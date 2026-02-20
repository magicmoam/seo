// features.js - Features page with hero, 9 tool cards, orchestrator, architecture for trySEO.ai
import { navigate } from '../router.js';

let _container = null;
let _particleInterval = null;
let _activeFilter = 'all';

// ── Tool card data ──
const tools = [
  { num: '01', title: 'Website Analyzer', category: 'analysis', gradient: 'gradient-1', desc: 'Full site audit with a 30-criteria scoring rubric across performance, SEO, content & technical dimensions.', tags: ['Performance', '30 Criteria'] },
  { num: '02', title: 'Keyword Research', category: 'analysis', gradient: 'gradient-2', desc: 'AI-powered keyword discovery with search volume, difficulty scoring, and intent analysis for precision targeting.', tags: ['Volume', 'Intent'] },
  { num: '03', title: 'Competitor Analysis', category: 'analysis', gradient: 'gradient-3', desc: 'Deep competitor intelligence with gap identification, strength mapping, and actionable strategy insights.', tags: ['Intelligence', 'Gaps'] },
  { num: '04', title: 'SERP Analysis', category: 'analysis', gradient: 'gradient-4', desc: 'Search results page analysis with ranking factor breakdown, SERP feature detection, and opportunity scoring.', tags: ['Rankings', 'Features'] },
  { num: '05', title: 'Content Gap', category: 'content', gradient: 'gradient-5', desc: 'Find missing content opportunities that your competitors are ranking for. Uncover the topics you should own.', tags: ['Opportunities', 'Topics'] },
  { num: '06', title: 'Content Generation', category: 'content', gradient: 'gradient-6', desc: 'AI-generated SEO-optimized content calendars, briefs, and editorial plans tailored to your domain.', tags: ['Calendars', 'Briefs'] },
  { num: '07', title: 'Topical Authority', category: 'strategy', gradient: 'gradient-7', desc: 'Map and build topical authority clusters. Establish domain expertise through strategic content architecture.', tags: ['Clusters', 'Authority'] },
  { num: '08', title: 'Technical SEO', category: 'technical', gradient: 'gradient-8', desc: 'Crawl and diagnose technical issues affecting search performance. Schema, crawlability, Core Web Vitals, and more.', tags: ['Diagnostics', 'Vitals'] },
  { num: '09', title: 'Backlink Strategy', category: 'technical', gradient: 'gradient-9', desc: 'Identify link building opportunities, analyze backlink profiles, and develop authority-building outreach strategies.', tags: ['Links', 'Outreach'] },
];

// ── Orchestrator phases ──
const phases = [
  {
    num: '01',
    label: 'Phase 1',
    title: 'Foundation Analysis',
    desc: 'Parallel execution of core analysis tools to establish a comprehensive baseline understanding of your digital presence.',
    items: ['Website Analyzer', 'Keyword Research', 'Competitor Analysis', 'Content Gap Analysis'],
    marginTop: '0',
  },
  {
    num: '02',
    label: 'Phase 2',
    title: 'Deep Intelligence',
    desc: 'Secondary analysis layer that builds on Phase 1 findings for deeper strategic insights.',
    items: ['Topical Authority Mapping', 'Technical SEO Audit', 'Backlink Strategy'],
    marginTop: '48px',
  },
  {
    num: '03',
    label: 'Phase 3',
    title: 'Content Planning',
    desc: 'Sequential content strategy generation informed by all prior analysis phases.',
    items: ['Content Calendar', 'Editorial Briefs', 'Topic Clusters'],
    marginTop: '16px',
  },
  {
    num: '04',
    label: 'Phase 4',
    title: 'Strategic Synthesis',
    desc: 'LLM-powered synthesis of all tool outputs into a unified, prioritized action plan.',
    items: ['Priority Roadmap', 'Quick Wins', 'Long-term Strategy'],
    marginTop: '64px',
    goldBorder: true,
  },
];

export function mount(container) {
  _container = container;
  _activeFilter = 'all';
  _container.innerHTML = _html();
  _initJS();
}

export function unmount() {
  if (_particleInterval) {
    clearInterval(_particleInterval);
    _particleInterval = null;
  }
  _container = null;
}

