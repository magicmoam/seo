// app.js - Authenticated dashboard for Retune (trySEO.ai)
import {
  queryAPI, getHistory, getUsage, getEvidence, downloadReport, downloadClientReport,
  getTrackedUrls, addTrackedUrl, removeTrackedUrl, runSnapshot, getSnapshots
} from '../api.js';
import { getUser, signOut, onAuthStateChanged, updateUserCredits, getGoogleClientId, isGA4OAuthEnabled } from '../auth.js';
import { navigate } from '../router.js';
import { esc as _esc, formatNum as _formatNum } from '../utils/helpers.js';

// ── Lazy-load renderers on demand ──

const RENDERER_LOADERS = {
  website_analyzer:    () => import('../renderers/website_analyzer.js'),
  keyword_research:    () => import('../renderers/keyword_research.js'),
  competitor_analysis: () => import('../renderers/competitor_analysis.js'),
  serp_analysis:       () => import('../renderers/serp_analysis.js'),
  content_gap:         () => import('../renderers/content_gap.js'),
  content_generation:  () => import('../renderers/content_generation.js'),
  topical_authority:   () => import('../renderers/topical_authority.js'),
  technical_seo:       () => import('../renderers/technical_seo.js'),
  backlink_strategy:   () => import('../renderers/backlink_strategy.js'),
  seo_strategy:        () => import('../renderers/seo_strategy.js'),
  ga4_analytics:       () => import('../renderers/ga4_analytics.js'),
};

// ── State ──

let _container = null;
let _abortController = null;
let _postAuthTimeout = null;
let _unsubAuth = null;
let _isSubmitting = false;
let _lastResult = null;
let _currentSearchId = null;
let _sidebarOpen = false;
let _historyView = false;
let _historyFilter = 'all';
let _historyItems = [];

// ── Tool definitions ──

const TOOLS = [
  { key: 'keyword_research',    q: 'Find keywords for ',           num: '01', name: 'Keywords',          desc: 'Volume, difficulty & long-tail',   credits: 1, category: 'research' },
  { key: 'serp_analysis',       q: 'Analyze SERP for ',            num: '02', name: 'SERP Analysis',     desc: 'Features, intent & positions',     credits: 1, category: 'research' },
  { key: 'competitor_analysis', q: 'Analyze competitors for ',     num: '03', name: 'Competitors',       desc: 'Strengths, weaknesses & gaps',     credits: 2, category: 'research' },
  { key: 'content_gap',         q: 'Find content gaps for ',       num: '04', name: 'Content Gaps',      desc: 'Underserved topics & angles',      credits: 2, category: 'research' },
  { key: 'website_analyzer',    q: 'Analyze the website ',         num: '05', name: 'Website Analyzer',  desc: 'SEO audit & scoring',              credits: 1, category: 'analysis' },
  { key: 'technical_seo',       q: 'Run technical SEO audit for ', num: '06', name: 'Technical SEO',     desc: 'Speed, crawl & indexation',        credits: 1, category: 'analysis' },
  { key: 'content_generation',  q: 'Write a blog post about ',     num: '07', name: 'Content Gen',       desc: 'SEO-optimized articles',           credits: 2, category: 'content' },
  { key: 'topical_authority',   q: 'Map topical authority for ',   num: '08', name: 'Topical Authority', desc: 'Topic clusters & pillars',         credits: 2, category: 'content' },
  { key: 'backlink_strategy',   q: 'Find backlink opportunities for ', num: '09', name: 'Backlinks',     desc: 'Link building strategy',           credits: 2, category: 'strategy' },
  { key: 'seo_strategy',        q: 'Create SEO strategy for ',     num: '10', name: 'Full Strategy',     desc: 'Complete multi-tool plan',          credits: 10, category: 'strategy' },
];

// ── Mount / Unmount ──

export function mount(container) {
  _container = container;
  _abortController = new AbortController();
  _historyView = false;
  _historyFilter = 'all';
  container.innerHTML = _layoutHtml();
  _attachEvents();
  _loadData();

  _unsubAuth = onAuthStateChanged((u) => {
    if (!u) { navigate('/'); return; }
    _updateCreditsDisplay(u);
  });

  window.addEventListener('toggle-sidebar', _toggleSidebar);
  window.addEventListener('credits-exhausted', _showUpgradeModal);

  // Post-auth redirect
  const postAuthUrl = sessionStorage.getItem('tryseo_post_auth_url');
  if (postAuthUrl) {
    sessionStorage.removeItem('tryseo_post_auth_url');
    try {
      const parsed = new URL(postAuthUrl.startsWith('http') ? postAuthUrl : 'https://' + postAuthUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        const q = _container.querySelector('#query-input');
        if (q) {
          q.value = 'Analyze the website ' + parsed.href;
          _postAuthTimeout = setTimeout(() => {
            if (!_abortController?.signal.aborted) _submitQuery();
          }, 300);
        }
      }
    } catch (e) { /* invalid URL, ignore */ }
  }

  // Check for upgrade success
  if (window.location.hash.includes('upgraded=true')) {
    _showToast('Welcome to Pro! Your credits have been updated.', 'success');
    window.location.hash = '#/app';
  }
}

