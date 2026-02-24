"""Tests for src/db.py - Database operations with mock Supabase client."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from src.db import (
    calculate_cost,
    deduct_credits,
    get_evidence,
    get_history,
    get_or_create_user,
    get_score_trends,
    get_user,
    list_all_users,
    reset_credits,
    save_evidence,
    save_search,
)


class TestCalculateCost:
    """Test calculate_cost() for different models."""

    def test_openai_model_cost(self):
        # OpenAI: input $2.5/M, output $10/M
        # 1000 input + 500 output = (1000*2.5 + 500*10) / 1_000_000 = (2500 + 5000) / 1_000_000 = 0.0075
        cost = calculate_cost("gpt-4o", 1000, 500)
        assert cost == 0.0075

    def test_anthropic_model_cost(self):
        # Anthropic: input $3.0/M, output $15.0/M
        # 1000 input + 500 output = (1000*3.0 + 500*15.0) / 1_000_000 = (3000 + 7500) / 1_000_000 = 0.0105
        cost = calculate_cost("claude-sonnet-4-5-20250929", 1000, 500)
        assert cost == 0.0105

    def test_zero_tokens(self):
        cost = calculate_cost("gpt-4o", 0, 0)
        assert cost == 0.0

    def test_model_detection_case_insensitive(self):
        # "claude" in model.lower() -> anthropic
        cost = calculate_cost("Claude-3-Opus", 1_000_000, 0)
        # 1M * $3.0 / 1M = $3.0
        assert cost == 3.0

    def test_unknown_model_defaults_to_openai(self):
        # No "claude" in name -> openai pricing
        cost = calculate_cost("unknown-model", 1_000_000, 0)
        # 1M * $2.5 / 1M = $2.5
        assert cost == 2.5


class TestGetOrCreateUser:
    """Test get_or_create_user() with mock Supabase."""

    async def test_returns_user_dict(self, mock_supabase, db_user):
        mock_supabase.configure_table("users", data=[db_user])
        result = await get_or_create_user("user@test.com", "Test User", "pic.jpg")
        assert result is not None
        assert result["email"] == "user@test.com"

    async def test_returns_none_when_no_client(self):
        with patch("src.db.client._get_client", return_value=None):
            result = await get_or_create_user("user@test.com")
            assert result is None

    async def test_returns_none_when_no_data(self, mock_supabase):
        mock_supabase.configure_table("users", data=[])
        result = await get_or_create_user("new@test.com")
        assert result is None


class TestGetUser:
    """Test get_user()."""

    async def test_returns_user_dict(self, mock_supabase, db_user):
        mock_supabase.configure_table("users", data=[db_user])
        result = await get_user("user@test.com")
        assert result is not None
        assert result["email"] == "user@test.com"
        assert result["tier"] == "free"

    async def test_returns_none_when_not_found(self, mock_supabase):
        mock_supabase.configure_table("users", data=[])
        result = await get_user("nonexistent@test.com")
        assert result is None

    async def test_returns_none_when_no_client(self):
        with patch("src.db.client._get_client", return_value=None):
            result = await get_user("user@test.com")
            assert result is None


class TestDeductCredits:
    """Test deduct_credits()."""

    async def test_succeeds_when_sufficient_credits(self, mock_supabase, db_user):
        # db_user has 5 credits_remaining
        mock_supabase.configure_table("users", data=[db_user])
        mock_supabase.configure_table("credit_transactions", data=[{}])
        result = await deduct_credits("user@test.com", 3, "keyword_research")
        assert result is True

    async def test_fails_when_insufficient_credits(self, mock_supabase, db_user):
        # db_user has 5 credits, try to deduct 10
        mock_supabase.configure_table("users", data=[db_user])
        result = await deduct_credits("user@test.com", 10, "seo_strategy")
        assert result is False

    async def test_returns_false_when_no_db_client(self):
        """When no DB client, deny usage (fail-closed)."""
        with patch("src.db.client._get_client", return_value=None):
            result = await deduct_credits("user@test.com", 5, "tool")
            assert result is False

    async def test_fails_when_user_not_found(self, mock_supabase):
        mock_supabase.configure_table("users", data=[])
        result = await deduct_credits("ghost@test.com", 1, "tool")
        assert result is False

    async def test_exact_credits_succeeds(self, mock_supabase, db_user):
        """Deducting exactly the remaining credits should succeed."""
        mock_supabase.configure_table("users", data=[db_user])
        mock_supabase.configure_table("credit_transactions", data=[{}])
        result = await deduct_credits("user@test.com", 5, "tool")  # 5 == 5
        assert result is True


class TestResetCredits:
    """Test reset_credits()."""

    async def test_reset_succeeds(self, mock_supabase):
        mock_supabase.configure_table("users", data=[{}])
        result = await reset_credits("user@test.com", 200)
        assert result is True

    async def test_returns_false_when_no_client(self):
        with patch("src.db.client._get_client", return_value=None):
            result = await reset_credits("user@test.com", 100)
            assert result is False


class TestListAllUsers:
    """Test list_all_users()."""

    async def test_returns_list(self, mock_supabase, db_user, pro_db_user):
        mock_supabase.configure_table("users", data=[db_user, pro_db_user])
        result = await list_all_users()
        assert isinstance(result, list)
        assert len(result) == 2

    async def test_returns_empty_list_when_no_client(self):
        with patch("src.db.client._get_client", return_value=None):
            result = await list_all_users()
            assert result == []

    async def test_returns_empty_list_when_no_users(self, mock_supabase):
        mock_supabase.configure_table("users", data=[])
        result = await list_all_users()
        assert result == []


class TestGetHistory:
    """Test get_history()."""

    async def test_returns_list(self, mock_supabase):
        history_data = [
            {"id": "1", "query": "test keyword", "tool_used": "keyword_research", "result": {}, "created_at": "2024-01-01T00:00:00Z"},
            {"id": "2", "query": "test url", "tool_used": "website_analyzer", "result": {}, "created_at": "2024-01-02T00:00:00Z"},
        ]
        mock_supabase.configure_table("search_history", data=history_data)
        result = await get_history("user@test.com")
        assert isinstance(result, list)
        assert len(result) == 2

    async def test_returns_empty_list_when_no_client(self):
        with patch("src.db.client._get_client", return_value=None):
            result = await get_history("user@test.com")
            assert result == []


class TestSaveSearch:
    """Test save_search()."""

    async def test_returns_id(self, mock_supabase):
        mock_supabase.configure_table("search_history", data=[{"id": "search-uuid-1"}])
        result = await save_search("user@test.com", "test query", "keyword_research", {"data": "value"})
        assert result == "search-uuid-1"

    async def test_returns_none_when_no_client(self):
        with patch("src.db.client._get_client", return_value=None):
            result = await save_search("user@test.com", "q", "t", {})
            assert result is None

    async def test_returns_none_when_no_data(self, mock_supabase):
        mock_supabase.configure_table("search_history", data=[])
        result = await save_search("user@test.com", "q", "t", {})
        assert result is None


class TestSaveEvidence:
    """Test save_evidence()."""

    async def test_returns_id(self, mock_supabase):
        mock_supabase.configure_table("evidence_traces", data=[{"id": "trace-uuid-1"}])
        trace = {
            "tool_used": "keyword_research",
            "query": "test",
            "jina_raw_responses": [{"url": "http://example.com", "content": "data"}],
            "model": "gpt-4o",
            "total_input_tokens": 100,
            "total_output_tokens": 50,
        }
        result = await save_evidence("user@test.com", "search-1", trace)
        assert result == "trace-uuid-1"

    async def test_returns_none_when_no_client(self):
        with patch("src.db.client._get_client", return_value=None):
            result = await save_evidence("user@test.com", "s1", {})
            assert result is None


class TestGetEvidence:
    """Test get_evidence()."""

    async def test_returns_dict_with_parsed_jina_raw_responses(self, mock_supabase):
        raw_json = json.dumps([{"url": "http://example.com", "content": "data"}])
        mock_supabase.configure_table("evidence_traces", data=[{
            "id": "trace-1",
            "search_id": "search-1",
            "user_email": "user@test.com",
            "jina_raw_responses": raw_json,
        }])
        result = await get_evidence("search-1", "user@test.com")
        assert result is not None
        assert isinstance(result["jina_raw_responses"], list)
        assert result["jina_raw_responses"][0]["url"] == "http://example.com"

    async def test_returns_none_when_not_found(self, mock_supabase):
        mock_supabase.configure_table("evidence_traces", data=[])
        result = await get_evidence("nonexistent", "user@test.com")
        assert result is None

    async def test_handles_non_json_jina_raw_responses(self, mock_supabase):
        """If jina_raw_responses is an invalid JSON string, it stays as-is."""
        mock_supabase.configure_table("evidence_traces", data=[{
            "id": "trace-1",
            "jina_raw_responses": "not-valid-json",
        }])
        result = await get_evidence("s1", "user@test.com")
        assert result is not None
        assert result["jina_raw_responses"] == "not-valid-json"

    async def test_handles_already_parsed_jina_raw_responses(self, mock_supabase):
        """If jina_raw_responses is already a list, it stays as-is."""
        mock_supabase.configure_table("evidence_traces", data=[{
            "id": "trace-1",
            "jina_raw_responses": [{"url": "http://example.com"}],
        }])
        result = await get_evidence("s1", "user@test.com")
        assert result is not None
        assert isinstance(result["jina_raw_responses"], list)


class TestGetScoreTrends:
    """Test get_score_trends()."""

    async def test_returns_stable_when_no_snapshots(self, mock_supabase):
        mock_supabase.configure_table("audit_snapshots", data=[])
        result = await get_score_trends("user@test.com", "https://example.com")
        assert result["trend_direction"] == "stable"
        assert result["score_change"] == 0
        assert result["snapshots"] == []

    async def test_computes_direction_up(self, mock_supabase):
        snapshots = [
            {"overall_score": 70, "created_at": "2024-01-02T00:00:00Z"},
            {"overall_score": 50, "created_at": "2024-01-01T00:00:00Z"},
        ]
        # get_audit_snapshots returns desc order: [70, 50]
        # reversed to chronological: [50, 70]
        # change = 70 - 50 = 20 > 2 -> "up"
        mock_supabase.configure_table("audit_snapshots", data=snapshots)
        result = await get_score_trends("user@test.com", "https://example.com")
        assert result["trend_direction"] == "up"
        assert result["score_change"] == 20

    async def test_computes_direction_down(self, mock_supabase):
        snapshots = [
            {"overall_score": 40, "created_at": "2024-01-02T00:00:00Z"},
            {"overall_score": 80, "created_at": "2024-01-01T00:00:00Z"},
        ]
        # reversed: [80, 40], change = 40 - 80 = -40 < -2 -> "down"
        mock_supabase.configure_table("audit_snapshots", data=snapshots)
        result = await get_score_trends("user@test.com", "https://example.com")
        assert result["trend_direction"] == "down"
        assert result["score_change"] == -40

    async def test_computes_direction_stable(self, mock_supabase):
        snapshots = [
            {"overall_score": 71, "created_at": "2024-01-02T00:00:00Z"},
            {"overall_score": 70, "created_at": "2024-01-01T00:00:00Z"},
        ]
        # reversed: [70, 71], change = 71 - 70 = 1 -> stable (not > 2)
        mock_supabase.configure_table("audit_snapshots", data=snapshots)
        result = await get_score_trends("user@test.com", "https://example.com")
        assert result["trend_direction"] == "stable"
        assert result["score_change"] == 1

    async def test_single_snapshot(self, mock_supabase):
        snapshots = [
            {"overall_score": 65, "created_at": "2024-01-01T00:00:00Z"},
        ]
        # single snapshot: change = 65 - 65 = 0 -> stable
        mock_supabase.configure_table("audit_snapshots", data=snapshots)
        result = await get_score_trends("user@test.com", "https://example.com")
        assert result["trend_direction"] == "stable"
        assert result["score_change"] == 0
