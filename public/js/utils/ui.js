/**
 * Shared UI fragment builders for Retune.
 * All functions return HTML strings compatible with innerHTML.
 * User-generated content is always escaped via esc().
 */
import { esc } from './helpers.js';

/**
 * Panel with [LABEL] header
 * @param {string} labelText - Label text (will show as [LABELTEXT])
 * @param {string} content - HTML content for the panel body
 * @returns {string} HTML string
 */
export function panel(labelText, content) {
  return `
    <div class="panel">
      <span class="panel-label">${esc(labelText)}</span>
      ${content}
    </div>
  `;
}

/**
 * Badge with optional severity variant
 * @param {string} text - Badge text
 * @param {string} variant - 'high'|'medium'|'low'|'critical'|'pass'|'fail'|'intent'|''
 */
export function badge(text, variant = '') {
  const cls = variant ? `badge badge-${variant}` : 'badge';
  return `<span class="${cls}">${esc(text)}</span>`;
}

/**
 * Data table
 * @param {string[]} headers - Column header strings
 * @param {string[][]} rows - Array of row arrays (each cell is an HTML string, already escaped if needed)
 */
export function dataTable(headers, rows) {
  return `
    <table class="data-table">
      <thead>
        <tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Empty state placeholder
 * @param {string} message - Message to display
 */
export function emptyState(message) {
  return `<div class="empty-state">${esc(message)}</div>`;
}

/**
 * Tag/pill component
 * @param {string} text - Tag text
 * @param {string} variant - ''|'accent'
 */
export function tag(text, variant = '') {
  const cls = variant ? `tag tag-${variant}` : 'tag';
  return `<span class="${cls}">${esc(text)}</span>`;
}

/**
 * Progress bar
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @param {string} color - CSS color string (e.g., 'var(--color-success)')
 */
export function progressBar(value, max, color = 'var(--accent-olive)') {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return `
    <div class="progress-bar">
      <div class="progress-fill" style="width:${pct}%;background:${color};"></div>
    </div>
  `;
}

/**
 * Score bar (horizontal, inline)
 * @param {number} score - 0-100
 * @param {number} width - bar width in px
 */
export function scoreBar(score, width = 60) {
  const color = score >= 70 ? 'var(--color-success)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-error)';
  return `
    <span class="score-bar" style="width:${width}px">
      <span class="score-fill" style="width:${score}%;background:${color};"></span>
    </span>
  `;
}

/**
 * Status dot indicator
 * @param {boolean} connected - Whether connected/active
 */
export function statusDot(connected = false) {
  return `<span class="status-dot${connected ? ' status-dot--connected' : ''}"></span>`;
}

/**
 * Modal markup
 * @param {string} id - Modal backdrop ID for targeting
 * @param {string} content - Inner HTML content
 */
export function modal(id, content) {
  return `
    <div class="modal-backdrop" id="${esc(id)}">
      <div class="modal-content">
        <button class="modal-close" onclick="document.getElementById('${esc(id)}')?.remove()">×</button>
        ${content}
      </div>
    </div>
  `;
}

/**
 * Panel list (bulleted list inside a panel)
 * @param {string[]} items - Array of text or HTML strings
 */
export function panelList(items) {
  return `<ul class="panel-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
}
