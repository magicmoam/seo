"""Vercel serverless function for /api/report/{search_id}."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tryseo.ai", "https://www.tryseo.ai", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _authenticate(request: Request) -> dict | JSONResponse:
    """Verify Google token from Authorization header or query param."""
    from src.middleware import authenticate_with_query_param
    return await authenticate_with_query_param(request)


@app.get("/api/report/{search_id}")
async def get_report(search_id: str, request: Request):
    from src.db import get_evidence, get_history
    from src.report_generator import generate_report

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    # Get evidence trace
    evidence = await get_evidence(search_id, user["email"])
    if not evidence:
        return JSONResponse({"error": "Evidence not found"}, status_code=404)

    # Get the search result from history
    history = await get_history(user["email"])
    search_result = None
    for item in history:
        if str(item.get("id")) == search_id:
            search_result = item
            break

    if not search_result:
        return JSONResponse({"error": "Search result not found"}, status_code=404)

    html_report = generate_report(search_result, evidence)
    return HTMLResponse(content=html_report)
