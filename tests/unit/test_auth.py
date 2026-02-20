"""Tests for src/auth.py - Google token verification and access control."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.auth import is_admin, is_allowed, verify_google_token


class TestVerifyGoogleToken:
    """Test verify_google_token() with mocked httpx."""

    async def test_returns_user_info_on_valid_token(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "email": "user@test.com",
            "email_verified": "true",
            "name": "Test User",
            "picture": "https://example.com/photo.jpg",
            "aud": os.environ["GOOGLE_CLIENT_ID"],
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("src.auth.httpx.AsyncClient", return_value=mock_client):
            result = await verify_google_token("valid-token")

        assert result is not None
        assert result["email"] == "user@test.com"
        assert result["name"] == "Test User"
        assert result["picture"] == "https://example.com/photo.jpg"

    async def test_returns_none_on_invalid_token(self):
        mock_response = MagicMock()
        mock_response.status_code = 400

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("src.auth.httpx.AsyncClient", return_value=mock_client):
            result = await verify_google_token("invalid-token")

        assert result is None

    async def test_returns_none_when_aud_doesnt_match(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "email": "user@test.com",
            "email_verified": "true",
            "name": "Test User",
            "picture": "",
            "aud": "wrong-client-id.apps.googleusercontent.com",
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("src.auth.httpx.AsyncClient", return_value=mock_client):
            result = await verify_google_token("token-with-wrong-aud")

        assert result is None

    async def test_returns_none_when_email_not_verified(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "email": "unverified@test.com",
            "email_verified": False,
            "name": "Unverified",
            "picture": "",
            "aud": os.environ["GOOGLE_CLIENT_ID"],
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("src.auth.httpx.AsyncClient", return_value=mock_client):
            result = await verify_google_token("unverified-token")

        assert result is None

    async def test_uses_email_prefix_as_name_when_name_missing(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "email": "noname@test.com",
            "email_verified": "true",
            "aud": os.environ["GOOGLE_CLIENT_ID"],
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("src.auth.httpx.AsyncClient", return_value=mock_client):
            result = await verify_google_token("no-name-token")

        assert result is not None
        assert result["name"] == "noname"


class TestIsAllowed:
    """Test is_allowed() - SaaS model always returns True."""

    def test_always_returns_true(self):
        assert is_allowed("anyone@example.com") is True

    def test_returns_true_for_empty_email(self):
        assert is_allowed("") is True

    def test_returns_true_for_any_domain(self):
        assert is_allowed("user@random-domain.org") is True


class TestIsAdmin:
    """Test is_admin() function."""

    def test_returns_true_for_admin_email(self):
        """admin@test.com is set in ADMIN_EMAILS in conftest."""
        with patch("src.auth.config") as mock_config:
            mock_config.admin_emails = ["admin@test.com"]
            assert is_admin("admin@test.com") is True

    def test_returns_true_case_insensitive(self):
        with patch("src.auth.config") as mock_config:
            mock_config.admin_emails = ["Admin@Test.com"]
            assert is_admin("admin@test.com") is True

    def test_returns_true_case_insensitive_input(self):
        with patch("src.auth.config") as mock_config:
            mock_config.admin_emails = ["admin@test.com"]
            assert is_admin("ADMIN@TEST.COM") is True

    def test_returns_false_for_non_admin(self):
        with patch("src.auth.config") as mock_config:
            mock_config.admin_emails = ["admin@test.com"]
            assert is_admin("user@test.com") is False

    def test_returns_false_when_admin_emails_empty(self):
        with patch("src.auth.config") as mock_config:
            mock_config.admin_emails = []
            assert is_admin("admin@test.com") is False
