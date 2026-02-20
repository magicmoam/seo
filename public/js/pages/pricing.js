// pricing.js - Pricing page for trySEO.ai
// Ported from pricing.html design with Stripe checkout integration
import { getUser, signIn, onAuthStateChanged } from '../auth.js';
import { stripeCheckout } from '../api.js';
import { navigate } from '../router.js';

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
  _createParticles();

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
    if (data.url) {
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
  const billingToggle = _container.querySelector('#billing-toggle');
  const proPrice = _container.querySelector('#pro-price');
  const proPeriod = _container.querySelector('#pro-period');
  const proAnnualNote = _container.querySelector('#pro-annual-note');

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      if ((plan === 'annual' && _isAnnual) || (plan === 'monthly' && !_isAnnual)) return;

      _isAnnual = plan === 'annual';

      // Update toggle visual
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (_isAnnual) {
        billingToggle.classList.add('annual');
      } else {
        billingToggle.classList.remove('annual');
      }

      // Animate price change
      proPrice.classList.add('changing');
      proPeriod.classList.add('changing');

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

        proPrice.classList.remove('changing');
        proPeriod.classList.remove('changing');
      }, 300);
    });
  });

  // FAQ accordion
  const faqItems = _container.querySelectorAll('[data-faq]');
  faqItems.forEach(item => {
    item.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      const answer = item.querySelector('.faq-answer');

      // Close all other items
      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          const otherAnswer = other.querySelector('.faq-answer');
          otherAnswer.style.maxHeight = '0';
          otherAnswer.style.opacity = '0';
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
        answer.style.opacity = '0';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        answer.style.opacity = '1';
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
    window.location.href = 'mailto:hello@tryseo.ai';
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
// Hero Particles
// ──────────────────────────────────────────────

function _createParticles() {
  if (!_container) return;
  const particleContainer = _container.querySelector('#hero-particles');
  if (!particleContainer) return;

  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.classList.add('hero-particle');
    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const duration = Math.random() * 10 + 12;
    const delay = Math.random() * 8;

    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}%;
      bottom: -10px;
      background: rgba(184, 158, 95, ${Math.random() * 0.2 + 0.05});
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    particleContainer.appendChild(particle);
  }
}

// ──────────────────────────────────────────────
// HTML Template
// ──────────────────────────────────────────────

