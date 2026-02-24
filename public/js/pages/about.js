// about.js - About page for Retune (dark neural aesthetic)
import { navigate } from '../router.js';

let _container = null;

export function mount(container) {
  _container = container;
  _container.innerHTML = _html();
}

export function unmount() {
  _container = null;
}

function _html() {
  return `
<div style="background: var(--bg-deep); min-height: 100vh; color: var(--text-main);">

  <!-- ═══════ HERO ═══════ -->
  <section style="padding: var(--space-xl) var(--space-l); padding-top: 140px; text-align: center; max-width: 800px; margin: 0 auto;">
    <h1 style="font-family: var(--font-display); font-size: clamp(3rem, 6vw, 5rem); font-weight: 700; color: var(--text-main); line-height: 1.05; margin-bottom: var(--space-m);">
      Retune
    </h1>
    <p style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--text-muted); max-width: 480px; margin: 0 auto; line-height: 1.7;">
      AI-powered SEO intelligence. Evidence over opinion. Clarity over complexity.
    </p>
  </section>

  <!-- ═══════ 01 MISSION ═══════ -->
  <section style="max-width: 800px; margin: 0 auto; padding: 0 var(--space-l) var(--space-xl);">
    <div class="panel" style="padding: var(--space-l);">
      <span class="label" style="color: var(--accent-olive); margin-bottom: var(--space-m); display: inline-block;">01 MISSION</span>
      <h2 style="font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 700; color: var(--text-main); margin-bottom: var(--space-s); line-height: 1.15;">
        Making advanced SEO accessible to every business
      </h2>
      <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); line-height: 1.7; margin-bottom: var(--space-s);">
        Enterprise SEO tools charge thousands per month and bury actionable data under layers of dashboards. Small teams and independent creators deserve the same caliber of insight without the enterprise price tag.
      </p>
      <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); line-height: 1.7;">
        Retune uses live web data from Jina AI and large language model analysis to surface the recommendations that actually move rankings. Every result includes an evidence chain showing the raw data, prompts, and reasoning behind it.
      </p>
    </div>
  </section>

  <!-- ═══════ 02 HOW IT WORKS ═══════ -->
  <section style="max-width: 800px; margin: 0 auto; padding: 0 var(--space-l) var(--space-xl);">
    <span class="label" style="color: var(--accent-cyan); margin-bottom: var(--space-l); display: inline-block;">02 HOW IT WORKS</span>

    <div style="display: grid; gap: var(--space-s);">

      <div class="card" style="padding: var(--space-m); display: flex; gap: var(--space-m); align-items: flex-start;">
        <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center;">
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-olive);">01</span>
        </div>
        <div>
          <h3 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Enter your URL</h3>
          <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Our agent classifies your intent and selects the right combination of tools automatically.</p>
        </div>
      </div>

      <div class="card" style="padding: var(--space-m); display: flex; gap: var(--space-m); align-items: flex-start;">
        <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center;">
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-olive);">02</span>
        </div>
        <div>
          <h3 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Live data gathering</h3>
          <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Jina AI scrapes and searches the live web in real time. No cached indexes, no stale data.</p>
        </div>
      </div>

      <div class="card" style="padding: var(--space-m); display: flex; gap: var(--space-m); align-items: flex-start;">
        <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center;">
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-olive);">03</span>
        </div>
        <div>
          <h3 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">LLM analysis</h3>
          <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Data is evaluated against 30 structured criteria across four categories. Scores computed deterministically.</p>
        </div>
      </div>

      <div class="card" style="padding: var(--space-m); display: flex; gap: var(--space-m); align-items: flex-start;">
        <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center;">
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-olive);">04</span>
        </div>
        <div>
          <h3 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Actionable results</h3>
          <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Prioritized roadmap sorted by point gain. Full evidence traces from raw scrape to final insight.</p>
        </div>
      </div>

    </div>
  </section>

  <!-- ═══════ 03 TECHNOLOGY ═══════ -->
  <section style="max-width: 800px; margin: 0 auto; padding: 0 var(--space-l) var(--space-xl);">
    <span class="label" style="color: var(--accent-olive); margin-bottom: var(--space-l); display: inline-block;">03 TECHNOLOGY</span>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-s);">

      <div class="card" style="padding: var(--space-m);">
        <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.08em;">DATA</span>
        <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin: var(--space-xs) 0;">Jina AI</h3>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Real-time web search and scraping. Live SERP data, not cached indexes.</p>
      </div>

      <div class="card" style="padding: var(--space-m);">
        <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.08em;">AUTH</span>
        <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin: var(--space-xs) 0;">Google Auth</h3>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Secure authentication via Google Sign-In. No passwords to manage.</p>
      </div>

      <div class="card" style="padding: var(--space-m);">
        <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.08em;">DATABASE</span>
        <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin: var(--space-xs) 0;">Supabase</h3>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Persistent storage for users, credit transactions, search history, and evidence traces.</p>
      </div>

      <div class="card" style="padding: var(--space-m);">
        <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.08em;">BILLING</span>
        <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin: var(--space-xs) 0;">Stripe</h3>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Secure payment processing with checkout sessions, webhooks, and customer portal.</p>
      </div>

    </div>
  </section>

  <!-- ═══════ 04 VALUES ═══════ -->
  <section style="max-width: 800px; margin: 0 auto; padding: 0 var(--space-l) var(--space-xl);">
    <span class="label" style="color: var(--accent-olive); margin-bottom: var(--space-l); display: inline-block;">04 VALUES</span>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-s);">

      <div class="panel" style="padding: var(--space-m);">
        <span style="font-family: var(--font-display); font-size: 2rem; font-weight: 700; color: var(--text-dim); margin-bottom: var(--space-xs); display: block;">I.</span>
        <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin-bottom: var(--space-xs);">Evidence over opinion</h3>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Every recommendation is backed by real web data. Full evidence traces from raw scrape to final insight.</p>
      </div>

      <div class="panel" style="padding: var(--space-m);">
        <span style="font-family: var(--font-display); font-size: 2rem; font-weight: 700; color: var(--text-dim); margin-bottom: var(--space-xs); display: block;">II.</span>
        <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin-bottom: var(--space-xs);">Clarity over complexity</h3>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">30 scoring criteria distilled into clear, actionable language. Complex analysis, simple output.</p>
      </div>

      <div class="panel" style="padding: var(--space-m);">
        <span style="font-family: var(--font-display); font-size: 2rem; font-weight: 700; color: var(--text-dim); margin-bottom: var(--space-xs); display: block;">III.</span>
        <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin-bottom: var(--space-xs);">Action over analysis</h3>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6;">Prioritized roadmaps sorted by impact. A path to 80+ with exact steps ranked by potential point gain.</p>
      </div>

    </div>
  </section>

  <!-- ═══════ CTA ═══════ -->
  <section style="max-width: 800px; margin: 0 auto; padding: var(--space-xl) var(--space-l); text-align: center;">
    <h2 style="font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 700; color: var(--text-main); margin-bottom: var(--space-s);">
      See it for yourself.
    </h2>
    <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); margin-bottom: var(--space-l); max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.7;">
      Start with a free audit and experience the intelligence platform built for modern SEO.
    </p>
    <div style="display: flex; flex-wrap: wrap; gap: var(--space-s); justify-content: center;">
      <a href="#/" class="btn-action" style="text-decoration: none;">Start Free Audit</a>
      <a href="#/features" class="btn-ghost" style="text-decoration: none;">View Features</a>
    </div>
  </section>

  <!-- ═══════ FOOTER ═══════ -->
  <footer style="max-width: 1100px; margin: 0 auto; padding: var(--space-l); border-top: 1px solid var(--border-subtle);">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-s);">
      <div style="display: flex; align-items: center; gap: var(--space-xs);">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); opacity: 0.6;"></span>
        <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em;">System Online</span>
      </div>
      <nav style="display: flex; gap: var(--space-m);">
        <a href="#/features" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); text-decoration: none;">Features</a>
        <a href="#/pricing" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); text-decoration: none;">Pricing</a>
        <a href="#/about" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); text-decoration: none;">About</a>
      </nav>
      <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">&copy; 2026 Retune</span>
    </div>
  </footer>

</div>`;
}
