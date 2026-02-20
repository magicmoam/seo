"""Tests for src/scoring_rubric.py - Scoring rubric, weights, and computation."""

from __future__ import annotations

import pytest

from src.scoring_rubric import (
    CATEGORY_WEIGHTS,
    RUBRIC,
    Criterion,
    compute_category_score,
    compute_overall_score,
    format_rubric_for_prompt,
    get_criterion_by_id,
    rubric_by_category,
)


class TestRubricStructure:
    """Test the RUBRIC list and CATEGORY_WEIGHTS."""

    def test_rubric_has_31_criteria(self):
        assert len(RUBRIC) == 31

    def test_category_weights_sum_to_1(self):
        total = sum(CATEGORY_WEIGHTS.values())
        assert abs(total - 1.0) < 1e-9

    def test_category_weights_has_4_categories(self):
        assert len(CATEGORY_WEIGHTS) == 4

    def test_all_4_categories_present(self):
        expected = {"performance", "seo", "content", "technical"}
        assert set(CATEGORY_WEIGHTS.keys()) == expected

    def test_all_criteria_have_valid_category(self):
        valid_categories = set(CATEGORY_WEIGHTS.keys())
        for c in RUBRIC:
            assert c.category in valid_categories, f"Criterion {c.id} has invalid category: {c.category}"

    def test_all_criteria_have_valid_eval_type(self):
        for c in RUBRIC:
            assert c.eval_type in ("pass_fail", "scored"), f"Criterion {c.id} has invalid eval_type: {c.eval_type}"

    def test_each_criterion_has_non_empty_fields(self):
        for c in RUBRIC:
            assert c.id, f"Criterion missing id"
            assert c.name, f"Criterion {c.id} missing name"
            assert c.description, f"Criterion {c.id} missing description"
            assert c.threshold_guidance, f"Criterion {c.id} missing threshold_guidance"

    def test_criterion_ids_are_unique(self):
        ids = [c.id for c in RUBRIC]
        assert len(ids) == len(set(ids)), "Duplicate criterion IDs found"

    def test_all_4_categories_have_criteria(self):
        groups = rubric_by_category()
        for cat in CATEGORY_WEIGHTS:
            assert cat in groups, f"No criteria for category: {cat}"
            assert len(groups[cat]) > 0, f"Empty criteria list for category: {cat}"


class TestCriterionWeightsPerCategory:
    """Test that criterion weights sum to approximately 1.0 per category."""

    def test_performance_weights_sum_to_1(self):
        groups = rubric_by_category()
        total = sum(c.weight for c in groups["performance"])
        assert abs(total - 1.0) < 0.01, f"performance weights sum to {total}"

    def test_seo_weights_sum_to_1(self):
        groups = rubric_by_category()
        total = sum(c.weight for c in groups["seo"])
        assert abs(total - 1.0) < 0.01, f"seo weights sum to {total}"

    def test_content_weights_sum_to_1(self):
        groups = rubric_by_category()
        total = sum(c.weight for c in groups["content"])
        assert abs(total - 1.0) < 0.01, f"content weights sum to {total}"

    def test_technical_weights_sum_to_1(self):
        groups = rubric_by_category()
        total = sum(c.weight for c in groups["technical"])
        assert abs(total - 1.0) < 0.01, f"technical weights sum to {total}"


class TestComputeCategoryScore:
    """Test compute_category_score() function."""

    def test_returns_correct_weighted_average(self):
        c1 = Criterion(
            id="t1", name="Test1", category="test", eval_type="scored",
            weight=0.6, description="d", threshold_guidance="g",
        )
        c2 = Criterion(
            id="t2", name="Test2", category="test", eval_type="scored",
            weight=0.4, description="d", threshold_guidance="g",
        )
        # (0.6 * 80 + 0.4 * 60) / (0.6 + 0.4) = (48 + 24) / 1.0 = 72
        result = compute_category_score([(c1, 80), (c2, 60)])
        assert result == 72

    def test_returns_0_for_empty_input(self):
        assert compute_category_score([]) == 0

    def test_single_criterion(self):
        c = Criterion(
            id="t1", name="Test", category="test", eval_type="scored",
            weight=1.0, description="d", threshold_guidance="g",
        )
        assert compute_category_score([(c, 85)]) == 85

    def test_all_zeros(self):
        c1 = Criterion(
            id="t1", name="Test1", category="test", eval_type="scored",
            weight=0.5, description="d", threshold_guidance="g",
        )
        c2 = Criterion(
            id="t2", name="Test2", category="test", eval_type="scored",
            weight=0.5, description="d", threshold_guidance="g",
        )
        assert compute_category_score([(c1, 0), (c2, 0)]) == 0

    def test_all_perfect_scores(self):
        c1 = Criterion(
            id="t1", name="Test1", category="test", eval_type="scored",
            weight=0.3, description="d", threshold_guidance="g",
        )
        c2 = Criterion(
            id="t2", name="Test2", category="test", eval_type="scored",
            weight=0.7, description="d", threshold_guidance="g",
        )
        assert compute_category_score([(c1, 100), (c2, 100)]) == 100


