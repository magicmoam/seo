import { esc } from '../utils/helpers.js';

export function render(r) {
  let h = '';
  if (r.pillar_pages?.length) {
    h += `<div class="panel"><div class="panel-label">Pillar Pages</div><ul class="panel-list">${r.pillar_pages.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>`;
  }
  if (r.topic_clusters?.length) {
    h += `<div class="panel"><div class="panel-label">Topic Clusters</div><table class="data-table"><thead><tr><th>Cluster</th><th>Subtopics</th></tr></thead><tbody>`;
    for (const c of r.topic_clusters) {
      const subtopics = Array.isArray(c.subtopics) ? c.subtopics.join(', ') : (c.subtopics || '');
      h += `<tr><td><strong>${esc(c.cluster || c.topic)}</strong></td><td class="cell-dim">${esc(subtopics)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  if (r.content_calendar?.length) {
    h += `<div class="panel"><div class="panel-label">Content Calendar</div><ul class="panel-list">${r.content_calendar.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div>`;
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--text-muted)">${esc(r.summary)}</p></div>`;
  return h;
}
