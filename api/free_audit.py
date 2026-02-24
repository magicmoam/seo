"""Vercel serverless function for /api/free-audit — unauthenticated SEO audit with server-side redaction."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time

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

# In-memory rate limiter: 3 requests/hour/IP
_rate_limit: dict[str, list[float]] = {}
RATE_LIMIT_MAX = 3
RATE_LIMIT_WINDOW = 3600  # 1 hour


def _check_rate_limit(ip: str) -> bool:
    """Returns True if request is allowed, False if rate-limited."""
    hashed = hashlib.sha256(ip.encode()).hexdigest()[:16]
    now = time.time()
    timestamps = _rate_limit.get(hashed, [])
    timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(timestamps) >= RATE_LIMIT_MAX:
        _rate_limit[hashed] = timestamps
        return False
    timestamps.append(now)
    _rate_limit[hashed] = timestamps
    return True


def _redact_analysis(result_dict: dict) -> dict:
    """Server-side redaction: expose scores and names, hide detailed findings/recommendations."""
    redacted = {
        "_redacted": True,
        "url": result_dict.get("url", ""),
        "page_title": result_dict.get("page_title", ""),
        "meta_description": result_dict.get("meta_description", ""),
        "overall_score": result_dict.get("overall_score", 0),
        "performance_score": result_dict.get("performance_score", ""),
        "seo_score": result_dict.get("seo_score", ""),
        "content_score": result_dict.get("content_score", ""),
        "technical_score": result_dict.get("technical_score", ""),
        "word_count": result_dict.get("word_count", 0),
        "internal_links": result_dict.get("internal_links", 0),
        "external_links": result_dict.get("external_links", 0),
    }

    # Summary: only first 120 chars
    summary = result_dict.get("summary", "")
    redacted["summary_teaser"] = summary[:120] + ("..." if len(summary) > 120 else "")

    # Issues: only severity counts
    issues = result_dict.get("issues", [])
    severity_counts = {"critical": 0, "warning": 0, "info": 0}
    for iss in issues:
        sev = iss.get("severity", "info")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
    redacted["issues_summary"] = severity_counts

    # Rubric: expose category scores, criterion names + pass/fail + scores, hide findings/recommendations
    rubric = result_dict.get("rubric")
    if rubric:
        redacted_categories = []
        for cat in rubric.get("categories", []):
            redacted_criteria = []
            for cr in cat.get("criteria", []):
                redacted_criteria.append({
                    "criterion_name": cr.get("criterion_name", ""),
                    "passed": cr.get("passed", False),
                    "score": cr.get("score", 0),
                })
            redacted_categories.append({
                "category": cat.get("category", ""),
                "score": cat.get("score", 0),
                "passed_count": cat.get("passed_count", 0),
                "total_count": cat.get("total_count", 0),
                "criteria": redacted_criteria,
            })
        redacted["rubric"] = {"categories": redacted_categories}

    # Path to 80: projected score + step count + first step action only
    path = result_dict.get("path_to_80")
    if path:
        steps = path.get("steps", [])
        redacted["path_to_80"] = {
            "current_score": path.get("current_score", 0),
            "projected_score": path.get("projected_score", 0),
            "step_count": len(steps),
            "first_step_action": steps[0].get("action", "") if steps else "",
        }

    return redacted


@app.post("/api/free-audit")
async def free_audit(request: Request):
    from src.tools import website_analyzer

    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    ip = ip.split(",")[0].strip()
    if not _check_rate_limit(ip):
        return JSONResponse(
            {"error": "Rate limit exceeded. Maximum 3 free audits per hour."},
            status_code=429,
        )

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

    try:
        result, usage, trace = await website_analyzer.run(url)
        result_dict = json.loads(result.model_dump_json())
        redacted = _redact_analysis(result_dict)
        return JSONResponse(redacted)
    except Exception:
        import logging
        logging.exception("Unhandled error in /api/free-audit")
        return JSONResponse({"error": "An internal error occurred"}, status_code=500)
