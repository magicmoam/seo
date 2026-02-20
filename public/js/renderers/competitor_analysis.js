import { esc } from '../utils/helpers.js';

export function render(r) {
  let h = '';
  for (const c of (r.competitors || [])) {
    h += `<div class="panel"><h3 style="font-size:15px;font-weight:500;color:var(--c-text-primary);margin-bottom:3px">${esc(c.title)}</h3>
      <div style="color:var(--c-text-tertiary);font-size:11px;margin-bottom:12px;word-break:break-all">${esc(c.url)}</div>
      <div style="display:flex;gap:14px;margin-bottom:14px;font-size:11px;color:var(--c-text-tertiary)"><span>${esc(c.content_type)}</span><span>~${esc(c.estimated_word_count)} words</span></div>
      <ul style="list-style:none;padding:0;font-size:12px;margin-bottom:6px">${(c.strengths||[]).map(s=>`<li style="color:var(--c-green);margin-bottom:4px;padding-left:16px;position:relative;line-height:1.4"><span style="position:absolute;left:0;font-family:'Space Mono',monospace;font-size:12px">+</span>${esc(s)}</li>`).join('')}</ul>
      <ul style="list-style:none;padding:0;font-size:12px">${(c.weaknesses||[]).map(w=>`<li style="color:rgba(255,107,107,0.7);margin-bottom:4px;padding-left:16px;position:relative;line-height:1.4"><span style="position:absolute;left:0;font-family:'Space Mono',monospace;font-size:12px">&minus;</span>${esc(w)}</li>`).join('')}</ul>
    </div>`;
  }
  if (r.opportunities?.length) {
    h += `<div class="panel"><div class="panel-label">Opportunities</div><ul class="panel-list">${r.opportunities.map(o=>`<li>${esc(o)}</li>`).join('')}</ul></div>`;
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${esc(r.summary)}</p></div>`;
  return h;
}
