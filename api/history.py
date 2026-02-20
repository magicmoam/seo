"""Vercel serverless function for /api/history."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from api._deps import get_current_user

app = FastAPI()


@app.get("/api/history")
async def history(request: Request, auth_result=Depends(get_current_user)):
    from src.db import get_history

    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    records = await get_history(user["email"])
    return JSONResponse(records)
