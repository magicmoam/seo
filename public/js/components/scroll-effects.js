// scroll-effects.js - Reveal, parallax, scroll progress, nav pill scroll state, side indicator
let _revealObserver = null;
let _dividerObserver = null;
let _scrollHandler = null;
let _mutationObs = null;

export function initScrollEffects() {
  // IntersectionObserver for .reveal and .reveal-stagger
  _revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');

        // Stagger children if present
        const children = entry.target.querySelectorAll('.reveal-child');
        children.forEach((child, i) => {
          child.style.transitionDelay = `${i * 0.08}s`;
        });
      }
    }
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px',
  });

  // Gold divider observer
  _dividerObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    }
  }, { threshold: 0.5 });

  // Observe all existing elements
  _observeAll();

  // Re-observe on DOM changes (debounced to prevent jank during page transitions)
  let _pendingObserveRaf = false;
  _mutationObs = new MutationObserver(() => {
    if (_pendingObserveRaf) return;
    _pendingObserveRaf = true;
    requestAnimationFrame(() => {
      _pendingObserveRaf = false;
      _observeAll();
    });
  });
  _mutationObs.observe(document.body, { childList: true, subtree: true });

  // Unified scroll handler
  _scrollHandler = () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Scroll progress bar
    const progressEl = document.querySelector('.scroll-progress');
    if (progressEl) {
      const progress = docHeight > 0 ? scrollY / docHeight : 0;
      progressEl.style.transform = `scaleX(${progress})`;
    }

    // Nav pill scroll state
    const navPill = document.querySelector('.nav-pill');
    if (navPill) {
      if (scrollY > 100) {
        navPill.classList.add('scrolled');
      } else {
        navPill.classList.remove('scrolled');
      }
    }

    // Parallax elements
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 0.02;
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
      el.style.transform = `translateY(${offset}px)`;
    });

    // Parallax card gradients
    document.querySelectorAll('[data-parallax-card]').forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 0.03;
      const rect = el.parentElement.getBoundingClientRect();
      const offset = rect.top * speed;
      el.style.transform = `translateY(${offset}px) scale(1.05)`;
    });

    // Side indicator opacity
    const sideIndicator = document.querySelector('.side-indicator');
    if (sideIndicator && sideIndicator.parentElement) {
      const scrollPercent = docHeight > 0 ? scrollY / docHeight : 0;
      sideIndicator.parentElement.style.opacity = Math.max(0.3, 1 - scrollPercent * 1.5);
    }
  };

  window.addEventListener('scroll', _scrollHandler, { passive: true });
}

function _observeAll() {
  if (_revealObserver) {
    document.querySelectorAll('.reveal:not(.visible), .reveal-stagger:not(.visible)').forEach(el => {
      _revealObserver.observe(el);
    });
  }
  if (_dividerObserver) {
    document.querySelectorAll('.gold-divider-grow:not(.visible)').forEach(el => {
      _dividerObserver.observe(el);
    });
  }
}

export function destroyScrollEffects() {
  if (_revealObserver) {
    _revealObserver.disconnect();
    _revealObserver = null;
  }
  if (_dividerObserver) {
    _dividerObserver.disconnect();
    _dividerObserver = null;
  }
  if (_scrollHandler) {
    window.removeEventListener('scroll', _scrollHandler);
    _scrollHandler = null;
  }
  if (_mutationObs) {
    _mutationObs.disconnect();
    _mutationObs = null;
  }
}
