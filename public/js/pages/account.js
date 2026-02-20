// account.js - Account page for trySEO.ai
import { getUser, onAuthStateChanged } from '../auth.js';
import { getUsage, stripePortal } from '../api.js';
import { navigate } from '../router.js';

let _container = null;
let _unsubAuth = null;
let _usage = null;

export function mount(container) {
  _container = container;
  const user = getUser();
  if (!user) { navigate('/'); return; }

  _render(user);
  _loadUsage();

  _unsubAuth = onAuthStateChanged((u) => {
    if (!u) { navigate('/'); return; }
    _render(u);
  });
}

export function unmount() {
  if (_unsubAuth) _unsubAuth();
  _container = null;
}

async function _loadUsage() {
  try {
    _usage = await getUsage();
    const user = getUser();
    if (user) _render(user);
  } catch (e) { /* silent */ }
}

function _render(user) {
  if (!_container) return;
  const credits = _usage?.credits_remaining ?? user.credits_remaining ?? 0;
  const tier = _usage?.tier || user.tier || 'free';
  const totalCost = _usage?.total_cost ?? 0;
  const totalQueries = _usage?.total_searches ?? 0;
  const maxCredits = tier === 'pro' ? 200 : 5;
  const creditPct = Math.min((credits / maxCredits) * 100, 100);

  _container.innerHTML = `
  <div style="max-width:640px;margin:0 auto;padding:100px 32px 64px">
    <h1 class="fade-in" style="font-size:32px;font-weight:300;letter-spacing:-0.03em;color:var(--c-text-primary);margin-bottom:32px">Account</h1>

    <!-- Profile Card -->
    <div class="glass fade-in fade-in-delay-1" style="padding:24px;margin-bottom:16px;display:flex;align-items:center;gap:16px">
      ${user.picture ? `<img src="${_esc(user.picture)}" style="width:48px;height:48px;border-radius:50%;border:1px solid var(--c-glass-border)" alt="">` : '<div style="width:48px;height:48px;border-radius:50%;background:var(--c-accent-dim);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--c-accent)">' + (user.name || user.email || '?').charAt(0).toUpperCase() + '</div>'}
      <div style="flex:1">
        <div style="font-size:16px;font-weight:500;color:var(--c-text-primary)">${_esc(user.name || user.email)}</div>
        <div style="font-size:13px;color:var(--c-text-tertiary)">${_esc(user.email)}</div>
      </div>
      <span style="font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;padding:4px 12px;border-radius:var(--radius);${tier === 'pro' ? 'background:rgba(107,207,127,0.12);color:var(--c-green)' : 'background:rgba(255,255,255,0.05);color:var(--c-text-tertiary)'}">${tier}</span>
    </div>

    <!-- Credits -->
    <div class="glass fade-in fade-in-delay-2" style="padding:24px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="label" style="padding:0">Credits Remaining</div>
        <span style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--c-accent)">${credits}</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${creditPct}%;background:${creditPct > 20 ? 'var(--c-accent)' : 'var(--c-red)'};border-radius:4px;transition:width 0.3s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--c-text-tertiary)">
        <span>${credits} of ${maxCredits} credits remaining</span>
        <span>Resets monthly</span>
      </div>
    </div>

    <!-- Usage Stats -->
    <div class="glass fade-in fade-in-delay-3" style="padding:24px;margin-bottom:16px">
      <div class="label" style="padding:0;margin-bottom:12px">Usage</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">
        <div>
          <div style="font-size:11px;color:var(--c-text-tertiary);margin-bottom:4px">Total Cost</div>
          <div style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:var(--c-text-primary)">$${totalCost.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--c-text-tertiary);margin-bottom:4px">Total Queries</div>
          <div style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:var(--c-text-primary)">${totalQueries}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--c-text-tertiary);margin-bottom:4px">Tokens Used</div>
          <div style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:var(--c-text-primary)">${_formatNum(_usage?.total_tokens || 0)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--c-text-tertiary);margin-bottom:4px">Queries Today</div>
          <div style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:var(--c-text-primary)">${_usage?.today_queries || 0}</div>
        </div>
      </div>
    </div>

    <!-- By Tool Breakdown -->
    ${_usage?.by_tool ? `
    <div class="glass fade-in fade-in-delay-4" style="padding:24px;margin-bottom:16px">
      <div class="label" style="padding:0;margin-bottom:12px">Usage by Tool</div>
      <table class="data-table">
        <thead><tr><th>Tool</th><th>Count</th></tr></thead>
        <tbody>
          ${Object.entries(_usage.by_tool).map(([tool, count]) =>
            `<tr><td style="text-transform:capitalize">${tool.replace(/_/g, ' ')}</td><td style="font-family:'Space Mono',monospace">${count}</td></tr>`
          ).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Actions -->
    <div class="fade-in fade-in-delay-5" style="display:flex;gap:12px;flex-wrap:wrap">
      ${tier === 'pro' ? `
        <button id="btn-manage-sub" class="btn-ghost" style="flex:1">Manage Subscription</button>
      ` : `
        <a href="#/pricing" class="btn-primary-solid" style="flex:1;text-decoration:none;display:inline-block;text-align:center;padding:12px">Upgrade to Pro</a>
      `}
      <button id="btn-back-app" class="btn-ghost" style="flex:1">Back to App</button>
    </div>
  </div>`;

  // Events
  const manageBtn = _container.querySelector('#btn-manage-sub');
  if (manageBtn) {
    manageBtn.addEventListener('click', async () => {
      manageBtn.textContent = 'Redirecting...';
      manageBtn.disabled = true;
      try {
        const data = await stripePortal();
        if (data.url) window.location.href = data.url;
        else { manageBtn.textContent = 'Manage Subscription'; manageBtn.disabled = false; }
      } catch (e) {
        manageBtn.textContent = 'Manage Subscription';
        manageBtn.disabled = false;
      }
    });
  }

  const backBtn = _container.querySelector('#btn-back-app');
  if (backBtn) backBtn.addEventListener('click', () => navigate('/app'));
}

function _formatNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function _esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
