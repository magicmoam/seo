// app.js - Main authenticated app page for trySEO.ai
import {
  queryAPI, getHistory, getUsage, getEvidence, downloadReport, downloadClientReport,
  getTrackedUrls, addTrackedUrl, removeTrackedUrl, runSnapshot, getSnapshots
} from '../api.js';
import { getUser, signOut, onAuthStateChanged, updateUserCredits, getGoogleClientId, isGA4OAuthEnabled } from '../auth.js';
import { navigate } from '../router.js';

let _container = null;
let _unsubAuth = null;
let _lastResult = null;
let _currentSearchId = null;
let _sidebarOpen = false;

// ── Lifecycle ──

export function mount(container) {
  _container = container;
  const user = getUser();
  if (!user) { navigate('/'); return; }

  _container.innerHTML = _layoutHtml();
  _attachEvents();
  _loadData();

  _unsubAuth = onAuthStateChanged((u) => {
    if (!u) { navigate('/'); return; }
    _updateCreditsDisplay(u);
  });

  // Sidebar toggle from nav hamburger
  window.addEventListener('toggle-sidebar', _toggleSidebar);

  // Credits exhausted
  window.addEventListener('credits-exhausted', _showUpgradeModal);

  // Check for post-auth redirect
  const postAuthUrl = sessionStorage.getItem('tryseo_post_auth_url');
  if (postAuthUrl) {
    sessionStorage.removeItem('tryseo_post_auth_url');
    const q = _container.querySelector('#query');
    if (q) {
      q.value = 'Analyze the website ' + postAuthUrl;
      setTimeout(() => _submitQuery(), 300);
    }
  }

  // Check for upgrade success
  if (window.location.hash.includes('upgraded=true')) {
    _showToast('Welcome to Pro! Your credits have been updated.', 'success');
    window.location.hash = '#/app';
  }
}

export function unmount() {
  if (_unsubAuth) _unsubAuth();
  window.removeEventListener('toggle-sidebar', _toggleSidebar);
  window.removeEventListener('credits-exhausted', _showUpgradeModal);
  _container = null;
  _lastResult = null;
  _currentSearchId = null;
}

// ── Layout ──

function _layoutHtml() {
  return `
  <div style="display:flex;min-height:calc(100vh - 52px);padding-top:0">
    <!-- Sidebar Overlay (mobile) -->
    <div id="sidebar-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:149;opacity:0;transition:opacity 0.3s"></div>

    <!-- Sidebar -->
    <div id="sidebar" style="width:260px;flex-shrink:0;background:rgba(255,255,255,0.02);border-right:1px solid var(--c-glass-border);padding:20px 14px;overflow-y:auto;height:calc(100vh - 52px);position:sticky;top:52px">
      <!-- Credits -->
      <div style="margin-bottom:16px;padding:12px;background:var(--c-accent-dim);border:1px solid rgba(212,184,149,0.15);border-radius:var(--radius)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--c-accent)">Credits</span>
          <span id="sidebar-credits" style="font-family:'Space Mono',monospace;font-size:16px;font-weight:700;color:var(--c-accent)">--</span>
        </div>
        <div id="sidebar-tier" style="font-size:10px;color:var(--c-text-tertiary);margin-top:4px"></div>
      </div>

      <!-- History -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-top:14px;position:relative">
        <span style="position:absolute;top:0;left:0;width:32px;height:1px;background:var(--c-accent)"></span>
        <span style="font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--c-accent)">History</span>
        <span id="history-count" style="font-family:'Space Mono',monospace;font-size:10px;color:var(--c-text-tertiary);background:rgba(255,255,255,0.05);padding:1px 7px;border-radius:var(--radius)">0</span>
      </div>
      <div id="history-list"><div style="color:var(--c-text-tertiary);font-size:12px;text-align:center;padding:40px 0">No searches yet</div></div>

      <!-- Tracked URLs -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;margin-bottom:16px;padding-top:14px;position:relative">
        <span style="position:absolute;top:0;left:0;width:32px;height:1px;background:var(--c-accent)"></span>
        <span style="font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--c-accent)">Tracked URLs</span>
        <span id="tracked-count" style="font-family:'Space Mono',monospace;font-size:10px;color:var(--c-text-tertiary);background:rgba(255,255,255,0.05);padding:1px 7px;border-radius:var(--radius)">0</span>
      </div>
      <div id="tracked-list"><div style="color:var(--c-text-tertiary);font-size:12px;text-align:center;padding:20px 0">No tracked URLs</div></div>

      <!-- GA4 -->
      <div id="ga4-connect-container" style="display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;margin-bottom:8px;padding-top:14px;position:relative">
          <span style="position:absolute;top:0;left:0;width:32px;height:1px;background:var(--c-accent)"></span>
          <span style="font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--c-accent)">Google Analytics</span>
        </div>
        <div id="ga4-status-content" style="padding:12px;background:rgba(255,255,255,0.02);border:1px solid var(--c-glass-border);border-radius:var(--radius)">
          <button id="btn-ga4-connect" style="width:100%;background:none;border:1px solid var(--c-accent);color:var(--c-accent);padding:8px 12px;border-radius:var(--radius);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all 0.2s">Connect Google Analytics</button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div style="flex:1;max-width:960px;margin:0 auto;padding:48px 36px 80px">
      <!-- Hero -->
      <div style="text-align:center;margin-bottom:48px" class="fade-in">
        <h2 style="font-size:44px;font-weight:300;letter-spacing:-0.04em;line-height:1.1;background:linear-gradient(180deg,#ffffff 30%,var(--c-accent) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px">
          Research, analyze &amp; rank.
        </h2>
        <p style="color:var(--c-text-tertiary);font-size:15px;font-weight:300;max-width:480px;margin:0 auto">
          AI-powered SEO intelligence. Keywords, competitors, content gaps, SERP analysis, content generation, and website audits.
        </p>
      </div>

      <!-- Tool Cards -->
      <div id="tools-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:32px" class="fade-in fade-in-delay-2">
        ${_toolCards()}
      </div>

      <!-- Dashboard Stats -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:32px" class="fade-in fade-in-delay-3">
        <div class="panel" style="padding:14px 16px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Total Cost</div><div id="dash-cost" style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700">$0.00</div></div>
        <div class="panel" style="padding:14px 16px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Queries Today</div><div id="dash-today" style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700">0</div></div>
        <div class="panel" style="padding:14px 16px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Tokens Used</div><div id="dash-tokens" style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700">0</div></div>
        <div class="panel" style="padding:14px 16px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Total Searches</div><div id="dash-searches" style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700">0</div></div>
      </div>

      <!-- Input -->
      <div style="position:relative;margin-bottom:32px" class="fade-in fade-in-delay-4">
        <textarea id="query" rows="2" placeholder="e.g. What keywords should I target for hard water shower filters?"
          style="width:100%;padding:18px 120px 18px 20px;background:var(--c-bg-card);border:1px solid var(--c-glass-border);border-radius:var(--radius);color:var(--c-text-primary);font-size:14px;font-family:Inter,sans-serif;font-weight:300;resize:none;outline:none;transition:border-color 0.2s;min-height:58px;max-height:120px;line-height:1.5"></textarea>
        <button id="submit-btn" style="position:absolute;right:10px;bottom:10px;padding:8px 24px;border:1px solid var(--c-glass-border);border-radius:var(--radius);background:rgba(212,184,149,0.08);color:var(--c-accent);font-size:12px;font-weight:500;font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;transition:all 0.2s">Run</button>
      </div>

      <!-- Error -->
      <div id="error-msg" style="display:none;background:rgba(255,107,107,0.06);border:1px solid rgba(255,107,107,0.15);border-radius:var(--radius);padding:14px 18px;color:var(--c-red);font-size:13px;margin-bottom:20px"></div>

      <!-- Loading -->
      <div id="loading" style="display:none;text-align:center;padding:60px 0">
        <div class="spinner"></div>
        <p style="color:var(--c-text-tertiary);font-size:13px;margin-top:16px">Researching with Jina AI and analyzing with LLM...</p>
      </div>

      <!-- Result -->
      <div id="result"></div>
    </div>
  </div>

  <!-- Trend Modal -->
  <div id="trend-modal" class="modal-backdrop">
    <div class="modal-content" style="max-width:600px">
      <button class="modal-close" id="trend-modal-close">&times;</button>
      <div id="trend-modal-body"></div>
    </div>
  </div>

  <!-- Upgrade Modal -->
  <div id="upgrade-modal" class="modal-backdrop">
    <div class="modal-content" style="text-align:center;max-width:420px">
      <button class="modal-close" id="upgrade-modal-close">&times;</button>
      <h3 style="font-size:20px;font-weight:400;color:var(--c-text-primary);margin-bottom:8px">Credits Exhausted</h3>
      <p style="color:var(--c-text-secondary);font-size:13px;margin-bottom:20px">You have run out of credits. Upgrade to Pro for 200 credits/month.</p>
      <a href="#/pricing" class="btn-primary-solid" style="text-decoration:none;display:inline-block;padding:12px 32px">Upgrade to Pro</a>
    </div>
  </div>

  <!-- GA4 Property Modal -->
  <div id="ga4-property-modal" class="modal-backdrop">
    <div class="modal-content" style="max-width:480px">
      <button class="modal-close" id="ga4-property-close">&times;</button>
      <h3 style="font-size:16px;font-weight:600;color:var(--c-text-primary);margin-bottom:4px">Select a GA4 Property</h3>
      <p style="font-size:13px;color:var(--c-text-tertiary);margin-bottom:16px">Choose which property to use for analytics data.</p>
      <div id="ga4-property-list"><div style="text-align:center;padding:24px;color:var(--c-text-tertiary);font-size:13px">Loading properties...</div></div>
    </div>
  </div>`;
}

