"""Vercel serverless function for /api/tracking — tracked URLs and audit snapshots."""

from __future__ import annotations

import json
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


async def _authenticate(request: Request) -> dict | JSONResponse:
    from src.middleware import authenticate
    return await authenticate(request)


@app.get("/api/tracking")
async def get_tracked_urls(request: Request):
    """Get all tracked URLs for the authenticated user."""
    from src.db import get_tracked_urls

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    urls = await get_tracked_urls(auth_result["email"])
    return JSONResponse(urls)


@app.post("/api/tracking")
async def add_tracked_url(request: Request):
    """Add a URL to track for scheduled audits."""
    from src.db import save_tracked_url

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    url = body.get("url", "").strip()
    if not url:
        return JSONResponse({"error": "URL is required"}, status_code=400)
    if len(url) > 2000:
        return JSONResponse({"error": "URL too long (max 2000 characters)"}, status_code=400)

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # Block SSRF: prevent requests to internal/private networks
    from urllib.parse import urlparse
    hostname = urlparse(url).hostname or ""
    if hostname in ("localhost", "127.0.0.1", "0.0.0.0") or hostname.startswith("10.") or hostname.startswith("192.168.") or hostname.startswith("172."):
        return JSONResponse({"error": "Internal URLs are not allowed"}, status_code=400)

    ga4_property_id = body.get("ga4_property_id", "")

    tracked_id = await save_tracked_url(auth_result["email"], url, ga4_property_id)
    return JSONResponse({"id": tracked_id, "url": url, "ga4_property_id": ga4_property_id})


@app.delete("/api/tracking")
async def remove_tracked(request: Request):
    """Remove a tracked URL."""
    from src.db import remove_tracked_url

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    tracked_id = body.get("id", "")
    if not tracked_id:
        return JSONResponse({"error": "id is required"}, status_code=400)

    await remove_tracked_url(auth_result["email"], tracked_id)
    return JSONResponse({"ok": True})


@app.get("/api/tracking/snapshots")
async def get_snapshots(request: Request):
    """Get audit snapshots (score trend) for a tracked URL."""
    from src.db import get_score_trends

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    url = request.query_params.get("url", "")
    if not url:
        return JSONResponse({"error": "url query param is required"}, status_code=400)

    trends = await get_score_trends(auth_result["email"], url)
    return JSONResponse(trends)


@app.post("/api/tracking/snapshot")
async def run_snapshot(request: Request):
    """Run an on-demand audit snapshot for a URL."""
    from src.db import save_audit_snapshot, save_tracked_url
    from src.tools import website_analyzer

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    url = body.get("url", "").strip()
    if not url:
        return JSONResponse({"error": "URL is required"}, status_code=400)

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        result, usage, trace = await website_analyzer.run(url)
        result_dict = json.loads(result.model_dump_json())

        # Extract category scores
        category_scores = {
            "performance": result_dict.get("performance_score", ""),
            "seo": result_dict.get("seo_score", ""),
            "content": result_dict.get("content_score", ""),
            "technical": result_dict.get("technical_score", ""),
        }

        # Extract issues summary
        issues = result_dict.get("issues", [])
        issues_summary = {"critical": 0, "warning": 0, "info": 0}
        for iss in issues:
            sev = iss.get("severity", "info")
            issues_summary[sev] = issues_summary.get(sev, 0) + 1

        # Ensure URL is tracked
        tracked_id = await save_tracked_url(auth_result["email"], url)

        # Save snapshot
        snapshot_id = await save_audit_snapshot(
            user_email=auth_result["email"],
            url=url,
            overall_score=result_dict.get("overall_score", 0),
            category_scores=category_scores,
            issues_summary=issues_summary,
            tracked_url_id=tracked_id,
        )

        return JSONResponse({
            "snapshot_id": snapshot_id,
            "overall_score": result_dict.get("overall_score", 0),
            "category_scores": category_scores,
            "issues_summary": issues_summary,
        })
    except Exception:
        import logging
        logging.exception("Unhandled error in /api/tracking/snapshot")
        return JSONResponse({"error": "An internal error occurred"}, status_code=500)
