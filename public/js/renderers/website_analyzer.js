import { esc, formatNum, diffBadge } from '../utils/helpers.js';

export function render(r) {
  let h = '';
  // Overview
  h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
    <div class="panel" style="text-align:center;padding:14px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Overall Score</div><div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700">${r.overall_score}/100</div></div>
    <div class="panel" style="text-align:center;padding:14px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Word Count</div><div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700">${formatNum(r.word_count)}</div></div>
    <div class="panel" style="text-align:center;padding:14px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Internal Links</div><div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700">${r.internal_links}</div></div>
    <div class="panel" style="text-align:center;padding:14px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">External Links</div><div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700">${r.external_links}</div></div>
  </div>`;

  // Score grid
  if (r.rubric) {
    const catMap = {};
    for (const cat of r.rubric.categories) catMap[cat.category] = cat;
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">';
    for (const catName of ['performance', 'seo', 'content', 'technical']) {
      const cat = catMap[catName];
      if (cat) {
        const barColor = cat.score >= 70 ? 'var(--c-green)' : cat.score >= 40 ? 'var(--c-yellow)' : 'var(--c-red)';
        h += `<div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">${catName}</div>
          <div style="font-family:'Space Mono',monospace;font-size:16px;font-weight:700;color:${barColor}">${cat.score}/100</div>
          <div style="font-size:10px;color:var(--c-text-tertiary);margin-top:2px">${cat.passed_count}/${cat.total_count} passed</div>
          <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;width:${cat.score}%;background:${barColor};border-radius:2px"></div></div>
        </div>`;
      }
    }
    h += '</div>';
    // Rubric breakdown
    h += _renderRubricBreakdown(r.rubric);
  } else {
    h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
      <div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">Performance</div>${diffBadge(r.performance_score)}</div>
      <div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">SEO</div>${diffBadge(r.seo_score)}</div>
      <div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">Content</div>${diffBadge(r.content_score)}</div>
      <div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">Technical</div>${diffBadge(r.technical_score)}</div>
    </div>`;
  }

  // Path to 80
  if (r.path_to_80) h += _renderPathTo80(r.path_to_80);

  // Meta
  h += `<div class="panel"><div class="panel-label">Page Meta</div>
    <p style="font-size:14px;font-weight:500;color:var(--c-text-primary);margin-bottom:4px">${esc(r.page_title)}</p>
    <p style="font-size:12px;color:var(--c-text-tertiary);margin-bottom:8px;word-break:break-all">${esc(r.url)}</p>
    <p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary);font-style:italic">${esc(r.meta_description)}</p>
  </div>`;

  // Issues
  if (r.issues?.length) {
    h += `<div class="panel"><div class="panel-label">Issues Found</div><table class="data-table"><thead><tr><th>Severity</th><th>Issue</th><th>Description</th><th>Recommendation</th></tr></thead><tbody>`;
    for (const iss of r.issues) {
      h += `<tr><td>${diffBadge(iss.severity)}</td><td><strong>${esc(iss.issue)}</strong></td><td class="cell-dim">${esc(iss.description)}</td><td class="cell-dim">${esc(iss.recommendation)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }

  // Headings
  if (r.heading_structure?.length) {
    h += `<div class="panel"><div class="panel-label">Heading Structure</div><ul class="panel-list">${r.heading_structure.map(hs=>`<li>${esc(hs)}</li>`).join('')}</ul></div>`;
  }

  // Schema
  if (r.schema_markup?.length) {
    h += `<div class="panel"><div class="panel-label">Schema Markup</div><ul class="panel-list">${r.schema_markup.map(sm=>`<li>${esc(sm)}</li>`).join('')}</ul></div>`;
  }

  // Summary
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${esc(r.summary)}</p></div>`;

  // Track button
  h += `<div class="panel" style="text-align:center">
    <button class="btn-track-url btn-primary-solid" data-url="${esc(r.url)}">Track This URL for Score Trends</button>
    <p style="font-size:11px;color:var(--c-text-tertiary);margin-top:6px">Get weekly automated audits and track score changes over time</p>
  </div>`;
  return h;
}

function _renderRubricBreakdown(rubric) {
  let h = '';
  for (const cat of rubric.categories) {
    const barColor = cat.score >= 70 ? 'var(--c-green)' : cat.score >= 40 ? 'var(--c-yellow)' : 'var(--c-red)';
    h += `<div class="rubric-cat-section" style="background:rgba(255,255,255,0.02);border:1px solid var(--c-glass-border);border-radius:var(--radius);margin-bottom:8px;overflow:hidden">
      <div class="rubric-cat-toggle" style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;transition:background 0.15s">
        <span class="rubric-chevron" style="color:var(--c-text-tertiary);font-size:12px;transition:transform 0.2s">&#9656;</span>
        <span style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-text-primary);flex:1">${esc(cat.category)}</span>
        <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;width:60px;overflow:hidden"><div style="height:100%;width:${cat.score}%;background:${barColor};border-radius:2px"></div></div>
        <span style="font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:${barColor}">${cat.score}</span>
        <span style="font-family:'Space Mono',monospace;font-size:10px;color:var(--c-text-tertiary)">${cat.passed_count}/${cat.total_count}</span>
      </div>
      <div class="rubric-criteria-inner" style="display:none;padding:0 16px 12px">`;
    for (const cr of cat.criteria) {
      const cls = cr.passed ? 'var(--c-green)' : 'var(--c-red)';
      const icon = cr.passed ? '&#10003;' : '&#10007;';
      h += `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px">
        <span style="color:${cls};font-size:12px;flex-shrink:0;width:18px;text-align:center">${icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;color:var(--c-text-primary)">${esc(cr.criterion_name)}</div>
          <div style="font-size:11px;color:var(--c-text-tertiary);line-height:1.4">${esc(cr.finding)}</div>
          ${cr.recommendation && !cr.passed ? `<div style="font-size:11px;color:var(--c-yellow);margin-top:2px;line-height:1.4">${esc(cr.recommendation)}</div>` : ''}
        </div>
        <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);flex-shrink:0;min-width:32px;text-align:right">${cr.score}</span>
      </div>`;
    }
    h += '</div></div>';
  }
  return h;
}

function _renderPathTo80(p) {
  const currentPct = Math.min(p.current_score, 100);
  const gainPct = Math.min(p.projected_score - p.current_score, 100 - currentPct);
  let running = p.current_score;

  let stepsHtml = '';
  for (const s of (p.steps || [])) {
    running += s.estimated_points;
    const crossed = running >= 80;
    stepsHtml += `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px">
      <span style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--c-green);background:rgba(107,207,127,0.12);padding:2px 6px;border-radius:3px;white-space:nowrap;min-width:50px;text-align:center">+${s.estimated_points} pts</span>
      <span style="font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(212,184,149,0.1);color:var(--c-accent);white-space:nowrap">${esc(s.category)}</span>
      <span style="font-size:10px;padding:1px 6px;border-radius:3px;white-space:nowrap;${s.effort === 'quick_win' ? 'background:rgba(107,207,127,0.12);color:var(--c-green)' : s.effort === 'moderate' ? 'background:rgba(245,197,66,0.12);color:var(--c-yellow)' : 'background:rgba(255,107,107,0.12);color:var(--c-red)'}">${esc((s.effort||'').replace(/_/g, ' '))}</span>
      <span style="flex:1;color:var(--c-text-primary)">${esc(s.action)}<br><span style="font-size:11px;color:var(--c-text-tertiary)">${esc(s.explanation)}</span></span>
      <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);min-width:28px;text-align:right;${crossed ? 'color:var(--c-green);font-weight:700' : ''}">${running}</span>
    </div>`;
  }

  return `<div style="margin-bottom:12px;padding:16px;background:rgba(255,255,255,0.02);border:1px solid var(--c-glass-border);border-left:3px solid var(--c-accent);border-radius:var(--radius)">
    <div class="label" style="padding:0;margin-bottom:10px">Path to 80</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary)">${p.current_score}</span>
      <div style="flex:1;height:10px;background:rgba(255,255,255,0.05);border-radius:5px;overflow:visible;position:relative">
        <div style="height:100%;width:${currentPct}%;background:var(--c-yellow);border-radius:5px 0 0 5px"></div>
        <div style="height:100%;position:absolute;top:0;left:${currentPct}%;width:${gainPct}%;background:var(--c-green);border-radius:0 5px 5px 0"></div>
        <div style="position:absolute;top:-3px;left:80%;width:2px;height:16px;background:var(--c-accent)"></div>
      </div>
      <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-accent);font-weight:700">80</span>
    </div>
    <div style="font-size:12px;color:var(--c-text-secondary);margin-bottom:12px;line-height:1.5">${esc(p.quick_wins_summary)}</div>
    ${stepsHtml}
  </div>`;
}
