"""Shared FastAPI dependencies for authentication."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import Request
from fastapi.responses import JSONResponse


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency: authenticate via Google token.

    Returns user dict or raises via JSONResponse (handled by callers
    that still check isinstance for backwards compat with Vercel).
    """
    from src.middleware import authenticate
    return await authenticate(request)


async def get_admin_user(request: Request) -> dict:
    """FastAPI dependency: authenticate and verify admin access."""
    from src.middleware import authenticate_admin
    return await authenticate_admin(request)
