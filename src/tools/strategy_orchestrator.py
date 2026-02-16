"""SEO Strategy Orchestrator: deploys multiple agents concurrently and synthesizes results.

This is the master agent that coordinates:
1. Website Analyzer - site audit
2. Keyword Research - keyword landscape
3. Competitor Analysis - competitive intelligence
4. Content Gap Analysis - opportunity identification
5. Topical Authority - content cluster architecture
6. Technical SEO - technical audit with fixes
7. Backlink Strategy - off-page SEO plan
8. Content Calendar - publishing schedule (derived from topical authority)
9. Strategy Synthesis - combines everything into a prioritized plan with costs

Agents 1-4 run concurrently in Phase 1.
Agents 5-7 run concurrently in Phase 2 (using Phase 1 data).
Agent 8 runs in Phase 3 (needs topical authority).
Agent 9 synthesizes everything in Phase 4.
"""

from __future__ import annotations

import asyncio
import json
import logging

from src.models import SEOStrategy
from src.prompts.templates import STRATEGY_SYNTHESIS_SYSTEM, STRATEGY_SYNTHESIS_USER
from src.tools import (
    backlink_strategy,
    competitor_analysis,
    content_calendar,
    content_gap,
    keyword_research,
    technical_seo,
    topical_authority,
    website_analyzer,
)
from src.tools import llm

logger = logging.getLogger(__name__)


def _merge_usage(*usages: dict) -> dict:
    """Merge multiple usage dicts into one."""
    merged = {
        "input_tokens": 0,
        "output_tokens": 0,
        "model": "",
        "jina_searches": 0,
        "jina_scrapes": 0,
    }
    for u in usages:
        merged["input_tokens"] += u.get("input_tokens", 0)
        merged["output_tokens"] += u.get("output_tokens", 0)
        merged["jina_searches"] += u.get("jina_searches", 0)
        merged["jina_scrapes"] += u.get("jina_scrapes", 0)
        if u.get("model"):
            merged["model"] = u["model"]
    return merged


def _safe_dump(obj) -> str:
    """Safely dump a Pydantic model or dict to JSON string."""
    if hasattr(obj, "model_dump_json"):
        return obj.model_dump_json(indent=2)
    return json.dumps(obj, indent=2, default=str)


async def _run_safe(name: str, coro):
    """Run an agent coroutine with error handling."""
    try:
        return await coro
    except Exception as e:
        logger.warning("Agent %s failed: %s", name, e)
        return None