function _toolCards() {
  const tools = [
    { q: 'Find keywords for ', num: '01', name: 'Keywords', desc: 'Volume, difficulty & long-tail', credits: 1 },
    { q: 'Analyze competitors for ', num: '02', name: 'Competitors', desc: 'Strengths, weaknesses & gaps', credits: 2 },
    { q: 'Analyze SERP for ', num: '03', name: 'SERP', desc: 'Features, intent & positions', credits: 1 },
    { q: 'Find content gaps for ', num: '04', name: 'Content Gaps', desc: 'Underserved topics & angles', credits: 1 },
    { q: 'Write a blog post about ', num: '05', name: 'Generate Content', desc: 'SEO-optimized articles', credits: 2 },
    { q: 'Analyze the website ', num: '06', name: 'Website Analyzer', desc: 'SEO audit & scoring', credits: 2 },
    { q: 'Map topical authority for ', num: '07', name: 'Topical Authority', desc: 'Topic clusters & pillars', credits: 1 },
    { q: 'Run technical SEO audit for ', num: '08', name: 'Technical SEO', desc: 'Speed, crawl & indexation', credits: 2 },
    { q: 'Find backlink opportunities for ', num: '09', name: 'Backlinks', desc: 'Link building strategy', credits: 1 },
    { q: 'Create SEO strategy for ', num: '10', name: 'SEO Strategy', desc: 'Complete multi-tool plan', credits: 10 },
  ];
  return tools.map(t => `
    <div class="tool-card-btn glass" data-q="${_esc(t.q)}" style="padding:16px 18px;cursor:pointer;transition:all 0.2s;position:relative">
      <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--c-text-tertiary);margin-bottom:6px">${t.num}</div>
      <div style="font-size:13px;font-weight:500;color:var(--c-text-primary);margin-bottom:3px">${t.name}</div>
      <div style="font-size:11px;color:var(--c-text-tertiary);line-height:1.4">${t.desc}</div>
      <div style="position:absolute;top:8px;right:8px;font-family:'Space Mono',monospace;font-size:9px;color:var(--c-accent);padding:1px 6px;background:var(--c-accent-dim);border-radius:var(--radius)">${t.credits}cr</div>
    </div>
  `).join('');
}

// ── Events ──

function _attachEvents() {
  // Tool card clicks
  _container.querySelectorAll('.tool-card-btn').forEach(card => {
    card.addEventListener('click', () => {
      const q = _container.querySelector('#query');
      q.value = card.dataset.q;
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
      _container.querySelectorAll('.tool-card-btn').forEach(c => c.style.borderColor = '');
      card.style.borderColor = 'rgba(212, 184, 149, 0.3)';
    });
  });

  // Submit
  const submitBtn = _container.querySelector('#submit-btn');
  submitBtn.addEventListener('click', _submitQuery);

  const queryEl = _container.querySelector('#query');
  queryEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _submitQuery(); }
  });

  // Sidebar overlay close
  const overlay = _container.querySelector('#sidebar-overlay');
  if (overlay) overlay.addEventListener('click', _closeSidebar);

  // Modal closes
  _container.querySelector('#trend-modal-close')?.addEventListener('click', () => _container.querySelector('#trend-modal').classList.remove('show'));
  _container.querySelector('#trend-modal')?.addEventListener('click', (e) => { if (e.target.id === 'trend-modal') e.target.classList.remove('show'); });
  _container.querySelector('#upgrade-modal-close')?.addEventListener('click', () => _container.querySelector('#upgrade-modal').classList.remove('show'));
  _container.querySelector('#upgrade-modal')?.addEventListener('click', (e) => { if (e.target.id === 'upgrade-modal') e.target.classList.remove('show'); });
  _container.querySelector('#ga4-property-close')?.addEventListener('click', () => _container.querySelector('#ga4-property-modal').classList.remove('show'));
  _container.querySelector('#ga4-property-modal')?.addEventListener('click', (e) => { if (e.target.id === 'ga4-property-modal') e.target.classList.remove('show'); });

  // GA4 connect
  _container.querySelector('#btn-ga4-connect')?.addEventListener('click', _connectGA4);
}

// ── Data loading ──

async function _loadData() {
  _loadHistory();
  _loadUsage();
  _loadTrackedUrls();
  _loadGA4Status();
}

async function _loadHistory() {
  try {
    const data = await getHistory();
    _renderHistory(data);
  } catch (e) { /* silent */ }
}

async function _loadUsage() {
  try {
    const data = await getUsage();
    const el = (id) => _container?.querySelector('#' + id);
    if (el('dash-cost')) el('dash-cost').textContent = '$' + (data.total_cost || 0).toFixed(2);
    if (el('dash-today')) el('dash-today').textContent = data.today_queries || 0;
    if (el('dash-tokens')) el('dash-tokens').textContent = _formatNum(data.total_tokens || 0);
    if (el('dash-searches')) el('dash-searches').textContent = data.total_searches || 0;

    // Update credits
    const user = getUser();
    if (user) {
      user.credits_remaining = data.credits_remaining ?? 0;
      user.tier = data.tier || 'free';
      _updateCreditsDisplay(user);
    }
  } catch (e) { /* silent */ }
}

function _updateCreditsDisplay(user) {
  if (!_container) return;
  const creditsEl = _container.querySelector('#sidebar-credits');
  const tierEl = _container.querySelector('#sidebar-tier');
  if (creditsEl) creditsEl.textContent = user.credits_remaining ?? '--';
  if (tierEl) tierEl.textContent = (user.tier || 'free').toUpperCase() + ' tier';
}

async function _loadTrackedUrls() {
  try {
    const urls = await getTrackedUrls();
    _renderTrackedUrls(urls);
  } catch (e) { /* silent */ }
}

