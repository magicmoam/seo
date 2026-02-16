"""Website analyzer tool: scrapes a URL and performs a comprehensive SEO audit with structured rubric scoring."""

from __future__ import annotations

import json

from src.models import (
    CategoryBreakdown,
    CriterionResult,
    EvidenceTrace,
    PathTo80,
    PathTo80Step,
    SEOIssue,
    ScoringRubricResult,
    WebsiteAnalysisResult,
)
from src.prompts.templates import WEBSITE_ANALYZER_SYSTEM, WEBSITE_ANALYZER_USER
from src.scoring_rubric import (
    CATEGORY_WEIGHTS,
    RUBRIC,
    RUBRIC_VERSION,
    compute_category_score,
    compute_overall_score,
    format_rubric_for_prompt,
    get_criterion_by_id,
    rubric_by_category,
)
from src.tools import jina, llm


def _score_to_label(score: int) -> str:
    """Convert a numeric score to a dimension label."""
    if score >= 80:
        return "excellent"
    if score >= 60:
        return "good"
    if score >= 40:
        return "fair"
    return "poor"


def _build_rubric_result(
    criteria_evaluations: list[dict],
) -> ScoringRubricResult:
    """Build ScoringRubricResult from LLM criterion evaluations."""
    # Index evaluations by criterion_id
    eval_map: dict[str, dict] = {}
    for ev in criteria_evaluations:
        eval_map[ev["criterion_id"]] = ev

    category_breakdowns: list[CategoryBreakdown] = []
    category_scores: dict[str, int] = {}

    for cat, criteria in rubric_by_category().items():
        criterion_results: list[CriterionResult] = []
        score_pairs = []

        for c in criteria:
            ev = eval_map.get(c.id, {})
            score = max(0, min(100, int(ev.get("score", 0))))

            # Determine pass/fail
            if c.eval_type == "pass_fail":
                passed = score == 100
            else:
                passed = score >= 70

            criterion_results.append(
                CriterionResult(
                    criterion_id=c.id,
                    criterion_name=c.name,
                    category=c.category,
                    score=score,
                    passed=passed,
                    finding=ev.get("finding", "Not evaluated"),
                    recommendation=ev.get("recommendation", ""),
                )
            )
            score_pairs.append((c, score))

        cat_score = compute_category_score(score_pairs)
        category_scores[cat] = cat_score
        passed_count = sum(1 for cr in criterion_results if cr.passed)

        category_breakdowns.append(
            CategoryBreakdown(
                category=cat,
                score=cat_score,
                weight=CATEGORY_WEIGHTS[cat],
                criteria=criterion_results,
                passed_count=passed_count,
                total_count=len(criterion_results),
            )
        )

    overall = compute_overall_score(category_scores)

    return ScoringRubricResult(
        categories=category_breakdowns,
        overall_score=overall,
        rubric_version=RUBRIC_VERSION,
    )


def _build_issues_from_rubric(rubric: ScoringRubricResult) -> list[SEOIssue]:
    """Derive SEOIssue list from failed criteria."""
    issues: list[SEOIssue] = []
    for cat_breakdown in rubric.categories:
        for cr in cat_breakdown.criteria:
            if cr.passed:
                continue
            if cr.score < 30:
                severity = "critical"
            elif cr.score < 70:
                severity = "warning"
            else:
                continue
            issues.append(
                SEOIssue(
                    issue=cr.criterion_name,
                    severity=severity,
                    description=cr.finding,
                    recommendation=cr.recommendation or f"Improve {cr.criterion_name.lower()}.",
                )
            )
    # Sort: critical first, then warning
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    issues.sort(key=lambda i: severity_order.get(i.severity, 2))
    return issues


