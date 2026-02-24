"""User and credit operations."""

from __future__ import annotations

from datetime import datetime, timezone

import src.db.client as _db_client


async def get_or_create_user(email: str, name: str = "", picture: str = "") -> dict | None:
    """Upsert a user on sign-in. Returns the user row."""
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
    if not client:
        return False  # fail-closed: deny if no DB

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
    client = _db_client._get_client()
    if not client:
        return False

    client.table("users").update({
        "credits_remaining": amount,
        "credits_reset_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("email", email).execute()
    return True


async def list_all_users(limit: int = 50, offset: int = 0, search: str = "") -> list[dict]:
    """List all users (for admin). Optionally filter by email/name via ilike."""
    client = _db_client._get_client()
    if not client:
        return []

    query = client.table("users").select("*")
    if search:
        # Supabase PostgREST ilike filter — search email or name
        query = query.or_(f"email.ilike.%{search}%,name.ilike.%{search}%")
    resp = (
        query
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return resp.data or []


async def count_users() -> int:
    """Count total users."""
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
