"""Shared authentication middleware for all API endpoints."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse

from src.auth import is_admin, verify_google_token
from src.db import get_or_create_user


async def authenticate(request: Request) -> dict | JSONResponse:
    """Verify Google token and ensure user exists in DB.

    Returns a user dict with keys: email, name, picture, tier, credits_remaining, is_admin.
    Or returns a JSONResponse error.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"error": "Missing authorization token"}, status_code=401)

    google_user = await verify_google_token(auth[7:])
    if not google_user:
        return JSONResponse({"error": "Invalid or expired token"}, status_code=401)

    # Upsert user in DB
    db_user = await get_or_create_user(
        google_user["email"],
        google_user.get("name", ""),
        google_user.get("picture", ""),
    )

    user = {
        "email": google_user["email"],
        "name": google_user.get("name", ""),
        "picture": google_user.get("picture", ""),
        "tier": db_user.get("tier", "free") if db_user else "free",
        "credits_remaining": db_user.get("credits_remaining", 5) if db_user else 5,
        "is_admin": is_admin(google_user["email"]),
    }

    return user


async def authenticate_admin(request: Request) -> dict | JSONResponse:
    """Authenticate and verify admin access.

    Returns user dict or JSONResponse error (401/403).
    """
    result = await authenticate(request)
    if isinstance(result, JSONResponse):
        return result

    if not result.get("is_admin"):
        return JSONResponse({"error": "Admin access required"}, status_code=403)

    return result
