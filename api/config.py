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