function _buildHTML() {
  return `
  <div class="relative">

    <!-- ==================== SIDE INDICATOR ==================== -->
    <div class="fixed left-8 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-center gap-6">
      <div class="w-px h-12 bg-gradient-to-b from-transparent via-obsidian/20 to-transparent"></div>
      <span class="side-indicator font-sans text-[9px] uppercase tracking-[0.3em] text-soft-gray/60">Pricing 2026</span>
      <div class="w-px h-12 bg-gradient-to-b from-transparent via-obsidian/20 to-transparent"></div>
    </div>

    <!-- ==================== HERO SECTION ==================== -->
    <section class="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-10 overflow-hidden">
      <!-- Hero background pattern -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <!-- Abstract gradient orbs with parallax -->
        <div class="absolute top-1/4 left-[16%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-burnished-gold/[0.06] to-transparent blur-3xl" data-parallax data-speed="0.02"></div>
        <div class="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-soft-gray/[0.05] to-transparent blur-3xl" data-parallax data-speed="0.03"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-gradient-to-r from-burnished-gold/[0.03] via-transparent to-soft-gray/[0.03] blur-3xl" data-parallax data-speed="0.01"></div>
        <!-- Floating particles -->
        <div id="hero-particles"></div>
      </div>

      <div class="text-center max-w-5xl mx-auto relative z-10 pt-32 pb-20">
        <div class="animate-in" style="animation-delay: 0.4s;">
          <span class="inline-block font-sans text-[10px] tracking-[0.3em] uppercase text-burnished-gold border border-burnished-gold/30 rounded-full px-5 py-2">Transparent Pricing</span>
        </div>

        <h1 class="mt-10 md:mt-14 font-display italic text-5xl md:text-7xl lg:text-[110px] leading-[0.95] tracking-tight text-obsidian animate-in" style="animation-delay: 0.6s;">
          Honest pricing,<br>no surprises.
        </h1>

        <p class="mt-8 md:mt-10 font-sans text-base md:text-lg text-obsidian/45 leading-relaxed max-w-2xl mx-auto animate-in" style="animation-delay: 0.8s;">
          Start free, scale when you need to. Every plan gives you<br class="hidden md:block"> access to AI-powered SEO intelligence built for results.
        </p>

        <div class="mt-10 animate-in" style="animation-delay: 1s;">
          <a href="#plans" class="nav-link inline-flex items-center gap-3 px-7 py-3.5 border border-obsidian/15 hover:border-obsidian/40 hover:bg-white/50 backdrop-blur-sm transition-all duration-500 rounded-full group">
            <span class="font-sans text-[10px] uppercase tracking-[0.25em]">View Plans</span>
            <svg class="w-3 h-3 transform group-hover:translate-y-1 transition-transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
          </a>
        </div>

        <!-- Line growth animation -->
        <div class="mt-14 flex justify-center">
          <div class="w-px bg-gradient-to-b from-burnished-gold/50 to-transparent line-grow"></div>
        </div>
      </div>

      <!-- Scroll indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-in" style="animation-delay: 1.4s;">
        <span class="font-sans text-[9px] uppercase tracking-[0.3em] text-soft-gray/60">Scroll</span>
        <div class="w-px h-10 bg-gradient-to-b from-obsidian/20 to-transparent"></div>
      </div>
    </section>

    <!-- ==================== BILLING TOGGLE + PRICING CARDS ==================== -->
    <section id="plans" class="px-6 md:px-10 lg:px-20 pb-32 pt-10">
      <!-- Section label -->
      <div class="max-w-7xl mx-auto mb-12 reveal">
        <div class="flex items-center gap-6">
          <span class="font-sans text-[10px] tracking-[0.2em] uppercase text-soft-gray">01 / Plans</span>
          <div class="flex-1 h-px bg-obsidian/10"></div>
          <span class="font-sans text-[10px] tracking-[0.15em] text-soft-gray/50">3 tiers</span>
        </div>
      </div>

      <!-- Billing toggle -->
      <div class="max-w-7xl mx-auto mb-16 flex justify-center reveal">
        <div class="flex items-center gap-6">
          <div class="billing-toggle flex items-center rounded-full p-1" id="billing-toggle">
            <div class="toggle-slider rounded-full"></div>
            <button class="toggle-btn active font-sans text-[10px] tracking-[0.15em] uppercase px-6 py-2.5 rounded-full" data-plan="monthly">Monthly</button>
            <button class="toggle-btn font-sans text-[10px] tracking-[0.15em] uppercase px-6 py-2.5 rounded-full" data-plan="annual">Annual</button>
          </div>
          <span class="save-badge font-sans text-[9px] tracking-[0.15em] uppercase text-burnished-gold bg-burnished-gold/10 border border-burnished-gold/20 rounded-full px-3 py-1.5">Save 20%</span>
        </div>
      </div>

      <!-- Pricing cards grid -->
      <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 reveal-stagger" id="pricing-grid">

        <!-- FREE TIER -->
        <div class="pricing-card bg-white/30 backdrop-blur-md border border-white/50 rounded-lg overflow-hidden reveal-child" style="transition-delay: 0s;">
          <div class="relative flex flex-col h-full">
            <!-- Card gradient background -->
            <div class="card-gradient absolute inset-0 bg-gradient-to-b from-soft-gray/[0.04] via-white/40 to-white/60 pointer-events-none"></div>

            <div class="relative p-8 md:p-10 flex flex-col h-full">
              <!-- Tier badge -->
              <div class="flex items-center justify-between mb-8">
                <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-soft-gray border border-obsidian/[0.08] rounded-full px-3 py-1">Free</span>
                <span class="font-serif text-5xl text-obsidian/[0.06]">01</span>
              </div>

              <!-- Price -->
              <div class="mb-8">
                <div class="flex items-baseline gap-1">
                  <span class="font-serif text-5xl md:text-6xl tracking-tight text-obsidian">$0</span>
                  <span class="font-sans text-[10px] tracking-wider uppercase text-soft-gray">/forever</span>
                </div>
                <div class="w-8 h-px bg-burnished-gold/30 mt-4"></div>
              </div>

              <!-- Features list -->
              <div class="space-y-4 mb-10 flex-1">
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">1 free site audit (redacted results)</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">Basic SEO score with category breakdown</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">Top-level recommendations</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">No account required</span>
                </div>
              </div>

              <!-- CTA -->
              <button id="btn-free" class="nav-link inline-flex items-center justify-center gap-3 w-full px-6 py-4 border border-obsidian/15 hover:border-obsidian/40 hover:bg-white/50 backdrop-blur-sm transition-all duration-500 rounded-full group cursor-pointer bg-transparent">
                <span class="font-sans text-[10px] uppercase tracking-[0.25em]">Try Free Audit</span>
                <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- PRO TIER (Featured) -->
        <div class="pricing-card featured bg-white/30 backdrop-blur-md border border-burnished-gold/40 rounded-lg overflow-hidden reveal-child md:-mt-4 md:mb-[-16px]" style="transition-delay: 0.08s;">
          <div class="relative flex flex-col h-full">
            <!-- Card gradient background with gold tint -->
            <div class="card-gradient absolute inset-0 bg-gradient-to-b from-burnished-gold/[0.08] via-burnished-gold/[0.03] to-white/60 pointer-events-none"></div>

            <div class="relative p-8 md:p-10 flex flex-col h-full">
              <!-- Tier badge -->
              <div class="flex items-center justify-between mb-8">
                <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-burnished-gold bg-burnished-gold/10 border border-burnished-gold/20 rounded-full px-3 py-1">Recommended</span>
                <span class="font-serif text-5xl text-burnished-gold/[0.10]">02</span>
              </div>

              <!-- Price -->
              <div class="mb-8">
                <div class="flex items-baseline gap-1">
                  <span class="font-serif text-5xl md:text-6xl tracking-tight text-obsidian price-value" id="pro-price">$49</span>
                  <span class="font-sans text-[10px] tracking-wider uppercase text-soft-gray price-value" id="pro-period">/month</span>
                </div>
                <p class="font-sans text-[10px] text-burnished-gold/70 mt-2 h-4" id="pro-annual-note"></p>
                <div class="w-8 h-px bg-burnished-gold/50 mt-3"></div>
              </div>

              <!-- Features list -->
              <div class="space-y-4 mb-10 flex-1">
                <div class="flex items-start gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold/60 mt-1.5 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/60 leading-relaxed">Unlimited full audits</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold/60 mt-1.5 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/60 leading-relaxed">All 10 AI-powered SEO tools</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold/60 mt-1.5 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/60 leading-relaxed">Full keyword research &amp; SERP analysis</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold/60 mt-1.5 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/60 leading-relaxed">Competitor &amp; content gap analysis</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold/60 mt-1.5 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/60 leading-relaxed">Technical SEO diagnostics</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold/60 mt-1.5 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/60 leading-relaxed">AI content briefs &amp; calendars</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold/60 mt-1.5 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/60 leading-relaxed">Backlink &amp; topical authority mapping</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold/60 mt-1.5 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/60 leading-relaxed">Export reports (HTML + Word)</span>
                </div>
              </div>

              <!-- CTA -->
              <button id="btn-pro" class="nav-link inline-flex items-center justify-center gap-3 w-full px-6 py-4 bg-obsidian text-alabaster hover:bg-obsidian/85 transition-all duration-500 rounded-full group cursor-pointer border-0">
                <span class="font-sans text-[10px] uppercase tracking-[0.25em]">Get Started</span>
                <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ENTERPRISE TIER -->
        <div class="pricing-card bg-white/30 backdrop-blur-md border border-white/50 rounded-lg overflow-hidden reveal-child" style="transition-delay: 0.16s;">
          <div class="relative flex flex-col h-full">
            <!-- Card gradient background -->
            <div class="card-gradient absolute inset-0 bg-gradient-to-b from-obsidian/[0.03] via-soft-gray/[0.04] to-white/60 pointer-events-none"></div>

            <div class="relative p-8 md:p-10 flex flex-col h-full">
              <!-- Tier badge -->
              <div class="flex items-center justify-between mb-8">
                <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-soft-gray border border-obsidian/[0.08] rounded-full px-3 py-1">Enterprise</span>
                <span class="font-serif text-5xl text-obsidian/[0.06]">03</span>
              </div>

              <!-- Price -->
              <div class="mb-8">
                <div class="flex items-baseline gap-1">
                  <span class="font-serif text-5xl md:text-6xl tracking-tight text-obsidian">Custom</span>
                </div>
                <p class="font-sans text-[10px] text-soft-gray/70 mt-2">Tailored to your organization</p>
                <div class="w-8 h-px bg-burnished-gold/30 mt-3"></div>
              </div>

              <!-- Features list -->
              <div class="space-y-4 mb-10 flex-1">
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">Everything in Pro</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">API access for custom integrations</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">Custom tool configurations</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">Dedicated priority support</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">Team collaboration &amp; roles</span>
                </div>
                <div class="flex items-start gap-3">
                  <span class="w-1 h-1 rounded-full bg-obsidian/30 mt-2 flex-shrink-0"></span>
                  <span class="font-sans text-xs text-obsidian/50 leading-relaxed">White-label reports</span>
                </div>
              </div>

              <!-- CTA -->
              <button id="btn-enterprise" class="nav-link inline-flex items-center justify-center gap-3 w-full px-6 py-4 border border-obsidian/15 hover:border-obsidian/40 hover:bg-white/50 backdrop-blur-sm transition-all duration-500 rounded-full group cursor-pointer bg-transparent">
                <span class="font-sans text-[10px] uppercase tracking-[0.25em]">Contact Us</span>
                <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ==================== FEATURE COMPARISON (Dark Section) ==================== -->
    <section class="relative bg-obsidian text-alabaster py-32 md:py-40 overflow-hidden" id="comparison">
      <!-- Dark section textures -->
      <div class="absolute inset-0 opacity-30 bg-noise mix-blend-overlay pointer-events-none"></div>
      <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-burnished-gold/20 to-transparent"></div>
      <div class="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-burnished-gold/20 to-transparent"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-burnished-gold/[0.03] to-transparent blur-3xl pointer-events-none"></div>

      <div class="relative z-10 px-6 md:px-10 lg:px-20">
        <!-- Section label -->
        <div class="max-w-7xl mx-auto mb-16 reveal">
          <div class="flex items-center gap-6">
            <span class="font-sans text-[10px] tracking-[0.2em] uppercase text-burnished-gold">02 / What's Included</span>
            <div class="flex-1 h-px bg-alabaster/10"></div>
            <span class="font-sans text-[10px] tracking-[0.15em] text-alabaster/20">Feature Matrix</span>
          </div>
        </div>

        <!-- Title -->
        <div class="max-w-7xl mx-auto mb-20 reveal">
          <h2 class="font-display italic text-4xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-alabaster">
            Everything,<br>compared.
          </h2>
        </div>

        <!-- Feature comparison grid -->
        <div class="max-w-7xl mx-auto reveal">
          <!-- Header row -->
          <div class="grid grid-cols-[1fr_80px_80px_80px] md:grid-cols-[1fr_120px_120px_120px] gap-2 md:gap-4 pb-6 border-b border-alabaster/10 mb-2">
            <div class="font-sans text-[9px] tracking-[0.2em] uppercase text-alabaster/30">Feature</div>
            <div class="font-sans text-[9px] tracking-[0.2em] uppercase text-alabaster/30 text-center">Free</div>
            <div class="font-sans text-[9px] tracking-[0.2em] uppercase text-burnished-gold text-center">Pro</div>
            <div class="font-sans text-[9px] tracking-[0.2em] uppercase text-alabaster/30 text-center">Enterprise</div>
          </div>

          <!-- Category: Analysis Tools -->
          <div class="pt-6 pb-3">
            <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-burnished-gold/60">Analysis Tools</span>
          </div>

          ${_comparisonRow('Website Analyzer', '1 audit', true, true)}
          ${_comparisonRow('Keyword Research', false, true, true)}
          ${_comparisonRow('Competitor Analysis', false, true, true)}
          ${_comparisonRow('SERP Analysis', false, true, true)}

          <!-- Category: Content Tools -->
          <div class="pt-8 pb-3">
            <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-burnished-gold/60">Content Tools</span>
          </div>

          ${_comparisonRow('Content Gap Analysis', false, true, true)}
          ${_comparisonRow('Content Generation &amp; Briefs', false, true, true)}

          <!-- Category: Strategy & Technical -->
          <div class="pt-8 pb-3">
            <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-burnished-gold/60">Strategy &amp; Technical</span>
          </div>

          ${_comparisonRow('Topical Authority Mapping', false, true, true)}
          ${_comparisonRow('Technical SEO Diagnostics', false, true, true)}
          ${_comparisonRow('Backlink Strategy', false, true, true)}
          ${_comparisonRow('Strategy Orchestrator', false, true, true)}

          <!-- Category: Outputs & Extras -->
          <div class="pt-8 pb-3">
            <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-burnished-gold/60">Outputs &amp; Extras</span>
          </div>

          ${_comparisonRow('30-criteria scoring rubric', 'Partial', true, true)}
          ${_comparisonRow('Export reports (HTML + Word)', false, true, true)}
          ${_comparisonRow('API access', false, false, true)}
          ${_comparisonRow('White-label reports', false, false, true)}
          ${_comparisonRow('Team collaboration', false, false, true)}
          ${_comparisonRow('Dedicated support', false, 'Email', true, true)}
        </div>
      </div>
    </section>

    <!-- ==================== SOCIAL PROOF / STATS (Editorial Two-Column) ==================== -->
    <section class="px-6 md:px-10 lg:px-20 py-32 md:py-40">
      <div class="max-w-7xl mx-auto">
        <!-- Section label -->
        <div class="mb-20 reveal">
          <div class="flex items-center gap-6">
            <span class="font-sans text-[10px] tracking-[0.2em] uppercase text-soft-gray">03 / The Engine</span>
            <div class="flex-1 h-px bg-obsidian/10"></div>
          </div>
        </div>

        <!-- Two-column editorial layout -->
        <div class="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <!-- Visual side -->
          <div class="reveal parallax-wrap">
            <div class="stats-visual rounded-lg aspect-[4/5] relative overflow-hidden border border-obsidian/5" data-parallax data-speed="0.02">
              <div class="absolute inset-0 flex flex-col justify-between p-8 md:p-12">
                <div>
                  <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-soft-gray/60">By the Numbers</span>
                </div>

                <div class="space-y-12">
                  <!-- Stat 01 -->
                  <div class="flex items-start gap-6">
                    <span class="font-serif text-3xl text-obsidian/[0.06] leading-none mt-0.5">01.</span>
                    <div>
                      <span class="font-serif text-5xl md:text-6xl tracking-tight text-obsidian block">30</span>
                      <p class="font-sans text-[10px] tracking-[0.15em] uppercase text-soft-gray mt-2">Scoring criteria per audit</p>
                    </div>
                  </div>
                  <div class="ml-10 w-16 h-px bg-gradient-to-r from-burnished-gold/30 to-transparent"></div>

                  <!-- Stat 02 -->
                  <div class="flex items-start gap-6">
                    <span class="font-serif text-3xl text-obsidian/[0.06] leading-none mt-0.5">02.</span>
                    <div>
                      <span class="font-serif text-5xl md:text-6xl tracking-tight text-obsidian block">10</span>
                      <p class="font-sans text-[10px] tracking-[0.15em] uppercase text-soft-gray mt-2">AI-powered specialist tools</p>
                    </div>
                  </div>
                  <div class="ml-10 w-16 h-px bg-gradient-to-r from-burnished-gold/30 to-transparent"></div>

                  <!-- Stat 03 -->
                  <div class="flex items-start gap-6">
                    <span class="font-serif text-3xl text-obsidian/[0.06] leading-none mt-0.5">03.</span>
                    <div>
                      <span class="font-serif text-5xl md:text-6xl tracking-tight text-obsidian block">&lt;60s</span>
                      <p class="font-sans text-[10px] tracking-[0.15em] uppercase text-soft-gray mt-2">Full analysis turnaround</p>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full bg-green-500/40 animate-pulse"></div>
                  <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-soft-gray/40">Live Metrics</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Text side -->
          <div class="reveal">
            <div class="pull-quote mb-12">
              <p class="font-display italic text-3xl md:text-4xl leading-snug text-obsidian/80 tracking-tight">
                The same intelligence that powers enterprise SEO teams &mdash; accessible to everyone.
              </p>
            </div>

            <div class="space-y-6">
              <p class="font-sans text-sm text-obsidian/45 leading-relaxed">
                Every query is processed through live web data, never cached databases. Jina AI scrapes and searches in real time, while our LLM evaluates against a structured 30-criteria rubric across performance, SEO fundamentals, content quality, and technical health.
              </p>
              <p class="font-sans text-sm text-obsidian/45 leading-relaxed">
                Scores are computed deterministically from weighted category averages. The AI provides the evaluation; the math provides the objectivity. Every recommendation comes with evidence traces and source attribution.
              </p>
              <p class="font-sans text-sm text-obsidian/45 leading-relaxed">
                Whether you are a solo founder running a single audit or an agency orchestrating full strategies across client portfolios, the engine is the same. The only difference is how much of it you use.
              </p>
            </div>

            <div class="mt-10 flex items-center gap-8">
              <div>
                <span class="font-serif text-4xl text-obsidian">4</span>
                <p class="font-sans text-[10px] tracking-[0.15em] uppercase text-soft-gray mt-1">Score categories</p>
              </div>
              <div class="w-px h-12 bg-obsidian/10"></div>
              <div>
                <span class="font-serif text-4xl text-obsidian">25%</span>
                <p class="font-sans text-[10px] tracking-[0.15em] uppercase text-soft-gray mt-1">Equal weight each</p>
              </div>
              <div class="w-px h-12 bg-obsidian/10"></div>
              <div>
                <span class="font-serif text-4xl text-obsidian">100%</span>
                <p class="font-sans text-[10px] tracking-[0.15em] uppercase text-soft-gray mt-1">Evidence-backed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== FAQ SECTION ==================== -->
    <section class="px-6 md:px-10 lg:px-20 pb-32" id="faq">
      <div class="max-w-7xl mx-auto">
        <!-- Section label -->
        <div class="mb-16 reveal">
          <div class="flex items-center gap-6">
            <span class="font-sans text-[10px] tracking-[0.2em] uppercase text-soft-gray">04 / Frequently Asked</span>
            <div class="flex-1 h-px bg-obsidian/10"></div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-12 md:gap-20">
          <!-- Left side - title -->
          <div class="reveal">
            <h2 class="font-display italic text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-obsidian tracking-tight">
              Questions?<br>Answered.
            </h2>
            <p class="mt-6 font-sans text-sm text-obsidian/40 leading-relaxed max-w-sm">
              Everything you need to know about our plans, tools, and how the platform works.
            </p>
          </div>

          <!-- Right side - accordion -->
          <div class="reveal">
            <!-- FAQ 1 -->
            <div class="faq-item py-6 cursor-pointer" data-faq>
              <div class="flex items-center justify-between gap-4">
                <h3 class="font-serif text-lg md:text-xl text-obsidian/80 tracking-tight">What's included in the free audit?</h3>
                <span class="faq-toggle font-sans text-xl text-burnished-gold flex-shrink-0 w-6 h-6 flex items-center justify-center">+</span>
              </div>
              <div class="faq-answer">
                <p class="font-sans text-sm text-obsidian/45 leading-relaxed pt-4 pb-2">
                  The free audit runs a full website analysis using our 30-criteria scoring rubric. You get your overall SEO score with a category breakdown across performance, SEO, content, and technical dimensions. Detailed recommendations are redacted in the free tier &mdash; sign up for Pro to unlock the complete analysis, evidence traces, and actionable roadmap.
                </p>
              </div>
            </div>

            <!-- FAQ 2 -->
            <div class="faq-item py-6 cursor-pointer" data-faq>
              <div class="flex items-center justify-between gap-4">
                <h3 class="font-serif text-lg md:text-xl text-obsidian/80 tracking-tight">Can I cancel my Pro plan anytime?</h3>
                <span class="faq-toggle font-sans text-xl text-burnished-gold flex-shrink-0 w-6 h-6 flex items-center justify-center">+</span>
              </div>
              <div class="faq-answer">
                <p class="font-sans text-sm text-obsidian/45 leading-relaxed pt-4 pb-2">
                  Yes. There are no long-term contracts or hidden fees. You can cancel your Pro subscription at any time and continue using it until the end of your billing period. Annual plans can be cancelled with a prorated refund for remaining months.
                </p>
              </div>
            </div>

            <!-- FAQ 3 -->
            <div class="faq-item py-6 cursor-pointer" data-faq>
              <div class="flex items-center justify-between gap-4">
                <h3 class="font-serif text-lg md:text-xl text-obsidian/80 tracking-tight">How does the AI audit actually work?</h3>
                <span class="faq-toggle font-sans text-xl text-burnished-gold flex-shrink-0 w-6 h-6 flex items-center justify-center">+</span>
              </div>
              <div class="faq-answer">
                <p class="font-sans text-sm text-obsidian/45 leading-relaxed pt-4 pb-2">
                  When you submit a URL, our AI agent scrapes and analyzes your site in real time using Jina AI. The data is evaluated by a large language model against 30 structured criteria across four categories. Scores are computed deterministically using weighted averages &mdash; the AI evaluates, but the scoring is mathematically objective. Results typically arrive in under 60 seconds.
                </p>
              </div>
            </div>

            <!-- FAQ 4 -->
            <div class="faq-item py-6 cursor-pointer" data-faq>
              <div class="flex items-center justify-between gap-4">
                <h3 class="font-serif text-lg md:text-xl text-obsidian/80 tracking-tight">What tools are included in Pro?</h3>
                <span class="faq-toggle font-sans text-xl text-burnished-gold flex-shrink-0 w-6 h-6 flex items-center justify-center">+</span>
              </div>
              <div class="faq-answer">
                <p class="font-sans text-sm text-obsidian/45 leading-relaxed pt-4 pb-2">
                  Pro includes all 10 AI-powered tools: Website Analyzer, Keyword Research, Competitor Analysis, SERP Analysis, Content Gap, Content Generation, Topical Authority Mapping, Technical SEO Diagnostics, Backlink Strategy, and the Strategy Orchestrator &mdash; which runs all tools in intelligent phases to produce a unified roadmap.
                </p>
              </div>
            </div>

            <!-- FAQ 5 -->
            <div class="faq-item py-6 cursor-pointer" data-faq>
              <div class="flex items-center justify-between gap-4">
                <h3 class="font-serif text-lg md:text-xl text-obsidian/80 tracking-tight">Do you offer refunds?</h3>
                <span class="faq-toggle font-sans text-xl text-burnished-gold flex-shrink-0 w-6 h-6 flex items-center justify-center">+</span>
              </div>
              <div class="faq-answer">
                <p class="font-sans text-sm text-obsidian/45 leading-relaxed pt-4 pb-2">
                  We offer a 14-day money-back guarantee on all new Pro subscriptions. If you are not satisfied with the platform, contact us within 14 days of your initial payment for a full refund. Annual plans include prorated refunds for unused months beyond the first 14 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== BOTTOM CTA ==================== -->
    <section class="px-6 md:px-10 lg:px-20 pb-32">
      <div class="max-w-7xl mx-auto">
        <div class="h-px bg-obsidian/10 mb-20 reveal"></div>

        <div class="max-w-4xl mx-auto text-center reveal">
          <h2 class="font-display italic text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-obsidian">
            Start with a<br>free audit.
          </h2>
          <p class="mt-6 font-sans text-base text-obsidian/35 max-w-lg mx-auto leading-relaxed">
            No sign-up required. See what ten tools working as one can reveal about your site. Upgrade when you are ready.
          </p>
          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button id="cta-free-audit" class="nav-link inline-flex items-center gap-3 px-8 py-4 bg-obsidian text-alabaster hover:bg-obsidian/85 transition-all duration-500 rounded-full group cursor-pointer border-0">
              <span class="font-sans text-[10px] uppercase tracking-[0.25em]">Start Free Audit</span>
              <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </button>
            <button id="cta-features" class="nav-link inline-flex items-center gap-3 px-8 py-4 border border-obsidian/15 hover:border-obsidian/40 hover:bg-white/50 backdrop-blur-sm transition-all duration-500 rounded-full group cursor-pointer bg-transparent">
              <span class="font-sans text-[10px] uppercase tracking-[0.25em]">Explore Features</span>
              <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== FOOTER ==================== -->
    <footer class="px-6 md:px-10 lg:px-20 pb-10">
      <div class="max-w-7xl mx-auto">
        <div class="h-px bg-obsidian/10 mb-10"></div>
        <div class="flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex items-center gap-3 font-sans text-[10px] uppercase tracking-widest text-soft-gray">
            <span class="w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></span>
            <span>AI Engine Online</span>
          </div>

          <div class="flex items-center gap-8">
            <a href="#/features" class="nav-link font-sans text-[10px] uppercase tracking-widest text-obsidian/40 hover:text-obsidian transition-colors">Features</a>
            <a href="#/pricing" class="nav-link font-sans text-[10px] uppercase tracking-widest text-obsidian/60 hover:text-obsidian transition-colors">Pricing</a>
            <a href="#/about" class="nav-link font-sans text-[10px] uppercase tracking-widest text-obsidian/40 hover:text-obsidian transition-colors">About</a>
          </div>

          <div class="font-sans text-[10px] uppercase tracking-widest text-soft-gray">
            &copy; 2026 trySEO.ai
          </div>
        </div>
      </div>
    </footer>

  </div>`;
}

// ──────────────────────────────────────────────
// Comparison Row Helper
// ──────────────────────────────────────────────

function _comparisonRow(feature, free, pro, enterprise, isLast = false) {
  const borderClass = isLast ? '' : 'border-b border-alabaster/[0.05]';

  function _cell(val) {
    if (val === true) return '<span class="text-center check-gold">&#10003;</span>';
    if (val === false) return '<span class="text-center check-dim">&mdash;</span>';
    // String value (like "1 audit", "Partial", "Email")
    return `<span class="text-center font-sans text-xs text-alabaster/20">${val}</span>`;
  }

  return `<div class="comparison-row grid grid-cols-[1fr_80px_80px_80px] md:grid-cols-[1fr_120px_120px_120px] gap-2 md:gap-4 py-4 ${borderClass} rounded-sm px-2 -mx-2">
    <span class="font-sans text-xs text-alabaster/50">${feature}</span>
    ${_cell(free)}
    ${_cell(pro)}
    ${_cell(enterprise)}
  </div>`;
}
