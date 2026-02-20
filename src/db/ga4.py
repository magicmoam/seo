"""GA4 OAuth connection management."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from src.config import config
import src.db.client as _db_client


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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
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
    client = _db_client._get_client()
    if not client:
        return False

    client.table("ga4_connections").delete().eq("user_email", user_email).execute()
    return True


async def refresh_ga4_access_token(user_email: str, connection: dict) -> str:
    """Refresh the GA4 access token if expired, caching the new one. Returns a valid access token."""
    expires_at = connection.get("access_token_expires_at")
    access_token = connection.get("access_token", "")

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
