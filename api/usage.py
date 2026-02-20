"""Vercel serverless function for /api/usage."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


async def _authenticate(request: Request) -> dict | JSONResponse:
    """Verify Google token from Authorization header."""
    from src.middleware import authenticate
    return await authenticate(request)


@app.get("/api/usage")
async def usage(request: Request):
    from src.db import get_usage_stats

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    stats = await get_usage_stats(user["email"])

    # Middleware already provides tier, credits, and admin info
    stats["tier"] = user.get("tier", "free")
    stats["credits_remaining"] = user.get("credits_remaining", 5)
    stats["is_admin"] = user.get("is_admin", False)

    return JSONResponse(stats)
