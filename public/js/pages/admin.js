// admin.js - Admin console for Retune
import { getUser, onAuthStateChanged } from '../auth.js';
import { getAdminUsers, getAdminUserDetail, adminAdjustCredits, adminChangeTier, adminImpersonate, getAdminStats } from '../api.js';
import { navigate } from '../router.js';
import { esc as _esc } from '../utils/helpers.js';

let _container = null;
let _unsubAuth = null;
let _adminAuthTimeout = null;
let _searchTimer = null;
let _stats = null;
let _users = [];
let _searchQuery = '';
let _page = 1;
let _activeTab = 'users';
let _blogPosts = [];

export function mount(container) {
  _container = container;
  const user = getUser();
  if (!user) { navigate('/'); return; }

  // Show loading while we wait for backend to confirm admin status
  _container.innerHTML = `<div class="empty-state" style="padding:120px 32px">[VERIFYING] Checking admin access...</div>`;

  // If is_admin is already true (cached from previous session), render immediately
  if (user.is_admin) {
    _renderAdmin();
    return;
  }

  // Otherwise wait for the auth state update from /api/usage
  _unsubAuth = onAuthStateChanged((u) => {
    if (!u) { navigate('/'); return; }
    if (u.is_admin) {
      if (_adminAuthTimeout) clearTimeout(_adminAuthTimeout);
      _renderAdmin();
    } else if (u.tier !== undefined && u.credits_remaining !== undefined) {
      if (_adminAuthTimeout) clearTimeout(_adminAuthTimeout);
      _container.innerHTML = `<div class="empty-state" style="padding:120px 32px">[ACCESS_DENIED] Admin privileges required.</div>`;
    }
  });

  // Fallback: if no update after 5s, show denied (cancellable)
  _adminAuthTimeout = setTimeout(() => {
    const u = getUser();
    if (u && !u.is_admin && _container) {
      _container.innerHTML = `<div class="empty-state" style="padding:120px 32px">[ACCESS_DENIED] Admin privileges required.</div>`;
    }
  }, 5000);
}

function _renderAdmin() {
  if (_unsubAuth) _unsubAuth();
  _render();
  _loadData();
  _unsubAuth = onAuthStateChanged((u) => {
    if (!u || !u.is_admin) { navigate('/'); }
  });
}

export function unmount() {
  if (_unsubAuth) _unsubAuth();
  if (_adminAuthTimeout) clearTimeout(_adminAuthTimeout);
  if (_searchTimer) clearTimeout(_searchTimer);
  _container = null;
  _stats = null;
  _users = [];
}

async function _loadData() {
  await Promise.all([_loadStats(), _loadUsers()]);
}

async function _loadStats() {
  try {
    _stats = await getAdminStats();
    _renderStats();
  } catch (e) { /* silent */ }
}

async function _loadUsers() {
  try {
    const data = await getAdminUsers(_page, _searchQuery);
    _users = data.users || data || [];
    _renderUsers();
  } catch (e) { /* silent */ }
}

