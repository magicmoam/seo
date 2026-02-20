// router.js - Hash-based SPA router for trySEO.ai
import { getUser } from './auth.js';

const routes = {
  '/': () => import('./pages/landing.js'),
  '/features': () => import('./pages/features.js'),
  '/pricing': () => import('./pages/pricing.js'),
  '/about': () => import('./pages/about.js'),
  '/app': () => import('./pages/app.js'),
  '/account': () => import('./pages/account.js'),
  '/admin': () => import('./pages/admin.js'),
};

const authGuardedRoutes = new Set(['/app', '/account', '/admin']);

let _currentPage = null;
let _currentRoute = null;

export function getCurrentRoute() {
  return _currentRoute;
}

export function navigate(path) {
  window.location.hash = '#' + path;
}

function getRouteFromHash() {
  const hash = window.location.hash.slice(1) || '/';
  // Strip query params for route matching
  const routePath = hash.split('?')[0];
  return routePath;
}

async function handleRouteChange() {
  const routePath = getRouteFromHash();
  const container = document.getElementById('page');
  if (!container) return;

  // Auth guard
  if (authGuardedRoutes.has(routePath) && !getUser()) {
    navigate('/');
    return;
  }

  // Find matching route
  const loader = routes[routePath];
  if (!loader) {
    // 404 - redirect to home
    navigate('/');
    return;
  }

  // Skip if same route
  if (routePath === _currentRoute) return;

  // Unmount previous page
  if (_currentPage && typeof _currentPage.unmount === 'function') {
    _currentPage.unmount();
  }

  // Clear container
  container.innerHTML = '';
  _currentRoute = routePath;

  try {
    const pageModule = await loader();
    _currentPage = pageModule;
    if (typeof pageModule.mount === 'function') {
      pageModule.mount(container);
    }
  } catch (err) {
    console.error('Failed to load page:', err);
    container.innerHTML = `<div style="text-align:center;padding:80px 20px">
      <p style="color:var(--c-text-tertiary)">Failed to load page.</p>
    </div>`;
  }

  // Scroll to top on route change
  window.scrollTo(0, 0);

  // Dispatch custom event for nav updates
  window.dispatchEvent(new CustomEvent('routechange', { detail: { route: routePath } }));
}

export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  // Initial route
  handleRouteChange();
}

// Force re-mount of current page (useful after auth change)
export async function remountCurrentPage() {
  const routePath = getRouteFromHash();
  const container = document.getElementById('page');
  if (!container) return;

  if (_currentPage && typeof _currentPage.unmount === 'function') {
    _currentPage.unmount();
  }
  container.innerHTML = '';
  _currentRoute = null;

  // Check auth guard after auth change
  if (authGuardedRoutes.has(routePath) && !getUser()) {
    navigate('/');
    return;
  }

  const loader = routes[routePath];
  if (!loader) {
    navigate('/');
    return;
  }

  _currentRoute = routePath;
  try {
    const pageModule = await loader();
    _currentPage = pageModule;
    if (typeof pageModule.mount === 'function') {
      pageModule.mount(container);
    }
  } catch (err) {
    console.error('Failed to load page:', err);
  }

  window.dispatchEvent(new CustomEvent('routechange', { detail: { route: routePath } }));
}
