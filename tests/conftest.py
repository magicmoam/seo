"""Shared fixtures for all tests."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure test env vars are set before any import
os.environ.setdefault("LLM_PROVIDER", "openai")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("JINA_API_KEY", "test-jina-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-supabase-key")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_123")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_123")
os.environ.setdefault("STRIPE_PUBLISHABLE_KEY", "pk_test_123")
os.environ.setdefault("STRIPE_PRO_MONTHLY_PRICE_ID", "price_monthly_123")
os.environ.setdefault("STRIPE_PRO_ANNUAL_PRICE_ID", "price_annual_123")
os.environ.setdefault("ADMIN_EMAILS", "admin@test.com")
os.environ.setdefault("GA4_TOKEN_ENCRYPTION_KEY", "")
os.environ.setdefault("CRON_SECRET", "test-cron-secret")


# ---------------------------------------------------------------------------
# Common user fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def google_user_info():
    """Simulated Google tokeninfo response."""
    return {
        "email": "user@test.com",
        "email_verified": "true",
        "name": "Test User",
        "picture": "https://example.com/photo.jpg",
        "aud": os.environ["GOOGLE_CLIENT_ID"],
    }


@pytest.fixture
def admin_google_user_info():
    """Simulated Google tokeninfo for admin."""
    return {
        "email": "admin@test.com",
        "email_verified": "true",
        "name": "Admin User",
        "picture": "https://example.com/admin.jpg",
        "aud": os.environ["GOOGLE_CLIENT_ID"],
    }


@pytest.fixture
def db_user():
    """Sample user row from DB."""
    return {
        "id": "uuid-123",
        "email": "user@test.com",
        "name": "Test User",
        "picture": "https://example.com/photo.jpg",
        "tier": "free",
        "credits_remaining": 5,
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }


@pytest.fixture
def pro_db_user():
    """Sample pro user row."""
    return {
        "id": "uuid-456",
        "email": "pro@test.com",
        "name": "Pro User",
        "picture": "",
        "tier": "pro",
        "credits_remaining": 200,
        "stripe_customer_id": "cus_test_123",
        "stripe_subscription_id": "sub_test_123",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }


# ---------------------------------------------------------------------------
# Mock Supabase client
# ---------------------------------------------------------------------------

class MockSupabaseResponse:
    """Mimics supabase execute() response."""

    def __init__(self, data=None, count=None):
        self.data = data or []
        self.count = count


class MockSupabaseQuery:
    """Chainable mock for supabase table queries."""

    def __init__(self, data=None, count=None):
        self._data = data
        self._count = count

    def select(self, *args, **kwargs):
        return self

    def insert(self, *args, **kwargs):
        return self

    def update(self, *args, **kwargs):
        return self

    def upsert(self, *args, **kwargs):
        return self

    def delete(self):
        return self

    def eq(self, *args, **kwargs):
        return self

    def gte(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, *args, **kwargs):
        return self

    def execute(self):
        return MockSupabaseResponse(data=self._data, count=self._count)


class MockSupabaseClient:
    """Mock for supabase.create_client()."""

    def __init__(self):
        self._tables: dict[str, MockSupabaseQuery] = {}

    def configure_table(self, name: str, data=None, count=None):
        """Pre-configure what a table query will return."""
        self._tables[name] = MockSupabaseQuery(data=data, count=count)

    def table(self, name: str):
        return self._tables.get(name, MockSupabaseQuery())


@pytest.fixture
def mock_supabase():
    """Provides a MockSupabaseClient and patches _get_client."""
    client = MockSupabaseClient()
    with patch("src.db.client._get_client", return_value=client):
        yield client


# ---------------------------------------------------------------------------
# Auth mocking helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_auth(google_user_info, db_user):
    """Patches verify_google_token and get_or_create_user for a regular user."""
    with (
        patch("src.middleware.verify_google_token", new_callable=AsyncMock, return_value={
            "email": google_user_info["email"],
            "name": google_user_info["name"],
            "picture": google_user_info["picture"],
        }),
        patch("src.middleware.get_or_create_user", new_callable=AsyncMock, return_value=db_user),
    ):
        yield


@pytest.fixture
def mock_admin_auth(admin_google_user_info):
    """Patches auth for admin user."""
    admin_db = {
        "email": "admin@test.com",
        "name": "Admin User",
        "picture": "",
        "tier": "pro",
        "credits_remaining": 200,
    }
    with (
        patch("src.middleware.verify_google_token", new_callable=AsyncMock, return_value={
            "email": admin_google_user_info["email"],
            "name": admin_google_user_info["name"],
            "picture": admin_google_user_info["picture"],
        }),
        patch("src.middleware.get_or_create_user", new_callable=AsyncMock, return_value=admin_db),
    ):
        yield