function _render() {
  if (!_container) return;

  const tabStyle = (tab) => {
    const active = _activeTab === tab;
    return `font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.08em;padding:8px 20px;border:none;cursor:pointer;background:${active ? 'var(--bg-panel-light)' : 'transparent'};color:${active ? 'var(--accent-olive)' : 'var(--text-muted)'};border-bottom:2px solid ${active ? 'var(--accent-olive)' : 'transparent'};transition:all 0.2s`;
  };

  _container.innerHTML = `
  <div style="max-width:1000px;margin:0 auto;padding:100px 32px 64px">

    <div class="panel-label" style="margin-bottom:24px">[ADMIN_CONSOLE]</div>

    <!-- Stats Row -->
    <div id="admin-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:28px">
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--accent-cyan)" id="stat-users">--</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-top:6px">TOTAL USERS</div>
      </div>
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--accent-olive)" id="stat-pro">--</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-top:6px">ACTIVE PRO</div>
      </div>
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--accent-cyan)" id="stat-mrr">--</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-top:6px">MRR</div>
      </div>
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--accent-orange)" id="stat-queries">--</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-top:6px">QUERIES TODAY</div>
      </div>
    </div>

    <!-- Tab Bar -->
    <div style="display:flex;border-bottom:1px solid var(--border-subtle);margin-bottom:20px">
      <button class="admin-tab" data-tab="users" style="${tabStyle('users')}">USERS</button>
      <button class="admin-tab" data-tab="blog" style="${tabStyle('blog')}">BLOG</button>
    </div>

    <!-- Users Tab -->
    <div id="tab-users" style="${_activeTab !== 'users' ? 'display:none' : ''}">

      <!-- Search -->
      <div style="margin-bottom:16px">
        <input id="user-search" type="text" placeholder="Search users by email..."
          style="width:100%;padding:12px 16px;background:var(--bg-panel);border:1px solid var(--border-subtle);border-radius:4px;color:var(--text-main);font-family:var(--font-mono);font-size:12px;outline:none;transition:border-color 0.2s"
          value="${_esc(_searchQuery)}">
      </div>

      <!-- Users Table -->
      <div id="users-table"></div>

      <!-- Impersonate Modal -->
      <div id="impersonate-modal" class="modal-backdrop">
        <div class="modal-content" style="max-width:520px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
          <button class="modal-close" id="impersonate-close">&times;</button>
          <div class="panel-label" style="margin-bottom:12px">[IMPERSONATE]</div>
          <div id="impersonate-email" style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);margin-bottom:12px"></div>
          <textarea id="impersonate-query" rows="3" placeholder="Enter query to run as this user..."
            style="width:100%;padding:12px;background:var(--bg-deep);border:1px solid var(--border-subtle);border-radius:4px;color:var(--text-main);font-family:var(--font-mono);font-size:12px;resize:none;outline:none;margin-bottom:12px"></textarea>
          <button id="impersonate-run" class="btn-action" style="width:100%">Run Query</button>
          <div id="impersonate-result" style="margin-top:12px"></div>
        </div>
      </div>

    </div><!-- end tab-users -->

    <!-- Blog Tab -->
    <div id="tab-blog" style="${_activeTab !== 'blog' ? 'display:none' : ''}">
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button id="blog-generate" class="btn-ghost">Generate Article</button>
        <button id="blog-generate-cluster" class="btn-ghost">Generate Cluster</button>
        <button id="blog-refresh" class="btn-ghost">Refresh</button>
      </div>
      <div id="blog-table"></div>
    </div>

    <!-- Credits Modal -->
    <div id="credits-modal" class="modal-backdrop">
      <div class="modal-content" style="max-width:400px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
        <button class="modal-close" id="credits-close">&times;</button>
        <div class="panel-label" style="margin-bottom:12px">[ADJUST_CREDITS]</div>
        <div id="credits-email" style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);margin-bottom:12px"></div>
        <input id="credits-amount" type="number" placeholder="Amount (positive or negative)"
          style="width:100%;padding:10px 12px;background:var(--bg-deep);border:1px solid var(--border-subtle);border-radius:4px;color:var(--text-main);font-family:var(--font-mono);font-size:12px;outline:none;margin-bottom:8px">
        <input id="credits-reason" type="text" placeholder="Reason"
          style="width:100%;padding:10px 12px;background:var(--bg-deep);border:1px solid var(--border-subtle);border-radius:4px;color:var(--text-main);font-family:var(--font-mono);font-size:12px;outline:none;margin-bottom:12px">
        <button id="credits-submit" class="btn-action" style="width:100%">Adjust Credits</button>
      </div>
    </div>
  </div>`;

  // Search event with module-level timer
  const searchInput = _container.querySelector('#user-search');
  searchInput.addEventListener('input', () => {
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      _searchQuery = searchInput.value.trim();
      _page = 1;
      _loadUsers();
    }, 300);
  });

  // Focus style
  searchInput.addEventListener('focus', () => { searchInput.style.borderColor = 'var(--accent-olive)'; });
  searchInput.addEventListener('blur', () => { searchInput.style.borderColor = 'var(--border-subtle)'; });

  // Modal closes
  _container.querySelector('#impersonate-close')?.addEventListener('click', () => _container.querySelector('#impersonate-modal').classList.remove('show'));
  _container.querySelector('#impersonate-modal')?.addEventListener('click', (e) => { if (e.target.id === 'impersonate-modal') e.target.classList.remove('show'); });
  _container.querySelector('#credits-close')?.addEventListener('click', () => _container.querySelector('#credits-modal').classList.remove('show'));
  _container.querySelector('#credits-modal')?.addEventListener('click', (e) => { if (e.target.id === 'credits-modal') e.target.classList.remove('show'); });

  // Tab switching
  _container.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.dataset.tab;
      _render();
      if (_activeTab === 'blog') _loadBlogPosts();
      else _loadData();
    });
  });

  // Blog buttons
  _container.querySelector('#blog-generate')?.addEventListener('click', _openGenerateModal);
  _container.querySelector('#blog-generate-cluster')?.addEventListener('click', _openClusterModal);
  _container.querySelector('#blog-refresh')?.addEventListener('click', _loadBlogPosts);

  // Load blog if active
  if (_activeTab === 'blog') _loadBlogPosts();
}

function _renderStats() {
  if (!_container || !_stats) return;
  const el = (id) => _container.querySelector('#' + id);
  if (el('stat-users')) el('stat-users').textContent = _stats.total_users ?? '--';
  if (el('stat-pro')) el('stat-pro').textContent = _stats.pro_users ?? '--';
  if (el('stat-mrr')) el('stat-mrr').textContent = '$' + ((_stats.pro_users || 0) * 49);
  if (el('stat-queries')) el('stat-queries').textContent = _stats.queries_today ?? '--';
}

