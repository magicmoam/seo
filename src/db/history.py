"""Search history, evidence traces, and usage tracking."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import src.db.client as _db_client


async def save_search(user_email: str, query: str, tool_used: str, result: dict) -> str | None:
    """Save a search result to the database. Returns the inserted row's id."""
    client = _db_client._get_client()
    if not client:
        return None

    resp = client.table("search_history").insert({
        "user_email": user_email,
        "query": query,
        "tool_used": tool_used,
        "result": result,
    }).execute()

    if resp.data and len(resp.data) > 0:
        return resp.data[0].get("id")
    return None


async def save_evidence(user_email: str, search_id: str | None, trace: dict) -> str | None:
    """Save an evidence trace to the database. Returns the trace id."""
    client = _db_client._get_client()
    if not client:
        return None

    row = {
        "user_email": user_email,
        "tool_used": trace.get("tool_used", ""),
        "query": trace.get("query", ""),
    }
    if search_id:
        row["search_id"] = search_id
    # Optional fields
    for field in (
        "jina_raw_responses", "system_prompt", "user_prompt",
        "llm_raw_response", "routing_prompt", "routing_raw_response",
        "routing_reasoning", "model", "total_input_tokens", "total_output_tokens",
    ):
        if field in trace:
            val = trace[field]
            if field == "jina_raw_responses" and isinstance(val, list):
                row[field] = json.dumps(val) if not isinstance(val, str) else val
            else:
                row[field] = val

    resp = client.table("evidence_traces").insert(row).execute()
    if resp.data and len(resp.data) > 0:
        return resp.data[0].get("id")
    return None


async def get_evidence(search_id: str, user_email: str) -> dict | None:
    """Retrieve an evidence trace by search_id."""
    client = _db_client._get_client()
    if not client:
        return None

    resp = (
        client.table("evidence_traces")
        .select("*")
        .eq("search_id", search_id)
        .eq("user_email", user_email)
        .limit(1)
        .execute()
    )
    if resp.data and len(resp.data) > 0:
        row = resp.data[0]
        # Parse jina_raw_responses back from JSON string if needed
        if isinstance(row.get("jina_raw_responses"), str):
            try:
                row["jina_raw_responses"] = json.loads(row["jina_raw_responses"])
            except (json.JSONDecodeError, TypeError):
                pass
        return row
    return None


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
    client = _db_client._get_client()
    if not client:
        return

    estimated_cost = _db_client.calculate_cost(model, input_tokens, output_tokens)

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
    client = _db_client._get_client()
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
        .select("tool_used, estimated_cost_usd, input_tokens, output_tokens, jina_searches, created_at")
        .eq("user_email", user_email)
        .order("created_at", desc=True)
        .limit(1000)
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


async def get_history(
    user_email: str, limit: int = 50, offset: int = 0, tool: str = ""
) -> list[dict]:
    """Get search history for a user with pagination and optional tool filter."""
    client = _db_client._get_client()
    if not client:
        return []

    query = (
        client.table("search_history")
        .select("id, query, tool_used, result, created_at")
        .eq("user_email", user_email)
    )
    if tool:
        query = query.eq("tool_used", tool)
    resp = (
        query
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return resp.data or []
