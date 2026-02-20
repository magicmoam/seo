import { esc, formatNum } from '../utils/helpers.js';

export function render(r) {
  const o = r.overview || {};
  let h = '';
  h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div class="panel" style="text-align:center;padding:16px"><div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--c-accent)">${formatNum(o.total_users||0)}</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Total Users</div></div>
    <div class="panel" style="text-align:center;padding:16px"><div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--c-accent)">${formatNum(o.sessions||0)}</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Sessions</div></div>
    <div class="panel" style="text-align:center;padding:16px"><div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--c-accent)">${formatNum(o.pageviews||0)}</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Pageviews</div></div>
  </div>`;
  if (r.daily_users?.length) {
    const maxUsers = Math.max(...r.daily_users.map(d => d.users), 1);
    h += `<div class="panel"><div class="panel-label">Daily Users</div><div style="display:flex;align-items:flex-end;gap:2px;height:120px">`;
    for (const d of r.daily_users) {
      const pct = (d.users / maxUsers * 100).toFixed(1);
      h += `<div style="flex:1;background:var(--c-accent);opacity:0.6;border-radius:2px 2px 0 0;min-width:3px;height:${pct}%" title="${d.date}: ${d.users} users"></div>`;
    }
    h += '</div></div>';
  }
  if (r.channels?.length) {
    h += `<div class="panel"><div class="panel-label">Traffic Channels</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">`;
    for (const c of r.channels) {
      h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--c-bg-card);border:1px solid var(--c-glass-border);border-radius:var(--radius)">
        <span style="font-size:13px;color:var(--c-text-primary)">${esc(c.channel)}</span>
        <div style="flex:1;margin:0 12px;height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden"><div style="height:100%;background:var(--c-accent);border-radius:2px;width:${c.percentage}%"></div></div>
        <span style="font-family:'Space Mono',monospace;font-size:12px;color:var(--c-text-secondary);min-width:40px;text-align:right">${c.percentage}%</span>
      </div>`;
    }
    h += '</div></div>';
  }
  if (r.top_pages?.length) {
    h += `<div class="panel"><div class="panel-label">Top Pages</div><table class="data-table"><thead><tr><th>Page</th><th>Views</th><th>Avg Time</th><th>Bounce</th></tr></thead><tbody>`;
    for (const p of r.top_pages.slice(0, 15)) {
      h += `<tr><td style="word-break:break-all"><strong>${esc(p.page_title||p.page_path)}</strong><br><span class="cell-dim">${esc(p.page_path)}</span></td><td>${formatNum(p.pageviews)}</td><td>${esc(p.avg_time_on_page)}</td><td>${esc(p.bounce_rate)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  if (r.insights?.length) {
    h += `<div class="panel"><div class="panel-label">Key Insights</div>${r.insights.map(i=>`<div style="padding:8px 12px;margin-bottom:6px;background:var(--c-accent-dim);border-left:2px solid var(--c-accent);border-radius:0 var(--radius) var(--radius) 0;font-size:13px;color:var(--c-text-secondary)">${esc(i)}</div>`).join('')}</div>`;
  }
  return h;
}
