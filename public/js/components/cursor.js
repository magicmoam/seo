// cursor.js - Custom cursor with dot + circle, smooth follow, dark section inversion
let _dot = null;
let _circle = null;
let _enabled = false;
let _cursorX = 0;
let _cursorY = 0;
let _circleX = 0;
let _circleY = 0;
let _raf = null;
let _moveHandler = null;
let _mutationObs = null;

const LERP = 0.12;
const HOVER_SELECTORS = 'a, button, .nav-link, .tool-card, .filter-btn, .phase-card, .pricing-card, .faq-item, .principle-card, .tech-item, .toggle-btn';
const DARK_SECTION_SELECTORS = '#orchestrator, #comparison, #how-it-works';

function _onMouseMove(e) {
  _cursorX = e.clientX;
  _cursorY = e.clientY;

  // Dot follows instantly
  if (_dot) {
    _dot.style.transform = `translate(${_cursorX}px, ${_cursorY}px) translate(-50%, -50%)`;
  }

  // Dark section inversion
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const isDark = el && el.closest(DARK_SECTION_SELECTORS);
  if (isDark) {
    _dot && _dot.classList.add('inverted');
    _circle && _circle.classList.add('inverted');
  } else {
    _dot && _dot.classList.remove('inverted');
    _circle && _circle.classList.remove('inverted');
  }
}

function _animateCircle() {
  _circleX += (_cursorX - _circleX) * LERP;
  _circleY += (_cursorY - _circleY) * LERP;
  if (_circle) {
    _circle.style.transform = `translate(${_circleX}px, ${_circleY}px) translate(-50%, -50%)`;
  }
  _raf = requestAnimationFrame(_animateCircle);
}

function _bindHover() {
  document.querySelectorAll(HOVER_SELECTORS).forEach(el => {
    if (el._cursorBound) return;
    el._cursorBound = true;
    el.addEventListener('mouseenter', () => _circle && _circle.classList.add('hovered'));
    el.addEventListener('mouseleave', () => _circle && _circle.classList.remove('hovered'));
  });
}

export function initCursor() {
  // Skip on touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

  _dot = document.querySelector('.cursor-dot');
  _circle = document.querySelector('.cursor-circle');

  if (!_dot || !_circle) return;

  _enabled = true;

  _moveHandler = _onMouseMove;
  document.addEventListener('mousemove', _moveHandler);
  _raf = requestAnimationFrame(_animateCircle);

  // Initial hover binding
  _bindHover();

  // Re-bind on DOM changes
  _mutationObs = new MutationObserver(() => _bindHover());
  _mutationObs.observe(document.body, { childList: true, subtree: true });
}

export function destroyCursor() {
  if (!_enabled) return;
  document.removeEventListener('mousemove', _moveHandler);
  if (_raf) cancelAnimationFrame(_raf);
  if (_mutationObs) _mutationObs.disconnect();
  _raf = null;
  _enabled = false;
}
