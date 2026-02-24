// account.js - Account page for Retune
import { getUser, onAuthStateChanged } from '../auth.js';
import { getUsage, stripePortal } from '../api.js';
import { navigate } from '../router.js';
import { esc as _esc, formatNum as _formatNum } from '../utils/helpers.js';

function isValidStripeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.stripe.com');
  } catch { return false; }
}

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
    if (user && _container) _render(user);
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
  const tokensUsed = _formatNum(_usage?.total_tokens || 0);
  const queriesToday = _usage?.today_queries || 0;

  _container.innerHTML = `
  <div style="max-width:640px;margin:0 auto;padding:100px 32px 64px">

    <div class="panel-label" style="margin-bottom:24px">[ACCOUNT]</div>

    <!-- User Info Card -->
    <div class="card" style="padding:20px;margin-bottom:12px;display:flex;align-items:center;gap:16px">
      ${user.picture
        ? `<img src="${_esc(user.picture)}" style="width:44px;height:44px;border-radius:50%;border:1px solid var(--border-subtle)" alt="">`
        : `<div style="width:44px;height:44px;border-radius:50%;background:var(--bg-panel-light);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:16px;color:var(--accent-olive)">${(user.name || user.email || '?').charAt(0).toUpperCase()}</div>`
      }
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--font-display);font-size:15px;font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(user.name || user.email)}</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-top:2px">${_esc(user.email)}</div>
      </div>
      <span class="badge" style="${tier === 'pro' ? 'background:rgba(156,170,126,0.15);color:var(--accent-olive)' : ''}">${tier.toUpperCase()}</span>
    </div>

    <!-- Credits Card -->
    <div class="card" style="padding:20px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span class="label">[CREDITS_REMAINING]</span>
        <span style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--accent-cyan);letter-spacing:-0.02em">${credits}</span>
      </div>
      <div class="progress-bar" style="margin-bottom:10px">
        <div class="progress-fill" style="width:${creditPct}%;${creditPct <= 20 ? 'background:var(--accent-orange)' : ''}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">
        <span>${credits} / ${maxCredits}</span>
        <span>RESETS MONTHLY</span>
      </div>
      ${tier !== 'pro' ? `
        <a href="#/pricing" id="btn-upgrade" class="btn-action" style="display:block;text-align:center;text-decoration:none;margin-top:16px;width:100%">Upgrade to Pro</a>
      ` : ''}
    </div>

    <!-- Usage Stats -->
    <div class="panel-label" style="margin-bottom:12px;margin-top:24px">[USAGE]</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
      <div class="card" style="padding:16px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Total Cost</div>
        <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--text-main)">$${totalCost.toFixed(2)}</div>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Total Queries</div>
        <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--text-main)">${totalQueries}</div>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Tokens Used</div>
        <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--text-main)">${tokensUsed}</div>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Queries Today</div>
        <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--text-main)">${queriesToday}</div>
      </div>
    </div>

    <!-- Usage by Tool -->
    ${_usage?.by_tool ? `
    <div class="card" style="padding:0;margin-bottom:24px;overflow:hidden">
      <table class="data-table">
        <thead><tr><th>TOOL</th><th>COUNT</th></tr></thead>
        <tbody>
          ${Object.entries(_usage.by_tool).map(([tool, count]) =>
            `<tr><td>${_esc(tool.replace(/_/g, ' '))}</td><td style="font-family:var(--font-mono)">${_esc(String(count))}</td></tr>`
          ).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Subscription -->
    <div class="panel-label" style="margin-bottom:12px;margin-top:24px">[SUBSCRIPTION]</div>
    <div class="card" style="padding:20px;margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-family:var(--font-display);font-size:14px;color:var(--text-main);margin-bottom:4px">Current Plan</div>
          <span class="badge" style="${tier === 'pro' ? 'background:rgba(156,170,126,0.15);color:var(--accent-olive)' : ''}">${tier.toUpperCase()}</span>
        </div>
        ${tier === 'pro' ? `
          <button id="btn-manage-sub" class="btn-ghost">Manage Subscription</button>
        ` : `
          <a href="#/pricing" class="btn-primary" style="text-decoration:none">Upgrade</a>
        `}
      </div>
    </div>

    <!-- Back -->
    <button id="btn-back-app" class="btn-ghost" style="width:100%">Back to App</button>
  </div>`;

  // Events
  const manageBtn = _container.querySelector('#btn-manage-sub');
  if (manageBtn) {
    manageBtn.addEventListener('click', async () => {
      manageBtn.textContent = 'Redirecting...';
      manageBtn.disabled = true;
      try {
        const data = await stripePortal();
        if (data.url && isValidStripeUrl(data.url)) window.location.href = data.url;
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
