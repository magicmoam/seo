"""Supabase database integration for search history."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from src.config import config

_client = None


def _get_client():
    global _client
    if _client is None:
        if not config.supabase_url or not config.supabase_key:
            return None
        from supabase import create_client
        _client = create_client(config.supabase_url, config.supabase_key)
    return _client


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