export function unmount() {
  _abortController?.abort();
  if (_postAuthTimeout) clearTimeout(_postAuthTimeout);
  if (_unsubAuth) _unsubAuth();
  window.removeEventListener('toggle-sidebar', _toggleSidebar);
  window.removeEventListener('credits-exhausted', _showUpgradeModal);
  _container = null;
  _isSubmitting = false;
  _lastResult = null;
  _currentSearchId = null;
}

// ── Layout ──

function _layoutHtml() {
  return `
  <div class="rt-app-shell">
    <!-- Sidebar Overlay (mobile) -->
    <div id="sidebar-overlay" class="rt-sidebar-overlay"></div>

    <!-- Sidebar -->
    <aside id="sidebar" class="rt-sidebar">
      <!-- Logo -->
      <div class="rt-sidebar-logo">
        <span style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:var(--text-main);letter-spacing:-0.02em">Retune</span>
      </div>

      <!-- Credits -->
      <div class="rt-credits-badge">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="label" style="margin-bottom:0">Credits</span>
          <span id="sidebar-credits" style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700;color:var(--accent-olive)">--</span>
        </div>
        <div id="sidebar-tier" style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);margin-top:4px"></div>
        <div class="progress-bar" style="margin-top:8px">
          <div id="credits-bar" class="progress-fill" style="width:0%"></div>
        </div>
      </div>

      <!-- Tool Picker -->
      <div class="sidebar-section">
        <span class="panel-label">Tools</span>
        <div id="tool-picker" class="rt-tool-list">
          ${_sidebarToolCards()}
        </div>
      </div>

      <!-- Recent History -->
      <div class="sidebar-section" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-xs)">
          <span class="panel-label" style="margin-bottom:0">History</span>
          <button id="btn-view-all-history" class="btn-ghost" style="padding:2px 8px;font-size:0.6rem">View All</button>
        </div>
        <div id="history-list" style="flex:1;overflow-y:auto">
          <div class="empty-state" style="padding:var(--space-m) 0;font-size:0.75rem">No searches yet</div>
        </div>
      </div>

      <!-- Tracked URLs -->
      <div class="sidebar-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-xs)">
          <span class="panel-label" style="margin-bottom:0">Tracked URLs</span>
          <span id="tracked-count" class="badge" style="font-size:0.6rem">0</span>
        </div>
        <div id="tracked-list">
          <div style="color:var(--text-muted);font-size:0.75rem;text-align:center;padding:var(--space-s) 0">No tracked URLs</div>
        </div>
      </div>

      <!-- GA4 -->
      <div id="ga4-connect-container" class="sidebar-section" style="display:none">
        <span class="panel-label">Google Analytics</span>
        <div id="ga4-status-content">
          <button id="btn-ga4-connect" class="btn-action" style="width:100%;font-size:0.7rem">Connect GA4</button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main id="main-content" class="rt-main">
      <!-- Default view: query + results -->
      <div id="view-query">
        <!-- Header -->
        <div class="rt-main-header fade-in">
          <span class="label">Dashboard</span>
          <h1 style="font-family:var(--font-display);font-size:2.5rem;font-weight:700;line-height:0.95;margin-bottom:var(--space-xs)">Research, analyze<br>&amp; rank.</h1>
          <p style="color:var(--text-muted);font-size:0.875rem;max-width:460px">AI-powered SEO intelligence. Run any tool below or type a natural-language query.</p>
        </div>

        <!-- Stats row -->
        <div class="rt-stats-row fade-in fade-in-delay-1">
          <div class="panel" style="padding:var(--space-s)">
            <span class="panel-label" style="font-size:0.6rem">Total Cost</span>
            <div id="dash-cost" style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700">$0.00</div>
          </div>
          <div class="panel" style="padding:var(--space-s)">
            <span class="panel-label" style="font-size:0.6rem">Queries Today</span>
            <div id="dash-today" style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700">0</div>
          </div>
          <div class="panel" style="padding:var(--space-s)">
            <span class="panel-label" style="font-size:0.6rem">Tokens Used</span>
            <div id="dash-tokens" style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700">0</div>
          </div>
          <div class="panel" style="padding:var(--space-s)">
            <span class="panel-label" style="font-size:0.6rem">Total Searches</span>
            <div id="dash-searches" style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700">0</div>
          </div>
        </div>

        <!-- Query input -->
        <div class="rt-query-box fade-in fade-in-delay-2">
          <textarea id="query-input" class="textarea" rows="2"
            placeholder="e.g. What keywords should I target for hard water shower filters?"
            style="padding-right:100px;min-height:56px;max-height:120px"></textarea>
          <button id="submit-btn" class="btn-action" style="position:absolute;right:8px;bottom:8px;padding:8px 20px">Run</button>
        </div>

        <!-- Error -->
        <div id="error-msg" class="rt-error-msg" style="display:none"></div>

        <!-- Loading -->
        <div id="loading" class="rt-loading" style="display:none">
          <div class="spinner"></div>
          <p style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.75rem;margin-top:var(--space-s)">ANALYZING // JINA_SEARCH + LLM_SYNTHESIS...</p>
        </div>

        <!-- Result -->
        <div id="result"></div>
      </div>

      <!-- History view (hidden by default) -->
      <div id="view-history" style="display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-m)">
          <div>
            <span class="label">Archive</span>
            <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:700;line-height:1">Session History</h2>
          </div>
          <button id="btn-back-dashboard" class="btn-ghost">Back to Dashboard</button>
        </div>

        <!-- Filter tabs -->
        <div class="rt-filter-row">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="analysis">Analysis</button>
          <button class="filter-btn" data-filter="research">Research</button>
          <button class="filter-btn" data-filter="content">Content</button>
          <button class="filter-btn" data-filter="strategy">Strategy</button>
        </div>

        <!-- History table -->
        <div id="history-table-container">
          <div class="empty-state">No history yet</div>
        </div>
      </div>
    </main>
  </div>

  <!-- Trend Modal -->
  <div id="trend-modal" class="modal-backdrop">
    <div class="modal-content" style="max-width:600px">
      <button class="modal-close" id="trend-modal-close">&times;</button>
      <div id="trend-modal-body"></div>
    </div>
  </div>

  <!-- Upgrade Modal -->
  <div id="upgrade-modal" class="upgrade-modal-overlay">
    <div class="upgrade-modal">
      <h2>Credits Exhausted</h2>
      <p>You have run out of credits. Upgrade to Pro for 200 credits/month.</p>
      <a href="#/pricing" class="btn-primary" style="text-decoration:none">Upgrade to Pro</a>
      <button id="upgrade-modal-dismiss" class="btn-dismiss">Dismiss</button>
    </div>
  </div>

  <!-- GA4 Property Modal -->
  <div id="ga4-property-modal" class="modal-backdrop">
    <div class="modal-content" style="max-width:480px">
      <button class="modal-close" id="ga4-property-close">&times;</button>
      <span class="panel-label">GA4 Properties</span>
      <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:4px">Select a Property</h3>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:var(--space-m)">Choose which property to use for analytics data.</p>
      <div id="ga4-property-list"><div class="empty-state" style="padding:var(--space-m)">Loading properties...</div></div>
    </div>
  </div>

  <style>
    /* App shell layout */
    .rt-app-shell {
      display: flex;
      min-height: calc(100vh - 64px);
      padding-top: 0;
    }
    .rt-sidebar {
      width: 280px;
      flex-shrink: 0;
      background: var(--bg-panel);
      border-right: 1px solid var(--border-subtle);
      padding: var(--space-m) var(--space-s);
      overflow-y: auto;
      height: calc(100vh - 64px);
      position: sticky;
      top: 64px;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }
    .rt-sidebar-logo {
      padding-bottom: var(--space-s);
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: var(--space-xs);
    }
    .rt-sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(3, 8, 8, 0.7);
      z-index: 149;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .rt-credits-badge {
      padding: var(--space-s);
      background: var(--bg-panel-light);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
    }
    .rt-tool-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .rt-tool-item {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: 8px 10px;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background var(--transition);
      border: 1px solid transparent;
    }
    .rt-tool-item:hover {
      background: var(--glass-bg-hover);
      border-color: var(--border-subtle);
    }
    .rt-tool-item.active {
      background: var(--accent-olive-dim);
      border-color: rgba(156, 170, 126, 0.2);
    }
    .rt-tool-item .tool-name {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-main);
      flex: 1;
    }
    .rt-tool-item .tool-cost {
      font-family: var(--font-mono);
      font-size: 0.6rem;
      color: var(--accent-olive);
      padding: 1px 6px;
      background: var(--accent-olive-dim);
      border-radius: var(--radius);
    }

    /* Main area */
    .rt-main {
      flex: 1;
      max-width: 960px;
      margin: 0 auto;
      padding: var(--space-l) var(--space-m) 80px;
    }
    .rt-main-header {
      margin-bottom: var(--space-l);
    }
    .rt-stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1px;
      background: var(--border-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      overflow: hidden;
      margin-bottom: var(--space-m);
    }
    .rt-stats-row > .panel {
      border: none;
      border-radius: 0;
    }
    .rt-query-box {
      position: relative;
      margin-bottom: var(--space-m);
    }
    .rt-error-msg {
      background: rgba(255, 107, 107, 0.06);
      border: 1px solid rgba(255, 107, 107, 0.2);
      border-radius: var(--radius);
      padding: var(--space-s);
      color: var(--color-error);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      margin-bottom: var(--space-s);
    }
    .rt-loading {
      text-align: center;
      padding: var(--space-xl) 0;
    }

    /* Result layout: 2-column */
    .rt-result-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--space-m);
    }
    .rt-result-main {
      min-width: 0;
    }
    .rt-result-sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--space-s);
    }
    .rt-result-header {
      display: flex;
      align-items: center;
      gap: var(--space-s);
      margin-bottom: var(--space-m);
      padding-bottom: var(--space-s);
      border-bottom: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }
    .rt-result-actions {
      display: flex;
      gap: var(--space-xs);
      margin-left: auto;
    }

    /* Filter row */
    .rt-filter-row {
      display: flex;
      gap: var(--space-m);
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: var(--space-s);
      margin-bottom: var(--space-m);
    }

    /* Sidebar history items */
    .rt-history-item {
      padding: 8px 10px;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background var(--transition);
      margin-bottom: 1px;
    }
    .rt-history-item:hover {
      background: var(--glass-bg-hover);
    }
    .rt-history-item .hi-query {
      font-size: 0.8rem;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }
    .rt-history-item .hi-meta {
      font-family: var(--font-mono);
      font-size: 0.6rem;
      color: var(--text-muted);
      display: flex;
      gap: var(--space-xs);
    }
    .rt-history-item .hi-meta .hi-tool {
      color: var(--accent-olive);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .rt-sidebar {
        display: none;
      }
      .rt-sidebar.open {
        display: flex;
        position: fixed;
        top: 64px;
        left: 0;
        z-index: 150;
        width: 300px;
        height: calc(100vh - 64px);
        background: var(--bg-panel);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
      .rt-sidebar-overlay.visible {
        display: block;
        opacity: 1;
      }
      .rt-stats-row {
        grid-template-columns: repeat(2, 1fr);
      }
      .rt-result-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>`;
}

