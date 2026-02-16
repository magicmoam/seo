"""Supabase database integration for search history and API usage tracking."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from src.config import config

_client = None

# Pricing per million tokens (USD)
PRICING = {
    "anthropic": {"input": 3.0, "output": 15.0},
    "openai": {"input": 2.5, "output": 10.0},
}


def _get_client():
    global _client
    if _client is None:
        if not config.supabase_url or not config.supabase_key:
            return None
        from supabase import create_client
        _client = create_client(config.supabase_url, config.supabase_key)
    return _client


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate estimated cost in USD based on model and token counts."""
    provider = "anthropic" if "claude" in model.lower() else "openai"
    rates = PRICING.get(provider, PRICING["anthropic"])
    cost = (input_tokens * rates["input"] + output_tokens * rates["output"]) / 1_000_000
    return round(cost, 6)


async def save_search(user_email: str, query: str, tool_used: str, result: dict) -> None:
    """Save a search result to the database."""
    client = _get_client()
    if not client:
        return

    client.table("search_history").insert({
        "user_email": user_email,
        "query": query,
        "tool_used": tool_used,
        "result": result,
    }).execute()


async def save_usage(
    user_email: str,
    tool_used: str,
    query: str,
    model: str = "",
    input_tokens: int = 0,
    output_tokens: int = 0,
    jina_searches: int = 0,
    jina_scrapes: int = 0,
) -> None:
    """Save API usage record to the database."""
    client = _get_client()
    if not client:
        return

    estimated_cost = calculate_cost(model, input_tokens, output_tokens)

    client.table("api_usage").insert({
        "user_email": user_email,
        "tool_used": tool_used,
        "query": query,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "jina_searches": jina_searches,
        "jina_scrapes": jina_scrapes,
        "estimated_cost_usd": estimated_cost,
    }).execute()


async def get_usage_stats(user_email: str) -> dict:
    """Get aggregated usage stats for a user."""
    client = _get_client()
    if not client:
        return {
            "total_cost": 0.0,
            "today_queries": 0,
            "total_tokens": 0,
            "total_searches": 0,
            "by_tool": {},
        }

    resp = (
        client.table("api_usage")
        .select("*")
        .eq("user_email", user_email)
        .order("created_at", desc=True)
        .execute()
    )
    rows = resp.data or []

    total_cost = 0.0
    total_tokens = 0
    total_searches = 0
    today_queries = 0
    by_tool: dict[str, dict] = {}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for row in rows:
        cost = row.get("estimated_cost_usd", 0.0) or 0.0
        inp = row.get("input_tokens", 0) or 0
        out = row.get("output_tokens", 0) or 0
        searches = row.get("jina_searches", 0) or 0
        tool = row.get("tool_used", "unknown")
        created = row.get("created_at", "")

        total_cost += cost
        total_tokens += inp + out
        total_searches += searches

        if created.startswith(today):
            today_queries += 1

        if tool not in by_tool:
            by_tool[tool] = {"queries": 0, "cost": 0.0, "tokens": 0}
        by_tool[tool]["queries"] += 1
        by_tool[tool]["cost"] += cost
        by_tool[tool]["tokens"] += inp + out

    return {
        "total_cost": round(total_cost, 4),
        "today_queries": today_queries,
        "total_tokens": total_tokens,
        "total_searches": total_searches,
        "by_tool": by_tool,
    }


async def get_history(user_email: str, limit: int = 50) -> list[dict]:
    """Get search history for a user."""
    client = _get_client()
    if not client:
        return []

    resp = (
        client.table("search_history")
        .select("id, query, tool_used, result, created_at")
        .eq("user_email", user_email)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []
