"""Integration tests for api/stripe_billing.py — Stripe billing endpoints."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.stripe_billing import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

AUTH_HEADER = {"Authorization": "Bearer test-token"}

MOCK_USER = {
    "email": "user@test.com",
    "name": "Test User",
    "picture": "https://example.com/photo.jpg",
    "tier": "free",
    "credits_remaining": 5,
    "is_admin": False,
}

MOCK_DB_USER = {
    "email": "user@test.com",
    "name": "Test User",
    "tier": "free",
    "credits_remaining": 5,
    "stripe_customer_id": None,
    "stripe_subscription_id": None,
}

MOCK_PRO_DB_USER = {
    "email": "pro@test.com",
    "name": "Pro User",
    "tier": "pro",
    "credits_remaining": 200,
    "stripe_customer_id": "cus_test_123",
    "stripe_subscription_id": "sub_test_123",
}


def _mock_authenticate_success(user=None):
    """Return a patch context for successful authentication."""
    u = user or MOCK_USER
    return patch(
        "api.stripe_billing._authenticate",
        new_callable=AsyncMock,
        return_value=u,
    )


def _mock_authenticate_failure():
    """Return a patch context for failed authentication (401)."""
    from fastapi.responses import JSONResponse

    return patch(
        "api.stripe_billing._authenticate",
        new_callable=AsyncMock,
        return_value=JSONResponse({"error": "Missing authorization token"}, status_code=401),
    )


# ---------------------------------------------------------------------------
# POST /api/stripe/checkout
# ---------------------------------------------------------------------------


class TestStripeCheckout:
    """Tests for POST /api/stripe/checkout."""

    async def test_returns_401_without_auth(self):
        with _mock_authenticate_failure():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post("/api/stripe/checkout")

        assert resp.status_code == 401

    async def test_returns_checkout_url_on_success(self):
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/test_session"

        with (
            _mock_authenticate_success(),
            patch("src.db.get_or_create_user", new_callable=AsyncMock, return_value=MOCK_PRO_DB_USER),
            patch("stripe.checkout.Session.create", return_value=mock_session),
            patch("stripe.Customer.create") as mock_customer_create,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/checkout",
                    json={"price_id": "price_monthly_123"},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["url"] == "https://checkout.stripe.com/test_session"
        # Should NOT have created a new customer since PRO user has stripe_customer_id
        mock_customer_create.assert_not_called()

    async def test_creates_stripe_customer_when_none_exists(self):
        mock_customer = MagicMock()
        mock_customer.id = "cus_new_123"

        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/new_session"

        with (
            _mock_authenticate_success(),
            patch("src.db.get_or_create_user", new_callable=AsyncMock, return_value=MOCK_DB_USER),
            patch("stripe.Customer.create", return_value=mock_customer) as mock_cust_create,
            patch("src.db.update_user_tier", new_callable=AsyncMock) as mock_update_tier,
            patch("stripe.checkout.Session.create", return_value=mock_session),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/checkout",
                    json={"price_id": "price_monthly_123"},
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 200
        mock_cust_create.assert_called_once()
        call_kwargs = mock_cust_create.call_args
        assert call_kwargs.kwargs["email"] == "user@test.com"
        # Verify the customer ID was saved
        mock_update_tier.assert_called_once_with("user@test.com", "free", stripe_customer_id="cus_new_123")


# ---------------------------------------------------------------------------
# POST /api/stripe/webhook
# ---------------------------------------------------------------------------


class TestStripeWebhook:
    """Tests for POST /api/stripe/webhook."""

    async def test_handles_checkout_session_completed(self):
        event = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "customer": "cus_test_123",
                    "subscription": "sub_test_456",
                    "metadata": {"user_email": "user@test.com"},
                    "customer_email": "user@test.com",
                }
            },
        }

        with (
            patch("stripe.Webhook.construct_event", return_value=event),
            patch("src.db.update_user_tier", new_callable=AsyncMock) as mock_update,
            patch("src.db.reset_credits", new_callable=AsyncMock) as mock_reset,
            patch("src.db.get_user_by_stripe_customer", new_callable=AsyncMock),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/webhook",
                    content=b'{"type":"checkout.session.completed"}',
                    headers={"stripe-signature": "test_sig"},
                )

        assert resp.status_code == 200
        assert resp.json()["received"] is True
        mock_update.assert_called_once_with("user@test.com", "pro", "cus_test_123", "sub_test_456")
        mock_reset.assert_called_once_with("user@test.com", 200)

    async def test_handles_invoice_paid(self):
        event = {
            "type": "invoice.paid",
            "data": {
                "object": {
                    "customer": "cus_test_123",
                }
            },
        }
        db_user = {"email": "user@test.com"}

        with (
            patch("stripe.Webhook.construct_event", return_value=event),
            patch(
                "src.db.get_user_by_stripe_customer",
                new_callable=AsyncMock,
                return_value=db_user,
            ),
            patch("src.db.reset_credits", new_callable=AsyncMock) as mock_reset,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/webhook",
                    content=b'{"type":"invoice.paid"}',
                    headers={"stripe-signature": "test_sig"},
                )

        assert resp.status_code == 200
        mock_reset.assert_called_once_with("user@test.com", 200)

    async def test_handles_customer_subscription_deleted(self):
        event = {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "customer": "cus_test_123",
                }
            },
        }
        db_user = {"email": "user@test.com"}

        with (
            patch("stripe.Webhook.construct_event", return_value=event),
            patch(
                "src.db.get_user_by_stripe_customer",
                new_callable=AsyncMock,
                return_value=db_user,
            ),
            patch("src.db.update_user_tier", new_callable=AsyncMock) as mock_update,
            patch("src.db.reset_credits", new_callable=AsyncMock) as mock_reset,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/webhook",
                    content=b'{"type":"customer.subscription.deleted"}',
                    headers={"stripe-signature": "test_sig"},
                )

        assert resp.status_code == 200
        mock_update.assert_called_once_with("user@test.com", "free")
        mock_reset.assert_called_once_with("user@test.com", 5)

    async def test_returns_400_on_invalid_signature(self):
        import stripe

        with patch(
            "stripe.Webhook.construct_event",
            side_effect=stripe.error.SignatureVerificationError("bad sig", "sig_header"),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/webhook",
                    content=b'{"type":"test"}',
                    headers={"stripe-signature": "bad_sig"},
                )

        assert resp.status_code == 400
        assert "Invalid signature" in resp.json()["error"]

    async def test_returns_400_on_invalid_payload(self):
        with patch(
            "stripe.Webhook.construct_event",
            side_effect=ValueError("Invalid payload"),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/webhook",
                    content=b"not valid",
                    headers={"stripe-signature": "test_sig"},
                )

        assert resp.status_code == 400
        assert "Invalid payload" in resp.json()["error"]


# ---------------------------------------------------------------------------
# POST /api/stripe/portal
# ---------------------------------------------------------------------------


class TestStripePortal:
    """Tests for POST /api/stripe/portal."""

    async def test_returns_401_without_auth(self):
        with _mock_authenticate_failure():
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post("/api/stripe/portal")

        assert resp.status_code == 401

    async def test_returns_404_when_no_stripe_customer_id(self):
        with (
            _mock_authenticate_success(),
            patch(
                "src.db.get_user",
                new_callable=AsyncMock,
                return_value=MOCK_DB_USER,  # stripe_customer_id is None
            ),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/portal",
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 404
        assert "No active subscription" in resp.json()["error"]

    async def test_returns_portal_url_for_subscribed_user(self):
        mock_session = MagicMock()
        mock_session.url = "https://billing.stripe.com/portal_session"

        with (
            _mock_authenticate_success(
                {**MOCK_USER, "email": "pro@test.com"}
            ),
            patch(
                "src.db.get_user",
                new_callable=AsyncMock,
                return_value=MOCK_PRO_DB_USER,
            ),
            patch("stripe.billing_portal.Session.create", return_value=mock_session),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/stripe/portal",
                    headers=AUTH_HEADER,
                )

        assert resp.status_code == 200
        assert resp.json()["url"] == "https://billing.stripe.com/portal_session"