// ── Full page HTML ──
function _html() {
  return `
<div class="bg-alabaster min-h-screen">

  <!-- Side Indicator -->
  <div class="fixed left-8 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-center gap-6" id="features-side-indicator">
    <div class="w-px h-12 bg-gradient-to-b from-transparent via-obsidian/20 to-transparent"></div>
    <span class="side-indicator font-sans text-[9px] uppercase tracking-[0.3em] text-soft-gray/60">Features 2026</span>
    <div class="w-px h-12 bg-gradient-to-b from-transparent via-obsidian/20 to-transparent"></div>
  </div>

  <!-- ═══════════════ HERO ═══════════════ -->
  <section class="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" id="features-hero">

    <!-- Gradient orbs -->
    <div class="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-burnished-gold/[0.04] blur-[120px] animate-pulse pointer-events-none"></div>
    <div class="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-obsidian/[0.03] blur-[100px] pointer-events-none" style="animation: breathe 15s ease-in-out infinite;"></div>

    <!-- Floating particles container -->
    <div class="absolute inset-0 pointer-events-none" id="hero-particles"></div>

    <!-- Hero content -->
    <div class="relative z-10 text-center max-w-3xl mx-auto px-6">

      <!-- Badge -->
      <div class="animate-in mb-8" style="animation-delay: 0.2s;">
        <span class="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/50 rounded-full">
          <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold" style="animation: badgePulse 2.5s ease-in-out infinite;"></span>
          <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-obsidian/60">The Complete Toolkit</span>
        </span>
      </div>

      <!-- Title -->
      <h1 class="animate-in font-serif text-6xl md:text-7xl lg:text-8xl font-semibold text-obsidian tracking-tight leading-[0.95] mb-6" style="animation-delay: 0.4s;">
        Ten tools.<br>
        <span class="italic font-normal text-obsidian/40">One intelligence.</span>
      </h1>

      <!-- Subtitle -->
      <p class="animate-in font-sans text-base md:text-lg text-obsidian/45 max-w-md mx-auto leading-relaxed mb-10" style="animation-delay: 0.6s;">
        From keyword discovery to full-site audits, every tool is powered by live SERP data and LLM analysis.
      </p>

      <!-- CTA -->
      <div class="animate-in" style="animation-delay: 0.8s;">
        <a href="#tools-grid" class="inline-flex items-center gap-3 px-8 py-4 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.25em] font-sans transition-all duration-300 hover:bg-obsidian/85 hover:shadow-lg">
          Explore Tools
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </a>
      </div>

      <!-- Line grow -->
      <div class="flex justify-center mt-16">
        <div class="w-px bg-gradient-to-b from-obsidian/20 to-transparent line-grow"></div>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-in" style="animation-delay: 1.4s;">
      <div class="flex flex-col items-center gap-2">
        <span class="font-sans text-[8px] uppercase tracking-[0.3em] text-soft-gray/50">Scroll</span>
        <div class="w-px h-6 bg-gradient-to-b from-soft-gray/30 to-transparent" style="animation: subtlePulse 2s ease-in-out infinite;"></div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ TOOLS GRID ═══════════════ -->
  <section class="relative py-32 px-6 md:px-12 lg:px-20" id="tools-grid">

    <!-- Section label -->
    <div class="max-w-7xl mx-auto mb-16 reveal">
      <div class="flex items-center gap-4 mb-4">
        <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-burnished-gold/80">01 / Core Tools</span>
        <div class="flex-1 h-px bg-obsidian/8"></div>
      </div>
    </div>

    <!-- Filter buttons -->
    <div class="max-w-7xl mx-auto mb-12 reveal">
      <div class="flex flex-wrap gap-6" id="features-filter-buttons">
        ${_filterButtons()}
      </div>
    </div>

    <!-- Cards grid -->
    <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 reveal-stagger" id="features-tools-grid">
      ${_toolCards()}
    </div>
  </section>

  <!-- ═══════════════ ORCHESTRATOR ═══════════════ -->
  <section class="relative py-32 bg-obsidian overflow-hidden" id="orchestrator">

    <!-- Section label -->
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 mb-16 reveal">
      <div class="flex items-center gap-4 mb-4">
        <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-burnished-gold/60">02 / The Master Tool</span>
        <div class="flex-1 h-px bg-alabaster/8"></div>
      </div>
    </div>

    <!-- Title + description -->
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 mb-20 reveal">
      <div class="max-w-2xl">
        <h2 class="font-serif text-5xl md:text-6xl font-semibold text-alabaster tracking-tight leading-[1.05] mb-6">
          The <span class="italic font-normal text-alabaster/40">Orchestrator</span>
        </h2>
        <p class="font-sans text-base text-alabaster/40 leading-relaxed max-w-lg">
          One command triggers all ten tools in a phased, intelligent pipeline. Each phase feeds the next, building a comprehensive strategy from raw data to actionable roadmap.
        </p>
      </div>
    </div>

    <!-- Phase cards (horizontal scroll) -->
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
      <div class="flex gap-6 overflow-x-auto horizontal-scroll pb-8" id="phase-cards-scroll">
        ${_phaseCards()}
      </div>
    </div>
  </section>

  <!-- ═══════════════ ARCHITECTURE ═══════════════ -->
  <section class="relative py-32 px-6 md:px-12 lg:px-20" id="architecture">

    <!-- Section label -->
    <div class="max-w-7xl mx-auto mb-16 reveal">
      <div class="flex items-center gap-4 mb-4">
        <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-burnished-gold/80">03 / Architecture</span>
        <div class="flex-1 h-px bg-obsidian/8"></div>
      </div>
    </div>

    <!-- Two-column editorial -->
    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

      <!-- Architecture visual panel -->
      <div class="reveal">
        <div class="arch-visual relative aspect-[4/5] rounded-lg overflow-hidden border border-obsidian/8 p-8 flex flex-col justify-between">

          <!-- Flow visualization -->
          <div class="flex-1 flex flex-col justify-center gap-6">

            <!-- Step 1: Query -->
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full border border-burnished-gold/30 flex items-center justify-center">
                <span class="font-serif text-sm text-burnished-gold">01</span>
              </div>
              <div>
                <span class="font-sans text-xs uppercase tracking-[0.15em] text-obsidian/60">Query</span>
                <p class="font-sans text-[11px] text-obsidian/35 mt-0.5">Natural language intent classification</p>
              </div>
            </div>

            <div class="ml-5 w-px h-8 bg-gradient-to-b from-burnished-gold/20 to-obsidian/5"></div>

            <!-- Step 2: Gather -->
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full border border-burnished-gold/30 flex items-center justify-center">
                <span class="font-serif text-sm text-burnished-gold">02</span>
              </div>
              <div>
                <span class="font-sans text-xs uppercase tracking-[0.15em] text-obsidian/60">Gather</span>
                <p class="font-sans text-[11px] text-obsidian/35 mt-0.5">Live SERP data via Jina AI search &amp; scrape</p>
              </div>
            </div>

            <div class="ml-5 w-px h-8 bg-gradient-to-b from-burnished-gold/20 to-obsidian/5"></div>

            <!-- Step 3: Analyze -->
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full border border-burnished-gold/30 flex items-center justify-center">
                <span class="font-serif text-sm text-burnished-gold">03</span>
              </div>
              <div>
                <span class="font-sans text-xs uppercase tracking-[0.15em] text-obsidian/60">Analyze</span>
                <p class="font-sans text-[11px] text-obsidian/35 mt-0.5">LLM evaluation against Pydantic schemas</p>
              </div>
            </div>

            <div class="ml-5 w-px h-8 bg-gradient-to-b from-burnished-gold/20 to-obsidian/5"></div>

            <!-- Step 4: Deliver -->
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full border border-burnished-gold/30 flex items-center justify-center">
                <span class="font-serif text-sm text-burnished-gold">04</span>
              </div>
              <div>
                <span class="font-sans text-xs uppercase tracking-[0.15em] text-obsidian/60">Deliver</span>
                <p class="font-sans text-[11px] text-obsidian/35 mt-0.5">Structured results with evidence traces</p>
              </div>
            </div>
          </div>

          <!-- Bottom label -->
          <div class="mt-8 pt-4 border-t border-obsidian/6">
            <span class="font-sans text-[9px] uppercase tracking-[0.2em] text-soft-gray/50">System Architecture Flow</span>
          </div>
        </div>
      </div>

      <!-- Text side -->
      <div class="reveal lg:pt-8">

        <!-- Pull quote -->
        <blockquote class="pull-quote font-display text-3xl md:text-4xl italic text-obsidian/70 leading-snug mb-10 pl-4">
          We don&rsquo;t just analyze &mdash; we orchestrate.
        </blockquote>

        <!-- Paragraphs -->
        <div class="space-y-6 mb-12">
          <p class="font-sans text-sm text-obsidian/50 leading-relaxed">
            Every query triggers a precise pipeline: intent classification routes to the right tool, Jina AI scrapes live web data, and our LLM evaluates findings against structured schemas. The result isn&rsquo;t a black box &mdash; it&rsquo;s transparent, evidence-backed intelligence.
          </p>
          <p class="font-sans text-sm text-obsidian/50 leading-relaxed">
            The Strategy Orchestrator takes this further by running all ten tools in coordinated phases. Each phase feeds into the next, building context progressively until a comprehensive action plan emerges from raw data.
          </p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-6">
          <div>
            <span class="block font-serif text-4xl font-semibold text-obsidian tracking-tight">30</span>
            <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray">Scoring Criteria</span>
          </div>
          <div>
            <span class="block font-serif text-4xl font-semibold text-obsidian tracking-tight">4</span>
            <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray">Analysis Phases</span>
          </div>
          <div>
            <span class="block font-serif text-4xl font-semibold text-obsidian tracking-tight">10</span>
            <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray">AI-Powered Tools</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ CTA ═══════════════ -->
  <section class="relative py-32 px-6 text-center reveal">
    <div class="max-w-2xl mx-auto">
      <h2 class="font-serif text-4xl md:text-5xl font-semibold text-obsidian tracking-tight leading-tight mb-6">
        Ready to see it<br><span class="italic font-normal text-obsidian/40">in action?</span>
      </h2>
      <p class="font-sans text-base text-obsidian/45 mb-10 max-w-md mx-auto">
        Start with a free audit and experience the intelligence platform built for modern SEO.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4">
        <a href="#/" class="features-cta-audit inline-flex items-center gap-3 px-8 py-4 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.25em] font-sans transition-all duration-300 hover:bg-obsidian/85 hover:shadow-lg cursor-pointer">
          Start Free Audit
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
        </a>
        <a href="#/pricing" class="features-cta-pricing inline-flex items-center gap-3 px-8 py-4 bg-transparent text-obsidian border border-obsidian/15 rounded-full text-[10px] uppercase tracking-[0.25em] font-sans transition-all duration-300 hover:border-obsidian/30 cursor-pointer">
          View Pricing
        </a>
      </div>
    </div>
  </section>

  <!-- ═══════════════ FOOTER ═══════════════ -->
  <footer class="relative px-6 md:px-12 lg:px-20 pb-12">

    <!-- Divider -->
    <div class="max-w-7xl mx-auto mb-12">
      <div class="h-px bg-obsidian/8"></div>
    </div>

    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

      <!-- AI Engine indicator -->
      <div class="flex items-center gap-3">
        <div class="w-1.5 h-1.5 rounded-full bg-green-500" style="animation: subtlePulse 2s ease-in-out infinite;"></div>
        <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray/60">AI Engine Online</span>
      </div>

      <!-- Nav links -->
      <nav class="flex items-center gap-8">
        <a href="#/features" class="font-sans text-xs text-obsidian/40 hover:text-obsidian transition-colors">Features</a>
        <a href="#/pricing" class="font-sans text-xs text-obsidian/40 hover:text-obsidian transition-colors">Pricing</a>
        <a href="#/about" class="font-sans text-xs text-obsidian/40 hover:text-obsidian transition-colors">About</a>
      </nav>

      <!-- Copyright -->
      <span class="font-sans text-[10px] text-soft-gray/40 tracking-wider">&copy; 2026 trySEO.ai</span>
    </div>
  </footer>

</div>`;
}

