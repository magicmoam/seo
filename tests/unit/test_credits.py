"""Tests for src/credits.py - Credit costs and tier limits."""

from __future__ import annotations

import pytest

from src.credits import TIER_CREDITS, TOOL_COSTS, get_tool_cost


class TestToolCosts:
    """Test TOOL_COSTS dictionary."""

    def test_tool_costs_has_11_tools(self):
        assert len(TOOL_COSTS) == 11

    def test_website_analyzer_costs_1(self):
        assert TOOL_COSTS["website_analyzer"] == 1

    def test_keyword_research_costs_1(self):
        assert TOOL_COSTS["keyword_research"] == 1

    def test_serp_analysis_costs_1(self):
        assert TOOL_COSTS["serp_analysis"] == 1

    def test_technical_seo_costs_1(self):
        assert TOOL_COSTS["technical_seo"] == 1

    def test_ga4_analytics_costs_1(self):
        assert TOOL_COSTS["ga4_analytics"] == 1

    def test_competitor_analysis_costs_2(self):
        assert TOOL_COSTS["competitor_analysis"] == 2

    def test_content_gap_costs_2(self):
        assert TOOL_COSTS["content_gap"] == 2

    def test_content_generation_costs_2(self):
        assert TOOL_COSTS["content_generation"] == 2

    def test_topical_authority_costs_2(self):
        assert TOOL_COSTS["topical_authority"] == 2

    def test_backlink_strategy_costs_2(self):
        assert TOOL_COSTS["backlink_strategy"] == 2

    def test_seo_strategy_costs_10(self):
        assert TOOL_COSTS["seo_strategy"] == 10

    def test_all_expected_tools_present(self):
        expected_tools = {
            "website_analyzer",
            "keyword_research",
            "serp_analysis",
            "technical_seo",
            "ga4_analytics",
            "competitor_analysis",
            "content_gap",
            "content_generation",
            "topical_authority",
            "backlink_strategy",
            "seo_strategy",
        }
        assert set(TOOL_COSTS.keys()) == expected_tools


class TestTierCredits:
    """Test TIER_CREDITS dictionary."""

    def test_free_tier_is_5(self):
        assert TIER_CREDITS["free"] == 5

    def test_pro_tier_is_200(self):
        assert TIER_CREDITS["pro"] == 200

    def test_only_two_tiers(self):
        assert len(TIER_CREDITS) == 2


class TestGetToolCost:
    """Test get_tool_cost() function."""

    def test_returns_correct_cost_for_known_tool(self):
        assert get_tool_cost("seo_strategy") == 10

    def test_returns_correct_cost_for_1_credit_tool(self):
        assert get_tool_cost("website_analyzer") == 1

    def test_returns_correct_cost_for_2_credit_tool(self):
        assert get_tool_cost("competitor_analysis") == 2

    def test_returns_1_for_unknown_tool(self):
        assert get_tool_cost("nonexistent_tool") == 1

    def test_returns_1_for_empty_string(self):
        assert get_tool_cost("") == 1
