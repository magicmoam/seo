import { esc, diffBadge } from '../utils/helpers.js';

export function render(r) {
  let h = '';
  // Strategy results can have multiple sub-results
  if (r.phases || r.website_analysis || r.keyword_research || r.executive_summary) {
    if (r.executive_summary) {
      h += `<div class="panel"><div class="panel-label">Executive Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--text-muted)">${esc(r.executive_summary)}</p></div>`;
    }
    if (r.key_findings?.length) {
      h += `<div class="panel"><div class="panel-label">Key Findings</div><ul class="panel-list">${r.key_findings.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
    }
    if (r.action_items?.length) {
      h += `<div class="panel"><div class="panel-label">Action Items</div><table class="data-table"><thead><tr><th>Priority</th><th>Action</th><th>Category</th></tr></thead><tbody>`;
      for (const a of r.action_items) {
        h += `<tr><td>${diffBadge(a.priority)}</td><td>${esc(a.action || a.description)}</td><td class="cell-dim">${esc(a.category)}</td></tr>`;
      }
      h += '</tbody></table></div>';
    }
    if (r.content_calendar?.length) {
      h += `<div class="panel"><div class="panel-label">Content Calendar</div><ul class="panel-list">${r.content_calendar.map(c=>`<li>${esc(typeof c === 'string' ? c : c.title || JSON.stringify(c))}</li>`).join('')}</ul></div>`;
    }
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--text-muted)">${esc(r.summary || r.executive_summary || '')}</p></div>`;
  return h;
}
