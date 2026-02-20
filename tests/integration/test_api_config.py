"""Integration tests for api/config.py — GET /api/config."""

from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient

from api.config import app


@pytest.fixture(autouse=True)
def _env_vars():
    """Ensure test env vars are available for config."""
    # These are already set in conftest.py via os.environ.setdefault
    yield


class TestGetConfig:
    """Tests for GET /api/config."""

    async def test_returns_200(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/config")

        assert resp.status_code == 200

    async def test_response_contains_google_client_id(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/config")

        data = resp.json()
        assert "google_client_id" in data
        assert data["google_client_id"] == os.environ["GOOGLE_CLIENT_ID"]

    async def test_response_contains_ga4_oauth_enabled(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/config")

        data = resp.json()
        assert "ga4_oauth_enabled" in data
        assert isinstance(data["ga4_oauth_enabled"], bool)

    async def test_response_contains_stripe_keys(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/config")

        data = resp.json()
        assert "stripe_publishable_key" in data
        assert "stripe_pro_monthly_price_id" in data
        assert "stripe_pro_annual_price_id" in data

    async def test_stripe_values_match_config(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/config")

        data = resp.json()
        assert data["stripe_publishable_key"] == os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
        assert data["stripe_pro_monthly_price_id"] == os.environ.get("STRIPE_PRO_MONTHLY_PRICE_ID", "")
        assert data["stripe_pro_annual_price_id"] == os.environ.get("STRIPE_PRO_ANNUAL_PRICE_ID", "")

    async def test_all_expected_keys_present(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/config")

        data = resp.json()
        expected_keys = {
            "google_client_id",
            "ga4_oauth_enabled",
            "stripe_publishable_key",
            "stripe_pro_monthly_price_id",
            "stripe_pro_annual_price_id",
        }
        assert set(data.keys()) == expected_keys