function _sidebarToolCards() {
  return TOOLS.map(t => `
    <div class="rt-tool-item" data-q="${_esc(t.q)}" data-key="${t.key}">
      <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-dim)">${t.num}</span>
      <span class="tool-name">${_esc(t.name)}</span>
      <span class="tool-cost">${t.credits}cr</span>
    </div>
  `).join('');
}

// ── Events ──

function _attachEvents() {
  if (!_container) return;

  // Tool card clicks in sidebar
  _container.querySelectorAll('.rt-tool-item').forEach(card => {
    card.addEventListener('click', () => {
      _showQueryView();
      const q = _container.querySelector('#query-input');
      if (q) {
        q.value = card.dataset.q;
        q.focus();
        q.setSelectionRange(q.value.length, q.value.length);
      }
      _container.querySelectorAll('.rt-tool-item').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      _closeSidebar();
    });
  });

  // Submit
  _container.querySelector('#submit-btn')?.addEventListener('click', _submitQuery);
  _container.querySelector('#query-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _submitQuery(); }
  });

  // Sidebar overlay close
  _container.querySelector('#sidebar-overlay')?.addEventListener('click', _closeSidebar);

  // Modal closes
  _container.querySelector('#trend-modal-close')?.addEventListener('click', () => _container.querySelector('#trend-modal')?.classList.remove('active'));
  _container.querySelector('#trend-modal')?.addEventListener('click', (e) => { if (e.target.id === 'trend-modal') e.target.classList.remove('active'); });
  _container.querySelector('#upgrade-modal-dismiss')?.addEventListener('click', () => _container.querySelector('#upgrade-modal')?.classList.remove('active'));
  _container.querySelector('#upgrade-modal')?.addEventListener('click', (e) => { if (e.target.id === 'upgrade-modal') e.target.classList.remove('active'); });
  _container.querySelector('#ga4-property-close')?.addEventListener('click', () => _container.querySelector('#ga4-property-modal')?.classList.remove('active'));
  _container.querySelector('#ga4-property-modal')?.addEventListener('click', (e) => { if (e.target.id === 'ga4-property-modal') e.target.classList.remove('active'); });

  // GA4 connect
  _container.querySelector('#btn-ga4-connect')?.addEventListener('click', _connectGA4);

  // History view
  _container.querySelector('#btn-view-all-history')?.addEventListener('click', _showHistoryView);
  _container.querySelector('#btn-back-dashboard')?.addEventListener('click', _showQueryView);

  // History filter tabs
  _container.querySelectorAll('#view-history .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _container.querySelectorAll('#view-history .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _historyFilter = btn.dataset.filter;
      _renderHistoryTable();
    });
  });
}

