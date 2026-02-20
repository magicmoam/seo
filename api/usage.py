"""Vercel serverless function for /api/usage."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from api._deps import get_current_user

app = FastAPI()


@app.get("/api/usage")
async def usage(request: Request, auth_result=Depends(get_current_user)):
    from src.db import get_usage_stats

    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    stats = await get_usage_stats(user["email"])

    # Middleware already provides tier, credits, and admin info
    stats["tier"] = user.get("tier", "free")
    stats["credits_remaining"] = user.get("credits_remaining", 5)
    stats["is_admin"] = user.get("is_admin", False)

    return JSONResponse(stats)
