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
    from src.db import get_history
    from src.middleware import authenticate

    auth_result = await authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    records = await get_history(user["email"])
    return JSONResponse(records)
