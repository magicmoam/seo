// pricing.js - Pricing page for Retune (dark neural aesthetic)
// Preserves Stripe checkout integration, auth state, billing toggle
import { getUser, signIn, onAuthStateChanged } from '../auth.js';
import { stripeCheckout } from '../api.js';
import { navigate } from '../router.js';

function isValidStripeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.stripe.com');
  } catch { return false; }
}

let _container = null;
let _isAnnual = false;
let _unsubAuth = null;
let _pendingCheckout = false;

// ──────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────

export function mount(container) {
  _container = container;
  _container.innerHTML = _buildHTML();
  _bindEvents();

  _unsubAuth = onAuthStateChanged((user) => {
    if (user && _pendingCheckout) {
      _pendingCheckout = false;
      _doCheckout();
    }
  });
}

export function unmount() {
  if (_unsubAuth) _unsubAuth();
  _container = null;
  _pendingCheckout = false;
}

// ──────────────────────────────────────────────
// Stripe Checkout
// ──────────────────────────────────────────────

async function _doCheckout() {
  try {
    const priceId = _isAnnual ? 'pro_annual' : 'pro_monthly';
    const data = await stripeCheckout(priceId);
    if (data.url && isValidStripeUrl(data.url)) {
      window.location.href = data.url;
    } else if (data.error) {
      alert(data.error);
    }
  } catch (e) {
    alert('Checkout failed: ' + e.message);
  }
}

function _handleGetStarted() {
  const user = getUser();
  if (!user) {
    _pendingCheckout = true;
    signIn();
  } else {
    _doCheckout();
  }
}

// ──────────────────────────────────────────────
// Event Binding
// ──────────────────────────────────────────────

function _bindEvents() {
  if (!_container) return;

  // Billing toggle
  const toggleBtns = _container.querySelectorAll('.toggle-btn');
  const proPrice = _container.querySelector('#pro-price');
  const proPeriod = _container.querySelector('#pro-period');
  const proAnnualNote = _container.querySelector('#pro-annual-note');

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      if ((plan === 'annual' && _isAnnual) || (plan === 'monthly' && !_isAnnual)) return;

      _isAnnual = plan === 'annual';

      // Update toggle visual
      toggleBtns.forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
        b.style.borderColor = 'var(--border-subtle)';
      });
      btn.style.background = 'var(--accent-cyan-dim)';
      btn.style.color = 'var(--accent-cyan)';
      btn.style.borderColor = 'var(--accent-cyan)';

      // Update price
      setTimeout(() => {
        if (_isAnnual) {
          proPrice.textContent = '$39';
          proPeriod.textContent = '/month';
          proAnnualNote.textContent = 'Billed annually at $468/year';
        } else {
          proPrice.textContent = '$49';
          proPeriod.textContent = '/month';
          proAnnualNote.textContent = '';
        }
      }, 150);
    });
  });

  // FAQ accordion
  const faqItems = _container.querySelectorAll('[data-faq]');
  faqItems.forEach(item => {
    item.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      const answer = item.querySelector('.faq-answer');
      const icon = item.querySelector('.faq-icon');

      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          const otherAnswer = other.querySelector('.faq-answer');
          const otherIcon = other.querySelector('.faq-icon');
          if (otherAnswer) { otherAnswer.style.maxHeight = '0'; otherAnswer.style.opacity = '0'; }
          if (otherIcon) otherIcon.textContent = '+';
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
        answer.style.opacity = '0';
        if (icon) icon.textContent = '+';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        answer.style.opacity = '1';
        if (icon) icon.textContent = '\u2212';
      }
    });
  });

  // Pro "Get Started" button
  const proBtn = _container.querySelector('#btn-pro');
  if (proBtn) proBtn.addEventListener('click', (e) => {
    e.preventDefault();
    _handleGetStarted();
  });

  // Free "Try Free Audit" button
  const freeBtn = _container.querySelector('#btn-free');
  if (freeBtn) freeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/');
  });

  // Enterprise "Contact Us"
  const enterpriseBtn = _container.querySelector('#btn-enterprise');
  if (enterpriseBtn) enterpriseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'mailto:hello@retune.so';
  });

  // Bottom CTA buttons
  const ctaFree = _container.querySelector('#cta-free-audit');
  if (ctaFree) ctaFree.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/');
  });

  const ctaFeatures = _container.querySelector('#cta-features');
  if (ctaFeatures) ctaFeatures.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/features');
  });
}

