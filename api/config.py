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
    return JSONResponse({"google_client_id": config.google_client_id})