function _renderUsers() {
  if (!_container) return;
  const table = _container.querySelector('#users-table');
  if (!table) return;

  if (!_users.length) {
    table.innerHTML = '<div class="empty-state">No users found.</div>';
    return;
  }

  table.innerHTML = `
  <div class="card" style="padding:0;overflow:hidden">
    <table class="data-table">
      <thead><tr><th>#</th><th>USER</th><th>TIER</th><th>CREDITS</th><th>JOINED</th><th>ACTIONS</th></tr></thead>
      <tbody>
        ${_users.map((u, i) => `
        <tr>
          <td style="font-family:var(--font-mono);color:var(--text-dim)">${String((_page - 1) * 20 + i + 1).padStart(3, '0')}</td>
          <td>
            <div style="font-size:13px;color:var(--text-main)">${_esc(u.email)}</div>
            ${u.name ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">${_esc(u.name)}</div>` : ''}
          </td>
          <td><span class="badge" style="${u.tier === 'pro' ? 'background:rgba(156,170,126,0.15);color:var(--accent-olive)' : ''}">${(u.tier || 'free').toUpperCase()}</span></td>
          <td style="font-family:var(--font-mono)">${u.credits_remaining ?? '-'}</td>
          <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn-admin-credits btn-ghost" data-email="${_esc(u.email)}">Credits</button>
              <select class="sel-admin-tier" data-email="${_esc(u.email)}" style="background:var(--bg-panel);border:1px solid var(--border-subtle);border-radius:4px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;padding:4px;cursor:pointer">
                <option value="free" ${(u.tier||'free')==='free'?'selected':''}>FREE</option>
                <option value="pro" ${u.tier==='pro'?'selected':''}>PRO</option>
              </select>
              <button class="btn-admin-impersonate btn-ghost" data-email="${_esc(u.email)}">Impersonate</button>
            </div>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;

  // Events
  table.querySelectorAll('.btn-admin-credits').forEach(btn => {
    btn.addEventListener('click', () => _openCreditsModal(btn.dataset.email));
  });
  table.querySelectorAll('.sel-admin-tier').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await adminChangeTier(sel.dataset.email, sel.value);
        _loadUsers();
      } catch (e) { alert('Failed: ' + e.message); }
    });
  });
  table.querySelectorAll('.btn-admin-impersonate').forEach(btn => {
    btn.addEventListener('click', () => _openImpersonateModal(btn.dataset.email));
  });
}

function _openCreditsModal(email) {
  if (!_container) return;
  const modal = _container.querySelector('#credits-modal');
  _container.querySelector('#credits-email').textContent = email;
  _container.querySelector('#credits-amount').value = '';
  _container.querySelector('#credits-reason').value = '';
  modal.classList.add('show');

  const submitBtn = _container.querySelector('#credits-submit');
  const newBtn = submitBtn.cloneNode(true);
  submitBtn.replaceWith(newBtn);
  newBtn.addEventListener('click', async () => {
    const amount = parseInt(_container.querySelector('#credits-amount').value);
    const reason = _container.querySelector('#credits-reason').value;
    if (isNaN(amount)) { alert('Enter a valid number'); return; }
    newBtn.textContent = 'Saving...';
    newBtn.disabled = true;
    try {
      await adminAdjustCredits(email, amount, reason);
      modal.classList.remove('show');
      _loadUsers();
    } catch (e) { alert('Failed: ' + e.message); }
    newBtn.textContent = 'Adjust Credits';
    newBtn.disabled = false;
  });
}

// ── Blog management ──

async function _loadBlogPosts() {
  try {
    const resp = await fetch('/api/admin/blog', {
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token') },
    });
    const data = await resp.json();
    _blogPosts = data.posts || [];
    _renderBlogPosts();
  } catch (e) { /* silent */ }
}

