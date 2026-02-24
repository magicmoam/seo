"""Integration tests for api/free_audit.py — POST /api/free-audit."""

from __future__ import annotations

import hashlib
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.free_audit import RATE_LIMIT_MAX, _check_rate_limit, _rate_limit, _redact_analysis, app
from src.models import (
    CategoryBreakdown,
    CriterionResult,
    EvidenceTrace,
    PathTo80,
    PathTo80Step,
    ScoringRubricResult,
    SEOIssue,
    WebsiteAnalysisResult,
)


def _make_mock_analysis() -> WebsiteAnalysisResult:
    """Build a realistic WebsiteAnalysisResult for mocking."""
    return WebsiteAnalysisResult(
        url="https://example.com",
        page_title="Example Domain",
        meta_description="This is an example meta description.",
        overall_score=62,
        performance_score="fair",
        seo_score="good",
        content_score="fair",
        technical_score="poor",
        word_count=1500,
        internal_links=12,
        external_links=5,
        heading_structure=["H1: Example", "H2: Section One"],
        issues=[
            SEOIssue(
                issue="Missing alt text",
                severity="critical",
                description="Images lack alt text",
                recommendation="Add descriptive alt text",
            ),
            SEOIssue(
                issue="Slow page speed",
                severity="warning",
                description="Page loads in 4s",
                recommendation="Optimize images",
            ),
            SEOIssue(
                issue="No schema markup",
                severity="info",
                description="No structured data found",
                recommendation="Add JSON-LD schema",
            ),
        ],
        schema_markup=[],
        summary="A" * 200,  # 200-char summary for testing truncation
        rubric=ScoringRubricResult(
            categories=[
                CategoryBreakdown(
                    category="performance",
                    score=55,
                    weight=0.25,
                    criteria=[
                        CriterionResult(
                            criterion_id="perf_1",
                            criterion_name="Page Load Speed",
                            category="performance",
                            score=40,
                            passed=False,
                            finding="Slow load",
                            recommendation="Optimize images and JS",
                        ),
                    ],
                    passed_count=0,
                    total_count=1,
                ),
            ],
            overall_score=62,
        ),
        path_to_80=PathTo80(
            current_score=62,
            target_score=80,
            steps=[
                PathTo80Step(
                    action="Fix critical images",
                    category="performance",
                    estimated_points=10,
                    effort="quick_win",
                    explanation="Optimize and add alt text",
                ),
                PathTo80Step(
                    action="Add schema markup",
                    category="technical",
                    estimated_points=5,
                    effort="moderate",
                    explanation="Add JSON-LD structured data",
                ),
            ],
            projected_score=77,
            quick_wins_summary="Focus on images and schema",
        ),
    )


def _make_mock_evidence_trace() -> EvidenceTrace:
    return EvidenceTrace(
        jina_raw_responses=[{"data": "raw"}],
        system_prompt="test prompt",
        user_prompt="test user prompt",
        llm_raw_response="{}",
        tool_used="website_analyzer",
        query="https://example.com",
    )


@pytest.fixture(autouse=True)
def _clear_rate_limit():
    """Clear the in-memory rate limit dict before each test."""
    _rate_limit.clear()
    yield
    _rate_limit.clear()


