"""Vercel serverless function for /api/history."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tryseo.ai", "https://www.tryseo.ai", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/history")
async def history(request: Request):
    from src.db import get_history
    from src.middleware import authenticate

    auth_result = await authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    try:
        limit = max(1, min(100, int(request.query_params.get("limit", "50"))))
        offset = max(0, int(request.query_params.get("offset", "0")))
    except (ValueError, TypeError):
        limit, offset = 50, 0
    tool = request.query_params.get("tool", "")

    records = await get_history(user["email"], limit=limit, offset=offset, tool=tool)
    return JSONResponse({"history": records, "limit": limit, "offset": offset})
