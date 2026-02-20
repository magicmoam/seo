"""Integration tests for api/evidence.py — GET /api/evidence/{search_id}."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from api.evidence import app


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
# GET /api/evidence/{search_id}
# ---------------------------------------------------------------------------


class TestGetEvidence:
    """Tests for GET /api/evidence/{search_id}."""

    async def test_returns_401_without_auth(self):
        with _mock_authenticate_failure():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/evidence/search-123")

        assert resp.status_code == 401
        assert "Missing authorization token" in resp.json()["error"]

    async def test_returns_evidence_data_on_success(self):
        mock_evidence = {
            "search_id": "search-123",
            "jina_raw_responses": [{"data": "raw search data"}],
            "system_prompt": "Analyze the SEO...",
            "user_prompt": "Check example.com",
            "llm_raw_response": '{"score": 75}',
            "tool_used": "website_analyzer",
            "query": "https://example.com",
        }

        with (
            _mock_authenticate_success(),
            patch(
                "src.db.get_evidence",
                new_callable=AsyncMock,
                return_value=mock_evidence,
            ),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get(
                    "/api/evidence/search-123", headers=AUTH_HEADER
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["search_id"] == "search-123"
        assert data["tool_used"] == "website_analyzer"
        assert data["query"] == "https://example.com"
        assert len(data["jina_raw_responses"]) == 1

    async def test_returns_404_when_not_found(self):
        with (
            _mock_authenticate_success(),
            patch(
                "src.db.get_evidence",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get(
                    "/api/evidence/nonexistent-id", headers=AUTH_HEADER
                )

        assert resp.status_code == 404
        assert "Evidence not found" in resp.json()["error"]

    async def test_passes_user_email_to_db(self):
        with (
            _mock_authenticate_success(),
            patch(
                "src.db.get_evidence",
                new_callable=AsyncMock,
                return_value={"search_id": "search-123"},
            ) as mock_get,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                await client.get(
                    "/api/evidence/search-123", headers=AUTH_HEADER
                )

        mock_get.assert_called_once_with("search-123", "user@test.com")
