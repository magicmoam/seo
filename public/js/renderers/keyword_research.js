import { esc, diffBadge, intentBadge } from '../utils/helpers.js';

export function render(r) {
  let h = `<div class="panel"><table class="data-table"><thead><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>Intent</th><th>CPC</th><th>Notes</th></tr></thead><tbody>`;
  for (const k of (r.keywords || [])) {
    h += `<tr><td><strong>${esc(k.keyword)}</strong></td><td>${esc(k.search_volume)}</td><td>${diffBadge(k.difficulty)}</td><td>${intentBadge(k.intent)}</td><td>${esc(k.cpc_estimate)}</td><td class="cell-dim">${esc(k.notes)}</td></tr>`;
  }
  h += '</tbody></table></div>';
  if (r.long_tail_suggestions?.length) {
    h += `<div class="panel"><div class="panel-label">Long-tail Suggestions</div><ul class="panel-list">${r.long_tail_suggestions.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${esc(r.summary)}</p></div>`;
  return h;
}
