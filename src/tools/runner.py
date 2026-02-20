"""Centralized tool runner — replaces duplicated if/elif routing chains."""

from __future__ import annotations

from src.tools import (
    backlink_strategy,
    competitor_analysis,
    content_gap,
    content_generator,
    ga4,
    keyword_research,
    serp_analysis,
    strategy_orchestrator,
    technical_seo,
    topical_authority,
    website_analyzer,
)
from src.tools.common import unpack_tool_result


async def run_tool(
    tool_name: str,
    query: str,
    extras: dict | None = None,
    user_email: str = "",
) -> tuple:
    """Run a tool by name, returning (result, usage, trace) uniformly.

    Args:
        tool_name: The tool identifier (e.g. "keyword_research").
        query: The primary query / URL / keyword.
        extras: Optional dict of additional parameters from the router.
        user_email: Required for ga4_analytics; ignored by other tools.

    Returns:
        A 3-tuple of (PydanticModel result, usage dict, EvidenceTrace).

    Raises:
        ValueError: If tool_name is not recognized.
    """
    extras = extras or {}

    if tool_name == "content_generation":
        raw = await content_generator.run(
            keyword=query,
            content_type=extras.get("content_type", "blog post"),
            tone=extras.get("tone", "professional"),
        )
    elif tool_name == "keyword_research":
        raw = await keyword_research.run(query)
    elif tool_name == "competitor_analysis":
        raw = await competitor_analysis.run(query)
    elif tool_name == "serp_analysis":
        raw = await serp_analysis.run(query)
    elif tool_name == "content_gap":
        raw = await content_gap.run(query)
    elif tool_name == "website_analyzer":
        raw = await website_analyzer.run(query)
    elif tool_name == "topical_authority":
        raw = await topical_authority.run(domain=query, niche=extras.get("niche", ""))
    elif tool_name == "technical_seo":
        raw = await technical_seo.run(query)
    elif tool_name == "backlink_strategy":
        raw = await backlink_strategy.run(domain=query, niche=extras.get("niche", ""))
    elif tool_name == "seo_strategy":
        raw = await strategy_orchestrator.run(url=query, niche=extras.get("niche", ""))
    elif tool_name == "ga4_analytics":
        raw = await ga4.run(
            property_id=query,
            date_range=extras.get("date_range", "last_30_days"),
            user_email=user_email,
        )
    else:
        raise ValueError(f"Unknown tool: {tool_name}")

    return unpack_tool_result(raw, tool_name, query)
