"""Scoring rubric: criteria definitions, weights, and deterministic score computation."""

from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Criterion definition
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Criterion:
    id: str
    name: str
    category: str  # performance | seo | content | technical
    eval_type: str  # pass_fail | scored
    weight: float  # within-category weight (sums to ~1.0 per category)
    description: str
    threshold_guidance: str


# ---------------------------------------------------------------------------
# Category weights (equal across 4 dimensions)
# ---------------------------------------------------------------------------

CATEGORY_WEIGHTS: dict[str, float] = {
    "performance": 0.25,
    "seo": 0.25,
    "content": 0.25,
    "technical": 0.25,
}

# ---------------------------------------------------------------------------
# Rubric: ~30 criteria across 4 categories
# ---------------------------------------------------------------------------

RUBRIC: list[Criterion] = [
    # ── Performance (6 criteria) ──
    Criterion(
        id="perf_render_blocking",
        name="Render-Blocking Resources",
        category="performance",
        eval_type="scored",
        weight=0.20,
        description="Check for render-blocking CSS/JS in the <head> that delay first paint.",
        threshold_guidance="0-2 render-blocking resources = 80-100; 3-5 = 50-79; 6+ = 0-49.",
    ),
    Criterion(
        id="perf_image_optimization",
        name="Image Optimization",
        category="performance",
        eval_type="scored",
        weight=0.20,
        description="Check if images use lazy loading, srcset/sizes, and modern formats (WebP/AVIF).",
        threshold_guidance="All images optimized = 100; most = 70-90; few = 30-69; none = 0-29.",
    ),
    Criterion(
        id="perf_minification",
        name="CSS/JS Minification",
        category="performance",
        eval_type="scored",
        weight=0.15,
        description="Check if CSS and JavaScript files appear minified (no excessive whitespace/comments).",
        threshold_guidance="All assets minified = 100; most = 70-90; mixed = 40-69; none = 0-39.",
    ),
    Criterion(
        id="perf_font_loading",
        name="Font Loading Strategy",
        category="performance",
        eval_type="scored",
        weight=0.15,
        description="Check for font-display: swap/optional, preconnect to font CDNs, limited font count.",
        threshold_guidance="Proper font-display + preconnect + few fonts = 100; partial = 50-80; no strategy = 0-49.",
    ),
    Criterion(
        id="perf_critical_content",
        name="Critical Content Priority",
        category="performance",
        eval_type="scored",
        weight=0.15,
        description="Check if above-the-fold content loads without waiting for secondary resources.",
        threshold_guidance="Main content is in initial HTML, not hidden behind JS = 80-100; partial = 40-79; fully JS-dependent = 0-39.",
    ),
    Criterion(
        id="perf_resource_count",
        name="Resource Count & Size",
        category="performance",
        eval_type="scored",
        weight=0.15,
        description="Evaluate total number of external requests and overall page weight indicators.",
        threshold_guidance="Lean page with few requests = 80-100; moderate = 50-79; bloated = 0-49.",
    ),
    # ── SEO (9 criteria) ──
    Criterion(
        id="seo_title",
        name="Title Tag",
        category="seo",
        eval_type="scored",
        weight=0.12,
        description="Check that a <title> tag exists and is 50-60 characters.",
        threshold_guidance="Present and 50-60 chars = 100; present but wrong length = 50-70; missing = 0.",
    ),
    Criterion(
        id="seo_meta_desc",
        name="Meta Description",
        category="seo",
        eval_type="scored",
        weight=0.10,
        description="Check that meta description exists and is 120-158 characters.",
        threshold_guidance="Present and 120-158 chars = 100; present but wrong length = 50-70; missing = 0.",
    ),
    Criterion(
        id="seo_h1",
        name="H1 Tag",
        category="seo",
        eval_type="pass_fail",
        weight=0.10,
        description="Check that exactly one H1 tag exists on the page.",
        threshold_guidance="Exactly 1 H1 = 100 (pass); 0 or 2+ H1s = 0 (fail).",
    ),
    Criterion(
        id="seo_heading_hierarchy",
        name="Heading Hierarchy",
        category="seo",
        eval_type="scored",
        weight=0.10,
        description="Check that headings follow proper hierarchy (H1 > H2 > H3, no skipped levels).",
        threshold_guidance="Perfect hierarchy = 100; minor skip = 60-80; major issues = 0-59.",
    ),
    Criterion(
        id="seo_image_alt",
        name="Image Alt Text",
        category="seo",
        eval_type="scored",
        weight=0.10,
        description="Check that images have descriptive alt attributes.",
        threshold_guidance="All images have descriptive alt = 100; most = 70-90; few/none = 0-69.",
    ),
    Criterion(
        id="seo_canonical",
        name="Canonical URL",
        category="seo",
        eval_type="pass_fail",
        weight=0.10,
        description="Check that a canonical link element is present.",
        threshold_guidance="Canonical present = 100 (pass); missing = 0 (fail).",
    ),
    Criterion(
        id="seo_schema",
        name="Schema / JSON-LD",
        category="seo",
        eval_type="scored",
        weight=0.12,
        description="Check for structured data (JSON-LD, microdata, or RDFa).",
        threshold_guidance="Rich schema with multiple types = 100; basic schema = 50-80; none = 0.",
    ),
    Criterion(
        id="seo_og_tags",
        name="Open Graph Tags",
        category="seo",
        eval_type="pass_fail",
        weight=0.08,
        description="Check for og:title, og:description, og:image meta tags.",
        threshold_guidance="All three OG tags present = 100 (pass); missing any = 0 (fail).",
    ),
    Criterion(
        id="seo_internal_links",
        name="Internal Links",
        category="seo",
        eval_type="scored",
        weight=0.10,
        description="Check that the page has 3+ internal links to other pages on the same domain.",
        threshold_guidance="5+ internal links = 100; 3-4 = 70-90; 1-2 = 30-60; 0 = 0.",
    ),
    Criterion(
        id="seo_external_links",
        name="External Links",
        category="seo",
        eval_type="scored",
        weight=0.08,
        description="Check for outbound links to authoritative external sources.",
        threshold_guidance="2+ quality external links = 100; 1 = 60; 0 = 30.",
    ),
    # ── Content (7 criteria) ──
    Criterion(
        id="content_word_count",
        name="Word Count",
        category="content",
        eval_type="scored",
        weight=0.15,
        description="Check that the page has adequate content length (300+ words minimum).",
        threshold_guidance="1000+ words = 100; 600-999 = 70-90; 300-599 = 40-69; <300 = 0-39.",
    ),
    Criterion(
        id="content_readability",
        name="Readability",
        category="content",
        eval_type="scored",
        weight=0.15,
        description="Evaluate readability: sentence length variety, paragraph breaks, clear language.",
        threshold_guidance="Easy to read, well-structured = 80-100; average = 50-79; dense/hard = 0-49.",
    ),
    Criterion(
        id="content_structure",
        name="Content Structure",
        category="content",
        eval_type="scored",
        weight=0.15,
        description="Check for use of subheadings, lists, tables, or other structural elements.",
        threshold_guidance="Rich structure (subheadings + lists + visual breaks) = 80-100; some = 50-79; wall of text = 0-49.",
    ),
    Criterion(
        id="content_keyword_usage",
        name="Keyword Usage",
        category="content",
        eval_type="scored",
        weight=0.15,
        description="Check if the primary topic/keyword appears naturally in title, H1, first paragraph, and body.",
        threshold_guidance="Natural usage in key positions = 80-100; present but awkward = 50-79; missing or stuffed = 0-49.",
    ),
    Criterion(
        id="content_media",
        name="Media & Visual Content",
        category="content",
        eval_type="scored",
        weight=0.10,
        description="Check for presence of images, videos, infographics, or other media.",
        threshold_guidance="Multiple relevant media = 80-100; 1-2 images = 50-79; no media = 0-49.",
    ),
    Criterion(
        id="content_eeat",
        name="E-E-A-T Signals",
        category="content",
        eval_type="scored",
        weight=0.15,
        description="Check for author attribution, credentials, citations, date published/updated, about page links.",
        threshold_guidance="Strong E-E-A-T signals (author, dates, citations) = 80-100; some = 40-79; none = 0-39.",
    ),
    Criterion(
        id="content_originality",
        name="Content Originality",
        category="content",
        eval_type="scored",
        weight=0.15,
        description="Evaluate whether content provides unique value, original insights, or just rehashes common info.",
        threshold_guidance="Unique insights/data/perspective = 80-100; mostly original = 50-79; generic = 0-49.",
    ),
    # ── Technical (8 criteria) ──
    Criterion(
        id="tech_https",
        name="HTTPS",
        category="technical",
        eval_type="pass_fail",
        weight=0.15,
        description="Check that the page is served over HTTPS.",
        threshold_guidance="HTTPS = 100 (pass); HTTP = 0 (fail).",
    ),
    Criterion(
        id="tech_viewport",
        name="Mobile Viewport",
        category="technical",
        eval_type="pass_fail",
        weight=0.12,
        description="Check for <meta name='viewport'> tag with proper content.",
        threshold_guidance="Viewport meta present = 100 (pass); missing = 0 (fail).",
    ),
    Criterion(
        id="tech_indexability",
        name="Indexability",
        category="technical",
        eval_type="pass_fail",
        weight=0.15,
        description="Check that robots meta tag or X-Robots-Tag does not block indexing (no noindex).",
        threshold_guidance="Indexable (no noindex) = 100 (pass); blocked = 0 (fail).",
    ),
    Criterion(
        id="tech_lang",
        name="HTML Lang Attribute",
        category="technical",
        eval_type="pass_fail",
        weight=0.08,
        description="Check that the <html> tag has a lang attribute.",
        threshold_guidance="lang attribute present = 100 (pass); missing = 0 (fail).",
    ),
    Criterion(
        id="tech_charset",
        name="UTF-8 Charset",
        category="technical",
        eval_type="pass_fail",
        weight=0.08,
        description="Check for <meta charset='UTF-8'> or equivalent charset declaration.",
        threshold_guidance="UTF-8 charset declared = 100 (pass); missing = 0 (fail).",
    ),
    Criterion(
        id="tech_clean_urls",
        name="Clean URLs",
        category="technical",
        eval_type="scored",
        weight=0.12,
        description="Check if the URL is clean, readable, and uses hyphens (no query params, IDs, or special chars).",
        threshold_guidance="Clean, readable URL = 100; mostly clean = 60-80; messy with params = 0-59.",
    ),
    Criterion(
        id="tech_page_complexity",
        name="Page Complexity",
        category="technical",
        eval_type="scored",
        weight=0.15,
        description="Evaluate DOM complexity: excessive nesting, inline styles, unused frameworks.",
        threshold_guidance="Clean DOM, minimal inline styles = 80-100; moderate = 50-79; excessive = 0-49.",
    ),
    Criterion(
        id="tech_no_broken",
        name="No Broken Elements",
        category="technical",
        eval_type="scored",
        weight=0.15,
        description="Check for broken images, missing resources, console errors, or dead links visible in HTML.",
        threshold_guidance="No broken elements detected = 100; minor issues = 60-80; multiple broken = 0-59.",
    ),
]

