"""Integration tests for api/history.py — GET /api/history."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from api.history import app


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


def _mock_authenticate_success():
    return patch(
        "src.middleware.authenticate",
        new_callable=AsyncMock,
        return_value=MOCK_USER,
    )


def _mock_authenticate_failure():
    return patch(
        "src.middleware.authenticate",
        new_callable=AsyncMock,
        return_value=JSONResponse({"error": "Missing authorization token"}, status_code=401),
    )


# ---------------------------------------------------------------------------
# GET /api/history
# ---------------------------------------------------------------------------


class TestGetHistory:
    """Tests for GET /api/history."""

    async def test_returns_401_without_auth(self):
        with _mock_authenticate_failure():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/history")

        assert resp.status_code == 401
        assert "Missing authorization token" in resp.json()["error"]

    async def test_returns_history_list_on_success(self):
        mock_history = [
            {
                "id": "search-1",
                "query": "best coffee shops NYC",
                "tool_used": "keyword_research",
                "created_at": "2024-06-01T12:00:00Z",
            },
            {
                "id": "search-2",
                "query": "https://example.com",
                "tool_used": "website_analyzer",
                "created_at": "2024-06-02T14:30:00Z",
            },
        ]

        with (
            _mock_authenticate_success(),
            patch(
                "src.db.get_history",
                new_callable=AsyncMock,
                return_value=mock_history,
            ),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/history", headers=AUTH_HEADER)

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["id"] == "search-1"
        assert data[1]["tool_used"] == "website_analyzer"

    async def test_returns_empty_list_when_no_history(self):
        with (
            _mock_authenticate_success(),
            patch(
                "src.db.get_history",
                new_callable=AsyncMock,
                return_value=[],
            ),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/history", headers=AUTH_HEADER)

        assert resp.status_code == 200
        data = resp.json()
        assert data == []

    async def test_passes_user_email_to_db(self):
        with (
            _mock_authenticate_success(),
            patch(
                "src.db.get_history",
                new_callable=AsyncMock,
                return_value=[],
            ) as mock_get,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                await client.get("/api/history", headers=AUTH_HEADER)

        mock_get.assert_called_once_with("user@test.com")
