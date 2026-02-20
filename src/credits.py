"""Credit costs per tool and tier limits for trySEO.ai."""

from __future__ import annotations

# Credit cost per tool
TOOL_COSTS: dict[str, int] = {
    "website_analyzer": 1,
    "keyword_research": 1,
    "serp_analysis": 1,
    "technical_seo": 1,
    "ga4_analytics": 1,
    "competitor_analysis": 2,
    "content_gap": 2,
    "content_generation": 2,
    "topical_authority": 2,
    "backlink_strategy": 2,
    "seo_strategy": 10,
}

# Tier credit allocations
TIER_CREDITS: dict[str, int] = {
    "free": 5,
    "pro": 200,
}


def get_tool_cost(tool_name: str) -> int:
    """Get the credit cost for a tool. Defaults to 1 if unknown."""
    return TOOL_COSTS.get(tool_name, 1)