// ── Filter buttons HTML ──
function _filterButtons() {
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'content', label: 'Content' },
    { id: 'technical', label: 'Technical' },
    { id: 'strategy', label: 'Strategy' },
  ];

  return filters.map(f => {
    const isActive = f.id === _activeFilter;
    return `<button class="filter-btn font-sans text-xs tracking-[0.15em] uppercase pb-1 ${isActive ? 'active text-obsidian' : 'text-soft-gray'}" data-filter="${f.id}">${f.label}</button>`;
  }).join('');
}

// ── Tool cards HTML ──
function _toolCards() {
  return tools.map((t, i) => {
    const categoryLabel = t.category.charAt(0).toUpperCase() + t.category.slice(1);
    const delay = (i * 0.08).toFixed(2);
    return `
    <div class="tool-card bg-white/30 backdrop-blur-md border border-white/50 rounded-lg overflow-hidden cursor-pointer group reveal-child" data-category="${t.category}" style="transition-delay: ${delay}s;">
      <div class="relative aspect-[4/5] overflow-hidden">
        <div class="card-gradient absolute inset-0 ${t.gradient}" data-parallax-card data-speed="0.03"></div>
        <div class="absolute top-5 left-6"><span class="tool-number font-serif text-5xl font-semibold text-obsidian/[0.07] transition-colors duration-600">${t.num}</span></div>
        <div class="absolute top-5 right-5"><span class="font-sans text-[8px] tracking-[0.2em] uppercase text-burnished-gold/80 bg-white/60 backdrop-blur-sm border border-burnished-gold/15 rounded-full px-3 py-1">${categoryLabel}</span></div>
        <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/80 via-white/40 to-transparent pt-20">
          <h3 class="font-serif italic text-2xl mb-2 tracking-tight">${t.title}</h3>
          <p class="font-sans text-xs text-obsidian/45 leading-relaxed line-clamp-2">${t.desc}</p>
          <div class="mt-4 flex items-center justify-between">
            <div class="flex gap-2">
              <span class="font-sans text-[8px] tracking-wider uppercase text-soft-gray border border-obsidian/8 rounded-full px-2.5 py-0.5">${t.tags[0]}</span>
              <span class="font-sans text-[8px] tracking-wider uppercase text-soft-gray border border-obsidian/8 rounded-full px-2.5 py-0.5">${t.tags[1]}</span>
            </div>
            <span class="card-arrow text-burnished-gold text-sm">&#8599;</span>
          </div>
        </div>
        <div class="explore-btn absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span class="inline-flex items-center gap-2 px-6 py-3 bg-obsidian/90 text-alabaster rounded-full text-[10px] uppercase tracking-[0.2em] font-sans backdrop-blur-sm">Explore <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg></span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Phase cards HTML ──
function _phaseCards() {
  return phases.map((p, i) => {
    const connectorClass = i < phases.length - 1 ? 'phase-connector' : '';
    const goldBorderStyle = p.goldBorder ? 'border-color: rgba(184, 158, 95, 0.3);' : '';
    return `
    <div class="phase-card ${connectorClass} flex-shrink-0 w-[320px] border border-alabaster/10 rounded-lg p-8 bg-alabaster/[0.03] reveal-child" style="margin-top: ${p.marginTop}; ${goldBorderStyle} transition-delay: ${(i * 0.1).toFixed(1)}s;">
      <div class="flex items-center gap-3 mb-6">
        <span class="font-serif text-3xl font-semibold text-alabaster/10">${p.num}</span>
        <span class="font-sans text-[9px] uppercase tracking-[0.2em] text-burnished-gold/60">${p.label}</span>
      </div>
      <h3 class="font-serif italic text-xl text-alabaster/90 mb-3 tracking-tight">${p.title}</h3>
      <div class="w-8 h-px bg-burnished-gold/30 mb-4"></div>
      <p class="font-sans text-xs text-alabaster/35 leading-relaxed mb-6">${p.desc}</p>
      <ul class="space-y-2">
        ${p.items.map(item => `
          <li class="flex items-center gap-2">
            <div class="w-1 h-1 rounded-full bg-burnished-gold/40"></div>
            <span class="font-sans text-[11px] text-alabaster/50">${item}</span>
          </li>
        `).join('')}
      </ul>
    </div>`;
  }).join('');
}

// ── JavaScript initialization ──
function _initJS() {
  if (!_container) return;

  // Filter button logic
  const filterBtns = _container.querySelectorAll('#features-filter-buttons .filter-btn');
  const grid = _container.querySelector('#features-tools-grid');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      _activeFilter = filter;

      // Update active state on buttons
      filterBtns.forEach(b => {
        b.classList.remove('active', 'text-obsidian');
        b.classList.add('text-soft-gray');
      });
      btn.classList.add('active', 'text-obsidian');
      btn.classList.remove('text-soft-gray');

      // Show/hide cards with animation
      if (!grid) return;
      const cards = grid.querySelectorAll('.tool-card');
      cards.forEach((card, idx) => {
        const category = card.dataset.category;
        const shouldShow = filter === 'all' || category === filter;

        if (shouldShow) {
          card.style.display = '';
          // Stagger the reveal animation
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, idx * 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  // Tool card click -> navigate to app
  const toolCards = _container.querySelectorAll('.tool-card');
  toolCards.forEach(card => {
    card.addEventListener('click', () => {
      navigate('/app');
    });
  });

  // CTA buttons
  const ctaAudit = _container.querySelector('.features-cta-audit');
  if (ctaAudit) {
    ctaAudit.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/');
    });
  }

  const ctaPricing = _container.querySelector('.features-cta-pricing');
  if (ctaPricing) {
    ctaPricing.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/pricing');
    });
  }

  // Hero particles
  _createHeroParticles();

  // Set initial transition styles for filter animation
  if (grid) {
    const cards = grid.querySelectorAll('.tool-card');
    cards.forEach(card => {
      card.style.transition = 'opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
    });
  }
}

// ── Hero particles ──
function _createHeroParticles() {
  const container = _container ? _container.querySelector('#hero-particles') : null;
  if (!container) return;

  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.classList.add('hero-particle');

    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 10;
    const isGold = Math.random() > 0.5;

    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}%;
      top: ${y}%;
      background: ${isGold ? 'rgba(184, 158, 95, 0.3)' : 'rgba(15, 15, 15, 0.08)'};
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;

    container.appendChild(particle);
  }
}