// ── View toggling ──

function _showQueryView() {
  if (!_container) return;
  _historyView = false;
  const qv = _container.querySelector('#view-query');
  const hv = _container.querySelector('#view-history');
  if (qv) qv.style.display = '';
  if (hv) hv.style.display = 'none';
}

function _showHistoryView() {
  if (!_container) return;
  _historyView = true;
  const qv = _container.querySelector('#view-query');
  const hv = _container.querySelector('#view-history');
  if (qv) qv.style.display = 'none';
  if (hv) { hv.style.display = ''; hv.style.animation = 'rt-fade-in 0.5s ease-out'; }
  _renderHistoryTable();
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
    const signal = _abortController?.signal;
    const data = await getHistory(signal);
    _historyItems = data || [];
    _renderSidebarHistory(_historyItems);
    if (_historyView) _renderHistoryTable();
  } catch (e) { /* silent */ }
}

async function _loadUsage() {
  try {
    const data = await getUsage();
    if (!_container) return;
    const el = (id) => _container.querySelector('#' + id);
    if (el('dash-cost')) el('dash-cost').textContent = '$' + (data.total_cost || 0).toFixed(2);
    if (el('dash-today')) el('dash-today').textContent = data.today_queries || 0;
    if (el('dash-tokens')) el('dash-tokens').textContent = _formatNum(data.total_tokens || 0);
    if (el('dash-searches')) el('dash-searches').textContent = data.total_searches || 0;

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
  const barEl = _container.querySelector('#credits-bar');
  if (creditsEl) creditsEl.textContent = user.credits_remaining ?? '--';
  if (tierEl) tierEl.textContent = (user.tier || 'free').toUpperCase() + ' TIER';
  if (barEl) {
    const max = user.tier === 'pro' ? 200 : 5;
    const pct = Math.min(100, ((user.credits_remaining || 0) / max) * 100);
    barEl.style.width = pct + '%';
  }
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
  if (ga4Container) ga4Container.style.display = '';
  try {
    const res = await fetch('/api/ga4/status', {
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token'), 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    _renderGA4Status(data);
  } catch (e) {
    _renderGA4Status({ connected: false });
  }
}

// ── Sidebar History ──

function _renderSidebarHistory(items) {
  if (!_container) return;
  const list = _container.querySelector('#history-list');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<div class="empty-state" style="padding:var(--space-m) 0;font-size:0.75rem">No searches yet</div>';
    return;
  }
  const recent = items.slice(0, 10);
  list.innerHTML = recent.map((item, i) => {
    const date = new Date(item.created_at).toLocaleDateString();
    const toolLabel = (item.tool_used || '').replace(/_/g, ' ');
    return `<div class="rt-history-item" data-idx="${i}">
      <div class="hi-query">${_esc(item.query)}</div>
      <div class="hi-meta">
        <span class="hi-tool">${_esc(toolLabel)}</span>
        <span>${date}</span>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.rt-history-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      const item = recent[idx];
      if (!item) return;
      _showQueryView();
      _closeSidebar();
      _currentSearchId = item.id || null;
      _displayResult({ tool_used: item.tool_used, query: item.query, result: item.result }, _currentSearchId);
    });
  });
}

// ── History Table (full view) ──

function _renderHistoryTable() {
  if (!_container) return;
  const container = _container.querySelector('#history-table-container');
  if (!container) return;

  const ANALYSIS_TOOLS = ['website_analyzer', 'technical_seo'];
  const RESEARCH_TOOLS = ['keyword_research', 'serp_analysis', 'competitor_analysis', 'content_gap'];
  const CONTENT_TOOLS = ['content_generation', 'topical_authority'];
  const STRATEGY_TOOLS = ['backlink_strategy', 'seo_strategy'];

  let filtered = _historyItems;
  if (_historyFilter === 'analysis') filtered = _historyItems.filter(i => ANALYSIS_TOOLS.includes(i.tool_used));
  else if (_historyFilter === 'research') filtered = _historyItems.filter(i => RESEARCH_TOOLS.includes(i.tool_used));
  else if (_historyFilter === 'content') filtered = _historyItems.filter(i => CONTENT_TOOLS.includes(i.tool_used));
  else if (_historyFilter === 'strategy') filtered = _historyItems.filter(i => STRATEGY_TOOLS.includes(i.tool_used));

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">No matching sessions</div>';
    return;
  }

  let h = '<table class="data-table"><thead><tr>';
  h += '<th>Index</th><th>Query</th><th>Tool</th><th>Date</th>';
  h += '</tr></thead><tbody>';
  filtered.forEach((item, i) => {
    const date = new Date(item.created_at).toLocaleDateString();
    const toolLabel = (item.tool_used || '').replace(/_/g, ' ');
    const shortId = (item.id || '').substring(0, 8).toUpperCase() || String(i + 1).padStart(3, '0');
    h += `<tr class="history-row" data-idx="${i}">
      <td class="cell-dim">${_esc(shortId)}</td>
      <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-display)">${_esc(item.query)}</td>
      <td><span class="badge badge-intent">${_esc(toolLabel)}</span></td>
      <td class="cell-dim">${date}</td>
    </tr>`;
  });
  h += '</tbody></table>';
  container.innerHTML = h;

  container.querySelectorAll('.history-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.idx);
      const item = filtered[idx];
      if (!item) return;
      _showQueryView();
      _currentSearchId = item.id || null;
      _displayResult({ tool_used: item.tool_used, query: item.query, result: item.result }, _currentSearchId);
    });
  });
}

// ── Tracked URLs ──

function _renderTrackedUrls(urls) {
  if (!_container) return;
  const list = _container.querySelector('#tracked-list');
  const count = _container.querySelector('#tracked-count');
  if (count) count.textContent = urls.length;
  if (!urls.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:0.75rem;text-align:center;padding:var(--space-s) 0">No tracked URLs</div>';
    return;
  }
  list.innerHTML = urls.map(t => {
    const domain = (t.url || '').replace(/https?:\/\//, '').split('/')[0];
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:2px;background:var(--glass-bg);border:1px solid var(--border-subtle);border-radius:var(--radius)">
      <div style="flex:1;min-width:0;font-family:var(--font-mono);font-size:0.7rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(domain)}</div>
      <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
        <button class="btn-show-trend" data-url="${_esc(t.url)}" style="background:none;border:1px solid var(--border-subtle);color:var(--text-muted);padding:2px 6px;border-radius:var(--radius);font-size:0.6rem;cursor:pointer;font-family:var(--font-mono)">Trends</button>
        <button class="btn-run-snapshot" data-url="${_esc(t.url)}" style="background:none;border:1px solid var(--border-subtle);color:var(--text-muted);padding:2px 6px;border-radius:var(--radius);font-size:0.6rem;cursor:pointer;font-family:var(--font-mono)">Audit</button>
        <button class="btn-untrack" data-id="${t.id}" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:0.875rem;padding:2px">&times;</button>
      </div>
    </div>`;
  }).join('');

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
      <div style="display:flex;align-items:center;gap:var(--space-xs);margin-bottom:var(--space-xs)">
        <span class="status-dot status-dot--connected"></span>
        <span style="font-size:0.75rem;color:var(--text-main);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(propName)}</span>
      </div>
      ${propId ? `<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);margin-bottom:var(--space-xs);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(propId)}</div>` : ''}
      <div style="display:flex;gap:var(--space-xs)">
        <button id="btn-ga4-change" class="btn-ghost" style="flex:1;padding:4px 8px;font-size:0.65rem">Change</button>
        <button id="btn-ga4-disconnect" class="btn-ghost" style="flex:1;padding:4px 8px;font-size:0.65rem">Disconnect</button>
      </div>`;
    el.querySelector('#btn-ga4-change')?.addEventListener('click', _openPropertySelector);
    el.querySelector('#btn-ga4-disconnect')?.addEventListener('click', _disconnectGA4);
  } else {
    el.innerHTML = '<button id="btn-ga4-connect" class="btn-action" style="width:100%;font-size:0.7rem">Connect GA4</button>';
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
          headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token'), 'Content-Type': 'application/json' },
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
  list.innerHTML = '<div class="empty-state" style="padding:var(--space-m)">Loading properties...</div>';
  modal.classList.add('active');
  try {
    const res = await fetch('/api/ga4/properties', {
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token'), 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.error || !data.properties?.length) {
      list.innerHTML = `<div class="empty-state" style="padding:var(--space-m)">${_esc(data.error || 'No GA4 properties found.')}</div>`;
      return;
    }
    list.innerHTML = data.properties.map(p => `
      <div class="ga4-prop-item card" data-pid="${_esc(p.property_id)}" data-pname="${_esc(p.display_name)}" style="cursor:pointer;margin-bottom:var(--space-xs);padding:var(--space-s)">
        <div style="font-size:0.875rem;color:var(--text-main);font-weight:600">${_esc(p.display_name)}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${_esc(p.account_name)}</div>
        <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-dim);margin-top:2px">${_esc(p.property_id)}</div>
      </div>
    `).join('');
    list.querySelectorAll('.ga4-prop-item').forEach(el => {
      el.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/ga4/select-property', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token'), 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: el.dataset.pid, property_name: el.dataset.pname }),
          });
          const data = await res.json();
          if (data.error) { alert(data.error); return; }
          modal.classList.remove('active');
          _loadGA4Status();
        } catch (e) { alert('Failed: ' + e.message); }
      });
    });
  } catch (e) {
    list.innerHTML = `<div class="empty-state" style="padding:var(--space-m);color:var(--color-error)">Failed to load: ${_esc(e.message)}</div>`;
  }
}

async function _disconnectGA4() {
  if (!confirm('Disconnect Google Analytics? Your stored tokens will be removed.')) return;
  try {
    await fetch('/api/ga4/disconnect', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token'), 'Content-Type': 'application/json' }
    });
    _loadGA4Status();
  } catch (e) { alert('Failed: ' + e.message); }
}

// ── Query submission ──

async function _submitQuery() {
  if (!_container || _isSubmitting) return;
  const queryEl = _container.querySelector('#query-input');
  const query = queryEl?.value.trim();
  if (!query) return;

  _isSubmitting = true;
  const errorEl = _container.querySelector('#error-msg');
  const resultEl = _container.querySelector('#result');
  const loadingEl = _container.querySelector('#loading');
  const submitBtn = _container.querySelector('#submit-btn');

  if (errorEl) errorEl.style.display = 'none';
  if (resultEl) resultEl.innerHTML = '';
  if (loadingEl) loadingEl.style.display = '';
  if (submitBtn) submitBtn.disabled = true;

  try {
    const data = await queryAPI(query);
    if (!_container) return;
    if (data.error) {
      if (errorEl) { errorEl.textContent = data.error; errorEl.style.display = ''; }
      return;
    }
    _currentSearchId = data.search_id || null;
    _lastResult = data;
    _displayResult(data, _currentSearchId);
    if (queryEl) queryEl.value = '';
    _loadHistory();
    _loadUsage();
  } catch (err) {
    if (!_container) return;
    if (err.message !== 'Credits exhausted' && errorEl) {
      errorEl.textContent = err.message || 'Network error';
      errorEl.style.display = '';
    }
  } finally {
    _isSubmitting = false;
    if (loadingEl) loadingEl.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ── Result rendering ──

async function _displayResult(data, searchId) {
  if (!_container) return;
  _lastResult = data;
  const el = _container.querySelector('#result');
  if (!el) return;
  const tool = data.tool_used;
  const r = data.result;

  // Header
  let html = `<div class="rt-result-header">
    <span class="badge badge-intent">${_esc(tool.replace(/_/g, ' '))}</span>
    <span style="color:var(--text-muted);font-size:0.8rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(data.query)}</span>
    <div class="rt-result-actions">
      <button class="btn-dl-report btn-ghost" style="font-size:0.65rem;padding:6px 12px">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span class="dl-label">Report</span>
      </button>
      ${(tool === 'website_analyzer' || tool === 'seo_strategy') ? `
      <button class="btn-dl-docx btn-ghost" style="font-size:0.65rem;padding:6px 12px">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span class="dl-label-docx">Client Report</span>
      </button>` : ''}
    </div>
  </div>`;

  // Evidence
  if (searchId) {
    html += `<div style="margin-bottom:var(--space-s)">
      <button class="btn-toggle-evidence btn-ghost" style="font-size:0.65rem;padding:6px 12px">View Evidence Chain</button>
    </div>
    <div id="evidence-panel" class="panel" style="display:none;margin-bottom:var(--space-m)"></div>`;
  }

  // Tool-specific rendering (lazy loaded)
  const loader = RENDERER_LOADERS[tool];
  if (loader) {
    try {
      const renderer = await loader();
      html += renderer.render(r);
    } catch (e) {
      html += `<pre class="panel" style="font-family:var(--font-mono);font-size:0.75rem;white-space:pre-wrap;word-break:break-word">${_esc(JSON.stringify(r, null, 2))}</pre>`;
    }
  } else {
    html += `<pre class="panel" style="font-family:var(--font-mono);font-size:0.75rem;white-space:pre-wrap;word-break:break-word">${_esc(JSON.stringify(r, null, 2))}</pre>`;
  }

  el.innerHTML = html;
  el.style.animation = 'rt-fade-in 0.5s ease-out';
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

// ── Evidence ──

async function _toggleEvidence(searchId) {
  if (!_container) return;
  const panel = _container.querySelector('#evidence-panel');
  if (!panel) return;
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = '';
  panel.innerHTML = '<p style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.75rem">Loading evidence...</p>';
  try {
    const ev = await getEvidence(searchId);
    if (ev.error) {
      panel.innerHTML = `<p style="color:var(--color-error);font-size:0.8rem">${_esc(ev.error)}</p>`;
      return;
    }
    panel.innerHTML = _renderEvidence(ev);
  } catch (err) {
    panel.innerHTML = `<p style="color:var(--color-error);font-size:0.8rem">Failed to load: ${_esc(err.message)}</p>`;
  }
}

function _renderEvidence(ev) {
  let h = '<span class="panel-label">Evidence Chain</span>';

  h += `<details style="margin-bottom:var(--space-xs);border-left:2px solid var(--border-subtle);padding-left:var(--space-s)">
    <summary style="cursor:pointer;font-size:0.8rem;font-weight:600;color:var(--text-main);padding:var(--space-xs) 0">Routing Decision</summary>
    <p style="font-size:0.8rem;color:var(--text-muted)"><strong>Tool:</strong> ${_esc(ev.tool_used)}<br><strong>Reasoning:</strong> ${_esc(ev.routing_reasoning || 'Not captured')}</p>
    ${ev.routing_raw_response ? `<pre class="panel" style="font-family:var(--font-mono);font-size:0.7rem;max-height:300px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;margin-top:var(--space-xs)">${_esc(ev.routing_raw_response)}</pre>` : ''}
  </details>`;

  let sources = ev.jina_raw_responses || [];
  if (typeof sources === 'string') { try { sources = JSON.parse(sources); } catch(e) { sources = []; } }
  h += `<details style="margin-bottom:var(--space-xs);border-left:2px solid var(--border-subtle);padding-left:var(--space-s)">
    <summary style="cursor:pointer;font-size:0.8rem;font-weight:600;color:var(--text-main);padding:var(--space-xs) 0">Data Sources (${sources.length})</summary>`;
  for (const src of sources) {
    const content = src.content || '';
    const preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
    h += `<details style="margin:4px 0;border-left:2px solid var(--border-subtle);padding-left:var(--space-xs)">
      <summary style="cursor:pointer;font-size:0.75rem;color:var(--text-main);padding:4px 0">${_esc(src.title || 'Untitled')}</summary>
      <p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-dim);word-break:break-all;margin-bottom:4px">${_esc(src.url || '')}</p>
      <pre class="panel" style="font-family:var(--font-mono);font-size:0.65rem;max-height:300px;overflow-y:auto;white-space:pre-wrap;word-break:break-word">${_esc(preview)}</pre>
    </details>`;
  }
  h += '</details>';

  h += `<details style="margin-bottom:var(--space-xs);border-left:2px solid var(--border-subtle);padding-left:var(--space-s)">
    <summary style="cursor:pointer;font-size:0.8rem;font-weight:600;color:var(--text-main);padding:var(--space-xs) 0">System Prompt</summary>
    <pre class="panel" style="font-family:var(--font-mono);font-size:0.65rem;max-height:300px;overflow-y:auto;white-space:pre-wrap;word-break:break-word">${_esc(ev.system_prompt || '')}</pre>
  </details>`;

  h += `<details style="margin-bottom:var(--space-xs);border-left:2px solid var(--border-subtle);padding-left:var(--space-s)">
    <summary style="cursor:pointer;font-size:0.8rem;font-weight:600;color:var(--text-main);padding:var(--space-xs) 0">User Prompt</summary>
    <pre class="panel" style="font-family:var(--font-mono);font-size:0.65rem;max-height:300px;overflow-y:auto;white-space:pre-wrap;word-break:break-word">${_esc(ev.user_prompt || '')}</pre>
  </details>`;

  h += `<details style="margin-bottom:var(--space-xs);border-left:2px solid var(--border-subtle);padding-left:var(--space-s)">
    <summary style="cursor:pointer;font-size:0.8rem;font-weight:600;color:var(--text-main);padding:var(--space-xs) 0">Raw LLM Response</summary>
    <pre class="panel" style="font-family:var(--font-mono);font-size:0.65rem;max-height:300px;overflow-y:auto;white-space:pre-wrap;word-break:break-word">${_esc(ev.llm_raw_response || '')}</pre>
  </details>`;

  const inp = ev.total_input_tokens || 0;
  const out = ev.total_output_tokens || 0;
  h += `<p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-dim);margin-top:var(--space-xs)">TOKENS: ${_formatNum(inp)} IN + ${_formatNum(out)} OUT = ${_formatNum(inp + out)} TOTAL // MODEL: ${_esc(ev.model || '')}</p>`;
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
    if (label) label.textContent = 'Report';
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
  body.innerHTML = '<p style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.75rem">Loading trend data...</p>';
  modal.classList.add('active');
  try {
    const data = await getSnapshots(url);
    if (!data.snapshots?.length) {
      body.innerHTML = `<span class="panel-label">Score Trend</span><p style="color:var(--text-muted);font-size:0.8rem">No snapshots yet. Click "Audit" to create the first one.</p>`;
      return;
    }
    const domain = url.replace(/https?:\/\//, '').split('/')[0];
    const snapshots = data.snapshots;
    const latest = snapshots[snapshots.length - 1];
    const arrow = data.trend_direction === 'up' ? '&#9650;' : data.trend_direction === 'down' ? '&#9660;' : '&#8212;';
    const trendCls = data.trend_direction === 'up' ? 'var(--color-success)' : data.trend_direction === 'down' ? 'var(--color-error)' : 'var(--text-muted)';
    const scoreCol = latest.overall_score >= 70 ? 'var(--color-success)' : latest.overall_score >= 40 ? 'var(--accent-orange)' : 'var(--color-error)';

    let h = `<span class="panel-label">Score Trend</span>
      <h3 style="font-size:1rem;margin-bottom:4px">${_esc(domain)}</h3>
      <p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);margin-bottom:var(--space-m)">${snapshots.length} snapshots // Latest: <strong style="color:${scoreCol}">${latest.overall_score}/100</strong> // <span style="color:${trendCls}">${arrow} ${data.score_change > 0 ? '+' : ''}${data.score_change} pts</span></p>`;

    // Chart
    h += '<div style="display:flex;align-items:flex-end;gap:4px;height:120px;margin-bottom:var(--space-m)">';
    for (const s of snapshots) {
      const pct = (s.overall_score / 100 * 100).toFixed(1);
      const date = (s.created_at || '').substring(0, 10);
      const color = s.overall_score >= 70 ? 'var(--color-success)' : s.overall_score >= 40 ? 'var(--accent-orange)' : 'var(--color-error)';
      h += `<div style="flex:1;background:${color};border-radius:2px 2px 0 0;height:${pct}%;position:relative;cursor:default" title="${date}: ${s.overall_score}"></div>`;
    }
    h += '</div>';

    // Table
    h += '<table class="data-table"><thead><tr><th>Date</th><th>Score</th><th>Perf</th><th>SEO</th><th>Content</th><th>Tech</th><th>Issues</th></tr></thead><tbody>';
    for (const s of [...snapshots].reverse()) {
      const cats = s.category_scores || {};
      const iss = s.issues_summary || {};
      const date = (s.created_at || '').substring(0, 10);
      const sc = s.overall_score >= 70 ? 'var(--color-success)' : s.overall_score >= 40 ? 'var(--accent-orange)' : 'var(--color-error)';
      h += `<tr><td class="cell-dim">${date}</td><td><strong style="color:${sc}">${s.overall_score}</strong></td><td>${_esc(cats.performance || '-')}</td><td>${_esc(cats.seo || '-')}</td><td>${_esc(cats.content || '-')}</td><td>${_esc(cats.technical || '-')}</td><td style="color:var(--color-error)">${iss.critical || 0}C</td></tr>`;
    }
    h += '</tbody></table>';
    body.innerHTML = h;
  } catch (e) {
    body.innerHTML = `<p style="color:var(--color-error);font-size:0.8rem">Failed to load: ${_esc(e.message)}</p>`;
  }
}

// ── Sidebar ──

function _toggleSidebar() {
  if (!_container) return;
  _sidebarOpen = !_sidebarOpen;
  const sidebar = _container.querySelector('#sidebar');
  const overlay = _container.querySelector('#sidebar-overlay');
  if (_sidebarOpen) {
    sidebar?.classList.add('open');
    overlay?.classList.add('visible');
  } else {
    _closeSidebar();
  }
}

function _closeSidebar() {
  if (!_container) return;
  _sidebarOpen = false;
  const sidebar = _container.querySelector('#sidebar');
  const overlay = _container.querySelector('#sidebar-overlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('visible');
}

// ── Upgrade Modal ──

function _showUpgradeModal() {
  if (!_container) return;
  _container.querySelector('#upgrade-modal')?.classList.add('active');
}

// ── Helpers ──

function _showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}
