"""Vercel serverless function for /api/history."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


@app.get("/api/history")
async def history(request: Request):
    from src.auth import verify_google_token, is_allowed
    from src.db import get_history

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"error": "Missing authorization token"}, status_code=401)

    user = await verify_google_token(auth[7:])
    if not user:
        return JSONResponse({"error": "Invalid or expired token"}, status_code=401)

    if not is_allowed(user["email"]):
        return JSONResponse({"error": "Access denied"}, status_code=403)

    records = await get_history(user["email"])
    return JSONResponse(records)