class TestComputeOverallScore:
    """Test compute_overall_score() function."""

    def test_returns_correct_weighted_sum(self):
        category_scores = {
            "performance": 80,
            "seo": 60,
            "content": 70,
            "technical": 90,
        }
        # 0.25*80 + 0.25*60 + 0.25*70 + 0.25*90 = 20+15+17.5+22.5 = 75
        assert compute_overall_score(category_scores) == 75

    def test_returns_0_for_all_zero_categories(self):
        category_scores = {
            "performance": 0,
            "seo": 0,
            "content": 0,
            "technical": 0,
        }
        assert compute_overall_score(category_scores) == 0

    def test_returns_100_for_all_perfect(self):
        category_scores = {
            "performance": 100,
            "seo": 100,
            "content": 100,
            "technical": 100,
        }
        assert compute_overall_score(category_scores) == 100

    def test_handles_missing_categories(self):
        """Missing categories default to 0."""
        category_scores = {"performance": 100}
        # 0.25*100 + 0.25*0 + 0.25*0 + 0.25*0 = 25
        assert compute_overall_score(category_scores) == 25

    def test_handles_empty_dict(self):
        assert compute_overall_score({}) == 0


class TestRubricByCategory:
    """Test rubric_by_category() helper."""

    def test_groups_correctly(self):
        groups = rubric_by_category()
        assert set(groups.keys()) == {"performance", "seo", "content", "technical"}

    def test_total_criteria_across_groups(self):
        groups = rubric_by_category()
        total = sum(len(v) for v in groups.values())
        assert total == 31

    def test_performance_has_6_criteria(self):
        groups = rubric_by_category()
        assert len(groups["performance"]) == 6

    def test_seo_has_10_criteria(self):
        groups = rubric_by_category()
        assert len(groups["seo"]) == 10

    def test_content_has_7_criteria(self):
        groups = rubric_by_category()
        assert len(groups["content"]) == 7

    def test_technical_has_8_criteria(self):
        groups = rubric_by_category()
        assert len(groups["technical"]) == 8


class TestFormatRubricForPrompt:
    """Test format_rubric_for_prompt()."""

    def test_returns_non_empty_string(self):
        result = format_rubric_for_prompt()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_contains_rubric_markers(self):
        result = format_rubric_for_prompt()
        assert "=== SCORING RUBRIC ===" in result
        assert "=== END RUBRIC ===" in result

    def test_contains_all_categories(self):
        result = format_rubric_for_prompt()
        assert "PERFORMANCE" in result
        assert "SEO" in result
        assert "CONTENT" in result
        assert "TECHNICAL" in result

    def test_contains_criterion_ids(self):
        result = format_rubric_for_prompt()
        assert "perf_render_blocking" in result
        assert "seo_title" in result
        assert "content_word_count" in result
        assert "tech_https" in result


class TestGetCriterionById:
    """Test get_criterion_by_id()."""

    def test_finds_existing_criterion(self):
        c = get_criterion_by_id("seo_title")
        assert c is not None
        assert c.name == "Title Tag"
        assert c.category == "seo"

    def test_finds_performance_criterion(self):
        c = get_criterion_by_id("perf_render_blocking")
        assert c is not None
        assert c.category == "performance"

    def test_returns_none_for_unknown_id(self):
        c = get_criterion_by_id("nonexistent_criterion")
        assert c is None

    def test_returns_none_for_empty_string(self):
        c = get_criterion_by_id("")
        assert c is None