async function _loadGA4Status() {
  if (!isGA4OAuthEnabled()) return;
  const ga4Container = _container?.querySelector('#ga4-connect-container');
  if (ga4Container) ga4Container.style.display = 'block';
  try {
    const res = await fetch('/api/ga4/status', {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('seo_token')}`, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    _renderGA4Status(data);
  } catch (e) {
    _renderGA4Status({ connected: false });
  }
}

// ── History ──

function _renderHistory(items) {
  if (!_container) return;
  const list = _container.querySelector('#history-list');
  const count = _container.querySelector('#history-count');
  count.textContent = items.length;
  if (!items.length) {
    list.innerHTML = '<div style="color:var(--c-text-tertiary);font-size:12px;text-align:center;padding:40px 0">No searches yet</div>';
    return;
  }
  list.innerHTML = items.map((item, i) => {
    const date = new Date(item.created_at).toLocaleDateString();
    return `<div class="history-item-btn" data-idx="${i}" style="padding:10px 12px;border-radius:var(--radius);margin-bottom:1px;cursor:pointer;transition:background 0.15s">
      <div style="font-size:13px;font-weight:400;color:var(--c-text-primary);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(item.query)}</div>
      <div style="font-size:10px;color:var(--c-text-tertiary);display:flex;gap:8px">
        <span style="color:var(--c-accent);font-weight:500;text-transform:capitalize">${item.tool_used.replace(/_/g, ' ')}</span>
        <span>${date}</span>
      </div>
    </div>`;
  }).join('');

  // Click handlers
  list.querySelectorAll('.history-item-btn').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      const item = items[idx];
      _closeSidebar();
      _currentSearchId = item.id || null;
      _renderResult({ tool_used: item.tool_used, query: item.query, result: item.result }, _currentSearchId);
    });
    el.addEventListener('mouseenter', () => el.style.background = 'rgba(255,255,255,0.04)');
    el.addEventListener('mouseleave', () => el.style.background = '');
  });
}

// ── Tracked URLs ──

function _renderTrackedUrls(urls) {
  if (!_container) return;
  const list = _container.querySelector('#tracked-list');
  const count = _container.querySelector('#tracked-count');
  count.textContent = urls.length;
  if (!urls.length) {
    list.innerHTML = '<div style="color:var(--c-text-tertiary);font-size:12px;text-align:center;padding:20px 0">No tracked URLs</div>';
    return;
  }
  list.innerHTML = urls.map(t => {
    const domain = (t.url || '').replace(/https?:\/\//, '').split('/')[0];
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;margin-bottom:4px;background:rgba(255,255,255,0.02);border:1px solid var(--c-glass-border);border-radius:var(--radius)">
      <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--c-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(domain)}</div></div>
      <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
        <button class="btn-show-trend" data-url="${_esc(t.url)}" style="background:none;border:1px solid var(--c-glass-border);color:var(--c-text-secondary);padding:3px 8px;border-radius:var(--radius);font-size:10px;cursor:pointer;font-family:inherit">Trends</button>
        <button class="btn-run-snapshot" data-url="${_esc(t.url)}" style="background:none;border:1px solid var(--c-glass-border);color:var(--c-text-secondary);padding:3px 8px;border-radius:var(--radius);font-size:10px;cursor:pointer;font-family:inherit">Audit</button>
        <button class="btn-untrack" data-id="${t.id}" style="background:none;border:none;color:var(--c-text-tertiary);cursor:pointer;font-size:14px;padding:2px">&times;</button>
      </div>
    </div>`;
  }).join('');

  // Events
  list.querySelectorAll('.btn-show-trend').forEach(btn => {
    btn.addEventListener('click', () => _showTrend(btn.dataset.url));
  });
  list.querySelectorAll('.btn-run-snapshot').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.textContent = '...';
      btn.disabled = true;
      try {
        await runSnapshot(btn.dataset.url);
        _loadTrackedUrls();
      } catch (e) { /* silent */ }
      btn.textContent = 'Audit';
      btn.disabled = false;
    });
  });
  list.querySelectorAll('.btn-untrack').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeTrackedUrl(btn.dataset.id);
      _loadTrackedUrls();
    });
  });
}

// ── GA4 ──

function _renderGA4Status(data) {
  if (!_container) return;
  const el = _container.querySelector('#ga4-status-content');
  if (!el) return;

  if (data.connected) {
    const propName = data.selected_property_name || 'No property selected';
    const propId = data.selected_property_id || '';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px rgba(74,222,128,0.4);flex-shrink:0"></span>
        <span style="font-size:12px;color:var(--c-text-secondary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(propName)}</span>
      </div>
      ${propId ? `<div style="font-size:11px;color:var(--c-text-tertiary);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(propId)}</div>` : ''}
      <div style="display:flex;gap:6px">
        <button id="btn-ga4-change" style="flex:1;background:none;border:1px solid var(--c-glass-border);color:var(--c-text-secondary);padding:5px 8px;border-radius:var(--radius);font-size:11px;cursor:pointer;font-family:inherit">Change</button>
        <button id="btn-ga4-disconnect" style="flex:1;background:none;border:1px solid var(--c-glass-border);color:var(--c-text-secondary);padding:5px 8px;border-radius:var(--radius);font-size:11px;cursor:pointer;font-family:inherit">Disconnect</button>
      </div>`;
    el.querySelector('#btn-ga4-change')?.addEventListener('click', _openPropertySelector);
    el.querySelector('#btn-ga4-disconnect')?.addEventListener('click', _disconnectGA4);
  } else {
    el.innerHTML = '<button id="btn-ga4-connect" style="width:100%;background:none;border:1px solid var(--c-accent);color:var(--c-accent);padding:8px 12px;border-radius:var(--radius);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all 0.2s">Connect Google Analytics</button>';
    el.querySelector('#btn-ga4-connect')?.addEventListener('click', _connectGA4);
  }
}

function _connectGA4() {
  if (typeof google === 'undefined' || !google.accounts?.oauth2) return;
  const client = google.accounts.oauth2.initCodeClient({
    client_id: getGoogleClientId(),
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    ux_mode: 'popup',
    callback: async (response) => {
      if (response.error) return;
      try {
        const res = await fetch('/api/ga4/connect', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('seo_token')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: response.code }),
        });
        const data = await res.json();
        if (data.error) { alert(data.error); return; }
        _openPropertySelector();
      } catch (e) { alert('Failed to connect: ' + e.message); }
    },
  });
  client.requestCode();
}

async function _openPropertySelector() {
  const modal = _container?.querySelector('#ga4-property-modal');
  const list = _container?.querySelector('#ga4-property-list');
  if (!modal || !list) return;
  list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--c-text-tertiary);font-size:13px">Loading properties...</div>';
  modal.classList.add('show');
  try {
    const res = await fetch('/api/ga4/properties', {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('seo_token')}`, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.error || !data.properties?.length) {
      list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--c-text-tertiary);font-size:13px">${data.error || 'No GA4 properties found.'}</div>`;
      return;
    }
    list.innerHTML = data.properties.map(p => `
      <div class="ga4-prop-item" data-pid="${_esc(p.property_id)}" data-pname="${_esc(p.display_name)}"
        style="display:flex;flex-direction:column;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--c-glass-border);border-radius:var(--radius);cursor:pointer;transition:all 0.2s;margin-bottom:6px">
        <span style="font-size:13px;color:var(--c-text-primary);font-weight:500">${_esc(p.display_name)}</span>
        <span style="font-size:11px;color:var(--c-text-tertiary);margin-top:2px">${_esc(p.account_name)}</span>
        <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);margin-top:2px">${_esc(p.property_id)}</span>
      </div>
    `).join('');
    list.querySelectorAll('.ga4-prop-item').forEach(el => {
      el.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/ga4/select-property', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('seo_token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: el.dataset.pid, property_name: el.dataset.pname }),
          });
          const data = await res.json();
          if (data.error) { alert(data.error); return; }
          modal.classList.remove('show');
          _loadGA4Status();
        } catch (e) { alert('Failed: ' + e.message); }
      });
      el.addEventListener('mouseenter', () => { el.style.borderColor = 'var(--c-accent)'; el.style.background = 'var(--c-accent-dim)'; });
      el.addEventListener('mouseleave', () => { el.style.borderColor = ''; el.style.background = ''; });
    });
  } catch (e) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--c-red);font-size:13px">Failed to load: ${_esc(e.message)}</div>`;
  }
}

