import { esc, intentBadge } from '../utils/helpers.js';

export function render(r) {
  let h = `<div class="panel"><table class="data-table"><thead><tr><th>#</th><th>Title</th><th>Type</th><th>URL</th></tr></thead><tbody>`;
  for (const e of (r.entries || [])) {
    h += `<tr><td><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:var(--radius);background:var(--accent-olive-dim);font-family:var(--font-mono);font-size:11px;color:var(--accent-olive);border:1px solid rgba(212,184,149,0.1)">${e.position}</span></td>
      <td><strong>${esc(e.title)}</strong><br><span class="cell-dim">${esc(e.snippet)}</span></td>
      <td>${intentBadge(e.content_type)}</td>
      <td class="cell-dim" style="word-break:break-all">${esc(e.url)}</td></tr>`;
  }
  h += '</tbody></table></div>';
  h += `<div class="panel"><div class="panel-label">SERP Features</div><ul class="panel-list">${(r.serp_features||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
  h += `<div class="panel"><div class="panel-label">Dominant Intent: ${esc(r.dominant_intent)}</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--text-muted)">${esc(r.summary)}</p></div>`;
  return h;
}
