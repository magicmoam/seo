// admin.js - Admin dashboard for trySEO.ai
import { getUser, onAuthStateChanged } from '../auth.js';
import { getAdminUsers, getAdminUserDetail, adminAdjustCredits, adminChangeTier, adminImpersonate, getAdminStats } from '../api.js';
import { navigate } from '../router.js';
import { esc as _esc } from '../utils/helpers.js';

let _container = null;
let _unsubAuth = null;
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
  if (!user.is_admin) {
    _container.innerHTML = `<div style="text-align:center;padding:120px 32px">
      <h2 style="font-size:24px;font-weight:300;color:var(--c-text-primary);margin-bottom:12px">Access Denied</h2>
      <p style="color:var(--c-text-tertiary);font-size:14px">You do not have admin privileges.</p>
      <a href="#/app" class="btn-ghost" style="display:inline-block;margin-top:16px;text-decoration:none">Back to App</a>
    </div>`;
    return;
  }

  _render();
  _loadData();

  _unsubAuth = onAuthStateChanged((u) => {
    if (!u || !u.is_admin) { navigate('/'); }
  });
}

export function unmount() {
  if (_unsubAuth) _unsubAuth();
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
  _container.innerHTML = `
  <div style="max-width:960px;margin:0 auto;padding:100px 32px 64px">
    <h1 class="fade-in" style="font-size:32px;font-weight:300;letter-spacing:-0.03em;color:var(--c-text-primary);margin-bottom:16px">Admin Dashboard</h1>

    <!-- Tabs -->
    <div style="display:flex;gap:4px;margin-bottom:24px" class="fade-in">
      <button class="admin-tab btn-ghost ${_activeTab === 'users' ? 'active' : ''}" data-tab="users" style="font-size:11px;padding:6px 16px;${_activeTab === 'users' ? 'background:rgba(212,184,149,0.15);color:var(--c-accent);border-color:var(--c-accent)' : ''}">Users</button>
      <button class="admin-tab btn-ghost ${_activeTab === 'blog' ? 'active' : ''}" data-tab="blog" style="font-size:11px;padding:6px 16px;${_activeTab === 'blog' ? 'background:rgba(212,184,149,0.15);color:var(--c-accent);border-color:var(--c-accent)' : ''}">Blog</button>
    </div>

    <!-- Users Tab -->
    <div id="tab-users" style="${_activeTab !== 'users' ? 'display:none' : ''}">

    <!-- Stats -->
    <div id="admin-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px" class="fade-in fade-in-delay-1">
      <div class="panel" style="text-align:center;padding:20px"><div style="font-family:'Space Mono',monospace;font-size:24px;font-weight:700;color:var(--c-accent)" id="stat-users">--</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Total Users</div></div>
      <div class="panel" style="text-align:center;padding:20px"><div style="font-family:'Space Mono',monospace;font-size:24px;font-weight:700;color:var(--c-green)" id="stat-pro">--</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Active Pro</div></div>
      <div class="panel" style="text-align:center;padding:20px"><div style="font-family:'Space Mono',monospace;font-size:24px;font-weight:700;color:var(--c-accent)" id="stat-mrr">--</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">MRR</div></div>
      <div class="panel" style="text-align:center;padding:20px"><div style="font-family:'Space Mono',monospace;font-size:24px;font-weight:700;color:var(--c-accent)" id="stat-queries">--</div><div style="font-size:11px;color:var(--c-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Queries Today</div></div>
    </div>

    <!-- Search -->
    <div style="margin-bottom:16px" class="fade-in fade-in-delay-2">
      <input id="user-search" type="text" placeholder="Search users by email..."
        style="width:100%;padding:12px 16px;background:var(--c-bg-card);border:1px solid var(--c-glass-border);border-radius:var(--radius);color:var(--c-text-primary);font-size:14px;font-family:Inter,sans-serif;font-weight:300;outline:none;transition:border-color 0.2s"
        value="${_esc(_searchQuery)}">
    </div>

    <!-- Users Table -->
    <div id="users-table" class="fade-in fade-in-delay-3"></div>

    <!-- Impersonate Modal -->
    <div id="impersonate-modal" class="modal-backdrop">
      <div class="modal-content" style="max-width:520px">
        <button class="modal-close" id="impersonate-close">&times;</button>
        <h3 style="font-size:16px;font-weight:500;color:var(--c-text-primary);margin-bottom:12px">Impersonate User</h3>
        <div id="impersonate-email" style="font-size:13px;color:var(--c-text-tertiary);margin-bottom:12px"></div>
        <textarea id="impersonate-query" rows="3" placeholder="Enter query to run as this user..."
          style="width:100%;padding:12px;background:var(--c-bg-card);border:1px solid var(--c-glass-border);border-radius:var(--radius);color:var(--c-text-primary);font-size:14px;font-family:Inter,sans-serif;resize:none;outline:none;margin-bottom:12px"></textarea>
        <button id="impersonate-run" class="btn-primary" style="width:100%">Run Query</button>
        <div id="impersonate-result" style="margin-top:12px"></div>
      </div>
    </div>

    </div><!-- end tab-users -->

    <!-- Blog Tab -->
    <div id="tab-blog" style="${_activeTab !== 'blog' ? 'display:none' : ''}">
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button id="blog-generate" class="btn-ghost" style="font-size:11px;padding:6px 16px">Generate Article</button>
        <button id="blog-generate-cluster" class="btn-ghost" style="font-size:11px;padding:6px 16px">Generate Cluster</button>
        <button id="blog-refresh" class="btn-ghost" style="font-size:11px;padding:6px 16px">Refresh</button>
      </div>
      <div id="blog-table"></div>
    </div>

    <!-- Credits Modal -->
    <div id="credits-modal" class="modal-backdrop">
      <div class="modal-content" style="max-width:400px">
        <button class="modal-close" id="credits-close">&times;</button>
        <h3 style="font-size:16px;font-weight:500;color:var(--c-text-primary);margin-bottom:12px">Adjust Credits</h3>
        <div id="credits-email" style="font-size:13px;color:var(--c-text-tertiary);margin-bottom:12px"></div>
        <input id="credits-amount" type="number" placeholder="Amount (positive or negative)"
          style="width:100%;padding:10px 12px;background:var(--c-bg-card);border:1px solid var(--c-glass-border);border-radius:var(--radius);color:var(--c-text-primary);font-size:14px;font-family:inherit;outline:none;margin-bottom:8px">
        <input id="credits-reason" type="text" placeholder="Reason"
          style="width:100%;padding:10px 12px;background:var(--c-bg-card);border:1px solid var(--c-glass-border);border-radius:var(--radius);color:var(--c-text-primary);font-size:14px;font-family:inherit;outline:none;margin-bottom:12px">
        <button id="credits-submit" class="btn-primary" style="width:100%">Adjust Credits</button>
      </div>
    </div>
  </div>`;

  // Search event
  const searchInput = _container.querySelector('#user-search');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      _searchQuery = searchInput.value.trim();
      _page = 1;
      _loadUsers();
    }, 300);
  });

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
    table.innerHTML = '<div style="text-align:center;padding:40px;color:var(--c-text-tertiary)">No users found.</div>';
    return;
  }

  table.innerHTML = `
  <div class="glass" style="overflow:hidden">
    <table class="data-table">
      <thead><tr><th>Email</th><th>Name</th><th>Tier</th><th>Credits</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>
        ${_users.map(u => `
        <tr>
          <td><strong>${_esc(u.email)}</strong></td>
          <td>${_esc(u.name || '-')}</td>
          <td><span style="font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;padding:2px 8px;border-radius:var(--radius);${u.tier === 'pro' ? 'background:rgba(107,207,127,0.12);color:var(--c-green)' : 'background:rgba(255,255,255,0.05);color:var(--c-text-tertiary)'}">${u.tier || 'free'}</span></td>
          <td style="font-family:'Space Mono',monospace">${u.credits_remaining ?? '-'}</td>
          <td class="cell-dim">${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn-admin-credits btn-ghost" data-email="${_esc(u.email)}" style="font-size:10px;padding:3px 8px">Credits</button>
              <select class="sel-admin-tier" data-email="${_esc(u.email)}" style="background:var(--c-bg-card);border:1px solid var(--c-glass-border);border-radius:var(--radius);color:var(--c-text-secondary);font-size:10px;padding:3px;cursor:pointer">
                <option value="free" ${(u.tier||'free')==='free'?'selected':''}>Free</option>
                <option value="pro" ${u.tier==='pro'?'selected':''}>Pro</option>
              </select>
              <button class="btn-admin-impersonate btn-ghost" data-email="${_esc(u.email)}" style="font-size:10px;padding:3px 8px">Impersonate</button>
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
  // Clone to remove old listeners
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
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('auth_token') },
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
    table.innerHTML = '<div style="text-align:center;padding:40px;color:var(--c-text-tertiary)">No blog posts yet. Generate your first article above.</div>';
    return;
  }

  table.innerHTML = `
  <div class="glass" style="overflow:hidden">
    <table class="data-table">
      <thead><tr><th>Title</th><th>Cluster</th><th>Type</th><th>Status</th><th>Words</th><th>Actions</th></tr></thead>
      <tbody>
        ${_blogPosts.map(p => `
        <tr>
          <td><strong>${_esc(p.title || p.slug)}</strong></td>
          <td class="cell-dim">${_esc(p.cluster_slug || '-')}</td>
          <td><span style="font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;padding:2px 8px;border-radius:var(--radius);${p.content_type === 'pillar' ? 'background:rgba(212,184,149,0.15);color:var(--c-accent)' : 'background:rgba(255,255,255,0.05);color:var(--c-text-tertiary)'}">${p.content_type || 'supporting'}</span></td>
          <td><span style="font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;padding:2px 8px;border-radius:var(--radius);${p.status === 'published' ? 'background:rgba(107,207,127,0.12);color:var(--c-green)' : 'background:rgba(255,255,255,0.05);color:var(--c-text-tertiary)'}">${p.status}</span></td>
          <td style="font-family:'Space Mono',monospace">${p.word_count || '-'}</td>
          <td>
            <div style="display:flex;gap:4px">
              ${p.status === 'draft' ? `<button class="btn-blog-publish btn-ghost" data-id="${_esc(p.id)}" style="font-size:10px;padding:3px 8px">Publish</button>` : `<button class="btn-blog-unpublish btn-ghost" data-id="${_esc(p.id)}" style="font-size:10px;padding:3px 8px">Unpublish</button>`}
              ${p.status === 'published' ? `<a href="/blog/${_esc(p.slug)}" target="_blank" class="btn-ghost" style="font-size:10px;padding:3px 8px;text-decoration:none">Preview</a>` : ''}
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
          headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('auth_token') },
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
          headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('auth_token') },
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
        'Authorization': 'Bearer ' + sessionStorage.getItem('auth_token'),
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
        'Authorization': 'Bearer ' + sessionStorage.getItem('auth_token'),
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
    resultEl.innerHTML = '<p style="color:var(--c-text-tertiary);font-size:13px">Processing...</p>';
    try {
      const data = await adminImpersonate(email, query);
      resultEl.innerHTML = `<pre style="background:rgba(0,0,0,0.2);border:1px solid var(--c-glass-border);border-radius:var(--radius);padding:12px;font-family:'Space Mono',monospace;font-size:11px;color:var(--c-text-secondary);overflow-x:auto;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto">${_esc(JSON.stringify(data, null, 2))}</pre>`;
    } catch (e) {
      resultEl.innerHTML = `<p style="color:var(--c-red);font-size:13px">${_esc(e.message)}</p>`;
    }
    newBtn.textContent = 'Run Query';
    newBtn.disabled = false;
  });
}

