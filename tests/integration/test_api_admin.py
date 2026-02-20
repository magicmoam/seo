"""Integration tests for api/admin.py — Admin dashboard endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from api.admin import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

AUTH_HEADER = {"Authorization": "Bearer test-token"}

MOCK_ADMIN_USER = {
    "email": "admin@test.com",
    "name": "Admin User",
    "picture": "",
    "tier": "pro",
    "credits_remaining": 200,
    "is_admin": True,
}

MOCK_NON_ADMIN_USER = {
    "email": "user@test.com",
    "name": "Test User",
    "picture": "",
    "tier": "free",
    "credits_remaining": 5,
    "is_admin": False,
}


def _mock_admin_auth_success():
    """Patch authenticate_admin to return an admin user."""
    return patch(
        "src.middleware.authenticate_admin",
        new_callable=AsyncMock,
        return_value=MOCK_ADMIN_USER,
    )


def _mock_admin_auth_forbidden():
    """Patch authenticate_admin to return 403."""
    return patch(
        "src.middleware.authenticate_admin",
        new_callable=AsyncMock,
        return_value=JSONResponse({"error": "Admin access required"}, status_code=403),
    )


def _mock_admin_auth_unauthorized():
    """Patch authenticate_admin to return 401."""
    return patch(
        "src.middleware.authenticate_admin",
        new_callable=AsyncMock,
        return_value=JSONResponse({"error": "Missing authorization token"}, status_code=401),
    )


# ---------------------------------------------------------------------------
# GET /api/admin/users
# ---------------------------------------------------------------------------


class TestAdminListUsers:
    """Tests for GET /api/admin/users."""

    async def test_returns_401_without_auth(self):
        with _mock_admin_auth_unauthorized():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/admin/users")

        assert resp.status_code == 401

    async def test_returns_403_for_non_admin(self):
        with _mock_admin_auth_forbidden():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get(
                    "/api/admin/users", headers=AUTH_HEADER
                )

        assert resp.status_code == 403
        assert "Admin access required" in resp.json()["error"]

    async def test_returns_user_list_for_admin(self):
        mock_users = [
            {"email": "user1@test.com", "name": "User 1", "tier": "free"},
            {"email": "user2@test.com", "name": "User 2", "tier": "pro"},
        ]

        with (
            _mock_admin_auth_success(),
            patch("src.db.list_all_users", new_callable=AsyncMock, return_value=mock_users),
            patch("src.db.count_users", new_callable=AsyncMock, return_value=2),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get(
                    "/api/admin/users", headers=AUTH_HEADER
                )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["users"]) == 2
        assert data["total"] == 2
        assert data["limit"] == 50
        assert data["offset"] == 0

    async def test_supports_search_filter(self):
        mock_users = [
            {"email": "alice@test.com", "name": "Alice"},
            {"email": "bob@test.com", "name": "Bob"},
        ]

        with (
            _mock_admin_auth_success(),
            patch("src.db.list_all_users", new_callable=AsyncMock, return_value=mock_users),
            patch("src.db.count_users", new_callable=AsyncMock, return_value=2),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get(
                    "/api/admin/users?search=alice", headers=AUTH_HEADER
                )

        data = resp.json()
        assert len(data["users"]) == 1
        assert data["users"][0]["email"] == "alice@test.com"


# ---------------------------------------------------------------------------
# GET /api/admin/users/{email}
# ---------------------------------------------------------------------------


class TestAdminGetUserDetail:
    """Tests for GET /api/admin/users/{email}."""

    async def test_returns_404_for_unknown_user(self):
        with (
            _mock_admin_auth_success(),
            patch("src.db.get_user", new_callable=AsyncMock, return_value=None),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get(
                    "/api/admin/users/unknown@test.com",
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 404
        assert "User not found" in resp.json()["error"]

    async def test_returns_user_detail(self):
        mock_user = {"email": "user@test.com", "name": "User", "tier": "free", "credits_remaining": 5}
        mock_stats = {"total_queries": 10, "queries_this_month": 3}
        mock_history = [{"id": "1", "query": "test", "tool_used": "keyword_research"}]

        with (
            _mock_admin_auth_success(),
            patch("src.db.get_user", new_callable=AsyncMock, return_value=mock_user),
            patch("src.db.get_usage_stats", new_callable=AsyncMock, return_value=mock_stats),
            patch("src.db.get_history", new_callable=AsyncMock, return_value=mock_history),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get(
                    "/api/admin/users/user@test.com",
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["email"] == "user@test.com"
        assert data["usage_stats"]["total_queries"] == 10
        assert len(data["recent_history"]) == 1


# ---------------------------------------------------------------------------
# POST /api/admin/users/{email}/credits
# ---------------------------------------------------------------------------


class TestAdminAdjustCredits:
    """Tests for POST /api/admin/users/{email}/credits."""

    async def test_returns_401_without_auth(self):
        with _mock_admin_auth_unauthorized():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/user@test.com/credits",
                    json={"amount": 10},
                )

        assert resp.status_code == 401

    async def test_adjusts_credits_successfully(self):
        mock_user = {"email": "user@test.com", "credits_remaining": 5}
        mock_client = MagicMock()
        # Make .table().update().eq().execute() chainable
        mock_table = MagicMock()
        mock_table.update.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = MagicMock(data=[])
        mock_table.insert.return_value = mock_table
        mock_client.table.return_value = mock_table

        with (
            _mock_admin_auth_success(),
            patch("src.db.get_user", new_callable=AsyncMock, return_value=mock_user),
            patch("src.db._get_client", return_value=mock_client),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/user@test.com/credits",
                    json={"amount": 10},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "user@test.com"
        assert data["credits_remaining"] == 15  # 5 + 10
        assert data["adjustment"] == 10

    async def test_credits_cannot_go_below_zero(self):
        mock_user = {"email": "user@test.com", "credits_remaining": 3}
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_table.update.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = MagicMock(data=[])
        mock_table.insert.return_value = mock_table
        mock_client.table.return_value = mock_table

        with (
            _mock_admin_auth_success(),
            patch("src.db.get_user", new_callable=AsyncMock, return_value=mock_user),
            patch("src.db._get_client", return_value=mock_client),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/user@test.com/credits",
                    json={"amount": -10},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 200
        assert resp.json()["credits_remaining"] == 0  # max(0, 3 + (-10))

    async def test_returns_404_for_unknown_user(self):
        with (
            _mock_admin_auth_success(),
            patch("src.db.get_user", new_callable=AsyncMock, return_value=None),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/unknown@test.com/credits",
                    json={"amount": 10},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 404

    async def test_returns_400_when_amount_missing(self):
        with _mock_admin_auth_success():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/user@test.com/credits",
                    json={},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 400
        assert "amount" in resp.json()["error"]


# ---------------------------------------------------------------------------
# POST /api/admin/users/{email}/tier
# ---------------------------------------------------------------------------


class TestAdminChangeTier:
    """Tests for POST /api/admin/users/{email}/tier."""

    async def test_changes_tier_to_pro(self):
        mock_user = {"email": "user@test.com", "tier": "free"}

        with (
            _mock_admin_auth_success(),
            patch("src.db.get_user", new_callable=AsyncMock, return_value=mock_user),
            patch("src.db.update_user_tier", new_callable=AsyncMock) as mock_update,
            patch("src.db.reset_credits", new_callable=AsyncMock) as mock_reset,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/user@test.com/tier",
                    json={"tier": "pro"},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "pro"
        mock_update.assert_called_once_with("user@test.com", "pro")
        mock_reset.assert_called_once_with("user@test.com", 200)

    async def test_changes_tier_to_free(self):
        mock_user = {"email": "user@test.com", "tier": "pro"}

        with (
            _mock_admin_auth_success(),
            patch("src.db.get_user", new_callable=AsyncMock, return_value=mock_user),
            patch("src.db.update_user_tier", new_callable=AsyncMock) as mock_update,
            patch("src.db.reset_credits", new_callable=AsyncMock) as mock_reset,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/user@test.com/tier",
                    json={"tier": "free"},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 200
        assert resp.json()["tier"] == "free"
        mock_update.assert_called_once_with("user@test.com", "free")
        mock_reset.assert_called_once_with("user@test.com", 5)

    async def test_returns_400_for_invalid_tier(self):
        with _mock_admin_auth_success():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/user@test.com/tier",
                    json={"tier": "enterprise"},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 400
        assert "tier must be" in resp.json()["error"]

    async def test_returns_404_for_unknown_user(self):
        with (
            _mock_admin_auth_success(),
            patch("src.db.get_user", new_callable=AsyncMock, return_value=None),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/admin/users/unknown@test.com/tier",
                    json={"tier": "pro"},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/admin/stats
# ---------------------------------------------------------------------------


class TestAdminStats:
    """Tests for GET /api/admin/stats."""

    async def test_returns_401_without_auth(self):
        with _mock_admin_auth_unauthorized():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/admin/stats")

        assert resp.status_code == 401

    async def test_returns_platform_stats_for_admin(self):
        with (
            _mock_admin_auth_success(),
            patch("src.db.count_users", new_callable=AsyncMock, return_value=100),
            patch("src.db.count_pro_users", new_callable=AsyncMock, return_value=10),
            patch("src.db.get_queries_today", new_callable=AsyncMock, return_value=250),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get(
                    "/api/admin/stats", headers=AUTH_HEADER
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_users"] == 100
        assert data["pro_users"] == 10
        assert data["mrr"] == 490  # 10 * 49
        assert data["queries_today"] == 250
