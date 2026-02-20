"""Integration tests for api/usage.py — GET /api/usage."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from api.usage import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

AUTH_HEADER = {"Authorization": "Bearer test-token"}

MOCK_USER = {
    "email": "user@test.com",
    "name": "Test User",
    "picture": "",
    "tier": "free",
    "credits_remaining": 5,
    "is_admin": False,
}


def _mock_authenticate_success(user=None):
    u = user or MOCK_USER
    return patch(
        "src.middleware.authenticate",
        new_callable=AsyncMock,
        return_value=u,
    )


def _mock_authenticate_failure():
    return patch(
        "src.middleware.authenticate",
        new_callable=AsyncMock,
        return_value=JSONResponse({"error": "Missing authorization token"}, status_code=401),
    )


# ---------------------------------------------------------------------------
# GET /api/usage
# ---------------------------------------------------------------------------


class TestGetUsage:
    """Tests for GET /api/usage."""

    async def test_returns_401_without_auth(self):
        with _mock_authenticate_failure():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/usage")

        assert resp.status_code == 401
        assert "Missing authorization token" in resp.json()["error"]

    async def test_returns_usage_stats_with_auth(self):
        mock_stats = {
            "total_queries": 42,
            "queries_this_month": 12,
            "tools_used": {"keyword_research": 5, "website_analyzer": 7},
        }

        with (
            _mock_authenticate_success(),
            patch(
                "src.db.get_usage_stats",
                new_callable=AsyncMock,
                return_value=mock_stats,
            ),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/usage", headers=AUTH_HEADER)

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_queries"] == 42
        assert data["queries_this_month"] == 12
        assert data["tools_used"]["keyword_research"] == 5

    async def test_includes_tier_and_credits_from_user(self):
        mock_stats = {"total_queries": 0}
        user = {
            "email": "pro@test.com",
            "name": "Pro User",
            "tier": "pro",
            "credits_remaining": 195,
            "is_admin": False,
        }

        with (
            _mock_authenticate_success(user),
            patch(
                "src.db.get_usage_stats",
                new_callable=AsyncMock,
                return_value=mock_stats,
            ),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/usage", headers=AUTH_HEADER)

        data = resp.json()
        assert data["tier"] == "pro"
        assert data["credits_remaining"] == 195
        assert data["is_admin"] is False

    async def test_admin_flag_reflected(self):
        mock_stats = {"total_queries": 0}
        user = {
            "email": "admin@test.com",
            "name": "Admin",
            "tier": "pro",
            "credits_remaining": 200,
            "is_admin": True,
        }

        with (
            _mock_authenticate_success(user),
            patch(
                "src.db.get_usage_stats",
                new_callable=AsyncMock,
                return_value=mock_stats,
            ),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/usage", headers=AUTH_HEADER)

        data = resp.json()
        assert data["is_admin"] is True
