"""Supabase database integration for search history and API usage tracking."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import httpx

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


# ---------------------------------------------------------------------------
# Users & Credits
# ---------------------------------------------------------------------------


async def get_or_create_user(email: str, name: str = "", picture: str = "") -> dict | None:
    """Upsert a user on sign-in. Returns the user row."""
    client = _get_client()
    if not client:
        return None

    resp = (
        client.table("users")
        .upsert(
            {
                "email": email,
                "name": name,
                "picture": picture,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="email",
        )
        .execute()
    )
    if resp.data and len(resp.data) > 0:
        return resp.data[0]
    return None


async def get_user(email: str) -> dict | None:
    """Get a user by email."""
    client = _get_client()
    if not client:
        return None

    resp = (
        client.table("users")
        .select("*")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    if resp.data and len(resp.data) > 0:
        return resp.data[0]
    return None


async def get_user_by_stripe_customer(customer_id: str) -> dict | None:
    """Get a user by Stripe customer ID."""
    client = _get_client()
    if not client:
        return None

    resp = (
        client.table("users")
        .select("*")
        .eq("stripe_customer_id", customer_id)
        .limit(1)
        .execute()
    )
    if resp.data and len(resp.data) > 0:
        return resp.data[0]
    return None


async def update_user_tier(
    email: str,
    tier: str,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
) -> bool:
    """Update a user's tier and optionally Stripe IDs."""
    client = _get_client()
    if not client:
        return False

    update = {
        "tier": tier,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if stripe_customer_id is not None:
        update["stripe_customer_id"] = stripe_customer_id
    if stripe_subscription_id is not None:
        update["stripe_subscription_id"] = stripe_subscription_id

    client.table("users").update(update).eq("email", email).execute()
    return True


async def deduct_credits(email: str, amount: int, tool: str, query: str = "") -> bool:
    """Deduct credits from a user. Returns False if insufficient credits."""
    client = _get_client()
    if not client:
        return True  # allow if no DB

    user = await get_user(email)
    if not user:
        return False

    remaining = user.get("credits_remaining", 0)
    if remaining < amount:
        return False

    new_balance = remaining - amount
    client.table("users").update({
        "credits_remaining": new_balance,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("email", email).execute()

    # Log the transaction
    client.table("credit_transactions").insert({
        "user_email": email,
        "credits_used": amount,
        "tool_used": tool,
        "query": query[:500],
        "balance_after": new_balance,
    }).execute()

    return True


async def reset_credits(email: str, amount: int) -> bool:
    """Reset credits for a user (e.g. on billing cycle)."""
    client = _get_client()
    if not client:
        return False

    client.table("users").update({
        "credits_remaining": amount,
        "credits_reset_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("email", email).execute()
    return True


async def list_all_users(limit: int = 50, offset: int = 0) -> list[dict]:
    """List all users (for admin). Returns list of user dicts."""
    client = _get_client()
    if not client:
        return []

    resp = (
        client.table("users")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return resp.data or []


async def count_users() -> int:
    """Count total users."""
    client = _get_client()
    if not client:
        return 0

    resp = (
        client.table("users")
        .select("id", count="exact")
        .execute()
    )
    return resp.count or 0


async def count_pro_users() -> int:
    """Count active Pro subscribers."""
    client = _get_client()
    if not client:
        return 0

    resp = (
        client.table("users")
        .select("id", count="exact")
        .eq("tier", "pro")
        .execute()
    )
    return resp.count or 0


async def get_queries_today() -> int:
    """Count total queries across all users today."""
    client = _get_client()
    if not client:
        return 0

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    resp = (
        client.table("api_usage")
        .select("id", count="exact")
        .gte("created_at", f"{today}T00:00:00Z")
        .execute()
    )
    return resp.count or 0


# ---------------------------------------------------------------------------
# Search History & Evidence
# ---------------------------------------------------------------------------


async def save_search(user_email: str, query: str, tool_used: str, result: dict) -> str | None:
    """Save a search result to the database. Returns the inserted row's id."""
    client = _get_client()
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
    client = _get_client()
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
    client = _get_client()
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


# ---------------------------------------------------------------------------
# Tracked URLs & Audit Snapshots
# ---------------------------------------------------------------------------


async def save_tracked_url(user_email: str, url: str, ga4_property_id: str = "") -> str | None:
    """Add a URL to track for scheduled audits. Returns the row id."""
    client = _get_client()
    if not client:
        return None

    # Check if already tracked
    existing = (
        client.table("tracked_urls")
        .select("id")
        .eq("user_email", user_email)
        .eq("url", url)
        .limit(1)
        .execute()
    )
    if existing.data:
        # Update ga4_property_id if provided
        if ga4_property_id:
            client.table("tracked_urls").update(
                {"ga4_property_id": ga4_property_id, "active": True}
            ).eq("id", existing.data[0]["id"]).execute()
        return existing.data[0]["id"]

    resp = client.table("tracked_urls").insert({
        "user_email": user_email,
        "url": url,
        "ga4_property_id": ga4_property_id,
        "active": True,
    }).execute()

    if resp.data and len(resp.data) > 0:
        return resp.data[0].get("id")
    return None


async def get_tracked_urls(user_email: str) -> list[dict]:
    """Get all tracked URLs for a user."""
    client = _get_client()
    if not client:
        return []

    resp = (
        client.table("tracked_urls")
        .select("*")
        .eq("user_email", user_email)
        .eq("active", True)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


async def get_all_active_tracked_urls() -> list[dict]:
    """Get all active tracked URLs across all users (for cron job)."""
    client = _get_client()
    if not client:
        return []

    resp = (
        client.table("tracked_urls")
        .select("*")
        .eq("active", True)
        .execute()
    )
    return resp.data or []


async def remove_tracked_url(user_email: str, tracked_url_id: str) -> bool:
    """Deactivate a tracked URL."""
    client = _get_client()
    if not client:
        return False

    client.table("tracked_urls").update({"active": False}).eq(
        "id", tracked_url_id
    ).eq("user_email", user_email).execute()
    return True


async def save_audit_snapshot(
    user_email: str,
    url: str,
    overall_score: int,
    category_scores: dict,
    issues_summary: dict,
    tracked_url_id: str | None = None,
) -> str | None:
    """Save an audit snapshot for trend tracking."""
    client = _get_client()
    if not client:
        return None

    row = {
        "user_email": user_email,
        "url": url,
        "overall_score": overall_score,
        "category_scores": category_scores,
        "issues_summary": issues_summary,
    }
    if tracked_url_id:
        row["tracked_url_id"] = tracked_url_id

    resp = client.table("audit_snapshots").insert(row).execute()
    if resp.data and len(resp.data) > 0:
        return resp.data[0].get("id")
    return None


async def get_audit_snapshots(user_email: str, url: str, limit: int = 30) -> list[dict]:
    """Get audit snapshots for a URL, ordered by date."""
    client = _get_client()
    if not client:
        return []

    resp = (
        client.table("audit_snapshots")
        .select("*")
        .eq("user_email", user_email)
        .eq("url", url)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


async def get_score_trends(user_email: str, url: str) -> dict:
    """Get score trend data for a tracked URL."""
    snapshots = await get_audit_snapshots(user_email, url)
    if not snapshots:
        return {"url": url, "snapshots": [], "score_change": 0, "trend_direction": "stable"}

    # Reverse to chronological order
    snapshots = list(reversed(snapshots))

    first_score = snapshots[0].get("overall_score", 0)
    latest_score = snapshots[-1].get("overall_score", 0)
    change = latest_score - first_score

    if change > 2:
        direction = "up"
    elif change < -2:
        direction = "down"
    else:
        direction = "stable"

    return {
        "url": url,
        "snapshots": snapshots,
        "score_change": change,
        "trend_direction": direction,
    }


# ---------------------------------------------------------------------------
# GA4 OAuth Connections
# ---------------------------------------------------------------------------


def _encrypt_token(token: str) -> str:
    """Encrypt a token using Fernet symmetric encryption."""
    from cryptography.fernet import Fernet
    key = config.ga4_token_encryption_key
    if not key:
        raise ValueError("GA4_TOKEN_ENCRYPTION_KEY is not configured")
    f = Fernet(key.encode())
    return f.encrypt(token.encode()).decode()


def _decrypt_token(encrypted: str) -> str:
    """Decrypt a Fernet-encrypted token."""
    from cryptography.fernet import Fernet
    key = config.ga4_token_encryption_key
    if not key:
        raise ValueError("GA4_TOKEN_ENCRYPTION_KEY is not configured")
    f = Fernet(key.encode())
    return f.decrypt(encrypted.encode()).decode()


async def save_ga4_connection(
    user_email: str,
    refresh_token: str,
    access_token: str = "",
    access_token_expires_at: str | None = None,
    selected_property_id: str = "",
    selected_property_name: str = "",
) -> bool:
    """Upsert a GA4 OAuth connection for a user."""
    client = _get_client()
    if not client:
        return False

    row = {
        "user_email": user_email,
        "encrypted_refresh_token": _encrypt_token(refresh_token),
        "access_token": access_token,
        "access_token_expires_at": access_token_expires_at,
        "selected_property_id": selected_property_id,
        "selected_property_name": selected_property_name,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    client.table("ga4_connections").upsert(row, on_conflict="user_email").execute()
    return True


async def get_ga4_connection(user_email: str) -> dict | None:
    """Get GA4 connection for a user, with decrypted refresh token."""
    client = _get_client()
    if not client:
        return None

    resp = (
        client.table("ga4_connections")
        .select("*")
        .eq("user_email", user_email)
        .limit(1)
        .execute()
    )
    if not resp.data:
        return None

    row = resp.data[0]
    row["refresh_token"] = _decrypt_token(row["encrypted_refresh_token"])
    del row["encrypted_refresh_token"]
    return row


async def update_ga4_property(user_email: str, property_id: str, property_name: str) -> bool:
    """Update the selected GA4 property for a user."""
    client = _get_client()
    if not client:
        return False

    client.table("ga4_connections").update({
        "selected_property_id": property_id,
        "selected_property_name": property_name,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("user_email", user_email).execute()
    return True


async def update_ga4_access_token(user_email: str, access_token: str, expires_at: str) -> bool:
    """Cache a refreshed access token."""
    client = _get_client()
    if not client:
        return False

    client.table("ga4_connections").update({
        "access_token": access_token,
        "access_token_expires_at": expires_at,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("user_email", user_email).execute()
    return True


async def delete_ga4_connection(user_email: str) -> bool:
    """Remove GA4 connection for a user."""
    client = _get_client()
    if not client:
        return False

    client.table("ga4_connections").delete().eq("user_email", user_email).execute()
    return True


async def refresh_ga4_access_token(user_email: str, connection: dict) -> str:
    """Refresh the GA4 access token if expired, caching the new one. Returns a valid access token."""
    expires_at = connection.get("access_token_expires_at")
    access_token = connection.get("access_token", "")

    from datetime import timedelta

    # Check if current token is still valid (with 60s buffer)
    if access_token and expires_at:
        exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) < exp - timedelta(seconds=60):
            return access_token

    # Refresh using Google token endpoint
    refresh_token = connection["refresh_token"]
    async with httpx.AsyncClient() as http:
        resp = await http.post("https://oauth2.googleapis.com/token", data={
            "client_id": config.google_client_id,
            "client_secret": config.google_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        })
    resp.raise_for_status()
    data = resp.json()

    new_access_token = data["access_token"]
    expires_in = data.get("expires_in", 3600)
    new_expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

    await update_ga4_access_token(user_email, new_access_token, new_expires_at)
    return new_access_token
