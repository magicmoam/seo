import { esc, diffBadge } from '../utils/helpers.js';

export function render(r) {
  let h = '';
  if (r.issues?.length) {
    h += `<div class="panel"><div class="panel-label">Technical Issues</div><table class="data-table"><thead><tr><th>Severity</th><th>Issue</th><th>Description</th><th>Recommendation</th></tr></thead><tbody>`;
    for (const iss of r.issues) {
      h += `<tr><td>${diffBadge(iss.severity)}</td><td><strong>${esc(iss.issue)}</strong></td><td class="cell-dim">${esc(iss.description)}</td><td class="cell-dim">${esc(iss.recommendation)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${esc(r.summary)}</p></div>`;
  return h;
}
