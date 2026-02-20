"""Tests for src/middleware.py - Authentication middleware."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import Request
from fastapi.responses import JSONResponse

from src.middleware import authenticate, authenticate_admin


def _make_request(headers: dict | None = None) -> Request:
    """Create a mock FastAPI Request object with given headers."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/test",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
    }
    request = Request(scope)
    return request


class TestAuthenticate:
    """Test authenticate() middleware function."""

    async def test_returns_401_when_no_authorization_header(self):
        request = _make_request({})
        result = await authenticate(request)

        assert isinstance(result, JSONResponse)
        assert result.status_code == 401

    async def test_returns_401_when_auth_header_not_bearer(self):
        request = _make_request({"Authorization": "Basic abc123"})
        result = await authenticate(request)

        assert isinstance(result, JSONResponse)
        assert result.status_code == 401

    @patch("src.middleware.get_or_create_user", new_callable=AsyncMock)
    @patch("src.middleware.verify_google_token", new_callable=AsyncMock)
    async def test_returns_401_when_token_invalid(self, mock_verify, mock_get_user):
        mock_verify.return_value = None

        request = _make_request({"Authorization": "Bearer invalid-token"})
        result = await authenticate(request)

        assert isinstance(result, JSONResponse)
        assert result.status_code == 401
        mock_verify.assert_called_once_with("invalid-token")

    @patch("src.middleware.get_or_create_user", new_callable=AsyncMock)
    @patch("src.middleware.verify_google_token", new_callable=AsyncMock)
    async def test_returns_user_dict_on_valid_token(self, mock_verify, mock_get_user):
        mock_verify.return_value = {
            "email": "user@test.com",
            "name": "Test User",
            "picture": "https://example.com/photo.jpg",
        }
        mock_get_user.return_value = {
            "tier": "free",
            "credits_remaining": 5,
        }

        request = _make_request({"Authorization": "Bearer valid-token"})
        result = await authenticate(request)

        assert isinstance(result, dict)
        assert result["email"] == "user@test.com"
        assert result["name"] == "Test User"
        assert result["tier"] == "free"
        assert result["credits_remaining"] == 5

    @patch("src.middleware.get_or_create_user", new_callable=AsyncMock)
    @patch("src.middleware.verify_google_token", new_callable=AsyncMock)
    async def test_returns_defaults_when_db_user_is_none(self, mock_verify, mock_get_user):
        mock_verify.return_value = {
            "email": "user@test.com",
            "name": "User",
            "picture": "",
        }
        mock_get_user.return_value = None

        request = _make_request({"Authorization": "Bearer valid-token"})
        result = await authenticate(request)

        assert isinstance(result, dict)
        assert result["tier"] == "free"
        assert result["credits_remaining"] == 5

    @patch("src.middleware.is_admin", return_value=True)
    @patch("src.middleware.get_or_create_user", new_callable=AsyncMock)
    @patch("src.middleware.verify_google_token", new_callable=AsyncMock)
    async def test_includes_is_admin_flag(self, mock_verify, mock_get_user, mock_is_admin):
        mock_verify.return_value = {
            "email": "admin@test.com",
            "name": "Admin",
            "picture": "",
        }
        mock_get_user.return_value = {"tier": "pro", "credits_remaining": 200}

        request = _make_request({"Authorization": "Bearer admin-token"})
        result = await authenticate(request)

        assert isinstance(result, dict)
        assert result["is_admin"] is True


class TestAuthenticateAdmin:
    """Test authenticate_admin() middleware function."""

    async def test_returns_401_when_no_auth(self):
        request = _make_request({})
        result = await authenticate_admin(request)

        assert isinstance(result, JSONResponse)
        assert result.status_code == 401

    @patch("src.middleware.get_or_create_user", new_callable=AsyncMock)
    @patch("src.middleware.verify_google_token", new_callable=AsyncMock)
    async def test_returns_403_when_user_not_admin(self, mock_verify, mock_get_user):
        mock_verify.return_value = {
            "email": "user@test.com",
            "name": "User",
            "picture": "",
        }
        mock_get_user.return_value = {"tier": "free", "credits_remaining": 5}

        with patch("src.middleware.is_admin", return_value=False):
            request = _make_request({"Authorization": "Bearer user-token"})
            result = await authenticate_admin(request)

        assert isinstance(result, JSONResponse)
        assert result.status_code == 403

    @patch("src.middleware.get_or_create_user", new_callable=AsyncMock)
    @patch("src.middleware.verify_google_token", new_callable=AsyncMock)
    async def test_returns_user_dict_when_admin(self, mock_verify, mock_get_user):
        mock_verify.return_value = {
            "email": "admin@test.com",
            "name": "Admin",
            "picture": "",
        }
        mock_get_user.return_value = {"tier": "pro", "credits_remaining": 200}

        with patch("src.middleware.is_admin", return_value=True):
            request = _make_request({"Authorization": "Bearer admin-token"})
            result = await authenticate_admin(request)

        assert isinstance(result, dict)
        assert result["email"] == "admin@test.com"
        assert result["is_admin"] is True
