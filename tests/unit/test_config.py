"""Tests for src/config.py - Config dataclass and validation."""

from __future__ import annotations

import os
from unittest.mock import patch

import pytest

from src.config import Config


class TestConfigDefaults:
    """Test Config dataclass default values."""

    def test_default_max_search_results(self):
        cfg = Config()
        assert cfg.max_search_results == 5

    def test_default_max_competitors(self):
        cfg = Config()
        assert cfg.max_competitors == 10

    def test_default_content_max_tokens(self):
        with patch.dict(os.environ, {"CONTENT_MAX_TOKENS": "8192"}, clear=False):
            cfg = Config()
            assert cfg.content_max_tokens == 8192

    def test_default_llm_provider_from_env(self):
        """LLM_PROVIDER is set to 'openai' in conftest."""
        cfg = Config()
        assert cfg.llm_provider == "openai"


class TestConfigFromEnvVars:
    """Test that Config loads values from environment variables."""

    def test_loads_openai_api_key(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-key-123"}, clear=False):
            cfg = Config()
            assert cfg.openai_api_key == "sk-test-key-123"

    def test_loads_anthropic_api_key(self):
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "ant-key-abc"}, clear=False):
            cfg = Config()
            assert cfg.anthropic_api_key == "ant-key-abc"

    def test_loads_jina_api_key(self):
        with patch.dict(os.environ, {"JINA_API_KEY": "jina-key-xyz"}, clear=False):
            cfg = Config()
            assert cfg.jina_api_key == "jina-key-xyz"

    def test_loads_google_client_id(self):
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "my-gid.apps.googleusercontent.com"}, clear=False):
            cfg = Config()
            assert cfg.google_client_id == "my-gid.apps.googleusercontent.com"

    def test_loads_supabase_url(self):
        with patch.dict(os.environ, {"SUPABASE_URL": "https://proj.supabase.co"}, clear=False):
            cfg = Config()
            assert cfg.supabase_url == "https://proj.supabase.co"

    def test_loads_supabase_key(self):
        with patch.dict(os.environ, {"SUPABASE_KEY": "supa-key"}, clear=False):
            cfg = Config()
            assert cfg.supabase_key == "supa-key"


class TestConfigAllowedEmails:
    """Test allowed_emails and admin_emails parsing."""

    def test_allowed_emails_parses_comma_separated(self):
        with patch.dict(os.environ, {"ALLOWED_EMAILS": "a@b.com, c@d.com, e@f.com"}, clear=False):
            cfg = Config()
            assert cfg.allowed_emails == ["a@b.com", "c@d.com", "e@f.com"]

    def test_allowed_emails_empty_when_not_set(self):
        with patch.dict(os.environ, {"ALLOWED_EMAILS": ""}, clear=False):
            cfg = Config()
            assert cfg.allowed_emails == []

    def test_admin_emails_parses_comma_separated(self):
        with patch.dict(os.environ, {"ADMIN_EMAILS": "admin1@x.com, admin2@y.com"}, clear=False):
            cfg = Config()
            assert cfg.admin_emails == ["admin1@x.com", "admin2@y.com"]

    def test_admin_emails_single_value(self):
        with patch.dict(os.environ, {"ADMIN_EMAILS": "solo@admin.com"}, clear=False):
            cfg = Config()
            assert cfg.admin_emails == ["solo@admin.com"]

    def test_admin_emails_empty_when_not_set(self):
        with patch.dict(os.environ, {"ADMIN_EMAILS": ""}, clear=False):
            cfg = Config()
            assert cfg.admin_emails == []


class TestConfigValidation:
    """Test Config.validate() method."""

    def test_validate_returns_error_when_openai_key_missing(self):
        cfg = Config(llm_provider="openai", openai_api_key="")
        errors = cfg.validate()
        assert len(errors) == 1
        assert "OPENAI_API_KEY" in errors[0]

    def test_validate_returns_error_when_anthropic_key_missing(self):
        cfg = Config(llm_provider="anthropic", anthropic_api_key="")
        errors = cfg.validate()
        assert len(errors) == 1
        assert "ANTHROPIC_API_KEY" in errors[0]

    def test_validate_returns_empty_list_when_openai_config_valid(self):
        cfg = Config(llm_provider="openai", openai_api_key="sk-valid")
        errors = cfg.validate()
        assert errors == []

    def test_validate_returns_empty_list_when_anthropic_config_valid(self):
        cfg = Config(llm_provider="anthropic", anthropic_api_key="ant-valid")
        errors = cfg.validate()
        assert errors == []

    def test_validate_no_error_for_anthropic_when_provider_is_openai(self):
        """Anthropic key missing should not matter when provider is openai."""
        cfg = Config(llm_provider="openai", openai_api_key="sk-key", anthropic_api_key="")
        errors = cfg.validate()
        assert errors == []

    def test_validate_no_error_for_openai_when_provider_is_anthropic(self):
        """OpenAI key missing should not matter when provider is anthropic."""
        cfg = Config(llm_provider="anthropic", anthropic_api_key="ant-key", openai_api_key="")
        errors = cfg.validate()
        assert errors == []
