"""Vercel serverless function for /api/evidence/{search_id}."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from api._deps import get_current_user

app = FastAPI()


@app.get("/api/evidence/{search_id}")
async def get_evidence(search_id: str, request: Request, auth_result=Depends(get_current_user)):
    from src.db import get_evidence

    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    evidence = await get_evidence(search_id, user["email"])
    if not evidence:
        return JSONResponse({"error": "Evidence not found"}, status_code=404)

    return JSONResponse(evidence)
