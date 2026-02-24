"""Backlink strategy agent: develops off-page SEO and link building plans with cost estimates."""

from __future__ import annotations

import asyncio
import json

from src.models import BacklinkStrategy, EvidenceTrace
from src.prompts.templates import BACKLINK_STRATEGY_SYSTEM, BACKLINK_STRATEGY_USER
from src.tools import jina, llm


async def run(domain: str, niche: str = "") -> tuple[BacklinkStrategy, dict, EvidenceTrace]:
    """Build a comprehensive backlink acquisition strategy."""
    # Scrape domain homepage
    scrape_count = 0
    try:
        homepage = await jina.scrape(domain)
        scrape_count += 1
    except Exception:
        homepage = {"title": domain, "url": domain, "content": ""}

    niche_query = niche if niche else homepage.get("title", domain)

    # Run all three searches in parallel
    competitor_results, outreach_results, linkbait_results = await asyncio.gather(
        jina.search(f"{niche_query} best sites resources", num_results=5),
        jina.search(f"{niche_query} write for us guest post", num_results=5),
        jina.search(f"{niche_query} statistics data research study", num_results=5),
    )

    research_data = f"--- Domain homepage ---\nTitle: {homepage.get('title', '')}\n"
    research_data += f"URL: {homepage.get('url', domain)}\n"
    research_data += f"Content:\n{homepage.get('content', '')[:1500]}\n\n"

    research_data += "--- Competitor landscape ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\nURL: {r['url']}\n{r['content'][:600]}"
        for r in competitor_results
    )

    research_data += "\n\n--- Guest post / outreach opportunities ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\nURL: {r['url']}\n{r['content'][:400]}"
        for r in outreach_results
    )

    research_data += "\n\n--- Link-worthy content ideas ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\n{r['content'][:400]}" for r in linkbait_results
    )

    system_prompt = BACKLINK_STRATEGY_SYSTEM
    user_prompt = BACKLINK_STRATEGY_USER.format(
        domain=domain, research_data=research_data
    )

    result = await llm.complete(
        system=system_prompt,
        user=user_prompt,
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 3,
        "jina_scrapes": scrape_count,
    }
    trace = EvidenceTrace(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="backlink_strategy",
        query=domain,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return BacklinkStrategy(**data), usage, trace
