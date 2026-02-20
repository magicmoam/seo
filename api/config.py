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