async function _disconnectGA4() {
  if (!confirm('Disconnect Google Analytics? Your stored tokens will be removed.')) return;
  try {
    await fetch('/api/ga4/disconnect', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('seo_token')}`, 'Content-Type': 'application/json' }
    });
    _loadGA4Status();
  } catch (e) { alert('Failed: ' + e.message); }
}

// ── Query submission ──

async function _submitQuery() {
  if (!_container) return;
  const queryEl = _container.querySelector('#query');
  const query = queryEl.value.trim();
  if (!query) return;

  const errorEl = _container.querySelector('#error-msg');
  const resultEl = _container.querySelector('#result');
  const loadingEl = _container.querySelector('#loading');
  const submitBtn = _container.querySelector('#submit-btn');

  errorEl.style.display = 'none';
  resultEl.innerHTML = '';
  loadingEl.style.display = 'block';
  submitBtn.disabled = true;

  try {
    const data = await queryAPI(query);
    if (data.error) {
      errorEl.textContent = data.error;
      errorEl.style.display = 'block';
      return;
    }
    _currentSearchId = data.search_id || null;
    _lastResult = data;
    _renderResult(data, _currentSearchId);
    queryEl.value = '';
    _loadHistory();
    _loadUsage();
  } catch (err) {
    if (err.message !== 'Credits exhausted') {
      errorEl.textContent = err.message || 'Network error';
      errorEl.style.display = 'block';
    }
  } finally {
    loadingEl.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// ── Result rendering ──

function _renderResult(data, searchId) {
  if (!_container) return;
  _lastResult = data;
  const el = _container.querySelector('#result');
  const tool = data.tool_used;
  const r = data.result;

  let html = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--c-glass-border);flex-wrap:wrap">
    <span class="badge badge-intent">${tool.replace(/_/g, ' ')}</span>
    <span style="color:var(--c-text-tertiary);font-size:13px">${_esc(data.query)}</span>
    <button class="btn-dl-report btn-ghost" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      <span class="dl-label">Download Report</span>
    </button>
    ${(tool === 'website_analyzer' || tool === 'seo_strategy') ? `
    <button class="btn-dl-docx btn-ghost" style="display:inline-flex;align-items:center;gap:6px">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <span class="dl-label-docx">Client Report</span>
    </button>` : ''}
  </div>`;

  // Evidence actions
  if (searchId) {
    html += `<div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn-toggle-evidence btn-ghost">View Evidence Chain</button>
    </div>
    <div id="evidence-panel" style="display:none" class="panel"></div>`;
  }

  // Tool-specific rendering
  if (tool === 'keyword_research') html += _renderKeywords(r);
  else if (tool === 'competitor_analysis') html += _renderCompetitors(r);
  else if (tool === 'serp_analysis') html += _renderSERP(r);
  else if (tool === 'content_gap') html += _renderGaps(r);
  else if (tool === 'content_generation') html += _renderContent(r);
  else if (tool === 'website_analyzer') html += _renderAnalyzer(r);
  else if (tool === 'topical_authority') html += _renderTopicalAuthority(r);
  else if (tool === 'technical_seo') html += _renderTechnicalSEO(r);
  else if (tool === 'backlink_strategy') html += _renderBacklinks(r);
  else if (tool === 'seo_strategy') html += _renderStrategy(r);
  else if (tool === 'ga4_analytics') html += _renderGA4Analytics(r);
  else html += `<pre style="background:var(--c-bg-card);border:1px solid var(--c-glass-border);border-radius:var(--radius);padding:20px;font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-secondary);overflow-x:auto;white-space:pre-wrap;word-break:break-word">${JSON.stringify(r, null, 2)}</pre>`;

  el.innerHTML = html;
  el.style.animation = 'fadeIn 0.5s ease-out';
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Attach result-level events
  el.querySelector('.btn-dl-report')?.addEventListener('click', () => _doDownloadReport());
  el.querySelector('.btn-dl-docx')?.addEventListener('click', () => _doDownloadClientReport());
  el.querySelector('.btn-toggle-evidence')?.addEventListener('click', () => _toggleEvidence(searchId));

  // Track URL button (in analyzer)
  el.querySelector('.btn-track-url')?.addEventListener('click', async (e) => {
    const url = e.target.dataset.url;
    try {
      await addTrackedUrl(url);
      await runSnapshot(url);
      _loadTrackedUrls();
      _showToast('URL is now being tracked', 'success');
    } catch (err) { _showToast('Failed to track: ' + err.message, 'error'); }
  });

  // Rubric category toggles
  el.querySelectorAll('.rubric-cat-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.rubric-cat-section');
      const list = parent?.querySelector('.rubric-criteria-inner');
      const chevron = btn.querySelector('.rubric-chevron');
      if (list) {
        const isOpen = list.style.display !== 'none';
        list.style.display = isOpen ? 'none' : 'block';
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
      }
    });
  });
}

// ── Tool renderers ──

function _renderKeywords(r) {
  let h = `<div class="panel"><table class="data-table"><thead><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>Intent</th><th>CPC</th><th>Notes</th></tr></thead><tbody>`;
  for (const k of (r.keywords || [])) {
    h += `<tr><td><strong>${_esc(k.keyword)}</strong></td><td>${_esc(k.search_volume)}</td><td>${_diffBadge(k.difficulty)}</td><td>${_intentBadge(k.intent)}</td><td>${_esc(k.cpc_estimate)}</td><td class="cell-dim">${_esc(k.notes)}</td></tr>`;
  }
  h += '</tbody></table></div>';
  if (r.long_tail_suggestions?.length) {
    h += `<div class="panel"><div class="panel-label">Long-tail Suggestions</div><ul class="panel-list">${r.long_tail_suggestions.map(s => `<li>${_esc(s)}</li>`).join('')}</ul></div>`;
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary)}</p></div>`;
  return h;
}

function _renderCompetitors(r) {
  let h = '';
  for (const c of (r.competitors || [])) {
    h += `<div class="panel"><h3 style="font-size:15px;font-weight:500;color:var(--c-text-primary);margin-bottom:3px">${_esc(c.title)}</h3>
      <div style="color:var(--c-text-tertiary);font-size:11px;margin-bottom:12px;word-break:break-all">${_esc(c.url)}</div>
      <div style="display:flex;gap:14px;margin-bottom:14px;font-size:11px;color:var(--c-text-tertiary)"><span>${_esc(c.content_type)}</span><span>~${_esc(c.estimated_word_count)} words</span></div>
      <ul style="list-style:none;padding:0;font-size:12px;margin-bottom:6px">${(c.strengths||[]).map(s=>`<li style="color:var(--c-green);margin-bottom:4px;padding-left:16px;position:relative;line-height:1.4"><span style="position:absolute;left:0;font-family:'Space Mono',monospace;font-size:12px">+</span>${_esc(s)}</li>`).join('')}</ul>
      <ul style="list-style:none;padding:0;font-size:12px">${(c.weaknesses||[]).map(w=>`<li style="color:rgba(255,107,107,0.7);margin-bottom:4px;padding-left:16px;position:relative;line-height:1.4"><span style="position:absolute;left:0;font-family:'Space Mono',monospace;font-size:12px">&minus;</span>${_esc(w)}</li>`).join('')}</ul>
    </div>`;
  }
  if (r.opportunities?.length) {
    h += `<div class="panel"><div class="panel-label">Opportunities</div><ul class="panel-list">${r.opportunities.map(o=>`<li>${_esc(o)}</li>`).join('')}</ul></div>`;
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary)}</p></div>`;
  return h;
}

