"""Tracked URLs and audit snapshot operations."""

from __future__ import annotations

import src.db.client as _db_client


async def save_tracked_url(user_email: str, url: str, ga4_property_id: str = "") -> str | None:
    """Add a URL to track for scheduled audits. Returns the row id."""
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
