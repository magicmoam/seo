// nav.js - Unified dark navigation for Retune
// Single dark glass nav for all routes — no more light/dark split
import { getUser, signOut, signIn, onAuthStateChanged } from '../auth.js';
import { navigate, getCurrentRoute } from '../router.js';
import { esc as _esc } from '../utils/helpers.js';

let _navEl = null;
let _unsubAuth = null;

const appRoutes = new Set(['/app', '/account', '/admin']);

export function mountNav() {
  const container = document.getElementById('nav-container');
  if (!container) return;

  _navEl = document.createElement('nav');
  _navEl.className = 'retune-nav';
  container.appendChild(_navEl);

  _unsubAuth = onAuthStateChanged(() => _render());
  window.addEventListener('routechange', _render);
  _render();
}

export function unmountNav() {
  if (_unsubAuth) _unsubAuth();
  window.removeEventListener('routechange', _render);
  _navEl = null;
}

export function updateNav() {
  _render();
}

function _render() {
  if (!_navEl) return;
  const user = getUser();
  const route = getCurrentRoute() || '/';
  const isApp = appRoutes.has(route);

  if (isApp && user) {
    _renderAppNav(user);
  } else {
    _renderMarketingNav(user, route);
  }
}

function _renderMarketingNav(user, route) {
  const navLink = (href, label, isExternal = false) => {
    const isActive = route === href || (href !== '/' && route.startsWith(href));
    return `<a href="${href}" style="${isActive ? 'color:var(--accent-olive)' : 'color:var(--text-muted)'};text-decoration:none;font-family:var(--font-mono);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;transition:color 0.2s" class="nav-link">${label}</a>`;
  };

  let rightSection = '';
  if (user) {
    rightSection = `
      <button id="nav-goto-app" style="padding:0.4rem 1rem;border:1px solid var(--accent-olive);color:var(--accent-olive);background:transparent;font-family:var(--font-mono);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;transition:all 0.3s">
        Go to App →
      </button>
    `;
  } else {
    rightSection = `
      <button id="nav-signin-cta" style="padding:0.4rem 1rem;border:1px solid var(--accent-olive);color:var(--accent-olive);background:transparent;font-family:var(--font-mono);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;transition:all 0.3s">
        Sign In →
      </button>
    `;
  }

  _navEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem">
      <a href="#/" style="text-decoration:none;font-family:var(--font-display);font-size:1.4rem;font-weight:800;color:var(--text-main);letter-spacing:-0.03em">
        Retune
      </a>
      <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.1em;padding:0.15rem 0.4rem;border:1px solid var(--text-dim);margin-left:0.25rem">
        BETA
      </span>
    </div>

    <nav style="display:flex;align-items:center;gap:2rem" class="hide-mobile">
      ${navLink('/', 'Home')}
      ${navLink('/features', 'Features', true)}
      ${navLink('/pricing', 'Pricing', true)}
      ${navLink('/about', 'About', true)}
    </nav>

    <div style="display:flex;align-items:center;gap:1rem">
      ${rightSection}
      <button id="nav-hamburger" style="display:none;background:transparent;border:1px solid var(--border-subtle);padding:0.4rem;cursor:pointer" class="show-mobile">
        <svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <div id="mobile-nav-menu" style="display:none;position:fixed;inset:0;background:var(--bg-deep);z-index:1001;flex-direction:column;align-items:center;justify-content:center;gap:2rem;border-bottom:1px solid var(--border-subtle)">
      <button id="close-mobile-menu" style="position:absolute;top:1.5rem;right:1.5rem;background:transparent;border:none;color:var(--text-muted);font-family:var(--font-mono);font-size:0.75rem;cursor:pointer">
        [CLOSE]
      </button>
      <a href="/" style="text-decoration:none;font-family:var(--font-mono);font-size:1.2rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em" class="mobile-nav-link">Home</a>
      <a href="/features" style="text-decoration:none;font-family:var(--font-mono);font-size:1.2rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em" class="mobile-nav-link">Features</a>
      <a href="/pricing" style="text-decoration:none;font-family:var(--font-mono);font-size:1.2rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em" class="mobile-nav-link">Pricing</a>
      <a href="/about" style="text-decoration:none;font-family:var(--font-mono);font-size:1.2rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em" class="mobile-nav-link">About</a>
      ${user
        ? '<a href="#/app" style="text-decoration:none;font-family:var(--font-mono);font-size:1.2rem;color:var(--accent-olive);text-transform:uppercase;letter-spacing:0.1em" class="mobile-nav-link">App</a>'
        : '<button id="mobile-signin" style="background:transparent;border:none;font-family:var(--font-mono);font-size:1.2rem;color:var(--accent-olive);text-transform:uppercase;letter-spacing:0.1em;cursor:pointer">Sign In</button>'}
    </div>
  `;

  // Bind events
  _navEl.querySelector('#nav-goto-app')?.addEventListener('click', () => navigate('/app'));
  _navEl.querySelector('#nav-signin-cta')?.addEventListener('click', () => signIn());

  const hamburger = _navEl.querySelector('#nav-hamburger');
  const mobileMenu = _navEl.querySelector('#mobile-nav-menu');
  const closeBtn = _navEl.querySelector('#close-mobile-menu');

  hamburger?.addEventListener('click', () => {
    if (mobileMenu) mobileMenu.style.display = 'flex';
  });

  closeBtn?.addEventListener('click', () => {
    if (mobileMenu) mobileMenu.style.display = 'none';
  });

  _navEl.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.style.display = 'none';
    });
  });

  _navEl.querySelector('#mobile-signin')?.addEventListener('click', () => {
    if (mobileMenu) mobileMenu.style.display = 'none';
    signIn();
  });

  // Hover effects
  _navEl.querySelectorAll('[id^="nav-"]').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (btn.style.borderColor === 'var(--accent-olive)') {
        btn.style.background = 'var(--accent-olive)';
        btn.style.color = 'var(--bg-deep)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--accent-olive)';
    });
  });
}

function _renderAppNav(user) {
  const credits = user.credits_remaining ?? 0;
  const tier = user.tier || 'free';
  const creditColor = credits <= 1 ? 'var(--color-error)' : credits <= 5 ? 'var(--color-warning)' : 'var(--accent-olive)';

  _navEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem">
      <button id="nav-hamburger-app" style="background:transparent;border:1px solid var(--border-subtle);padding:0.35rem 0.5rem;cursor:pointer;border-radius:var(--radius)" title="Toggle sidebar">
        <svg width="14" height="14" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <a href="#/app" style="text-decoration:none;font-family:var(--font-display);font-size:1.2rem;font-weight:800;color:var(--text-main);letter-spacing:-0.03em">
        Retune
      </a>
    </div>

    <div style="display:flex;align-items:center;gap:0.75rem">
      <span style="font-family:var(--font-mono);font-size:0.7rem;color:${creditColor};padding:0.2rem 0.6rem;border:1px solid ${creditColor};opacity:0.9">
        ${credits} credits
      </span>
      ${tier === 'pro'
        ? '<span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-success);padding:0.2rem 0.5rem;border:1px solid var(--color-success)">PRO</span>'
        : ''}
      ${user.is_admin
        ? '<a href="#/admin" style="text-decoration:none;font-family:var(--font-mono);font-size:0.65rem;text-transform:uppercase;color:var(--text-muted);padding:0.2rem 0.5rem;border:1px solid var(--border-subtle)">Admin</a>'
        : ''}
      <a href="#/account" style="text-decoration:none">
        ${user.picture
          ? `<img src="${_esc(user.picture)}" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border-subtle)" alt="Account">`
          : '<span style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.7rem">U</span>'}
      </a>
      <button id="nav-signout" style="padding:0.2rem 0.6rem;border:1px solid var(--border-subtle);background:transparent;color:var(--text-muted);font-size:0.65rem;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;transition:all 0.2s">
        Exit
      </button>
    </div>
  `;

  _navEl.querySelector('#nav-signout')?.addEventListener('click', () => {
    signOut();
    navigate('/');
  });

  _navEl.querySelector('#nav-hamburger-app')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  });
}