function _renderSERP(r) {
  let h = `<div class="panel"><table class="data-table"><thead><tr><th>#</th><th>Title</th><th>Type</th><th>URL</th></tr></thead><tbody>`;
  for (const e of (r.entries || [])) {
    h += `<tr><td><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:var(--radius);background:var(--c-accent-dim);font-family:'Space Mono',monospace;font-size:11px;color:var(--c-accent);border:1px solid rgba(212,184,149,0.1)">${e.position}</span></td>
      <td><strong>${_esc(e.title)}</strong><br><span class="cell-dim">${_esc(e.snippet)}</span></td>
      <td>${_intentBadge(e.content_type)}</td>
      <td class="cell-dim" style="word-break:break-all">${_esc(e.url)}</td></tr>`;
  }
  h += '</tbody></table></div>';
  h += `<div class="panel"><div class="panel-label">SERP Features</div><ul class="panel-list">${(r.serp_features||[]).map(f=>`<li>${_esc(f)}</li>`).join('')}</ul></div>`;
  h += `<div class="panel"><div class="panel-label">Dominant Intent: ${_esc(r.dominant_intent)}</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary)}</p></div>`;
  return h;
}

function _renderGaps(r) {
  let h = `<div class="panel"><table class="data-table"><thead><tr><th>Topic</th><th>Gap Type</th><th>Opportunity</th><th>Suggested Angle</th></tr></thead><tbody>`;
  for (const g of (r.gaps || [])) {
    h += `<tr><td><strong>${_esc(g.topic)}</strong></td><td>${_esc(g.gap_type)}</td><td>${_diffBadge(g.opportunity_score)}</td><td class="cell-dim">${_esc(g.suggested_angle)}</td></tr>`;
  }
  h += '</tbody></table></div>';
  if (r.underserved_subtopics?.length) {
    h += `<div class="panel"><div class="panel-label">Underserved Subtopics</div><ul class="panel-list">${r.underserved_subtopics.map(s=>`<li>${_esc(s)}</li>`).join('')}</ul></div>`;
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary)}</p></div>`;
  return h;
}

function _renderContent(r) {
  let h = `<div class="panel"><h2 style="font-size:22px;font-weight:400;letter-spacing:-0.02em;color:var(--c-text-primary);margin-bottom:8px">${_esc(r.title)}</h2>
    <p style="color:var(--c-text-secondary);font-size:13px;font-style:italic;font-weight:300;margin-bottom:14px">${_esc(r.meta_description)}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <span style="padding:3px 10px;background:var(--c-accent-dim);border:1px solid rgba(212,184,149,0.15);border-radius:var(--radius);font-size:11px;color:var(--c-accent);font-family:'Space Mono',monospace">${_esc(r.target_keyword)}</span>
      ${(r.secondary_keywords||[]).map(k=>`<span style="padding:3px 10px;background:var(--c-accent-dim);border:1px solid rgba(212,184,149,0.15);border-radius:var(--radius);font-size:11px;color:var(--c-accent);font-family:'Space Mono',monospace">${_esc(k)}</span>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--c-text-tertiary);font-family:'Space Mono',monospace">${r.word_count} words</p>
  </div>`;
  if (r.outline?.length) {
    h += `<div class="panel"><div class="panel-label">Outline</div><ul class="panel-list">${r.outline.map(o=>`<li>${_esc(o)}</li>`).join('')}</ul></div>`;
  }
  let content = _esc(r.content || '')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  h += `<div class="panel" style="font-size:14px;line-height:1.8;font-weight:300;color:var(--c-text-secondary)"><p>${content}</p></div>`;
  if (r.seo_notes?.length) {
    h += `<div class="panel"><div class="panel-label">SEO Notes</div><ul class="panel-list">${r.seo_notes.map(n=>`<li>${_esc(n)}</li>`).join('')}</ul></div>`;
  }
  return h;
}

function _renderAnalyzer(r) {
  let h = '';
  // Overview
  h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
    <div class="panel" style="text-align:center;padding:14px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Overall Score</div><div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700">${r.overall_score}/100</div></div>
    <div class="panel" style="text-align:center;padding:14px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Word Count</div><div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700">${_formatNum(r.word_count)}</div></div>
    <div class="panel" style="text-align:center;padding:14px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">Internal Links</div><div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700">${r.internal_links}</div></div>
    <div class="panel" style="text-align:center;padding:14px"><div class="label" style="font-size:9px;padding:0;margin-bottom:4px">External Links</div><div style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700">${r.external_links}</div></div>
  </div>`;

  // Score grid
  if (r.rubric) {
    const catMap = {};
    for (const cat of r.rubric.categories) catMap[cat.category] = cat;
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">';
    for (const catName of ['performance', 'seo', 'content', 'technical']) {
      const cat = catMap[catName];
      if (cat) {
        const barColor = cat.score >= 70 ? 'var(--c-green)' : cat.score >= 40 ? 'var(--c-yellow)' : 'var(--c-red)';
        h += `<div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">${catName}</div>
          <div style="font-family:'Space Mono',monospace;font-size:16px;font-weight:700;color:${barColor}">${cat.score}/100</div>
          <div style="font-size:10px;color:var(--c-text-tertiary);margin-top:2px">${cat.passed_count}/${cat.total_count} passed</div>
          <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;width:${cat.score}%;background:${barColor};border-radius:2px"></div></div>
        </div>`;
      }
    }
    h += '</div>';
    // Rubric breakdown
    h += _renderRubricBreakdown(r.rubric);
  } else {
    h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
      <div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">Performance</div>${_diffBadge(r.performance_score)}</div>
      <div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">SEO</div>${_diffBadge(r.seo_score)}</div>
      <div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">Content</div>${_diffBadge(r.content_score)}</div>
      <div class="panel" style="padding:12px"><div class="label" style="font-size:9px;padding:0;margin-bottom:6px">Technical</div>${_diffBadge(r.technical_score)}</div>
    </div>`;
  }

  // Path to 80
  if (r.path_to_80) h += _renderPathTo80(r.path_to_80);

  // Meta
  h += `<div class="panel"><div class="panel-label">Page Meta</div>
    <p style="font-size:14px;font-weight:500;color:var(--c-text-primary);margin-bottom:4px">${_esc(r.page_title)}</p>
    <p style="font-size:12px;color:var(--c-text-tertiary);margin-bottom:8px;word-break:break-all">${_esc(r.url)}</p>
    <p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary);font-style:italic">${_esc(r.meta_description)}</p>
  </div>`;

  // Issues
  if (r.issues?.length) {
    h += `<div class="panel"><div class="panel-label">Issues Found</div><table class="data-table"><thead><tr><th>Severity</th><th>Issue</th><th>Description</th><th>Recommendation</th></tr></thead><tbody>`;
    for (const iss of r.issues) {
      h += `<tr><td>${_diffBadge(iss.severity)}</td><td><strong>${_esc(iss.issue)}</strong></td><td class="cell-dim">${_esc(iss.description)}</td><td class="cell-dim">${_esc(iss.recommendation)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }

  // Headings
  if (r.heading_structure?.length) {
    h += `<div class="panel"><div class="panel-label">Heading Structure</div><ul class="panel-list">${r.heading_structure.map(hs=>`<li>${_esc(hs)}</li>`).join('')}</ul></div>`;
  }

  // Schema
  if (r.schema_markup?.length) {
    h += `<div class="panel"><div class="panel-label">Schema Markup</div><ul class="panel-list">${r.schema_markup.map(sm=>`<li>${_esc(sm)}</li>`).join('')}</ul></div>`;
  }

  // Summary
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary)}</p></div>`;

  // Track button
  h += `<div class="panel" style="text-align:center">
    <button class="btn-track-url btn-primary-solid" data-url="${_esc(r.url)}">Track This URL for Score Trends</button>
    <p style="font-size:11px;color:var(--c-text-tertiary);margin-top:6px">Get weekly automated audits and track score changes over time</p>
  </div>`;
  return h;
}

function _renderTopicalAuthority(r) {
  let h = '';
  if (r.pillar_pages?.length) {
    h += `<div class="panel"><div class="panel-label">Pillar Pages</div><ul class="panel-list">${r.pillar_pages.map(p=>`<li>${_esc(p)}</li>`).join('')}</ul></div>`;
  }
  if (r.topic_clusters?.length) {
    h += `<div class="panel"><div class="panel-label">Topic Clusters</div><table class="data-table"><thead><tr><th>Cluster</th><th>Subtopics</th></tr></thead><tbody>`;
    for (const c of r.topic_clusters) {
      const subtopics = Array.isArray(c.subtopics) ? c.subtopics.join(', ') : (c.subtopics || '');
      h += `<tr><td><strong>${_esc(c.cluster || c.topic)}</strong></td><td class="cell-dim">${_esc(subtopics)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  if (r.content_calendar?.length) {
    h += `<div class="panel"><div class="panel-label">Content Calendar</div><ul class="panel-list">${r.content_calendar.map(c=>`<li>${_esc(c)}</li>`).join('')}</ul></div>`;
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary)}</p></div>`;
  return h;
}

function _renderTechnicalSEO(r) {
  let h = '';
  if (r.issues?.length) {
    h += `<div class="panel"><div class="panel-label">Technical Issues</div><table class="data-table"><thead><tr><th>Severity</th><th>Issue</th><th>Description</th><th>Recommendation</th></tr></thead><tbody>`;
    for (const iss of r.issues) {
      h += `<tr><td>${_diffBadge(iss.severity)}</td><td><strong>${_esc(iss.issue)}</strong></td><td class="cell-dim">${_esc(iss.description)}</td><td class="cell-dim">${_esc(iss.recommendation)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary)}</p></div>`;
  return h;
}

function _renderBacklinks(r) {
  let h = '';
  if (r.opportunities?.length) {
    h += `<div class="panel"><div class="panel-label">Backlink Opportunities</div><table class="data-table"><thead><tr><th>Source</th><th>Type</th><th>Authority</th><th>Strategy</th></tr></thead><tbody>`;
    for (const o of r.opportunities) {
      h += `<tr><td><strong>${_esc(o.source || o.domain)}</strong></td><td>${_esc(o.type || o.link_type)}</td><td>${_diffBadge(o.authority || o.domain_authority)}</td><td class="cell-dim">${_esc(o.strategy || o.approach)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary)}</p></div>`;
  return h;
}

function _renderStrategy(r) {
  let h = '';
  // Strategy results can have multiple sub-results
  if (r.phases || r.website_analysis || r.keyword_research || r.executive_summary) {
    if (r.executive_summary) {
      h += `<div class="panel"><div class="panel-label">Executive Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.executive_summary)}</p></div>`;
    }
    if (r.key_findings?.length) {
      h += `<div class="panel"><div class="panel-label">Key Findings</div><ul class="panel-list">${r.key_findings.map(f=>`<li>${_esc(f)}</li>`).join('')}</ul></div>`;
    }
    if (r.action_items?.length) {
      h += `<div class="panel"><div class="panel-label">Action Items</div><table class="data-table"><thead><tr><th>Priority</th><th>Action</th><th>Category</th></tr></thead><tbody>`;
      for (const a of r.action_items) {
        h += `<tr><td>${_diffBadge(a.priority)}</td><td>${_esc(a.action || a.description)}</td><td class="cell-dim">${_esc(a.category)}</td></tr>`;
      }
      h += '</tbody></table></div>';
    }
    if (r.content_calendar?.length) {
      h += `<div class="panel"><div class="panel-label">Content Calendar</div><ul class="panel-list">${r.content_calendar.map(c=>`<li>${_esc(typeof c === 'string' ? c : c.title || JSON.stringify(c))}</li>`).join('')}</ul></div>`;
    }
  }
  h += `<div class="panel"><div class="panel-label">Summary</div><p style="font-size:14px;font-weight:300;line-height:1.7;color:var(--c-text-secondary)">${_esc(r.summary || r.executive_summary || '')}</p></div>`;
  return h;
}

function _renderGA4Analytics(r) {
  const o = r.overview || {};
  let h = '';
  h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div class="panel" style="text-align:center;padding:16px"><div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--c-accent)">${_formatNum(o.total_users||0)}</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Total Users</div></div>
    <div class="panel" style="text-align:center;padding:16px"><div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--c-accent)">${_formatNum(o.sessions||0)}</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Sessions</div></div>
    <div class="panel" style="text-align:center;padding:16px"><div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--c-accent)">${_formatNum(o.pageviews||0)}</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Pageviews</div></div>
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
        <span style="font-size:13px;color:var(--c-text-primary)">${_esc(c.channel)}</span>
        <div style="flex:1;margin:0 12px;height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden"><div style="height:100%;background:var(--c-accent);border-radius:2px;width:${c.percentage}%"></div></div>
        <span style="font-family:'Space Mono',monospace;font-size:12px;color:var(--c-text-secondary);min-width:40px;text-align:right">${c.percentage}%</span>
      </div>`;
    }
    h += '</div></div>';
  }
  if (r.top_pages?.length) {
    h += `<div class="panel"><div class="panel-label">Top Pages</div><table class="data-table"><thead><tr><th>Page</th><th>Views</th><th>Avg Time</th><th>Bounce</th></tr></thead><tbody>`;
    for (const p of r.top_pages.slice(0, 15)) {
      h += `<tr><td style="word-break:break-all"><strong>${_esc(p.page_title||p.page_path)}</strong><br><span class="cell-dim">${_esc(p.page_path)}</span></td><td>${_formatNum(p.pageviews)}</td><td>${_esc(p.avg_time_on_page)}</td><td>${_esc(p.bounce_rate)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  if (r.insights?.length) {
    h += `<div class="panel"><div class="panel-label">Key Insights</div>${r.insights.map(i=>`<div style="padding:8px 12px;margin-bottom:6px;background:var(--c-accent-dim);border-left:2px solid var(--c-accent);border-radius:0 var(--radius) var(--radius) 0;font-size:13px;color:var(--c-text-secondary)">${_esc(i)}</div>`).join('')}</div>`;
  }
  return h;
}

// ── Sub-renderers ──

function _renderRubricBreakdown(rubric) {
  let h = '';
  for (const cat of rubric.categories) {
    const barColor = cat.score >= 70 ? 'var(--c-green)' : cat.score >= 40 ? 'var(--c-yellow)' : 'var(--c-red)';
    h += `<div class="rubric-cat-section" style="background:rgba(255,255,255,0.02);border:1px solid var(--c-glass-border);border-radius:var(--radius);margin-bottom:8px;overflow:hidden">
      <div class="rubric-cat-toggle" style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;transition:background 0.15s">
        <span class="rubric-chevron" style="color:var(--c-text-tertiary);font-size:12px;transition:transform 0.2s">&#9656;</span>
        <span style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-text-primary);flex:1">${_esc(cat.category)}</span>
        <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;width:60px;overflow:hidden"><div style="height:100%;width:${cat.score}%;background:${barColor};border-radius:2px"></div></div>
        <span style="font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:${barColor}">${cat.score}</span>
        <span style="font-family:'Space Mono',monospace;font-size:10px;color:var(--c-text-tertiary)">${cat.passed_count}/${cat.total_count}</span>
      </div>
      <div class="rubric-criteria-inner" style="display:none;padding:0 16px 12px">`;
    for (const cr of cat.criteria) {
      const cls = cr.passed ? 'var(--c-green)' : 'var(--c-red)';
      const icon = cr.passed ? '&#10003;' : '&#10007;';
      h += `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px">
        <span style="color:${cls};font-size:12px;flex-shrink:0;width:18px;text-align:center">${icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;color:var(--c-text-primary)">${_esc(cr.criterion_name)}</div>
          <div style="font-size:11px;color:var(--c-text-tertiary);line-height:1.4">${_esc(cr.finding)}</div>
          ${cr.recommendation && !cr.passed ? `<div style="font-size:11px;color:var(--c-yellow);margin-top:2px;line-height:1.4">${_esc(cr.recommendation)}</div>` : ''}
        </div>
        <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);flex-shrink:0;min-width:32px;text-align:right">${cr.score}</span>
      </div>`;
    }
    h += '</div></div>';
  }
  return h;
}

function _renderPathTo80(p) {
  const currentPct = Math.min(p.current_score, 100);
  const gainPct = Math.min(p.projected_score - p.current_score, 100 - currentPct);
  let running = p.current_score;

  let stepsHtml = '';
  for (const s of (p.steps || [])) {
    running += s.estimated_points;
    const crossed = running >= 80;
    stepsHtml += `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px">
      <span style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--c-green);background:rgba(107,207,127,0.12);padding:2px 6px;border-radius:3px;white-space:nowrap;min-width:50px;text-align:center">+${s.estimated_points} pts</span>
      <span style="font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(212,184,149,0.1);color:var(--c-accent);white-space:nowrap">${_esc(s.category)}</span>
      <span style="font-size:10px;padding:1px 6px;border-radius:3px;white-space:nowrap;${s.effort === 'quick_win' ? 'background:rgba(107,207,127,0.12);color:var(--c-green)' : s.effort === 'moderate' ? 'background:rgba(245,197,66,0.12);color:var(--c-yellow)' : 'background:rgba(255,107,107,0.12);color:var(--c-red)'}">${_esc((s.effort||'').replace(/_/g, ' '))}</span>
      <span style="flex:1;color:var(--c-text-primary)">${_esc(s.action)}<br><span style="font-size:11px;color:var(--c-text-tertiary)">${_esc(s.explanation)}</span></span>
      <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);min-width:28px;text-align:right;${crossed ? 'color:var(--c-green);font-weight:700' : ''}">${running}</span>
    </div>`;
  }

  return `<div style="margin-bottom:12px;padding:16px;background:rgba(255,255,255,0.02);border:1px solid var(--c-glass-border);border-left:3px solid var(--c-accent);border-radius:var(--radius)">
    <div class="label" style="padding:0;margin-bottom:10px">Path to 80</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary)">${p.current_score}</span>
      <div style="flex:1;height:10px;background:rgba(255,255,255,0.05);border-radius:5px;overflow:visible;position:relative">
        <div style="height:100%;width:${currentPct}%;background:var(--c-yellow);border-radius:5px 0 0 5px"></div>
        <div style="height:100%;position:absolute;top:0;left:${currentPct}%;width:${gainPct}%;background:var(--c-green);border-radius:0 5px 5px 0"></div>
        <div style="position:absolute;top:-3px;left:80%;width:2px;height:16px;background:var(--c-accent)"></div>
      </div>
      <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--c-accent);font-weight:700">80</span>
    </div>
    <div style="font-size:12px;color:var(--c-text-secondary);margin-bottom:12px;line-height:1.5">${_esc(p.quick_wins_summary)}</div>
    ${stepsHtml}
  </div>`;
}

// ── Evidence ──

async function _toggleEvidence(searchId) {
  if (!_container) return;
  const panel = _container.querySelector('#evidence-panel');
  if (!panel) return;
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';
  panel.innerHTML = '<p style="color:var(--c-text-tertiary);font-size:13px">Loading evidence...</p>';
  try {
    const ev = await getEvidence(searchId);
    if (ev.error) {
      panel.innerHTML = `<p style="color:var(--c-red);font-size:13px">${_esc(ev.error)}</p>`;
      return;
    }
    panel.innerHTML = _renderEvidence(ev);
  } catch (err) {
    panel.innerHTML = `<p style="color:var(--c-red);font-size:13px">Failed to load: ${_esc(err.message)}</p>`;
  }
}

function _renderEvidence(ev) {
  let h = '<div class="panel-label">Evidence Chain</div>';
  h += `<details style="margin-bottom:8px;border-left:2px solid var(--c-glass-border);padding-left:12px"><summary style="cursor:pointer;font-size:13px;font-weight:500;color:var(--c-text-primary);padding:8px 0">Routing Decision</summary>
    <p style="font-size:13px;color:var(--c-text-secondary)"><strong>Tool:</strong> ${_esc(ev.tool_used)}<br><strong>Reasoning:</strong> ${_esc(ev.routing_reasoning || 'Not captured')}</p>
    ${ev.routing_raw_response ? `<pre style="background:rgba(0,0,0,0.2);border:1px solid var(--c-glass-border);border-radius:var(--radius);padding:12px;font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);overflow-x:auto;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;margin-top:8px">${_esc(ev.routing_raw_response)}</pre>` : ''}
  </details>`;

  let sources = ev.jina_raw_responses || [];
  if (typeof sources === 'string') { try { sources = JSON.parse(sources); } catch(e) { sources = []; } }
  h += `<details style="margin-bottom:8px;border-left:2px solid var(--c-glass-border);padding-left:12px"><summary style="cursor:pointer;font-size:13px;font-weight:500;color:var(--c-text-primary);padding:8px 0">Data Sources (${sources.length})</summary>`;
  for (const src of sources) {
    const content = src.content || '';
    const preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
    h += `<details style="margin:4px 0;border-left:2px solid var(--c-glass-border);padding-left:8px"><summary style="cursor:pointer;font-size:12px;color:var(--c-text-primary);padding:4px 0">${_esc(src.title || 'Untitled')}</summary>
      <p style="font-size:11px;color:var(--c-text-tertiary);word-break:break-all;margin-bottom:4px">${_esc(src.url || '')}</p>
      <pre style="background:rgba(0,0,0,0.2);border:1px solid var(--c-glass-border);border-radius:var(--radius);padding:12px;font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);overflow-x:auto;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;margin-top:8px">${_esc(preview)}</pre>
    </details>`;
  }
  h += '</details>';
  h += `<details style="margin-bottom:8px;border-left:2px solid var(--c-glass-border);padding-left:12px"><summary style="cursor:pointer;font-size:13px;font-weight:500;color:var(--c-text-primary);padding:8px 0">System Prompt</summary><pre style="background:rgba(0,0,0,0.2);border:1px solid var(--c-glass-border);border-radius:var(--radius);padding:12px;font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);overflow-x:auto;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;margin-top:8px">${_esc(ev.system_prompt || '')}</pre></details>`;
  h += `<details style="margin-bottom:8px;border-left:2px solid var(--c-glass-border);padding-left:12px"><summary style="cursor:pointer;font-size:13px;font-weight:500;color:var(--c-text-primary);padding:8px 0">User Prompt</summary><pre style="background:rgba(0,0,0,0.2);border:1px solid var(--c-glass-border);border-radius:var(--radius);padding:12px;font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);overflow-x:auto;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;margin-top:8px">${_esc(ev.user_prompt || '')}</pre></details>`;
  h += `<details style="margin-bottom:8px;border-left:2px solid var(--c-glass-border);padding-left:12px"><summary style="cursor:pointer;font-size:13px;font-weight:500;color:var(--c-text-primary);padding:8px 0">Raw LLM Response</summary><pre style="background:rgba(0,0,0,0.2);border:1px solid var(--c-glass-border);border-radius:var(--radius);padding:12px;font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-tertiary);overflow-x:auto;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;margin-top:8px">${_esc(ev.llm_raw_response || '')}</pre></details>`;
  const inp = ev.total_input_tokens || 0;
  const out = ev.total_output_tokens || 0;
  h += `<p style="font-size:11px;color:var(--c-text-tertiary);margin-top:8px">Tokens: ${_formatNum(inp)} in + ${_formatNum(out)} out = ${_formatNum(inp + out)} total | Model: ${_esc(ev.model || '')}</p>`;
  return h;
}

// ── Downloads ──

async function _doDownloadReport() {
  if (!_lastResult) return;
  const btn = _container?.querySelector('.btn-dl-report');
  const label = btn?.querySelector('.dl-label');
  if (label) label.textContent = 'Generating...';
  if (btn) btn.disabled = true;
  try {
    await downloadReport(_lastResult);
  } catch (err) {
    _showToast('Download failed: ' + err.message, 'error');
  } finally {
    if (label) label.textContent = 'Download Report';
    if (btn) btn.disabled = false;
  }
}

async function _doDownloadClientReport() {
  if (!_lastResult) return;
  const label = _container?.querySelector('.dl-label-docx');
  if (label) label.textContent = 'Generating...';
  try {
    await downloadClientReport(_lastResult);
  } catch (err) {
    _showToast('Download failed: ' + err.message, 'error');
  } finally {
    if (label) label.textContent = 'Client Report';
  }
}

// ── Trends ──

async function _showTrend(url) {
  if (!_container) return;
  const modal = _container.querySelector('#trend-modal');
  const body = _container.querySelector('#trend-modal-body');
  if (!modal || !body) return;
  body.innerHTML = '<p style="color:var(--c-text-tertiary)">Loading trend data...</p>';
  modal.classList.add('show');
  try {
    const data = await getSnapshots(url);
    if (!data.snapshots?.length) {
      body.innerHTML = `<h3 style="font-size:14px;margin-bottom:12px">Score Trend</h3><p style="color:var(--c-text-tertiary)">No snapshots yet. Click "Audit" to create the first one.</p>`;
      return;
    }
    const domain = url.replace(/https?:\/\//, '').split('/')[0];
    const snapshots = data.snapshots;
    const latest = snapshots[snapshots.length - 1];
    const arrow = data.trend_direction === 'up' ? '&#9650;' : data.trend_direction === 'down' ? '&#9660;' : '&#8212;';
    const trendCls = data.trend_direction === 'up' ? 'var(--c-green)' : data.trend_direction === 'down' ? 'var(--c-red)' : 'var(--c-text-tertiary)';
    const scoreCol = latest.overall_score >= 70 ? 'var(--c-green)' : latest.overall_score >= 40 ? 'var(--c-yellow)' : 'var(--c-red)';

    let h = `<h3 style="font-size:14px;margin-bottom:4px">${_esc(domain)}</h3>
      <p style="font-size:12px;color:var(--c-text-tertiary);margin-bottom:16px">${snapshots.length} snapshots &middot; Latest: <strong style="color:${scoreCol}">${latest.overall_score}/100</strong> &middot; <span style="color:${trendCls}">${arrow} ${data.score_change > 0 ? '+' : ''}${data.score_change} pts</span></p>`;

    // Chart
    h += '<div style="display:flex;align-items:flex-end;gap:4px;height:150px;margin:16px 0">';
    for (const s of snapshots) {
      const pct = (s.overall_score / 100 * 100).toFixed(1);
      const date = (s.created_at || '').substring(0, 10);
      const color = s.overall_score >= 70 ? 'var(--c-green)' : s.overall_score >= 40 ? 'var(--c-yellow)' : 'var(--c-red)';
      h += `<div style="flex:1;background:${color};border-radius:2px 2px 0 0;height:${pct}%;position:relative;cursor:default" title="${date}: ${s.overall_score}"></div>`;
    }
    h += '</div>';

    // Table
    h += `<table class="data-table"><thead><tr><th>Date</th><th>Score</th><th>Perf</th><th>SEO</th><th>Content</th><th>Tech</th><th>Issues</th></tr></thead><tbody>`;
    for (const s of [...snapshots].reverse()) {
      const cats = s.category_scores || {};
      const iss = s.issues_summary || {};
      const date = (s.created_at || '').substring(0, 10);
      const sc = s.overall_score >= 70 ? 'var(--c-green)' : s.overall_score >= 40 ? 'var(--c-yellow)' : 'var(--c-red)';
      h += `<tr><td>${date}</td><td><strong style="color:${sc}">${s.overall_score}</strong></td><td>${_esc(cats.performance||'-')}</td><td>${_esc(cats.seo||'-')}</td><td>${_esc(cats.content||'-')}</td><td>${_esc(cats.technical||'-')}</td><td style="color:var(--c-red)">${iss.critical||0}C</td></tr>`;
    }
    h += '</tbody></table>';
    body.innerHTML = h;
  } catch (e) {
    body.innerHTML = `<p style="color:var(--c-red)">Failed to load: ${_esc(e.message)}</p>`;
  }
}

// ── Sidebar ──

function _toggleSidebar() {
  if (!_container) return;
  _sidebarOpen = !_sidebarOpen;
  const sidebar = _container.querySelector('#sidebar');
  const overlay = _container.querySelector('#sidebar-overlay');
  if (_sidebarOpen) {
    sidebar.style.cssText += ';position:fixed;top:52px;left:0;z-index:150;width:280px;height:calc(100vh - 52px);transform:translateX(0);background:rgba(10,13,16,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);transition:transform 0.3s';
    overlay.style.display = 'block';
    setTimeout(() => overlay.style.opacity = '1', 10);
  } else {
    _closeSidebar();
  }
}

function _closeSidebar() {
  if (!_container) return;
  _sidebarOpen = false;
  const sidebar = _container.querySelector('#sidebar');
  const overlay = _container.querySelector('#sidebar-overlay');
  if (sidebar) sidebar.style.cssText = 'width:260px;flex-shrink:0;background:rgba(255,255,255,0.02);border-right:1px solid var(--c-glass-border);padding:20px 14px;overflow-y:auto;height:calc(100vh - 52px);position:sticky;top:52px';
  if (overlay) { overlay.style.opacity = '0'; setTimeout(() => overlay.style.display = 'none', 300); }
}

// ── Upgrade Modal ──

function _showUpgradeModal() {
  if (!_container) return;
  _container.querySelector('#upgrade-modal')?.classList.add('show');
}

// ── Helpers ──

function _showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}

function _formatNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function _diffBadge(d) {
  if (!d) return '';
  const l = String(d).toLowerCase();
  const map = { low: 'low', medium: 'medium', high: 'high', poor: 'poor', fair: 'fair', good: 'good', excellent: 'excellent', critical: 'critical', warning: 'warning', info: 'info' };
  const cls = map[l] || 'medium';
  return `<span class="badge badge-${cls}">${_esc(d)}</span>`;
}

function _intentBadge(i) {
  return `<span class="badge badge-intent">${_esc(i)}</span>`;
}

function _esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