function _renderBlogPosts() {
  if (!_container) return;
  const table = _container.querySelector('#blog-table');
  if (!table) return;

  if (!_blogPosts.length) {
    table.innerHTML = '<div class="empty-state">No blog posts yet. Generate your first article above.</div>';
    return;
  }

  table.innerHTML = `
  <div class="card" style="padding:0;overflow:hidden">
    <table class="data-table">
      <thead><tr><th>TITLE</th><th>CLUSTER</th><th>TYPE</th><th>STATUS</th><th>WORDS</th><th>ACTIONS</th></tr></thead>
      <tbody>
        ${_blogPosts.map(p => `
        <tr>
          <td style="color:var(--text-main)">${_esc(p.title || p.slug)}</td>
          <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${_esc(p.cluster_slug || '-')}</td>
          <td><span class="badge" style="${p.content_type === 'pillar' ? 'background:rgba(156,170,126,0.15);color:var(--accent-olive)' : ''}">${(p.content_type || 'supporting').toUpperCase()}</span></td>
          <td><span class="badge" style="${p.status === 'published' ? 'background:rgba(0,209,230,0.1);color:var(--accent-cyan)' : ''}">${(p.status || 'draft').toUpperCase()}</span></td>
          <td style="font-family:var(--font-mono)">${p.word_count || '-'}</td>
          <td>
            <div style="display:flex;gap:4px">
              ${p.status === 'draft'
                ? `<button class="btn-blog-publish btn-ghost" data-id="${_esc(p.id)}">Publish</button>`
                : `<button class="btn-blog-unpublish btn-ghost" data-id="${_esc(p.id)}">Unpublish</button>`}
              ${p.status === 'published' ? `<a href="/blog/${_esc(p.slug)}" target="_blank" class="btn-ghost" style="text-decoration:none">Preview</a>` : ''}
            </div>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;

  // Publish/unpublish events
  table.querySelectorAll('.btn-blog-publish').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.textContent = '...';
      btn.disabled = true;
      try {
        await fetch('/api/admin/blog/' + btn.dataset.id + '/publish', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token') },
        });
        _loadBlogPosts();
      } catch (e) { alert('Failed: ' + e.message); }
    });
  });
  table.querySelectorAll('.btn-blog-unpublish').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.textContent = '...';
      btn.disabled = true;
      try {
        await fetch('/api/admin/blog/' + btn.dataset.id + '/unpublish', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token') },
        });
        _loadBlogPosts();
      } catch (e) { alert('Failed: ' + e.message); }
    });
  });
}

async function _openGenerateModal() {
  const keyword = prompt('Enter target keyword for the article:');
  if (!keyword) return;
  const cluster = prompt('Cluster slug (leave empty for none):', '') || '';
  try {
    window.showToast?.('Generating article... This may take a minute.', 'success', 10000);
    const resp = await fetch('/api/admin/blog/generate', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword, cluster_slug: cluster }),
    });
    const data = await resp.json();
    if (data.post_id) {
      window.showToast?.('Article generated as draft!', 'success');
      _loadBlogPosts();
    } else {
      alert('Failed: ' + (data.error || 'Unknown error'));
    }
  } catch (e) { alert('Failed: ' + e.message); }
}

async function _openClusterModal() {
  const name = prompt('Cluster name (e.g., "Website SEO Audit"):');
  if (!name) return;
  const pillar = prompt('Pillar keyword:');
  if (!pillar) return;
  const supporting = prompt('Supporting keywords (comma-separated):');
  if (!supporting) return;

  const keywords = supporting.split(',').map(k => k.trim()).filter(Boolean);
  try {
    window.showToast?.('Generating cluster... This will take several minutes.', 'success', 30000);
    const resp = await fetch('/api/admin/blog/generate-cluster', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + sessionStorage.getItem('seo_token'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cluster_name: name, pillar_keyword: pillar, supporting_keywords: keywords }),
    });
    const data = await resp.json();
    window.showToast?.(`Cluster generated: ${data.total_articles || 0} articles as drafts.`, 'success');
    _loadBlogPosts();
  } catch (e) { alert('Failed: ' + e.message); }
}

function _openImpersonateModal(email) {
  if (!_container) return;
  const modal = _container.querySelector('#impersonate-modal');
  _container.querySelector('#impersonate-email').textContent = 'Running as: ' + email;
  _container.querySelector('#impersonate-query').value = '';
  _container.querySelector('#impersonate-result').innerHTML = '';
  modal.classList.add('show');

  const runBtn = _container.querySelector('#impersonate-run');
  const newBtn = runBtn.cloneNode(true);
  runBtn.replaceWith(newBtn);
  newBtn.addEventListener('click', async () => {
    const query = _container.querySelector('#impersonate-query').value.trim();
    if (!query) return;
    const resultEl = _container.querySelector('#impersonate-result');
    newBtn.textContent = 'Running...';
    newBtn.disabled = true;
    resultEl.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);padding:12px">[PROCESSING]...</div>`;
    try {
      const data = await adminImpersonate(email, query);
      resultEl.innerHTML = `<pre style="background:var(--bg-deep);border:1px solid var(--border-subtle);border-radius:4px;padding:12px;font-family:var(--font-mono);font-size:11px;color:var(--text-muted);overflow-x:auto;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto">${_esc(JSON.stringify(data, null, 2))}</pre>`;
    } catch (e) {
      resultEl.innerHTML = `<div style="font-family:var(--font-mono);font-size:12px;color:var(--accent-orange);padding:8px">${_esc(e.message)}</div>`;
    }
    newBtn.textContent = 'Run Query';
    newBtn.disabled = false;
  });
}