async def run(url: str, niche: str = "") -> tuple[SEOStrategy, dict]:
    """Run the full multi-agent SEO strategy pipeline.

    Args:
        url: Target website URL or domain.
        niche: Industry/niche description (auto-detected if empty).

    Returns:
        Tuple of (SEOStrategy, usage_dict).
    """
    # Normalize URL
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    domain = url.rstrip("/")
    all_usages: list[dict] = []

    # Extract a search-friendly query from the domain
    domain_name = domain.split("//")[-1].split("/")[0].replace("www.", "")
    search_query = niche if niche else domain_name

    # -----------------------------------------------------------------------
    # PHASE 1: Parallel foundation agents
    # -----------------------------------------------------------------------
    phase1 = await asyncio.gather(
        _run_safe("website_analyzer", website_analyzer.run(url)),
        _run_safe("keyword_research", keyword_research.run(search_query)),
        _run_safe("competitor_analysis", competitor_analysis.run(search_query)),
        _run_safe("content_gap", content_gap.run(search_query)),
    )

    site_audit_result = phase1[0]
    keyword_result = phase1[1]
    competitor_result = phase1[2]
    gap_result = phase1[3]

    # Collect usages
    for result in phase1:
        if result:
            all_usages.append(result[1])

    # Prepare text summaries for downstream agents
    site_audit_text = _safe_dump(site_audit_result[0]) if site_audit_result else "{}"
    keyword_text = _safe_dump(keyword_result[0]) if keyword_result else "{}"
    competitor_text = _safe_dump(competitor_result[0]) if competitor_result else "{}"
    gap_text = _safe_dump(gap_result[0]) if gap_result else "{}"

    # -----------------------------------------------------------------------
    # PHASE 2: Parallel specialized agents (use Phase 1 context)
    # -----------------------------------------------------------------------
    phase2 = await asyncio.gather(
        _run_safe(
            "topical_authority",
            topical_authority.run(domain, niche=search_query),
        ),
        _run_safe("technical_seo", technical_seo.run(url)),
        _run_safe(
            "backlink_strategy",
            backlink_strategy.run(domain, niche=search_query),
        ),
    )

    authority_result = phase2[0]
    technical_result = phase2[1]
    backlink_result = phase2[2]

    for result in phase2:
        if result:
            all_usages.append(result[1])

    authority_text = _safe_dump(authority_result[0]) if authority_result else "{}"
    technical_text = _safe_dump(technical_result[0]) if technical_result else "{}"
    backlink_text = _safe_dump(backlink_result[0]) if backlink_result else "{}"

    # -----------------------------------------------------------------------
    # PHASE 3: Content calendar (needs topical authority data)
    # -----------------------------------------------------------------------
    # Build strategy context for the calendar agent
    calendar_context = (
        f"--- Topical Authority Map ---\n{authority_text}\n\n"
        f"--- Keyword Research ---\n{keyword_text}\n\n"
        f"--- Content Gaps ---\n{gap_text}\n\n"
        f"--- Competitor Analysis ---\n{competitor_text}"
    )

    calendar_result = await _run_safe(
        "content_calendar",
        content_calendar.run(domain, strategy_data=calendar_context),
    )

    if calendar_result:
        all_usages.append(calendar_result[1])

    calendar_text = _safe_dump(calendar_result[0]) if calendar_result else "{}"

    # -----------------------------------------------------------------------
    # PHASE 4: Strategy synthesis - combine all agent outputs
    # -----------------------------------------------------------------------
    # For the synthesis prompt, we pass summarized schemas rather than full ones
    # to keep token usage manageable
    authority_schema = authority_text[:3000] if authority_result else '"see topical_authority above"'
    calendar_schema = calendar_text[:3000] if calendar_result else '"see content_calendar above"'
    technical_schema = technical_text[:3000] if technical_result else '"see technical_audit above"'
    backlink_schema = backlink_text[:3000] if backlink_result else '"see backlink_strategy above"'

    synthesis_result = await llm.complete(
        system=STRATEGY_SYNTHESIS_SYSTEM,
        user=STRATEGY_SYNTHESIS_USER.format(
            domain=domain,
            site_audit=site_audit_text[:3000],
            keyword_data=keyword_text[:2000],
            competitor_data=competitor_text[:2000],
            gap_data=gap_text[:2000],
            authority_data=authority_text[:3000],
            calendar_data=calendar_text[:3000],
            technical_data=technical_text[:3000],
            backlink_data=backlink_text[:3000],
            authority_schema=authority_schema,
            calendar_schema=calendar_schema,
            technical_schema=technical_schema,
            backlink_schema=backlink_schema,
        ),
        temperature=0.2,
    )

    all_usages.append({
        "input_tokens": synthesis_result.input_tokens,
        "output_tokens": synthesis_result.output_tokens,
        "model": synthesis_result.model,
        "jina_searches": 0,
        "jina_scrapes": 0,
    })

    # Parse the synthesis - it contains the full nested strategy
    synthesis_data = json.loads(synthesis_result.text)

    # The synthesis LLM may return nested objects or may reference the originals.
    # Use the actual agent outputs as the authoritative sub-strategies,
    # falling back to whatever the synthesis LLM produced.
    if authority_result:
        synthesis_data["topical_authority"] = json.loads(authority_result[0].model_dump_json())
    if calendar_result:
        synthesis_data["content_calendar"] = json.loads(calendar_result[0].model_dump_json())
    if technical_result:
        synthesis_data["technical_audit"] = json.loads(technical_result[0].model_dump_json())
    if backlink_result:
        synthesis_data["backlink_strategy"] = json.loads(backlink_result[0].model_dump_json())

    merged_usage = _merge_usage(*all_usages)
    strategy = SEOStrategy(**synthesis_data)
    return strategy, merged_usage
