import { esc } from '../utils/helpers.js';

export function render(r) {
  let h = `<div class="panel"><h2 style="font-size:22px;font-weight:400;letter-spacing:-0.02em;color:var(--text-main);margin-bottom:8px">${esc(r.title)}</h2>
    <p style="color:var(--text-muted);font-size:13px;font-style:italic;font-weight:300;margin-bottom:14px">${esc(r.meta_description)}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <span style="padding:3px 10px;background:var(--accent-olive-dim);border:1px solid rgba(212,184,149,0.15);border-radius:var(--radius);font-size:11px;color:var(--accent-olive);font-family:var(--font-mono)">${esc(r.target_keyword)}</span>
      ${(r.secondary_keywords||[]).map(k=>`<span style="padding:3px 10px;background:var(--accent-olive-dim);border:1px solid rgba(212,184,149,0.15);border-radius:var(--radius);font-size:11px;color:var(--accent-olive);font-family:var(--font-mono)">${esc(k)}</span>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-dim);font-family:var(--font-mono)">${r.word_count} words</p>
  </div>`;
  if (r.outline?.length) {
    h += `<div class="panel"><div class="panel-label">Outline</div><ul class="panel-list">${r.outline.map(o=>`<li>${esc(o)}</li>`).join('')}</ul></div>`;
  }
  // XSS safety: esc() is called FIRST to sanitize user content,
  // then regex introduces only safe structural HTML tags (h1, h2, h3, strong, li, p, br)
  let content = esc(r.content || '')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  h += `<div class="panel" style="font-size:14px;line-height:1.8;font-weight:300;color:var(--text-muted)"><p>${content}</p></div>`;
  if (r.seo_notes?.length) {
    h += `<div class="panel"><div class="panel-label">SEO Notes</div><ul class="panel-list">${r.seo_notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></div>`;
  }
  return h;
}