// ──────────────────────────────────────────────
// FAQ data
// ──────────────────────────────────────────────

const _faqs = [
  {
    q: "What's included in the free audit?",
    a: "The free audit runs a full website analysis using our 30-criteria scoring rubric. You get your overall SEO score with a category breakdown across performance, SEO, content, and technical dimensions. Detailed recommendations are redacted in the free tier -- upgrade to Pro to unlock the complete analysis, evidence traces, and actionable roadmap."
  },
  {
    q: "Can I cancel my Pro plan anytime?",
    a: "Yes. There are no long-term contracts or hidden fees. Cancel your Pro subscription at any time and continue using it until the end of your billing period. Annual plans can be cancelled with a prorated refund for remaining months."
  },
  {
    q: "How does the AI audit actually work?",
    a: "When you submit a URL, our AI agent scrapes and analyzes your site in real time using Jina AI. The data is evaluated by a large language model against 30 structured criteria across four categories. Scores are computed deterministically using weighted averages. Results typically arrive in under 60 seconds."
  },
  {
    q: "What tools are included in Pro?",
    a: "Pro includes all 10 AI-powered tools: Website Analyzer, Keyword Research, Competitor Analysis, SERP Analysis, Content Gap, Content Generation, Topical Authority Mapping, Technical SEO Diagnostics, Backlink Strategy, and the Strategy Orchestrator which runs all tools in intelligent phases."
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 14-day money-back guarantee on all new Pro subscriptions. If you are not satisfied, contact us within 14 days of your initial payment for a full refund."
  }
];

// ──────────────────────────────────────────────
// Comparison Row Helper
// ──────────────────────────────────────────────

function _comparisonRow(feature, free, pro, enterprise) {
  function _cell(val) {
    if (val === true) return `<td style="text-align: center; color: var(--accent-olive);">&#10003;</td>`;
    if (val === false) return `<td style="text-align: center; color: var(--text-dim);">&mdash;</td>`;
    return `<td style="text-align: center; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${val}</td>`;
  }
  return `<tr>
    <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); padding: var(--space-xs) var(--space-s);">${feature}</td>
    ${_cell(free)}${_cell(pro)}${_cell(enterprise)}
  </tr>`;
}

// ──────────────────────────────────────────────
// HTML Template
// ──────────────────────────────────────────────

