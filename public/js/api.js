// api.js - Shared fetch helpers for trySEO.ai
import { getToken, signOut } from './auth.js';
import { navigate } from './router.js';

export async function fetchAPI(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    signOut();
    navigate('/');
    throw new Error('Session expired. Please sign in again.');
  }

  if (res.status === 402) {
    window.dispatchEvent(new CustomEvent('credits-exhausted', {
      detail: { message: 'You have run out of credits. Upgrade to Pro for more.' }
    }));
    throw new Error('Credits exhausted');
  }

  return res;
}

export async function queryAPI(query) {
  const res = await fetchAPI('/api/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  return res.json();
}

export async function getHistory() {
  const res = await fetchAPI('/api/history');
  return res.json();
}

export async function getUsage() {
  const res = await fetchAPI('/api/usage');
  return res.json();
}

export async function getEvidence(searchId) {
  const res = await fetchAPI(`/api/evidence/${searchId}`);
  return res.json();
}

export async function downloadReport(data) {
  const res = await fetchAPI('/api/report', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Report generation failed');
  const html = await res.text();
  const blob = new Blob([html], { type: 'text/html' });
  triggerDownload(blob, `tryseo_${data.tool_used}_${Date.now()}.html`);
}

export async function downloadClientReport(data) {
  const res = await fetchAPI('/api/client-report', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Client report generation failed');
  const blob = await res.blob();
  const domain = (data.query || 'report').replace(/https?:\/\//, '').split('/')[0];
  triggerDownload(blob, `tryseo_report_${domain}.docx`);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getTrackedUrls() {
  const res = await fetchAPI('/api/tracking');
  return res.json();
}

export async function addTrackedUrl(url) {
  const res = await fetchAPI('/api/tracking', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function removeTrackedUrl(id) {
  const res = await fetchAPI('/api/tracking', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function runSnapshot(url) {
  const res = await fetchAPI('/api/tracking/snapshot', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function getSnapshots(url) {
  const res = await fetchAPI(`/api/tracking/snapshots?url=${encodeURIComponent(url)}`);
  return res.json();
}

export async function getAnalytics(propertyId, dateRange) {
  const params = new URLSearchParams();
  if (propertyId) params.set('property_id', propertyId);
  if (dateRange) params.set('date_range', dateRange);
  const res = await fetchAPI(`/api/analytics?${params}`);
  return res.json();
}

export async function runFreeAudit(url) {
  const res = await fetch('/api/free-audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function stripeCheckout(priceId) {
  const res = await fetchAPI('/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ price_id: priceId }),
  });
  return res.json();
}

export async function stripePortal() {
  const res = await fetchAPI('/api/stripe/portal', {
    method: 'POST',
  });
  return res.json();
}

// Admin endpoints
export async function getAdminUsers(page = 1, search = '') {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set('search', search);
  const res = await fetchAPI(`/api/admin/users?${params}`);
  return res.json();
}

export async function getAdminUserDetail(email) {
  const res = await fetchAPI(`/api/admin/users/${encodeURIComponent(email)}`);
  return res.json();
}

export async function adminAdjustCredits(email, amount, reason) {
  const res = await fetchAPI(`/api/admin/users/${encodeURIComponent(email)}/credits`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
  return res.json();
}

export async function adminChangeTier(email, tier) {
  const res = await fetchAPI(`/api/admin/users/${encodeURIComponent(email)}/tier`, {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
  return res.json();
}

export async function adminImpersonate(email, query) {
  const res = await fetchAPI('/api/admin/impersonate', {
    method: 'POST',
    body: JSON.stringify({ email, query }),
  });
  return res.json();
}

export async function getAdminStats() {
  const res = await fetchAPI('/api/admin/stats');
  return res.json();
}

export async function getConfig() {
  const res = await fetch('/api/config');
  return res.json();
}
