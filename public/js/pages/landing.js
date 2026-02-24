// landing.js - Retune SEO Intelligence Platform landing page
import { getUser, signIn } from '../auth.js';
import { navigate } from '../router.js';

let _container = null;
let _observer = null;
let _scrollHandler = null;

export function mount(container) {
  _container = container;
  _container.innerHTML = _html();
  _bindEvents();
}

export function unmount() {
  if (_observer) { _observer.disconnect(); _observer = null; }
  if (_scrollHandler) { window.removeEventListener('scroll', _scrollHandler); _scrollHandler = null; }
  _container = null;
}

/* ── Event binding ── */

function _bindEvents() {
  if (!_container) return;

  // CTA: Start Analysis → sign in or go to app
  _container.querySelectorAll('[data-action="start"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const user = getUser();
      user ? navigate('/app') : signIn();
    });
  });

  // CTA: See Features → navigate
  _container.querySelectorAll('[data-action="features"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/features');
    });
  });

  // Navigation links
  _container.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.nav);
    });
  });

  // Scroll-reveal observer for tool cards and sections
  _observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  _container.querySelectorAll('.reveal, .reveal-child').forEach(el => {
    _observer.observe(el);
  });
}

/* ── HTML template ── */

function _html() {
  const user = getUser();
  const startLabel = user ? 'Go to App' : 'Start Analysis';
  const signinLabel = user ? 'Go to App' : 'Sign In';

  const tools = [
    { id: '01', name: 'Website Analyzer', desc: 'Full-spectrum site audit with 31-point scoring rubric', credits: 1 },
    { id: '02', name: 'Keyword Research', desc: 'Intent-mapped keyword clusters with difficulty scoring', credits: 1 },
    { id: '03', name: 'SERP Analysis', desc: 'Feature detection and ranking factor analysis', credits: 1 },
    { id: '04', name: 'Technical SEO', desc: 'Core Web Vitals, schema, and crawlability audit', credits: 1 },
    { id: '05', name: 'GA4 Analytics', desc: 'Google Analytics integration and traffic insights', credits: 1 },
    { id: '06', name: 'Competitor Analysis', desc: 'Gap identification and strategic positioning', credits: 2 },
    { id: '07', name: 'Content Gap', desc: 'Uncover missing content opportunities vs competitors', credits: 2 },
    { id: '08', name: 'Content Generation', desc: 'AI-generated content calendars and briefs', credits: 2 },
    { id: '09', name: 'Topical Authority', desc: 'Map and build authority across topic clusters', credits: 2 },
    { id: '10', name: 'Backlink Strategy', desc: 'Discover link-building opportunities and outreach targets', credits: 2 },
  ];

  const toolCardsHTML = tools.map((t, i) => `
    <div class="card reveal-child" style="transition-delay: ${i * 0.06}s;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <span class="font-mono" style="font-size: 0.7rem; color: var(--text-dim);">TOOL_${t.id}</span>
        <span class="badge">${t.credits} cr</span>
      </div>
      <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">${t.name}</h4>
      <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.5;">${t.desc}</p>
    </div>
  `).join('');

  return `
    <!-- Scan line effect -->
    <div class="scan-line-container"><div class="scan-line"></div></div>

    <!-- Dot-grid background + vignette (full page) -->
    <div style="position: fixed; inset: 0; z-index: 0; pointer-events: none;">
      <div style="position: absolute; inset: 0; background-image: radial-gradient(var(--text-dim) 1px, transparent 1px); background-size: 24px 24px; opacity: 0.25;"></div>
      <div style="position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 30%, transparent 0%, var(--bg-deep) 70%);"></div>
    </div>

    <!-- Scrollable content -->
    <div id="landing-scroll" style="position: relative; z-index: 1; height: 100vh; overflow-y: auto;">

      <!-- ═══ HERO ═══ -->
      <section style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 80px 24px 48px; position: relative;">

        <div class="fade-in" style="margin-bottom: 48px;">
          <span class="label" style="margin-bottom: 24px;">SEO Intelligence Platform</span>
          <h1 style="font-family: var(--font-display); font-size: clamp(3.5rem, 10vw, 7rem); font-weight: 700; letter-spacing: -0.04em; line-height: 0.9; color: var(--text-main); margin-bottom: 24px;">Retune</h1>
          <p style="font-family: var(--font-mono); font-size: 1rem; color: var(--text-muted); max-width: 420px; margin: 0 auto 40px; line-height: 1.6;">AI-powered analysis that thinks like an analyst</p>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <button class="btn-primary" data-action="start">${startLabel}</button>
            <button class="btn-ghost" data-action="features">See Features</button>
          </div>
        </div>

        <div class="fade-in-delay-3" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim); letter-spacing: 0.05em;">
          [ SYSTEM_STATUS: <span style="color: var(--color-success);">ONLINE</span> ] &nbsp; [ TOOLS: <span style="color: var(--accent-olive);">10</span> ] &nbsp; [ CREDITS: <span style="color: var(--accent-cyan);">FREE</span> ]
        </div>

        <!-- Scroll hint -->
        <div style="position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em;">Scroll</span>
          <div style="width: 1px; height: 32px; background: linear-gradient(to bottom, var(--text-dim), transparent);"></div>
        </div>
      </section>

      <!-- ═══ TOOLS ═══ -->
      <section style="padding: 120px 24px; border-top: 1px solid var(--border-subtle);">
        <div style="max-width: 1100px; margin: 0 auto;">
          <div class="reveal" style="text-align: center; margin-bottom: 64px;">
            <span class="label">Available Tools</span>
            <h2 style="font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; letter-spacing: -0.03em; color: var(--text-main); margin-top: 16px;">Ten tools. One intelligence.</h2>
            <p style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted); max-width: 480px; margin: 16px auto 0; line-height: 1.6;">Each tool is purpose-built. The Strategy Orchestrator runs all ten in sequence for a complete analysis.</p>
          </div>
          <div class="reveal-stagger" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${toolCardsHTML}
          </div>
        </div>
      </section>

      <!-- ═══ HOW IT WORKS ═══ -->
      <section style="padding: 120px 24px; border-top: 1px solid var(--border-subtle);">
        <div style="max-width: 800px; margin: 0 auto;">
          <div class="reveal" style="text-align: center; margin-bottom: 64px;">
            <span class="label">Process</span>
            <h2 style="font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; letter-spacing: -0.03em; color: var(--text-main); margin-top: 16px;">How it works</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0;">
            ${_stepHTML('01', 'Connect your website', 'Enter any URL. Our agent crawls, scores, and benchmarks across 31 criteria in seconds.', 0)}
            ${_stepHTML('02', 'Run AI analysis', 'Select a tool or run the full orchestrator. AI processes your data against live search results.', 0.1)}
            ${_stepHTML('03', 'Get actionable insights', 'Receive a prioritized roadmap, content calendar, and technical fixes, ready to implement.', 0.2)}
          </div>
        </div>
      </section>

      <!-- ═══ CTA ═══ -->
      <section style="padding: 120px 24px; border-top: 1px solid var(--border-subtle);">
        <div class="reveal" style="max-width: 600px; margin: 0 auto; text-align: center;">
          <span class="label">Get Started</span>
          <h2 style="font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; letter-spacing: -0.03em; color: var(--text-main); margin-top: 16px; margin-bottom: 24px;">Ready to optimize?</h2>
          <div style="margin-bottom: 32px;">
            <button class="btn-primary" data-action="start" style="padding: 14px 32px; font-size: 0.8rem;">${signinLabel}</button>
          </div>
          <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.8;">Free: 5 credits/month. Pro: 200 credits/month at $49/mo.</p>
        </div>
      </section>

      <!-- ═══ FOOTER ═══ -->
      <footer style="padding: 48px 24px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; max-width: 1100px; margin: 0 auto;">
        <div style="display: flex; align-items: center; gap: 24px;">
          <a href="#/" data-nav="/" style="font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: var(--text-main); text-decoration: none;">Retune</a>
          <nav style="display: flex; gap: 20px;">
            <a href="#/features" data-nav="/features" style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); text-decoration: none;">Features</a>
            <a href="#/pricing" data-nav="/pricing" style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); text-decoration: none;">Pricing</a>
            <a href="#/about" data-nav="/about" style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); text-decoration: none;">About</a>
          </nav>
        </div>
        <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em;">&copy; 2026 Retune</span>
      </footer>

    </div>
  `;
}

/* ── Step card helper ── */

function _stepHTML(num, title, desc, delay) {
  return `
    <div class="reveal" style="display: grid; grid-template-columns: 64px 1fr; gap: 24px; padding: 32px 0; border-bottom: 1px solid var(--border-subtle); transition-delay: ${delay}s;">
      <div style="font-family: var(--font-mono); font-size: 2rem; font-weight: 700; color: var(--accent-olive); line-height: 1;">${num}</div>
      <div>
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">${title}</h3>
        <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); line-height: 1.6; max-width: 480px;">${desc}</p>
      </div>
    </div>
  `;
}
