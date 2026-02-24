"""
Local development server for Retune.
Serves both the frontend (public/) and all API routes on a single port.

Usage:
    uvicorn dev_server:app --port 8080 --reload
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pathlib

app = FastAPI(title="Retune Dev Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import all sub-apps and copy their routes directly into the main app.
# FastAPI sub-app mounting strips the mount prefix before matching, so we
# can't use app.mount("/api/config", config_app) — the routes would never
# match. Instead we copy the routes so full paths like /api/config work.

from api.config import app as config_app
from api.query import app as query_app
from api.history import app as history_app
from api.usage import app as usage_app
from api.admin import app as admin_app
from api.evidence import app as evidence_app
from api.stripe_billing import app as stripe_app
from api.free_audit import app as free_audit_app
from api.tracking import app as tracking_app
from api.ga4_connect import app as ga4_app
from api.report import app as report_app
from api.analytics import app as analytics_app

for sub_app in [
    config_app, query_app, history_app, usage_app, admin_app,
    evidence_app, stripe_app, free_audit_app, tracking_app,
    ga4_app, report_app, analytics_app,
]:
    for route in sub_app.routes:
        app.routes.append(route)

# Serve frontend static files with no-cache headers (dev only)
PUBLIC = pathlib.Path("public")

@app.get("/{full_path:path}")
async def serve_static(full_path: str, response: Response):
    # Resolve file path
    target = PUBLIC / full_path
    if target.is_dir():
        target = target / "index.html"
    if not target.exists() or not target.is_file():
        target = PUBLIC / "index.html"  # SPA fallback

    # Detect media type
    suffix = target.suffix.lower()
    media_types = {
        ".html": "text/html; charset=utf-8",
        ".js":   "application/javascript; charset=utf-8",
        ".css":  "text/css; charset=utf-8",
        ".json": "application/json",
        ".svg":  "image/svg+xml",
        ".png":  "image/png",
        ".ico":  "image/x-icon",
        ".woff2": "font/woff2",
    }
    media_type = media_types.get(suffix, "application/octet-stream")

    return FileResponse(
        target,
        media_type=media_type,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
        },
    )