function _buildHTML() {
  return `
<div style="background: var(--bg-deep); min-height: 100vh; color: var(--text-main);">

  <!-- ═══════ HERO ═══════ -->
  <section style="padding: var(--space-xl) var(--space-l); padding-top: 140px; text-align: center; max-width: 800px; margin: 0 auto;">
    <span class="label" style="color: var(--accent-olive); margin-bottom: var(--space-m); display: inline-block;">PRICING</span>
    <h1 style="font-family: var(--font-display); font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 700; color: var(--text-main); line-height: 1.1; margin-bottom: var(--space-m);">
      Simple, Transparent Pricing
    </h1>
    <p style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--text-muted); max-width: 480px; margin: 0 auto; line-height: 1.7;">
      Start free, scale when you need to. Every plan gives you access to AI-powered SEO intelligence.
    </p>
  </section>

  <!-- ═══════ BILLING TOGGLE ═══════ -->
  <section style="max-width: 1100px; margin: 0 auto; padding: 0 var(--space-l) var(--space-l); text-align: center;">
    <div style="display: inline-flex; gap: var(--space-xs); align-items: center;">
      <button class="toggle-btn" data-plan="monthly" style="
        font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;
        padding: var(--space-xs) var(--space-m);
        border: 1px solid var(--accent-cyan);
        border-radius: var(--radius);
        background: var(--accent-cyan-dim);
        color: var(--accent-cyan);
        cursor: pointer; transition: all var(--transition);
      ">Monthly</button>
      <button class="toggle-btn" data-plan="annual" style="
        font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;
        padding: var(--space-xs) var(--space-m);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background: transparent;
        color: var(--text-muted);
        cursor: pointer; transition: all var(--transition);
      ">Annual</button>
      <span class="badge badge-medium" style="margin-left: var(--space-xs);">20% OFF</span>
    </div>
  </section>

  <!-- ═══════ TIER CARDS ═══════ -->
  <section style="max-width: 1100px; margin: 0 auto; padding: 0 var(--space-l) var(--space-xl);">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-s); align-items: stretch;">

      <!-- FREE -->
      <div class="panel" style="padding: var(--space-l); display: flex; flex-direction: column;">
        <span class="label" style="color: var(--text-dim); margin-bottom: var(--space-m);">FREE</span>
        <div style="margin-bottom: var(--space-m);">
          <span style="font-family: var(--font-display); font-size: 3rem; font-weight: 700; color: var(--text-main);">$0</span>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">/forever</span>
        </div>
        <ul style="list-style: none; padding: 0; margin: 0 0 var(--space-l) 0; flex: 1;">
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> 5 credits / month
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> All 10 tools accessible
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> Basic SEO score
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> No account required for audit
          </li>
        </ul>
        <button id="btn-free" class="btn-ghost" style="width: 100%; justify-content: center; cursor: pointer;">Try Free Audit</button>
      </div>

      <!-- PRO (featured) -->
      <div class="panel" style="padding: var(--space-l); display: flex; flex-direction: column; border-color: var(--accent-olive);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-m);">
          <span class="label" style="color: var(--accent-olive);">PRO</span>
          <span class="badge badge-medium">RECOMMENDED</span>
        </div>
        <div style="margin-bottom: var(--space-2xs);">
          <span id="pro-price" style="font-family: var(--font-display); font-size: 3rem; font-weight: 700; color: var(--text-main); transition: opacity 0.15s ease;">$49</span>
          <span id="pro-period" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); transition: opacity 0.15s ease;">/month</span>
        </div>
        <p id="pro-annual-note" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-olive); min-height: 1.2em; margin-bottom: var(--space-m);"></p>
        <ul style="list-style: none; padding: 0; margin: 0 0 var(--space-l) 0; flex: 1;">
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--accent-olive);">&bull;</span> 200 credits / month
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--accent-olive);">&bull;</span> All 10 AI-powered tools
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--accent-olive);">&bull;</span> Strategy Orchestrator
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--accent-olive);">&bull;</span> Full keyword &amp; SERP analysis
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--accent-olive);">&bull;</span> Competitor &amp; content gap analysis
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--accent-olive);">&bull;</span> Export reports (HTML + Word)
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--accent-olive);">&bull;</span> Priority support
          </li>
        </ul>
        <button id="btn-pro" class="btn-primary" style="width: 100%; justify-content: center; cursor: pointer;">Get Started</button>
      </div>

      <!-- ENTERPRISE -->
      <div class="panel" style="padding: var(--space-l); display: flex; flex-direction: column;">
        <span class="label" style="color: var(--text-dim); margin-bottom: var(--space-m);">ENTERPRISE</span>
        <div style="margin-bottom: var(--space-m);">
          <span style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 700; color: var(--text-main);">Custom</span>
        </div>
        <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-bottom: var(--space-m);">Tailored to your organization</p>
        <ul style="list-style: none; padding: 0; margin: 0 0 var(--space-l) 0; flex: 1;">
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> Everything in Pro
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> API access
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> Custom tool configurations
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> Dedicated support
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> Team collaboration &amp; roles
          </li>
          <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 6px 0; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
            <span style="color: var(--text-dim);">&bull;</span> White-label reports
          </li>
        </ul>
        <button id="btn-enterprise" class="btn-ghost" style="width: 100%; justify-content: center; cursor: pointer;">Contact Us</button>
      </div>

    </div>
  </section>

  <!-- ═══════ FEATURE COMPARISON TABLE ═══════ -->
  <section style="max-width: 1100px; margin: 0 auto; padding: 0 var(--space-l) var(--space-xl);">
    <div class="panel" style="padding: var(--space-l); overflow-x: auto;">
      <span class="label" style="color: var(--accent-olive); margin-bottom: var(--space-m); display: inline-block;">FEATURE COMPARISON</span>
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align: left;">Feature</th>
            <th style="text-align: center;">Free</th>
            <th style="text-align: center; color: var(--accent-olive);">Pro</th>
            <th style="text-align: center;">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          ${_comparisonRow('Website Analyzer', '1 audit', true, true)}
          ${_comparisonRow('Keyword Research', false, true, true)}
          ${_comparisonRow('Competitor Analysis', false, true, true)}
          ${_comparisonRow('SERP Analysis', false, true, true)}
          ${_comparisonRow('Content Gap Analysis', false, true, true)}
          ${_comparisonRow('Content Generation', false, true, true)}
          ${_comparisonRow('Topical Authority', false, true, true)}
          ${_comparisonRow('Technical SEO', false, true, true)}
          ${_comparisonRow('Backlink Strategy', false, true, true)}
          ${_comparisonRow('Strategy Orchestrator', false, true, true)}
          ${_comparisonRow('30-criteria scoring', 'Partial', true, true)}
          ${_comparisonRow('Export reports', false, true, true)}
          ${_comparisonRow('API access', false, false, true)}
          ${_comparisonRow('White-label reports', false, false, true)}
          ${_comparisonRow('Team collaboration', false, false, true)}
        </tbody>
      </table>
    </div>
  </section>

  <!-- ═══════ FAQ ═══════ -->
  <section style="max-width: 800px; margin: 0 auto; padding: 0 var(--space-l) var(--space-xl);">
    <span class="label" style="color: var(--accent-olive); margin-bottom: var(--space-l); display: inline-block;">FAQ</span>

    ${_faqs.map((faq, i) => `
      <div data-faq style="border-bottom: 1px solid var(--border-subtle); cursor: pointer; padding: var(--space-m) 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-s);">
          <div style="display: flex; gap: var(--space-s); align-items: baseline;">
            <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">Q:</span>
            <h3 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--text-main);">${faq.q}</h3>
          </div>
          <span class="faq-icon" style="font-family: var(--font-mono); font-size: 1.2rem; color: var(--accent-olive); flex-shrink: 0;">+</span>
        </div>
        <div class="faq-answer" style="max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease;">
          <div style="display: flex; gap: var(--space-s); padding-top: var(--space-s);">
            <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">A:</span>
            <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); line-height: 1.7;">${faq.a}</p>
          </div>
        </div>
      </div>
    `).join('')}
  </section>

  <!-- ═══════ CTA ═══════ -->
  <section style="max-width: 800px; margin: 0 auto; padding: var(--space-xl) var(--space-l); text-align: center;">
    <h2 style="font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 700; color: var(--text-main); margin-bottom: var(--space-s);">
      Start with a free audit.
    </h2>
    <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); margin-bottom: var(--space-l); max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.7;">
      No sign-up required. See what ten tools working as one can reveal about your site.
    </p>
    <div style="display: flex; flex-wrap: wrap; gap: var(--space-s); justify-content: center;">
      <button id="cta-free-audit" class="btn-action" style="cursor: pointer;">Start Free Audit</button>
      <button id="cta-features" class="btn-ghost" style="cursor: pointer;">Explore Features</button>
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
