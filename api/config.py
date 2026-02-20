"""Vercel serverless function for /api/config - returns public client config."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()


@app.get("/api/config")
async def get_config():
    from src.config import config
    return JSONResponse({
        "google_client_id": config.google_client_id,
        "ga4_oauth_enabled": bool(config.google_client_secret),
        "stripe_publishable_key": config.stripe_publishable_key,
        "stripe_pro_monthly_price_id": config.stripe_pro_monthly_price_id,
        "stripe_pro_annual_price_id": config.stripe_pro_annual_price_id,
    })


@app.get("/api/config/debug-admin")
async def debug_admin():
    """Temporary debug endpoint — remove after verifying admin setup."""
    from src.config import config
    return JSONResponse({
        "admin_emails_count": len(config.admin_emails),
        "admin_emails_masked": [e[:3] + "***" + e[e.index("@"):] if "@" in e else "***" for e in config.admin_emails],
        "admin_emails_raw_env": bool(os.getenv("ADMIN_EMAILS")),
    })


@app.get("/api/config/health")
async def health_check():
    """Temporary diagnostic endpoint — tests all critical imports."""
    results = {}

    try:
        import src.db.client as _c
        results["db_client"] = "ok"
    except Exception as e:
        results["db_client"] = str(e)

    try:
        from src.db import get_or_create_user, get_usage_stats
        results["db_imports"] = "ok"
    except Exception as e:
        results["db_imports"] = str(e)

    try:
        from src.db.blog import list_all_posts
        results["db_blog"] = "ok"
    except Exception as e:
        results["db_blog"] = str(e)

    try:
        from src.middleware import authenticate
        results["middleware"] = "ok"
    except Exception as e:
        results["middleware"] = str(e)

    try:
        from src.config import config
        results["config"] = "ok"
        results["admin_emails_count"] = len(config.admin_emails)
        results["supabase_configured"] = bool(config.supabase_url)
    except Exception as e:
        results["config"] = str(e)

    return JSONResponse(results)