def _build_path_to_80(rubric: ScoringRubricResult) -> PathTo80 | None:
    """Build a path-to-80 from failed criteria ordered by potential point gain."""
    if rubric.overall_score >= 80:
        return None

    # Collect failed criteria with their potential point contribution
    failed: list[tuple[CriterionResult, float]] = []
    for cat_breakdown in rubric.categories:
        cat_weight = cat_breakdown.weight
        # Count criteria in category for normalization
        n_criteria = cat_breakdown.total_count
        for cr in cat_breakdown.criteria:
            if cr.score >= 100:
                continue
            criterion_def = get_criterion_by_id(cr.criterion_id)
            if not criterion_def:
                continue
            # Potential points = category_weight * criterion_weight * score_gap
            score_gap = 100 - cr.score
            potential = cat_weight * criterion_def.weight * score_gap
            failed.append((cr, potential))

    # Sort by potential gain descending
    failed.sort(key=lambda x: x[1], reverse=True)

    steps: list[PathTo80Step] = []
    for cr, potential in failed[:8]:
        estimated_points = max(1, round(potential))
        effort = "quick_win" if cr.score >= 40 else ("moderate" if cr.score >= 20 else "significant")
        steps.append(
            PathTo80Step(
                action=cr.recommendation or f"Improve {cr.criterion_name.lower()}",
                category=cr.category,
                estimated_points=estimated_points,
                effort=effort,
                explanation=cr.finding,
            )
        )

    projected_score = rubric.overall_score + sum(s.estimated_points for s in steps)
    quick_wins = [s for s in steps if s.effort == "quick_win"]
    quick_summary = (
        f"{len(quick_wins)} quick win(s) available. "
        + (f"Start with: {quick_wins[0].action}" if quick_wins else "Focus on the highest-impact items first.")
    )

    return PathTo80(
        current_score=rubric.overall_score,
        target_score=80,
        steps=steps,
        projected_score=min(projected_score, 100),
        quick_wins_summary=quick_summary,
    )


async def run(url: str) -> tuple[WebsiteAnalysisResult, dict, EvidenceTrace]:
    # Scrape the target page
    page, raw_page = await jina.scrape_with_raw(url)

    page_data = f"URL: {url}\n"
    page_data += f"Title: {page.get('title', 'N/A')}\n"
    page_data += f"Description: {page.get('description', 'N/A')}\n\n"
    page_data += f"Page content:\n{page.get('content', '')[:8000]}"

    rubric_text = format_rubric_for_prompt()

    system_prompt = WEBSITE_ANALYZER_SYSTEM
    user_prompt = WEBSITE_ANALYZER_USER.format(
        url=url, page_data=page_data, rubric=rubric_text
    )

    result = await llm.complete(
        system=system_prompt,
        user=user_prompt,
    )

    data = json.loads(result.text)

    # Extract criteria evaluations and build deterministic scores
    criteria_evaluations = data.pop("criteria_evaluations", [])
    rubric_result = _build_rubric_result(criteria_evaluations)

    # Compute category scores for dimension labels
    cat_scores = {cb.category: cb.score for cb in rubric_result.categories}

    # Derive issues and path_to_80 from rubric
    issues = _build_issues_from_rubric(rubric_result)
    path_to_80 = _build_path_to_80(rubric_result)

    # Build the final result with deterministic scores
    analysis = WebsiteAnalysisResult(
        url=data.get("url", url),
        page_title=data.get("page_title", ""),
        meta_description=data.get("meta_description", ""),
        overall_score=rubric_result.overall_score,
        performance_score=_score_to_label(cat_scores.get("performance", 0)),
        seo_score=_score_to_label(cat_scores.get("seo", 0)),
        content_score=_score_to_label(cat_scores.get("content", 0)),
        technical_score=_score_to_label(cat_scores.get("technical", 0)),
        word_count=data.get("word_count", 0),
        internal_links=data.get("internal_links", 0),
        external_links=data.get("external_links", 0),
        heading_structure=data.get("heading_structure", []),
        issues=issues,
        schema_markup=data.get("schema_markup", []),
        summary=data.get("summary", ""),
        evidence=data.get("evidence"),
        path_to_80=path_to_80,
        rubric=rubric_result,
    )

    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 0,
        "jina_scrapes": 1,
    }
    trace = EvidenceTrace(
        jina_raw_responses=[raw_page],
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="website_analyzer",
        query=url,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return analysis, usage, trace
