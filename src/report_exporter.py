"""Report exporter: generates shareable HTML and JSON reports from any tool output."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from src.models import (
    AgentResponse,
    BacklinkStrategy,
    CompetitorAnalysisResult,
    ContentCalendar,
    ContentGapResult,
    GeneratedContent,
    KeywordResearchResult,
    PathTo80,
    ScoringRubricResult,
    SEOStrategy,
    SERPAnalysisResult,
    TechnicalSEOAudit,
    TopicalAuthorityMap,
    WebsiteAnalysisResult,
)

OUTPUT_DIR = Path(__file__).parent.parent / "output"

TOOL_LABELS = {
    "keyword_research": "Keyword Research",
    "competitor_analysis": "Competitor Analysis",
    "serp_analysis": "SERP Analysis",
    "content_gap": "Content Gap Analysis",
    "content_generation": "Content Generation",
    "website_analyzer": "Website Analysis",
    "topical_authority": "Topical Authority Map",
    "content_calendar": "Content Calendar",
    "technical_seo": "Technical SEO Audit",
    "backlink_strategy": "Backlink Strategy",
    "seo_strategy": "Full SEO Strategy",
}


def _ensure_output_dir() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def _slug(text: str) -> str:
    return text.lower().replace(" ", "_").replace("/", "_").replace(":", "")[:40]


# ---------------------------------------------------------------------------
# JSON export
# ---------------------------------------------------------------------------

def export_json(response: AgentResponse) -> str:
    """Export the full response as a JSON file. Returns the file path."""
    outdir = _ensure_output_dir()
    filename = f"{response.tool_used}_{_slug(response.query)}_{_timestamp()}.json"
    path = outdir / filename
    path.write_text(response.model_dump_json(indent=2))
    return str(path)


# ---------------------------------------------------------------------------
# HTML report generation
# ---------------------------------------------------------------------------

_CSS = """\
:root { --bg: #0f1117; --card: #1a1d2e; --border: #2a2d3e; --text: #e1e4eb;
  --dim: #8b8fa3; --cyan: #22d3ee; --green: #4ade80; --yellow: #facc15;
  --red: #f87171; --blue: #60a5fa; --magenta: #c084fc; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; max-width: 1200px; margin: 0 auto; }
h1 { color: var(--cyan); font-size: 1.8rem; margin-bottom: 0.5rem; }
h2 { color: var(--cyan); font-size: 1.4rem; margin: 2rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
h3 { color: var(--green); font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
.meta { color: var(--dim); font-size: 0.9rem; margin-bottom: 2rem; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem; margin-bottom: 1rem; }
.score { display: inline-block; font-size: 2rem; font-weight: bold; padding: 0.3rem 1rem; border-radius: 8px; }
.score-good { color: var(--green); border: 2px solid var(--green); }
.score-mid { color: var(--yellow); border: 2px solid var(--yellow); }
.score-bad { color: var(--red); border: 2px solid var(--red); }
table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
th { background: var(--card); color: var(--cyan); text-align: left; padding: 0.6rem 0.8rem; border-bottom: 2px solid var(--border); }
td { padding: 0.5rem 0.8rem; border-bottom: 1px solid var(--border); }
tr:hover td { background: rgba(34,211,238,0.05); }
.tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
.critical { background: rgba(248,113,113,0.2); color: var(--red); }
.high { background: rgba(250,204,21,0.2); color: var(--yellow); }
.medium { background: rgba(96,165,250,0.2); color: var(--blue); }
.low { background: rgba(139,143,163,0.2); color: var(--dim); }
.easy { background: rgba(74,222,128,0.2); color: var(--green); }
.hard { background: rgba(248,113,113,0.2); color: var(--red); }
.pillar { background: rgba(192,132,252,0.2); color: var(--magenta); }
.cluster { background: rgba(192,132,252,0.15); color: var(--magenta); }
.supporting { background: rgba(139,143,163,0.15); color: var(--dim); }
.linkbait { background: rgba(34,211,238,0.2); color: var(--cyan); }
ul { margin: 0.5rem 0 0.5rem 1.5rem; }
li { margin-bottom: 0.3rem; }
.cost-box { background: linear-gradient(135deg, rgba(250,204,21,0.1), rgba(74,222,128,0.1));
  border: 1px solid var(--yellow); border-radius: 8px; padding: 1rem; margin: 1rem 0; text-align: center; }
.cost-box .amount { font-size: 1.6rem; font-weight: bold; color: var(--yellow); }
.cost-box .label { color: var(--dim); font-size: 0.9rem; }
pre { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 1rem;
  overflow-x: auto; font-size: 0.85rem; margin: 0.5rem 0; }
code { font-family: 'SF Mono', 'Fira Code', monospace; }
.summary { background: var(--card); border-left: 3px solid var(--green); padding: 1rem; margin: 1rem 0; border-radius: 0 6px 6px 0; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } body { padding: 1rem; } }
@media print { body { background: #fff; color: #111; } .card { border-color: #ddd; } h2 { color: #0891b2; } }
.footer { text-align: center; color: var(--dim); font-size: 0.8rem; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); }
"""


def _tag(text: str) -> str:
    cls = text.lower().replace(" ", "_")
    return f'<span class="tag {cls}">{text}</span>'


def _score_class(score: int) -> str:
    if score >= 70:
        return "score-good"
    if score >= 40:
        return "score-mid"
    return "score-bad"


def _esc(text: str) -> str:
    """HTML-escape text."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


# ---------------------------------------------------------------------------
# Per-tool HTML renderers
# ---------------------------------------------------------------------------

def _html_keyword_research(r: KeywordResearchResult) -> str:
    rows = ""
    for kw in r.keywords:
        rows += f"<tr><td>{_esc(kw.keyword)}</td><td>{_esc(kw.search_volume)}</td>"
        rows += f"<td>{_tag(kw.difficulty)}</td><td>{_esc(kw.intent)}</td>"
        rows += f"<td>{_esc(kw.cpc_estimate)}</td><td>{_esc(kw.notes)}</td></tr>\n"

    lt = "".join(f"<li>{_esc(s)}</li>" for s in r.long_tail_suggestions)
    return f"""
    <h2>Keyword Research: {_esc(r.seed_keyword)}</h2>
    <table><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>Intent</th><th>CPC</th><th>Notes</th></tr>
    {rows}</table>
    <h3>Long-tail Suggestions</h3><ul>{lt}</ul>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_competitor_analysis(r: CompetitorAnalysisResult) -> str:
    cards = ""
    for c in r.competitors:
        strengths = "".join(f"<li>{_esc(s)}</li>" for s in c.strengths)
        weaknesses = "".join(f"<li>{_esc(w)}</li>" for w in c.weaknesses)
        cards += f"""<div class="card">
            <h3>{_esc(c.title)}</h3><p style="color:var(--dim)">{_esc(c.url)}</p>
            <p>{_esc(c.content_type)} | ~{_esc(c.estimated_word_count)} words</p>
            <div class="grid-2"><div><strong style="color:var(--green)">Strengths</strong><ul>{strengths}</ul></div>
            <div><strong style="color:var(--red)">Weaknesses</strong><ul>{weaknesses}</ul></div></div>
        </div>"""

    themes = "".join(f"<li>{_esc(t)}</li>" for t in r.common_themes)
    opps = "".join(f"<li>{_esc(o)}</li>" for o in r.opportunities)
    return f"""
    <h2>Competitor Analysis: {_esc(r.query)}</h2>{cards}
    <h3>Common Themes</h3><ul>{themes}</ul>
    <h3>Opportunities</h3><ul>{opps}</ul>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_serp_analysis(r: SERPAnalysisResult) -> str:
    rows = ""
    for e in r.entries:
        rows += f"<tr><td>{e.position}</td><td>{_esc(e.title)}</td><td>{_esc(e.content_type)}</td><td style='color:var(--dim)'>{_esc(e.url)}</td></tr>\n"
    features = "".join(f"<li>{_esc(f)}</li>" for f in r.serp_features)
    return f"""
    <h2>SERP Analysis: {_esc(r.query)}</h2>
    <table><tr><th>#</th><th>Title</th><th>Type</th><th>URL</th></tr>{rows}</table>
    <p><strong>Dominant intent:</strong> {_esc(r.dominant_intent)}</p>
    <h3>SERP Features</h3><ul>{features}</ul>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_content_gap(r: ContentGapResult) -> str:
    rows = ""
    for g in r.gaps:
        rows += f"<tr><td>{_esc(g.topic)}</td><td>{_esc(g.gap_type)}</td><td>{_tag(g.opportunity_score)}</td><td>{_esc(g.suggested_angle)}</td></tr>\n"
    subs = "".join(f"<li>{_esc(s)}</li>" for s in r.underserved_subtopics)
    return f"""
    <h2>Content Gap Analysis: {_esc(r.query)}</h2>
    <table><tr><th>Topic</th><th>Gap Type</th><th>Opportunity</th><th>Suggested Angle</th></tr>{rows}</table>
    <h3>Underserved Subtopics</h3><ul>{subs}</ul>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_content(r: GeneratedContent) -> str:
    outline = "".join(f"<li>{_esc(h)}</li>" for h in r.outline)
    keywords = ", ".join(r.secondary_keywords)
    notes = "".join(f"<li>{_esc(n)}</li>" for n in r.seo_notes)
    return f"""
    <h2>{_esc(r.title)}</h2>
    <div class="card"><p><em>{_esc(r.meta_description)}</em></p>
    <p><strong>Keyword:</strong> {_esc(r.target_keyword)} | <strong>Secondary:</strong> {_esc(keywords)} | <strong>Words:</strong> {r.word_count}</p></div>
    <h3>Outline</h3><ul>{outline}</ul>
    <div class="card">{r.content}</div>
    <h3>SEO Notes</h3><ul>{notes}</ul>
    """


def _html_path_to_80(p: PathTo80) -> str:
    """Render a Path to 80 score improvement roadmap."""
    gap = p.target_score - p.current_score
    running = p.current_score
    step_rows = ""
    for i, s in enumerate(p.steps, 1):
        running += s.estimated_points
        crossed = running >= 80
        highlight = ' style="color:var(--green);font-weight:600"' if crossed else ""
        effort_cls = {"quick_win": "easy", "moderate": "medium", "significant": "hard"}.get(s.effort, "medium")
        step_rows += (
            f"<tr><td>{i}</td>"
            f"<td><span class='tag easy' style='min-width:50px;text-align:center'>+{s.estimated_points} pts</span></td>"
            f"<td>{_esc(s.action)}</td>"
            f"<td>{_tag(s.category)}</td>"
            f"<td>{_tag(s.effort.replace('_', ' '))}</td>"
            f"<td{highlight}>{running}</td>"
            f"<td style='color:var(--dim);font-size:0.85rem'>{_esc(s.explanation)}</td></tr>\n"
        )

    # Progress bar segments
    bar_pct_current = min(p.current_score, 100)
    bar_pct_gain = min(p.projected_score - p.current_score, 100 - bar_pct_current)
    bar_html = (
        f'<div style="display:flex;align-items:center;gap:8px;margin:1rem 0">'
        f'<span style="font-size:0.85rem;color:var(--dim)">{p.current_score}</span>'
        f'<div style="flex:1;height:14px;background:rgba(255,255,255,0.05);border-radius:7px;overflow:hidden;position:relative">'
        f'<div style="height:100%;width:{bar_pct_current}%;background:var(--yellow);border-radius:7px 0 0 7px"></div>'
        f'<div style="height:100%;width:{bar_pct_gain}%;background:var(--green);position:absolute;top:0;left:{bar_pct_current}%;border-radius:0 7px 7px 0"></div>'
        f'<div style="position:absolute;top:-2px;left:80%;width:2px;height:18px;background:var(--cyan)"></div>'
        f'</div>'
        f'<span style="font-size:0.85rem;color:var(--cyan);font-weight:600">80</span>'
        f'</div>'
    )

    return f"""
    <h2>Path to 80</h2>
    <div class="card" style="border-left:3px solid var(--cyan)">
        <p style="margin-bottom:0.5rem"><strong>Current score:</strong> {p.current_score} &rarr; <strong>Target:</strong> {p.target_score} &rarr; <strong>Projected:</strong> {p.projected_score}</p>
        {bar_html}
        <p style="color:var(--dim);font-size:0.9rem;margin-top:0.5rem">{_esc(p.quick_wins_summary)}</p>
    </div>
    <table>
    <tr><th>#</th><th>Points</th><th>Action</th><th>Category</th><th>Effort</th><th>Running</th><th>Why</th></tr>
    {step_rows}
    </table>
    """


def _html_rubric_breakdown(rubric: ScoringRubricResult) -> str:
    """Render per-category rubric breakdown with per-criterion details."""
    html = '<h3>Scoring Rubric Breakdown</h3>'
    html += f'<p style="color:var(--dim);font-size:0.85rem">Rubric version {_esc(rubric.rubric_version)} &mdash; {rubric.overall_score}/100 overall</p>'

    for cat in rubric.categories:
        score_color = "green" if cat.score >= 70 else ("yellow" if cat.score >= 40 else "red")
        html += f"""<div class="card" style="border-left:3px solid var(--{score_color})">
            <h3 style="display:flex;justify-content:space-between;align-items:center">
                <span>{_esc(cat.category.title())}</span>
                <span style="color:var(--{score_color})">{cat.score}/100 ({cat.passed_count}/{cat.total_count} passed)</span>
            </h3>
            <table><tr><th>Status</th><th>Criterion</th><th>Score</th><th>Finding</th><th>Recommendation</th></tr>"""
        for cr in cat.criteria:
            status = "&#10003;" if cr.passed else "&#10007;"
            status_color = "green" if cr.passed else "red"
            html += f"""<tr>
                <td style="color:var(--{status_color});text-align:center">{status}</td>
                <td>{_esc(cr.criterion_name)}</td>
                <td style="text-align:center">{cr.score}</td>
                <td style="color:var(--dim)">{_esc(cr.finding)}</td>
                <td style="color:var(--dim)">{_esc(cr.recommendation)}</td>
            </tr>"""
        html += "</table></div>"
    return html


def _html_website_analysis(r: WebsiteAnalysisResult) -> str:
    issues_rows = ""
    for i in r.issues:
        issues_rows += f"<tr><td>{_tag(i.severity)}</td><td>{_esc(i.issue)}</td><td>{_esc(i.description)}</td><td>{_esc(i.recommendation)}</td></tr>\n"
    headings = "".join(f"<li>{_esc(h)}</li>" for h in r.heading_structure)
    schema = "".join(f"<li>{_esc(s)}</li>" for s in r.schema_markup)
    path_section = _html_path_to_80(r.path_to_80) if r.path_to_80 else ""
    rubric_section = _html_rubric_breakdown(r.rubric) if r.rubric else ""
    return f"""
    <h2>Website Analysis: {_esc(r.url)}</h2>
    <div class="card">
    <span class="score {_score_class(r.overall_score)}">{r.overall_score}/100</span>
    <p><strong>Title:</strong> {_esc(r.page_title)}</p>
    <p><strong>Meta:</strong> {_esc(r.meta_description)}</p>
    <div class="grid-2">
    <div><strong>Performance:</strong> {_tag(r.performance_score)} <strong>SEO:</strong> {_tag(r.seo_score)}</div>
    <div><strong>Content:</strong> {_tag(r.content_score)} <strong>Technical:</strong> {_tag(r.technical_score)}</div>
    </div>
    <p>{r.word_count} words | {r.internal_links} internal links | {r.external_links} external links</p></div>
    {rubric_section}
    {path_section}
    <h3>Issues</h3>
    <table><tr><th>Severity</th><th>Issue</th><th>Description</th><th>Fix</th></tr>{issues_rows}</table>
    <h3>Headings</h3><ul>{headings}</ul>
    <h3>Schema Markup</h3><ul>{schema if schema else '<li>None detected</li>'}</ul>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_topical_authority(r: TopicalAuthorityMap) -> str:
    clusters = ""
    for i, c in enumerate(r.clusters, 1):
        pages = "".join(
            f"<li>{_esc(p)} <span style='color:var(--dim)'>({_esc(k)})</span></li>"
            for p, k in zip(c.supporting_pages, c.supporting_keywords)
        )
        clusters += f"""<div class="card">
            <h3>Cluster {i}: {_esc(c.cluster_name)}</h3>
            <p><strong>Pillar:</strong> {_esc(c.pillar_page)}</p>
            <p><strong>Keyword:</strong> {_esc(c.pillar_keyword)} (Volume: {_esc(c.pillar_search_volume)})</p>
            <strong>Supporting Pages ({len(c.supporting_pages)}):</strong><ul>{pages}</ul>
            <p><strong>Linking:</strong> {_esc(c.internal_linking_notes)}</p>
        </div>"""

    hierarchy = "".join(f"<li>{_esc(h)}</li>" for h in r.content_hierarchy)
    return f"""
    <h2>Topical Authority Map</h2>
    <div class="card"><p><strong>Domain:</strong> {_esc(r.domain)} | <strong>Niche:</strong> {_esc(r.niche)} | <strong>Total pages:</strong> {r.estimated_total_pages}</p></div>
    {clusters}
    <h3>Content Hierarchy</h3><ul>{hierarchy}</ul>
    <p><strong>Interlinking Strategy:</strong> {_esc(r.interlinking_strategy)}</p>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_content_calendar(r: ContentCalendar) -> str:
    rows = ""
    for e in r.entries:
        rows += f"<tr><td>{e.week}</td><td>{_esc(e.title)}</td><td>{_esc(e.target_keyword)}</td>"
        rows += f"<td>{_tag(e.content_type)}</td><td>{_tag(e.priority)}</td>"
        rows += f"<td>{_esc(e.cluster)}</td><td>{e.estimated_word_count:,}</td><td>${e.estimated_cost_usd:,.0f}</td></tr>\n"

    notes = "".join(f"<li>{_esc(n)}</li>" for n in r.seasonal_notes)
    return f"""
    <h2>Content Calendar</h2>
    <div class="card"><p><strong>Duration:</strong> {r.total_weeks} weeks | <strong>Frequency:</strong> {_esc(r.publishing_frequency)}</p></div>
    <div class="cost-box"><div class="amount">${r.total_estimated_cost_usd:,.2f}</div><div class="label">Total Content Production Cost</div></div>
    <table><tr><th>Wk</th><th>Title</th><th>Keyword</th><th>Type</th><th>Priority</th><th>Cluster</th><th>Words</th><th>Cost</th></tr>
    {rows}</table>
    <h3>Seasonal Notes</h3><ul>{notes}</ul>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_technical_seo(r: TechnicalSEOAudit) -> str:
    actions = "".join(f"<li><strong>{i}.</strong> {_esc(a)}</li>" for i, a in enumerate(r.priority_actions, 1))
    fix_rows = ""
    for f in r.fixes:
        fix_rows += f"<tr><td>{_esc(f.category)}</td><td>{_esc(f.issue)}</td><td>{_tag(f.impact)}</td>"
        fix_rows += f"<td>{_esc(f.current_state)}</td><td>{_esc(f.recommendation)}</td><td>{_esc(f.estimated_effort)}</td></tr>\n"

    schemas = ""
    for s in r.schema_recommendations:
        schemas += f"""<div class="card"><h3>Schema: {_esc(s.schema_type)}</h3>
            <p>{_esc(s.description)}</p><pre><code>{_esc(s.json_ld_example)}</code></pre></div>"""

    cwv = "".join(f"<li>{_esc(n)}</li>" for n in r.core_web_vitals_notes)
    speed = "".join(f"<li>{_esc(n)}</li>" for n in r.site_speed_notes)
    return f"""
    <h2>Technical SEO Audit</h2>
    <div class="card"><p><strong>URL:</strong> {_esc(r.url)} | <strong>Mobile:</strong> {_tag(r.mobile_readiness)} | <strong>Total effort:</strong> {_esc(r.estimated_total_effort)}</p></div>
    <h3>Priority Actions</h3><ul>{actions}</ul>
    <table><tr><th>Category</th><th>Issue</th><th>Impact</th><th>Current</th><th>Fix</th><th>Effort</th></tr>{fix_rows}</table>
    {schemas}
    <h3>Core Web Vitals</h3><ul>{cwv}</ul>
    <h3>Speed Optimization</h3><ul>{speed}</ul>
    <p><strong>Crawl Budget:</strong> {_esc(r.crawl_budget_notes)}</p>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_backlink_strategy(r: BacklinkStrategy) -> str:
    actions = "".join(f"<li><strong>{i}.</strong> {_esc(a)}</li>" for i, a in enumerate(r.priority_actions, 1))
    opp_rows = ""
    for o in r.opportunities:
        opp_rows += f"<tr><td>{_esc(o.strategy)}</td><td>{_esc(o.target_description)}</td>"
        opp_rows += f"<td>{_esc(o.outreach_angle)}</td><td>{_tag(o.difficulty)}</td>"
        opp_rows += f"<td>{_esc(o.estimated_domain_authority_range)}</td><td>${o.estimated_cost_usd:,.0f}</td></tr>\n"

    asset_rows = ""
    for a in r.linkable_assets:
        asset_rows += f"<tr><td>{_esc(a.asset_type)}</td><td>{_esc(a.title)}</td>"
        asset_rows += f"<td>{_tag(a.estimated_links_potential)}</td><td>${a.estimated_production_cost_usd:,.0f}</td></tr>\n"

    insights = "".join(f"<li>{_esc(i)}</li>" for i in r.competitor_link_insights)
    return f"""
    <h2>Backlink Strategy</h2>
    <div class="card"><p><strong>Domain:</strong> {_esc(r.domain)} | <strong>Monthly target:</strong> {r.monthly_link_target} links</p></div>
    <div class="cost-box"><div class="amount">${r.estimated_monthly_cost_usd:,.2f}/mo</div><div class="label">Estimated Monthly Link Building Cost</div></div>
    <h3>Priority Actions</h3><ul>{actions}</ul>
    <h3>Link Building Opportunities</h3>
    <table><tr><th>Strategy</th><th>Target</th><th>Angle</th><th>Difficulty</th><th>DA Range</th><th>Cost</th></tr>{opp_rows}</table>
    <h3>Linkable Assets to Create</h3>
    <table><tr><th>Type</th><th>Title</th><th>Link Potential</th><th>Cost</th></tr>{asset_rows}</table>
    <h3>Competitor Link Insights</h3><ul>{insights}</ul>
    <div class="summary">{_esc(r.summary)}</div>
    """


def _html_seo_strategy(r: SEOStrategy) -> str:
    """Full multi-agent strategy report."""
    # Cost breakdown
    cost_rows = ""
    for c in r.cost_breakdown:
        cost_rows += f"<tr><td>{_esc(c.category)}</td><td>{_esc(c.description)}</td>"
        cost_rows += f"<td>${c.monthly_cost_usd:,.2f}</td><td>${c.one_time_cost_usd:,.2f}</td><td>{_esc(c.notes)}</td></tr>\n"

    # Priority actions
    action_rows = ""
    for i, a in enumerate(r.priority_actions, 1):
        action_rows += f"<tr><td>{i}</td><td>{_esc(a.agent)}</td><td>{_esc(a.action)}</td>"
        action_rows += f"<td>{_tag(a.priority)}</td><td>{_esc(a.timeline)}</td>"
        action_rows += f"<td>{_esc(a.expected_impact)}</td><td>${a.estimated_cost_usd:,.0f}</td></tr>\n"

    risks = "".join(f"<li>{_esc(rf)}</li>" for rf in r.risk_factors)
    path_section = _html_path_to_80(r.path_to_80) if r.path_to_80 else ""

    sub_reports = (
        _html_topical_authority(r.topical_authority)
        + _html_content_calendar(r.content_calendar)
        + _html_technical_seo(r.technical_audit)
        + _html_backlink_strategy(r.backlink_strategy)
    )

    return f"""
    <h1>SEO Strategy Report: {_esc(r.domain)}</h1>
    <div class="card">
        <span class="score {_score_class(r.overall_health_score)}">{r.overall_health_score}/100</span>
        <p style="margin-top:1rem">{_esc(r.executive_summary)}</p>
        <p><strong>Timeline:</strong> {_esc(r.expected_timeline_to_results)}</p>
        <p><strong>ROI:</strong> {_esc(r.roi_projection)}</p>
    </div>
    {path_section}

    <h2>Investment Overview</h2>
    <div class="grid-2">
        <div class="cost-box"><div class="amount">${r.total_monthly_investment_usd:,.2f}/mo</div><div class="label">Monthly Investment</div></div>
        <div class="cost-box"><div class="amount">${r.total_setup_cost_usd:,.2f}</div><div class="label">One-time Setup Cost</div></div>
    </div>
    <table><tr><th>Category</th><th>Description</th><th>Monthly</th><th>One-time</th><th>Notes</th></tr>{cost_rows}</table>

    <h2>Priority Actions</h2>
    <table><tr><th>#</th><th>Agent</th><th>Action</th><th>Priority</th><th>Timeline</th><th>Impact</th><th>Cost</th></tr>{action_rows}</table>

    <h2>Detailed Agent Reports</h2>
    {sub_reports}

    <h2>Risk Factors</h2><ul>{risks}</ul>
    """


_HTML_RENDERERS = {
    "keyword_research": _html_keyword_research,
    "competitor_analysis": _html_competitor_analysis,
    "serp_analysis": _html_serp_analysis,
    "content_gap": _html_content_gap,
    "content_generation": _html_content,
    "website_analyzer": _html_website_analysis,
    "topical_authority": _html_topical_authority,
    "content_calendar": _html_content_calendar,
    "technical_seo": _html_technical_seo,
    "backlink_strategy": _html_backlink_strategy,
    "seo_strategy": _html_seo_strategy,
}


def export_html_string(response: AgentResponse) -> str:
    """Generate an HTML report string (for API responses or in-memory use)."""
    tool_label = TOOL_LABELS.get(response.tool_used, response.tool_used)
    ts = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

    renderer = _HTML_RENDERERS.get(response.tool_used)
    if renderer:
        body = renderer(response.result)
    else:
        body = f"<pre>{_esc(response.result.model_dump_json(indent=2))}</pre>"

    if response.tool_used != "seo_strategy":
        body = f"<h1>{_esc(tool_label)}: {_esc(response.query)}</h1>\n{body}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>trySEO.ai Report - {_esc(tool_label)}</title>
<style>{_CSS}</style>
</head>
<body>
<div class="meta">trySEO.ai SEO Intelligence | {_esc(tool_label)} | Generated {ts}</div>
{body}
<div class="footer">Generated by <strong>trySEO.ai</strong> - AI-Powered SEO Intelligence | {ts}</div>
</body>
</html>"""


def export_html(response: AgentResponse) -> str:
    """Export the response as a shareable HTML report file. Returns the file path."""
    outdir = _ensure_output_dir()
    html = export_html_string(response)
    filename = f"{response.tool_used}_{_slug(response.query)}_{_timestamp()}.html"
    path = outdir / filename
    path.write_text(html)
    return str(path)
