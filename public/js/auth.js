// auth.js - Google Sign-In, token management for trySEO.ai
import { getConfig, getUsage } from './api.js';

let _token = null;
let _user = null;
let _googleClientId = '';
let _ga4OAuthEnabled = false;
let _listeners = [];

export function getToken() { return _token; }
export function getUser() { return _user; }
export function getGoogleClientId() { return _googleClientId; }
export function isGA4OAuthEnabled() { return _ga4OAuthEnabled; }

export function onAuthStateChanged(callback) {
  _listeners.push(callback);
  return () => { _listeners = _listeners.filter(l => l !== callback); };
}

function _notifyListeners() {
  for (const cb of _listeners) {
    try { cb(_user); } catch (e) { console.error('Auth listener error:', e); }
  }
}

export async function initAuth() {
  try {
    const config = await getConfig();
    _googleClientId = config.google_client_id;
    _ga4OAuthEnabled = config.ga4_oauth_enabled || false;
  } catch (e) {
    console.error('Failed to fetch config:', e);
  }

  // Wait for Google API to load
  await new Promise((resolve) => {
    if (typeof google !== 'undefined' && google.accounts) {
      resolve();
      return;
    }
    const check = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts) {
        clearInterval(check);
        resolve();
      }
    }, 100);
    // Timeout after 10s
    setTimeout(() => { clearInterval(check); resolve(); }, 10000);
  });

  if (typeof google === 'undefined' || !google.accounts) {
    console.warn('Google Sign-In API not loaded');
    return;
  }

  google.accounts.id.initialize({
    client_id: _googleClientId,
    callback: _handleCredentialResponse,
    auto_select: true,
  });

  // Restore session
  const stored = sessionStorage.getItem('seo_token');
  if (stored) {
    _token = stored;
    try {
      const payload = JSON.parse(atob(stored.split('.')[1]));
      _user = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        tier: 'free',
        credits_remaining: 0,
        is_admin: false,
      };
      // Fetch usage to get tier/credits info
      _fetchUserInfo();
      _notifyListeners();
    } catch (e) {
      // Invalid token
      sessionStorage.removeItem('seo_token');
      _token = null;
      _user = null;
    }
  }
}

async function _fetchUserInfo() {
  try {
    const usage = await getUsage();
    if (_user && usage) {
      _user.tier = usage.tier || 'free';
      _user.credits_remaining = usage.credits_remaining ?? 0;
      _user.is_admin = usage.is_admin || false;
      _notifyListeners();
    }
  } catch (e) {
    // Silently fail - user might not be authorized yet
  }
}

function _handleCredentialResponse(response) {
  _token = response.credential;
  sessionStorage.setItem('seo_token', _token);
  try {
    const payload = JSON.parse(atob(_token.split('.')[1]));
    _user = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      tier: 'free',
      credits_remaining: 0,
      is_admin: false,
    };
    _fetchUserInfo();
    _notifyListeners();
  } catch (e) {
    console.error('Failed to parse token:', e);
  }
}

export function signIn() {
  if (typeof google !== 'undefined' && google.accounts) {
    google.accounts.id.prompt();
  }
}

export function renderGoogleButton(elementId, opts = {}) {
  if (typeof google === 'undefined' || !google.accounts) return;
  const el = document.getElementById(elementId);
  if (!el) return;
  google.accounts.id.renderButton(el, {
    theme: 'filled_black',
    size: 'large',
    shape: 'rectangular',
    text: 'signin_with',
    ...opts,
  });
}

export function signOut() {
  _token = null;
  _user = null;
  sessionStorage.removeItem('seo_token');
  if (typeof google !== 'undefined' && google.accounts) {
    google.accounts.id.disableAutoSelect();
  }
  _notifyListeners();
}

export function updateUserCredits(credits) {
  if (_user) {
    _user.credits_remaining = credits;
    _notifyListeners();
  }
}
