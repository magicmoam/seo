import { esc, diffBadge } from '../utils/helpers.js';

export function render(r) {
  let h = '';
  if (r.opportunities?.length) {
    h += `<div class="panel"><div class="panel-label">Backlink Opportunities</div><table class="data-table"><thead><tr><th>Source</th><th>Type</th><th>Authority</th><th>Strategy</th></tr></thead><tbody>`;
    for (const o of r.opportunities) {
      h += `<tr><td><strong>${esc(o.source || o.domain)}</strong></td><td>${esc(o.type || o.link_type)}</td><td>${diffBadge(o.authority || o.domain_authority)}</td><td class="cell-dim">${esc(o.strategy || o.approach)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--text-muted)">${esc(r.summary)}</p></div>`;
  return h;
}
