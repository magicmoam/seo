"""Vercel serverless function for /api/analytics — GA4 analytics data."""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


async def _authenticate(request: Request) -> dict | JSONResponse:
    from src.middleware import authenticate
    return await authenticate(request)


@app.get("/api/analytics")
async def get_analytics(request: Request):
    """Fetch GA4 analytics data for a property."""
    from src.tools import ga4

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    property_id = request.query_params.get("property_id", "")
    date_range = request.query_params.get("date_range", "last_30_days")

    if not property_id:
        return JSONResponse({"error": "property_id is required"}, status_code=400)

    if date_range not in ("last_7_days", "last_30_days", "last_90_days"):
        return JSONResponse({"error": "Invalid date_range"}, status_code=400)

    try:
        report, usage, trace = await ga4.run(property_id, date_range, user_email=auth_result["email"])
        return JSONResponse(json.loads(report.model_dump_json()))
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": f"GA4 API error: {e}"}, status_code=500)
