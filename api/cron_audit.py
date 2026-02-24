"""Vercel cron function — runs scheduled audits on all tracked URLs."""

from __future__ import annotations

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

_CONCURRENCY = 3  # max parallel audits to avoid overwhelming Jina

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tryseo.ai", "https://www.tryseo.ai", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/cron/audit")
async def cron_audit(request: Request):
    """Run scheduled audit snapshots for all active tracked URLs.

    Protected by CRON_SECRET — Vercel sends this header automatically for cron jobs.
    """
    from src.config import config
    from src.db import get_all_active_tracked_urls, save_audit_snapshot
    from src.tools import website_analyzer

    # Verify cron secret (fail-closed: require secret to be configured)
    auth_header = request.headers.get("authorization", "")
    if not config.cron_secret:
        return JSONResponse({"error": "CRON_SECRET not configured"}, status_code=500)
    if auth_header != f"Bearer {config.cron_secret}":
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    tracked_urls = await get_all_active_tracked_urls()

    # Always include trySEO.ai self-audit (practice what we preach)
    self_audit = {"url": "https://tryseo.ai", "user_email": "system@tryseo.ai", "id": None}
    if not any(t.get("url") == "https://tryseo.ai" for t in tracked_urls):
        tracked_urls.append(self_audit)

    if not tracked_urls:
        return JSONResponse({"message": "No tracked URLs", "audited": 0})

    results = []
    errors = []
    sem = asyncio.Semaphore(_CONCURRENCY)

    async def _audit_one(tracked: dict) -> None:
        url = tracked.get("url", "")
        user_email = tracked.get("user_email", "")
        tracked_id = tracked.get("id")

        if not url or not user_email:
            return

        async with sem:
            try:
                result, usage, trace = await website_analyzer.run(url)
                result_dict = json.loads(result.model_dump_json())

                category_scores = {
                    "performance": result_dict.get("performance_score", ""),
                    "seo": result_dict.get("seo_score", ""),
                    "content": result_dict.get("content_score", ""),
                    "technical": result_dict.get("technical_score", ""),
                }

                issues = result_dict.get("issues", [])
                issues_summary = {"critical": 0, "warning": 0, "info": 0}
                for iss in issues:
                    sev = iss.get("severity", "info")
                    issues_summary[sev] = issues_summary.get(sev, 0) + 1

                snapshot_id = await save_audit_snapshot(
                    user_email=user_email,
                    url=url,
                    overall_score=result_dict.get("overall_score", 0),
                    category_scores=category_scores,
                    issues_summary=issues_summary,
                    tracked_url_id=tracked_id,
                )

                results.append({
                    "url": url,
                    "score": result_dict.get("overall_score", 0),
                    "snapshot_id": snapshot_id,
                })
            except Exception:
                import logging
                logging.exception("Cron audit failed for %s", url)
                errors.append({"url": url, "error": "Audit failed"})

    await asyncio.gather(*(_audit_one(t) for t in tracked_urls))

    return JSONResponse({
        "message": f"Audited {len(results)} URLs",
        "audited": len(results),
        "results": results,
        "errors": errors,
    })
