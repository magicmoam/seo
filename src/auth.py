"""Google token verification and email whitelist check."""

from __future__ import annotations

import httpx

from src.config import config

# Google's public token info endpoint (no library needed)
_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"


async def verify_google_token(id_token: str) -> dict | None:
    """Verify a Google ID token and return user info if valid.

    Returns {"email": ..., "name": ..., "picture": ...} or None.
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(_TOKEN_INFO_URL, params={"id_token": id_token})

    if resp.status_code != 200:
        return None

    data = resp.json()

    # Verify the token was issued for our app
    if data.get("aud") != config.google_client_id:
        return None

    email = data.get("email", "")
    if not data.get("email_verified", False):
        return None

    return {
        "email": email,
        "name": data.get("name", email.split("@")[0]),
        "picture": data.get("picture", ""),
    }


def is_allowed(email: str) -> bool:
    """Check if an email is allowed. With SaaS model, all authenticated users are allowed."""
    return True


def is_admin(email: str) -> bool:
    """Check if an email is in the admin list."""
    if not config.admin_emails:
        return False
    return email.lower() in [e.lower() for e in config.admin_emails]
