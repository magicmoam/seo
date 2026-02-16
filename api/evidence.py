"""Vercel serverless function for /api/evidence/{search_id}."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


async def _authenticate(request: Request) -> dict | JSONResponse:
    """Verify Google token from Authorization header."""
    from src.auth import verify_google_token, is_allowed

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"error": "Missing authorization token"}, status_code=401)

    user = await verify_google_token(auth[7:])
    if not user:
        return JSONResponse({"error": "Invalid or expired token"}, status_code=401)

    if not is_allowed(user["email"]):
        return JSONResponse({"error": "Access denied"}, status_code=403)

    return user


@app.get("/api/evidence/{search_id}")
async def get_evidence(search_id: str, request: Request):
    from src.db import get_evidence

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    evidence = await get_evidence(search_id, user["email"])
    if not evidence:
        return JSONResponse({"error": "Evidence not found"}, status_code=404)

    return JSONResponse(evidence)
