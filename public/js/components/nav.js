// nav.js - Glass morphism pill navigation for trySEO.ai
import { getUser, signOut, signIn, onAuthStateChanged } from '../auth.js';
import { navigate, getCurrentRoute } from '../router.js';

let _navEl = null;
let _unsubAuth = null;
let _mobileMenuEl = null;

const marketingRoutes = new Set(['/', '/features', '/pricing', '/about']);
const appRoutes = new Set(['/app', '/account', '/admin']);

export function mountNav(container) {
  _navEl = document.createElement('div');
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
  const route = getCurrentRoute();
  const isMarketing = marketingRoutes.has(route);
  const isApp = appRoutes.has(route);
  const isLanding = route === '/';

  // Toggle app-mode class on body for dark theme pages
  if (isApp) {
    document.body.classList.add('app-mode');
  } else {
    document.body.classList.remove('app-mode');
  }

  // Landing page has its own flat header - hide pill nav
  if (isLanding) {
    _navEl.innerHTML = '';
    return;
  }

  // App pages get their own dark nav bar
  if (isApp && user) {
    _renderAppNav(user, route);
    return;
  }

  // Marketing pages: glass morphism pill nav
  _renderMarketingNav(user, route);
}

function _renderMarketingNav(user, route) {
  const activeLink = (href) => route === href
    ? 'nav-link font-display text-base italic text-obsidian transition-colors relative'
    : 'nav-link font-display text-base italic text-obsidian/50 hover:text-obsidian transition-colors';

  const activeUnderline = (href) => route === href
    ? '<span class="absolute -bottom-1 left-0 w-full h-px bg-burnished-gold"></span>'
    : '';

  let rightCTA = '';
  if (user) {
    rightCTA = `<button id="nav-goto-app" class="hidden md:inline-flex nav-link items-center gap-2 px-5 py-2.5 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.2em] font-sans hover:bg-obsidian/85 transition-colors animate-in" style="animation-delay: 0.3s;">
      Go to App
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
    </button>`;
  } else {
    rightCTA = `<button id="nav-signin-cta" class="hidden md:inline-flex nav-link items-center gap-2 px-5 py-2.5 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.2em] font-sans hover:bg-obsidian/85 transition-colors animate-in" style="animation-delay: 0.3s;">
      Free Audit
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
    </button>`;
  }

  _navEl.innerHTML = `
    <header class="fixed top-0 left-0 right-0 z-40 p-4 md:p-6">
      <div class="max-w-7xl mx-auto flex justify-between items-center nav-pill px-6 md:px-8 py-4 rounded-full">
        <div class="flex items-center gap-4">
          <a href="#/" class="group relative nav-link">
            <span class="font-serif text-2xl md:text-3xl font-semibold tracking-tighter">trySEO<span class="text-burnished-gold">.ai</span></span>
          </a>
          <span class="hidden md:inline-block h-px w-6 bg-obsidian/15"></span>
          <span class="hidden md:inline-block font-sans text-[9px] tracking-[0.2em] uppercase text-soft-gray">SEO Intelligence</span>
        </div>

        <nav class="hidden md:flex items-center gap-10">
          <a href="#/" class="${activeLink('/')}"">Home${activeUnderline('/')}</a>
          <a href="#/features" class="${activeLink('/features')}">Features${activeUnderline('/features')}</a>
          <a href="#/pricing" class="${activeLink('/pricing')}">Pricing${activeUnderline('/pricing')}</a>
          <a href="#/about" class="${activeLink('/about')}">About${activeUnderline('/about')}</a>
        </nav>

        <button id="nav-hamburger" class="nav-link group flex flex-col items-end gap-1.5 md:hidden">
          <span class="font-sans text-[10px] tracking-widest uppercase mb-1">Menu</span>
          <span class="w-8 h-px bg-obsidian group-hover:w-12 transition-all duration-300"></span>
          <span class="w-5 h-px bg-obsidian group-hover:w-8 transition-all duration-300 delay-75"></span>
        </button>

        ${rightCTA}
      </div>
    </header>

    <!-- Mobile menu overlay -->
    <div id="mobile-menu" class="mobile-menu fixed inset-0 z-50 bg-alabaster/95 backdrop-blur-lg flex flex-col items-center justify-center gap-8">
      <button id="close-menu" class="nav-link absolute top-6 right-6 font-sans text-[10px] tracking-widest uppercase">Close</button>
      <a href="#/" class="nav-link font-display text-3xl italic text-obsidian/70 hover:text-obsidian transition-colors">Home</a>
      <a href="#/features" class="nav-link font-display text-3xl italic text-obsidian/70 hover:text-obsidian transition-colors">Features</a>
      <a href="#/pricing" class="nav-link font-display text-3xl italic text-obsidian/70 hover:text-obsidian transition-colors">Pricing</a>
      <a href="#/about" class="nav-link font-display text-3xl italic text-obsidian/70 hover:text-obsidian transition-colors">About</a>
      ${user ? '<a href="#/app" class="nav-link font-display text-3xl italic text-burnished-gold hover:text-obsidian transition-colors">App</a>' : ''}
    </div>
  `;

  // Bind events
  const hamburger = _navEl.querySelector('#nav-hamburger');
  const mobileMenu = _navEl.querySelector('#mobile-menu');
  const closeMenu = _navEl.querySelector('#close-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
  }
  if (closeMenu && mobileMenu) {
    closeMenu.addEventListener('click', () => mobileMenu.classList.remove('open'));
    // Close menu on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  const gotoApp = _navEl.querySelector('#nav-goto-app');
  if (gotoApp) gotoApp.addEventListener('click', () => navigate('/app'));

  const signinCta = _navEl.querySelector('#nav-signin-cta');
  if (signinCta) signinCta.addEventListener('click', () => navigate('/'));
}

function _renderAppNav(user, route) {
  const credits = user.credits_remaining ?? 0;
  const tier = user.tier || 'free';

  _navEl.innerHTML = `
    <nav class="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-8 h-[52px]"
         style="background:rgba(15,15,15,0.85);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06)">
      <div class="flex items-center gap-3">
        <button id="nav-hamburger-app" class="md:hidden flex flex-col justify-center gap-1 w-8 h-8 p-1.5" style="background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:4px">
          <span style="display:block;width:100%;height:1.5px;background:rgba(255,255,255,0.5);border-radius:1px"></span>
          <span style="display:block;width:100%;height:1.5px;background:rgba(255,255,255,0.5);border-radius:1px"></span>
          <span style="display:block;width:100%;height:1.5px;background:rgba(255,255,255,0.5);border-radius:1px"></span>
        </button>
        <a href="#/app" style="text-decoration:none">
          <span class="font-serif text-xl font-semibold tracking-tighter text-alabaster">trySEO<span class="text-burnished-gold">.ai</span></span>
        </a>
      </div>
      <div class="flex items-center gap-3">
        <span style="font-family:'Inter',sans-serif;font-size:11px;color:#B89E5F;padding:3px 10px;background:rgba(184,158,95,0.1);border-radius:4px;border:1px solid rgba(184,158,95,0.15)">
          ${credits} credits
        </span>
        ${tier === 'pro' ? '<span style="font-family:\'Inter\',sans-serif;font-size:10px;color:#6bcf7f;padding:2px 8px;background:rgba(107,207,127,0.12);border-radius:4px">PRO</span>' : ''}
        <a href="#/account" style="text-decoration:none;display:flex;align-items:center;gap:6px">
          ${user.picture ? `<img src="${_esc(user.picture)}" style="width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.1)" alt="">` : ''}
        </a>
        ${user.is_admin ? '<a href="#/admin" style="text-decoration:none;font-size:10px;color:rgba(255,255,255,0.4);padding:3px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-family:\'Inter\',sans-serif">Admin</a>' : ''}
        <button id="nav-signout" style="padding:4px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;background:transparent;color:rgba(255,255,255,0.4);font-size:11px;font-family:\'Inter\',sans-serif;cursor:pointer;transition:all 0.2s">Sign out</button>
      </div>
    </nav>
  `;

  const signoutBtn = _navEl.querySelector('#nav-signout');
  if (signoutBtn) signoutBtn.addEventListener('click', () => { signOut(); navigate('/'); });

  const hamburger = _navEl.querySelector('#nav-hamburger-app');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toggle-sidebar'));
    });
  }
}

function _esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