class TestFreeAuditValidation:
    """Tests for input validation on POST /api/free-audit."""

    async def test_returns_400_when_no_url_provided(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post("/api/free-audit", json={"url": ""})

        assert resp.status_code == 400
        assert "URL is required" in resp.json()["error"]

    async def test_returns_400_when_url_key_missing(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post("/api/free-audit", json={})

        assert resp.status_code == 400
        assert "URL is required" in resp.json()["error"]

    async def test_returns_400_when_invalid_json(self):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/free-audit",
                content=b"not json",
                headers={"Content-Type": "application/json"},
            )

        assert resp.status_code == 400
        assert "Invalid JSON" in resp.json()["error"]


class TestFreeAuditURLNormalization:
    """Tests for URL normalization."""

    async def test_prepends_https_when_missing(self):
        mock_result = _make_mock_analysis()
        mock_trace = _make_mock_evidence_trace()
        mock_usage = {"input_tokens": 100, "output_tokens": 200}

        with patch(
            "src.tools.website_analyzer.run",
            new_callable=AsyncMock,
            return_value=(mock_result, mock_usage, mock_trace),
        ) as mock_run:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post("/api/free-audit", json={"url": "example.com"})

            assert resp.status_code == 200
            # Verify run was called with https:// prepended
            mock_run.assert_called_once_with("https://example.com")


class TestFreeAuditSuccess:
    """Tests for successful audit execution."""

    async def test_returns_redacted_analysis_on_success(self):
        mock_result = _make_mock_analysis()
        mock_trace = _make_mock_evidence_trace()
        mock_usage = {"input_tokens": 100, "output_tokens": 200}

        with patch(
            "src.tools.website_analyzer.run",
            new_callable=AsyncMock,
            return_value=(mock_result, mock_usage, mock_trace),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/free-audit", json={"url": "https://example.com"}
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["_redacted"] is True
        assert data["url"] == "https://example.com"
        assert data["overall_score"] == 62

    async def test_redacted_response_has_scores(self):
        mock_result = _make_mock_analysis()
        mock_trace = _make_mock_evidence_trace()
        mock_usage = {"input_tokens": 100, "output_tokens": 200}

        with patch(
            "src.tools.website_analyzer.run",
            new_callable=AsyncMock,
            return_value=(mock_result, mock_usage, mock_trace),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/free-audit", json={"url": "https://example.com"}
                )

        data = resp.json()
        assert data["performance_score"] == "fair"
        assert data["seo_score"] == "good"
        assert data["content_score"] == "fair"
        assert data["technical_score"] == "poor"

    async def test_redacted_response_has_summary_teaser(self):
        mock_result = _make_mock_analysis()
        mock_trace = _make_mock_evidence_trace()
        mock_usage = {"input_tokens": 100, "output_tokens": 200}

        with patch(
            "src.tools.website_analyzer.run",
            new_callable=AsyncMock,
            return_value=(mock_result, mock_usage, mock_trace),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/free-audit", json={"url": "https://example.com"}
                )

        data = resp.json()
        assert "summary_teaser" in data
        # Summary is 200 chars, so teaser is truncated to 120 + "..."
        assert len(data["summary_teaser"]) == 123  # 120 chars + "..."
        assert data["summary_teaser"].endswith("...")

    async def test_redacted_response_has_issues_summary(self):
        mock_result = _make_mock_analysis()
        mock_trace = _make_mock_evidence_trace()
        mock_usage = {"input_tokens": 100, "output_tokens": 200}

        with patch(
            "src.tools.website_analyzer.run",
            new_callable=AsyncMock,
            return_value=(mock_result, mock_usage, mock_trace),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/free-audit", json={"url": "https://example.com"}
                )

        data = resp.json()
        assert "issues_summary" in data
        assert data["issues_summary"]["critical"] == 1
        assert data["issues_summary"]["warning"] == 1
        assert data["issues_summary"]["info"] == 1

    async def test_returns_500_when_analyzer_raises(self):
        with patch(
            "src.tools.website_analyzer.run",
            new_callable=AsyncMock,
            side_effect=RuntimeError("Jina API down"),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/free-audit", json={"url": "https://example.com"}
                )

        assert resp.status_code == 500
        assert resp.json()["error"] == "An internal error occurred"


class TestRateLimiting:
    """Tests for rate limiting on the free audit endpoint."""

    async def test_first_three_requests_allowed(self):
        mock_result = _make_mock_analysis()
        mock_trace = _make_mock_evidence_trace()
        mock_usage = {"input_tokens": 100, "output_tokens": 200}

        with patch(
            "src.tools.website_analyzer.run",
            new_callable=AsyncMock,
            return_value=(mock_result, mock_usage, mock_trace),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                for i in range(RATE_LIMIT_MAX):
                    resp = await client.post(
                        "/api/free-audit", json={"url": "https://example.com"}
                    )
                    assert resp.status_code == 200, f"Request {i+1} should succeed"

    async def test_fourth_request_returns_429(self):
        mock_result = _make_mock_analysis()
        mock_trace = _make_mock_evidence_trace()
        mock_usage = {"input_tokens": 100, "output_tokens": 200}

        with patch(
            "src.tools.website_analyzer.run",
            new_callable=AsyncMock,
            return_value=(mock_result, mock_usage, mock_trace),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                # Exhaust rate limit
                for _ in range(RATE_LIMIT_MAX):
                    await client.post(
                        "/api/free-audit", json={"url": "https://example.com"}
                    )

                # 4th request should be rate limited
                resp = await client.post(
                    "/api/free-audit", json={"url": "https://example.com"}
                )

        assert resp.status_code == 429
        assert "Rate limit exceeded" in resp.json()["error"]


class TestCheckRateLimit:
    """Direct unit tests for the _check_rate_limit function."""

    def test_allows_first_request(self):
        assert _check_rate_limit("192.168.1.1") is True

    def test_allows_up_to_max_requests(self):
        for _ in range(RATE_LIMIT_MAX):
            assert _check_rate_limit("10.0.0.1") is True

    def test_blocks_after_max_requests(self):
        for _ in range(RATE_LIMIT_MAX):
            _check_rate_limit("10.0.0.2")
        assert _check_rate_limit("10.0.0.2") is False

    def test_uses_hashed_ip(self):
        ip = "203.0.113.50"
        hashed = hashlib.sha256(ip.encode()).hexdigest()[:16]
        _check_rate_limit(ip)
        # The rate_limit dict should use hashed IP, not raw IP
        assert ip not in _rate_limit
        assert hashed in _rate_limit

    def test_different_ips_have_separate_limits(self):
        for _ in range(RATE_LIMIT_MAX):
            _check_rate_limit("10.0.0.10")
        # IP 10.0.0.10 is now rate limited
        assert _check_rate_limit("10.0.0.10") is False
        # But a different IP should be allowed
        assert _check_rate_limit("10.0.0.11") is True


class TestRedactAnalysis:
    """Direct unit tests for the _redact_analysis function."""

    def test_sets_redacted_flag(self):
        result = _redact_analysis({"url": "https://example.com"})
        assert result["_redacted"] is True

    def test_preserves_url_and_scores(self):
        input_data = {
            "url": "https://example.com",
            "page_title": "Test",
            "meta_description": "Test desc",
            "overall_score": 75,
            "performance_score": "good",
            "seo_score": "fair",
            "content_score": "good",
            "technical_score": "fair",
            "word_count": 2000,
            "internal_links": 10,
            "external_links": 3,
        }
        result = _redact_analysis(input_data)
        assert result["url"] == "https://example.com"
        assert result["overall_score"] == 75
        assert result["performance_score"] == "good"
        assert result["word_count"] == 2000

    def test_truncates_summary_to_120_chars(self):
        long_summary = "X" * 300
        result = _redact_analysis({"summary": long_summary})
        assert result["summary_teaser"] == "X" * 120 + "..."

    def test_short_summary_not_truncated(self):
        short_summary = "Short summary"
        result = _redact_analysis({"summary": short_summary})
        assert result["summary_teaser"] == "Short summary"

    def test_issues_summary_counts_severities(self):
        issues = [
            {"severity": "critical"},
            {"severity": "critical"},
            {"severity": "warning"},
            {"severity": "info"},
            {"severity": "info"},
            {"severity": "info"},
        ]
        result = _redact_analysis({"issues": issues})
        assert result["issues_summary"]["critical"] == 2
        assert result["issues_summary"]["warning"] == 1
        assert result["issues_summary"]["info"] == 3

    def test_rubric_strips_findings_and_recommendations(self):
        rubric = {
            "categories": [
                {
                    "category": "performance",
                    "score": 60,
                    "passed_count": 3,
                    "total_count": 5,
                    "criteria": [
                        {
                            "criterion_name": "Page Speed",
                            "passed": True,
                            "score": 80,
                            "finding": "Should be redacted",
                            "recommendation": "Should be redacted",
                        },
                    ],
                }
            ]
        }
        result = _redact_analysis({"rubric": rubric})
        criterion = result["rubric"]["categories"][0]["criteria"][0]
        assert "criterion_name" in criterion
        assert "passed" in criterion
        assert "score" in criterion
        # findings and recommendations should NOT be in redacted output
        assert "finding" not in criterion
        assert "recommendation" not in criterion

    def test_path_to_80_redaction(self):
        path = {
            "current_score": 55,
            "projected_score": 82,
            "steps": [
                {"action": "Fix images", "explanation": "Details here"},
                {"action": "Add schema", "explanation": "More details"},
            ],
        }
        result = _redact_analysis({"path_to_80": path})
        p = result["path_to_80"]
        assert p["current_score"] == 55
        assert p["projected_score"] == 82
        assert p["step_count"] == 2
        assert p["first_step_action"] == "Fix images"
        # Full step details should not be present
        assert "steps" not in p

    def test_handles_missing_optional_fields(self):
        result = _redact_analysis({})
        assert result["_redacted"] is True
        assert result["url"] == ""
        assert result["overall_score"] == 0
        assert result["summary_teaser"] == ""
        assert result["issues_summary"] == {"critical": 0, "warning": 0, "info": 0}
        assert "rubric" not in result
        assert "path_to_80" not in result