RUBRIC_VERSION = "1.0"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def rubric_by_category() -> dict[str, list[Criterion]]:
    """Group criteria by category."""
    groups: dict[str, list[Criterion]] = {}
    for c in RUBRIC:
        groups.setdefault(c.category, []).append(c)
    return groups


def compute_category_score(
    criteria_scores: list[tuple[Criterion, int]],
) -> int:
    """Weighted average within a category. Returns 0-100."""
    if not criteria_scores:
        return 0
    total_weight = sum(c.weight for c, _ in criteria_scores)
    if total_weight == 0:
        return 0
    weighted_sum = sum(c.weight * score for c, score in criteria_scores)
    return round(weighted_sum / total_weight)


def compute_overall_score(category_scores: dict[str, int]) -> int:
    """Weighted sum across categories. Returns 0-100."""
    total = 0.0
    for cat, weight in CATEGORY_WEIGHTS.items():
        total += weight * category_scores.get(cat, 0)
    return round(total)


def format_rubric_for_prompt() -> str:
    """Serialize the rubric to text for injection into the LLM prompt."""
    lines: list[str] = []
    lines.append("=== SCORING RUBRIC ===")
    lines.append("")

    for cat, criteria in rubric_by_category().items():
        cat_weight = CATEGORY_WEIGHTS[cat]
        lines.append(
            f"## {cat.upper()} (category weight: {cat_weight:.0%})"
        )
        lines.append("")
        for c in criteria:
            lines.append(f"- [{c.id}] {c.name}")
            lines.append(f"  Type: {c.eval_type} | Weight: {c.weight:.0%}")
            lines.append(f"  Check: {c.description}")
            lines.append(f"  Scoring: {c.threshold_guidance}")
            lines.append("")

    lines.append("=== END RUBRIC ===")
    return "\n".join(lines)


def get_criterion_by_id(criterion_id: str) -> Criterion | None:
    """Look up a criterion by its id."""
    for c in RUBRIC:
        if c.id == criterion_id:
            return c
    return None
