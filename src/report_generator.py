"""Generate self-contained HTML reports from search results and evidence traces."""

from __future__ import annotations

import html
import json
from datetime import datetime, timezone


def generate_report(search_result: dict, evidence: dict) -> str:
    """Produce a self-contained HTML report with evidence chain."""
    tool = evidence.get("tool_used", "unknown")
    query = evidence.get("query", "")
    model = evidence.get("model", "")
    timestamp = evidence.get("created_at", datetime.now(timezone.utc).isoformat())
    routing_reasoning = evidence.get("routing_reasoning", "")
    system_prompt = evidence.get("system_prompt", "")
    user_prompt = evidence.get("user_prompt", "")
    llm_raw = evidence.get("llm_raw_response", "")
    jina_raw = evidence.get("jina_raw_responses", [])
    if isinstance(jina_raw, str):
        try:
            jina_raw = json.loads(jina_raw)
        except (json.JSONDecodeError, TypeError):
            jina_raw = []

    total_in = evidence.get("total_input_tokens", 0) or 0
    total_out = evidence.get("total_output_tokens", 0) or 0

    # Extract evidence from result
    result = search_result.get("result", search_result)
    score_evidence = result.get("evidence", {}) or {}
    score_reasoning = score_evidence.get("score_reasoning", "")
    key_findings = score_evidence.get("key_findings", [])
    data_sources = score_evidence.get("data_sources", [])

    # Build executive summary
    summary = result.get("summary", "")
    overall_score = result.get("overall_score", None)

    score_html = ""
    if overall_score is not None:
        score_html = f'<div class="score-big">{overall_score}<span>/100</span></div>'

    findings_html = ""
    if key_findings:
        items = "".join(f"<li>{_esc(f)}</li>" for f in key_findings)
        findings_html = f"<ul>{items}</ul>"

    sources_html = ""
    if data_sources:
        items = "".join(f"<li>{_esc(s)}</li>" for s in data_sources)
        sources_html = f"<ul>{items}</ul>"

    # Data sources section
    jina_sections = ""
    for i, raw in enumerate(jina_raw):
        title = raw.get("title", f"Source {i + 1}")
        url = raw.get("url", "")
        content = raw.get("content", "")
        content_preview = content[:500] + ("..." if len(content) > 500 else "")
        jina_sections += f"""
        <details class="source-item">
            <summary>{_esc(title)}</summary>
            <p class="source-url">{_esc(url)}</p>
            <pre class="source-content">{_esc(content_preview)}</pre>
            <details class="raw-data">
                <summary>Full content ({len(content):,} chars)</summary>
                <pre>{_esc(content)}</pre>
            </details>
        </details>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>trySEO.ai Report: {_esc(query)}</title>
<style>
    :root {{
        --bg: #0a0d10;
        --card: rgba(255,255,255,0.03);
        --text: #f0f0f0;
        --text-dim: rgba(255,255,255,0.6);
        --text-muted: rgba(255,255,255,0.3);
        --accent: #d4b895;
        --accent-dim: rgba(212,184,149,0.15);
        --border: rgba(255,255,255,0.08);
        --red: #ff6b6b;
        --green: #6bcf7f;
    }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.6;
        padding: 40px;
        max-width: 900px;
        margin: 0 auto;
    }}
    h1 {{ font-size: 28px; font-weight: 300; margin-bottom: 8px; }}
    h2 {{
        font-size: 16px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.08em; color: var(--accent);
        margin: 32px 0 16px; padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
    }}
    .meta {{ color: var(--text-muted); font-size: 13px; margin-bottom: 32px; }}
    .meta span {{ margin-right: 16px; }}
    .card {{
        background: var(--card); border: 1px solid var(--border);
        border-radius: 4px; padding: 20px; margin-bottom: 16px;
    }}
    .score-big {{
        font-size: 48px; font-weight: 700; color: var(--accent);
        text-align: center; padding: 16px 0;
    }}
    .score-big span {{ font-size: 20px; color: var(--text-muted); }}
    p {{ margin-bottom: 12px; color: var(--text-dim); font-size: 14px; }}
    ul {{ padding-left: 20px; margin-bottom: 12px; }}
    li {{ color: var(--text-dim); font-size: 13px; margin-bottom: 4px; }}
    pre {{
        background: rgba(0,0,0,0.3); border: 1px solid var(--border);
        border-radius: 4px; padding: 12px; font-size: 11px;
        color: var(--text-muted); overflow-x: auto; white-space: pre-wrap;
        word-break: break-word; max-height: 400px; overflow-y: auto;
    }}
    details {{ margin-bottom: 8px; }}
    summary {{
        cursor: pointer; font-size: 13px; font-weight: 500;
        color: var(--text); padding: 8px 0;
    }}
    summary:hover {{ color: var(--accent); }}
    .source-item {{ border-left: 2px solid var(--border); padding-left: 12px; }}
    .source-url {{ font-size: 11px; color: var(--text-muted); word-break: break-all; }}
    .source-content {{ margin-top: 8px; }}
    .raw-data pre {{ max-height: 600px; }}
    .disclaimer {{
        margin-top: 48px; padding-top: 24px;
        border-top: 1px solid var(--border);
        font-size: 11px; color: var(--text-muted);
    }}
    .brand {{ color: var(--accent); font-weight: 600; }}
    @media print {{
        body {{ background: white; color: #222; padding: 20px; }}
        .card {{ border: 1px solid #ddd; }}
        pre {{ background: #f5f5f5; color: #333; border-color: #ddd; }}
        summary {{ color: #222; }}
        h2 {{ color: #8B7355; }}
    }}
</style>
</head>
<body>

<h1>SEO Analysis Report</h1>
<div class="meta">
    <span>Query: <strong>{_esc(query)}</strong></span>
    <span>Tool: {_esc(tool.replace('_', ' ').title())}</span>
    <span>Model: {_esc(model)}</span>
    <span>Generated: {_esc(timestamp[:19])}</span>
</div>

<h2>1. Executive Summary</h2>
<div class="card">
    {score_html}
    <p>{_esc(summary)}</p>
</div>

<h2>2. Evidence Chain</h2>
<div class="card">
    <details>
        <summary>Routing Decision</summary>
        <p><strong>Tool selected:</strong> {_esc(tool)}</p>
        <p><strong>Reasoning:</strong> {_esc(routing_reasoning) if routing_reasoning else 'Not captured'}</p>
    </details>
    <details>
        <summary>Data Sources ({len(jina_raw)} sources scraped)</summary>
        {jina_sections if jina_sections else '<p>No raw data captured</p>'}
    </details>
</div>

<h2>3. Score Reasoning</h2>
<div class="card">
    <p>{_esc(score_reasoning) if score_reasoning else 'LLM reasoning not captured for this query.'}</p>
    {f'<h3 style="font-size:13px;color:var(--accent);margin:12px 0 8px">Key Findings</h3>{findings_html}' if findings_html else ''}
    {f'<h3 style="font-size:13px;color:var(--accent);margin:12px 0 8px">Data Sources Referenced</h3>{sources_html}' if sources_html else ''}
</div>

<h2>4. Methodology</h2>
<div class="card">
    <details>
        <summary>System Prompt</summary>
        <pre>{_esc(system_prompt)}</pre>
    </details>
    <details>
        <summary>User Prompt (sent to LLM)</summary>
        <pre>{_esc(user_prompt)}</pre>
    </details>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px">
        Tokens used: {total_in:,} input + {total_out:,} output = {total_in + total_out:,} total
    </p>
    <p style="font-size:12px;color:var(--text-muted)">
        Note: Search content is truncated before LLM analysis (search: 3KB, scrape: 8KB per page).
        Full untruncated content is preserved in the raw data appendix below.
    </p>
</div>

<h2>5. Raw LLM Response</h2>
<div class="card">
    <details>
        <summary>Full LLM output</summary>
        <pre>{_esc(llm_raw)}</pre>
    </details>
</div>

<div class="disclaimer">
    <p><span class="brand">trySEO.ai</span> SEO Intelligence Report</p>
    <p>This report was generated automatically using AI-powered analysis.
    Scores and recommendations are estimates based on publicly available web data
    and should be validated with additional tools and expert review.
    Data was collected at the time of analysis and may not reflect current state.</p>
</div>

</body>
</html>"""


def _esc(text: str) -> str:
    """HTML-escape a string."""
    if not text:
        return ""
    return html.escape(str(text))
