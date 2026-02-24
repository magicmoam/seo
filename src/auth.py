"""Google token verification and email whitelist check."""

from __future__ import annotations

import time

import httpx

from src.config import config

# Google's public token info endpoint (no library needed)
_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"

# In-memory cache for verified tokens: {token_hash: (result, expiry_ts)}
_token_cache: dict[str, tuple[dict | None, float]] = {}
_CACHE_TTL = 300  # 5 minutes


async def verify_google_token(id_token: str) -> dict | None:
    """Verify a Google ID token and return user info if valid.

    Returns {"email": ..., "name": ..., "picture": ...} or None.
    Results are cached for 5 minutes to reduce Google API calls.
    """
    # Check cache first (use last 16 chars of token as key to avoid storing full tokens)
    cache_key = id_token[-16:]
    now = time.monotonic()
    cached = _token_cache.get(cache_key)
    if cached is not None:
        result, expiry = cached
        if now < expiry:
            return result

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(_TOKEN_INFO_URL, params={"id_token": id_token})

    if resp.status_code != 200:
        _token_cache[cache_key] = (None, now + _CACHE_TTL)
        return None

    data = resp.json()

    # Verify the token was issued for our app
    if data.get("aud") != config.google_client_id:
        _token_cache[cache_key] = (None, now + _CACHE_TTL)
        return None

    email = data.get("email", "")
    if not data.get("email_verified", False):
        _token_cache[cache_key] = (None, now + _CACHE_TTL)
        return None

    user_info = {
        "email": email,
        "name": data.get("name", email.split("@")[0]),
        "picture": data.get("picture", ""),
    }
    _token_cache[cache_key] = (user_info, now + _CACHE_TTL)
    return user_info


def is_admin(email: str) -> bool:
    """Check if an email is in the admin list."""
    if not config.admin_emails:
        return False
    return email.lower() in [e.lower() for e in config.admin_emails]
