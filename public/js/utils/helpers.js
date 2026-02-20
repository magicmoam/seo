// helpers.js - Shared pure utility functions

/** HTML-escape a string to prevent XSS. */
export function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

/** Format a number with K/M suffixes. */
export function formatNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/** Truncate a string with ellipsis. */
export function truncate(str, maxLen = 80) {
  if (!str) return '';
  const s = String(str);
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

/** Colored badge for difficulty/severity/score levels. */
export function diffBadge(d) {
  if (!d) return '';
  const l = String(d).toLowerCase();
  const map = { low: 'low', medium: 'medium', high: 'high', poor: 'poor', fair: 'fair', good: 'good', excellent: 'excellent', critical: 'critical', warning: 'warning', info: 'info' };
  const cls = map[l] || 'medium';
  return `<span class="badge badge-${cls}">${esc(d)}</span>`;
}

/** Badge for intent types. */
export function intentBadge(i) {
  return `<span class="badge badge-intent">${esc(i)}</span>`;
}
