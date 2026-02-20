import { esc, diffBadge } from '../utils/helpers.js';

export function render(r) {
  let h = `<div class="panel"><table class="data-table"><thead><tr><th>Topic</th><th>Gap Type</th><th>Opportunity</th><th>Suggested Angle</th></tr></thead><tbody>`;
  for (const g of (r.gaps || [])) {
    h += `<tr><td><strong>${esc(g.topic)}</strong></td><td>${esc(g.gap_type)}</td><td>${diffBadge(g.opportunity_score)}</td><td class="cell-dim">${esc(g.suggested_angle)}</td></tr>`;
  }
  h += '</tbody></table></div>';
  if (r.underserved_subtopics?.length) {
    h += `<div class="panel"><div class="panel-label">Underserved Subtopics</div><ul class="panel-list">${r.underserved_subtopics.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>`;
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${esc(r.summary)}</p></div>`;
  return h;
}
