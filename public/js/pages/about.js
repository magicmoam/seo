// about.js - About page for trySEO.ai (editorial design)
import { navigate } from '../router.js';

let _container = null;
let _particleEls = [];
let _particleAnimFrameId = null;

export function mount(container) {
  _container = container;
  _container.innerHTML = _html();
  _initParticles();
}

export function unmount() {
  if (_particleAnimFrameId) {
    cancelAnimationFrame(_particleAnimFrameId);
    _particleAnimFrameId = null;
  }
  _particleEls = [];
  _container = null;
}

/* ── Hero Particles ── */
function _initParticles() {
  const heroEl = _container.querySelector('#about-hero');
  if (!heroEl) return;

  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'hero-particle';
    const size = 1 + Math.random() * 3;
    const x = Math.random() * 100;
    const dur = 8 + Math.random() * 14;
    const delay = Math.random() * dur;
    const opacity = 0.15 + Math.random() * 0.35;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}%;
      bottom: -10px;
      background: ${Math.random() > 0.5 ? 'rgba(184,158,95,' + opacity + ')' : 'rgba(15,15,15,' + (opacity * 0.5) + ')'};
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;
    `;
    heroEl.appendChild(p);
    _particleEls.push(p);
  }
}

/* ── HTML ── */
function _html() {
  return `
  <div class="relative">

    <!-- Side Indicator -->
    <div class="fixed left-6 md:left-10 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-3 transition-opacity duration-500">
      <div class="w-px h-12 bg-gradient-to-b from-transparent via-obsidian/20 to-transparent"></div>
      <span class="side-indicator font-sans text-[9px] uppercase tracking-[0.25em] text-soft-gray">About trySEO.ai</span>
      <div class="w-px h-12 bg-gradient-to-b from-transparent via-obsidian/20 to-transparent"></div>
    </div>

    <!-- ═══════════════════════════════════════
         HERO
         ═══════════════════════════════════════ -->
    <section id="about-hero" class="relative min-h-screen flex items-center justify-center overflow-hidden">

      <!-- Background art -->
      <div class="hero-bg-art">
        <!-- Animated gradient shapes -->
        <div data-parallax data-speed="0.015" class="absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full opacity-60"
             style="background: radial-gradient(circle, rgba(184,158,95,0.07) 0%, transparent 70%); animation: breathe 15s ease-in-out infinite;"></div>
        <div data-parallax data-speed="0.025" class="absolute bottom-[15%] right-[10%] w-[400px] h-[400px] rounded-full opacity-50"
             style="background: radial-gradient(circle, rgba(15,15,15,0.04) 0%, transparent 70%); animation: breathe 12s ease-in-out infinite 3s;"></div>
        <div data-parallax data-speed="0.02" class="absolute top-[40%] right-[25%] w-[300px] h-[300px] rounded-full opacity-40"
             style="background: radial-gradient(circle, rgba(184,158,95,0.05) 0%, transparent 70%); animation: breathe 18s ease-in-out infinite 6s;"></div>
      </div>

      <!-- Hero content -->
      <div class="relative z-10 max-w-5xl mx-auto px-6 md:px-12 text-center">

        <!-- Badge -->
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-obsidian/10 bg-white/30 backdrop-blur-sm animate-in" style="animation-delay: 0.3s;">
          <span class="w-1.5 h-1.5 rounded-full bg-burnished-gold animate-pulse"></span>
          <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray">The Story</span>
        </div>

        <!-- Title -->
        <h1 class="mt-10 md:mt-14 font-serif text-5xl md:text-7xl lg:text-[110px] leading-[0.92] tracking-tighter text-obsidian animate-in" style="animation-delay: 0.6s;">
          SEO shouldn't<br>require <span class="font-display italic text-burnished-gold">guesswork.</span>
        </h1>

        <!-- Subtitle -->
        <p class="mt-8 md:mt-10 font-display italic text-xl md:text-2xl text-obsidian/50 max-w-xl mx-auto leading-relaxed animate-in" style="animation-delay: 0.9s;">
          We built trySEO.ai to replace intuition with intelligence, and complexity with clarity.
        </p>

        <!-- Line grow -->
        <div class="flex justify-center mt-12">
          <div class="w-px bg-gradient-to-b from-obsidian/30 to-transparent line-grow"></div>
        </div>

        <!-- Scroll indicator -->
        <div class="mt-8 animate-in" style="animation-delay: 1.4s;">
          <span class="font-sans text-[9px] uppercase tracking-[0.3em] text-soft-gray">Scroll to explore</span>
          <div class="mt-3 mx-auto w-5 h-8 rounded-full border border-obsidian/15 flex items-start justify-center pt-1.5">
            <div class="w-1 h-1.5 rounded-full bg-obsidian/30 animate-bounce"></div>
          </div>
        </div>
      </div>
    </section>


    <!-- ═══════════════════════════════════════
         01 / OUR MISSION
         ═══════════════════════════════════════ -->
    <section class="relative py-32 md:py-44 px-6 md:px-12 lg:px-20">
      <div class="max-w-7xl mx-auto">

        <!-- Section label -->
        <div class="mb-16 md:mb-24 reveal">
          <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-soft-gray">01 / Our Mission</span>
          <div class="mt-3 w-12 h-px bg-burnished-gold/40"></div>
        </div>

        <!-- Two-column editorial -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">

          <!-- Left: Abstract visual -->
          <div class="reveal" style="transition-delay: 0.1s;">
            <div class="parallax-wrap">
              <div data-parallax data-speed="0.02" class="parallax-visual relative aspect-[4/5] rounded-sm overflow-hidden abstract-panel-1">
                <!-- Concentric circles -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-[60%] aspect-square rounded-full border border-burnished-gold/10"></div>
                  <div class="absolute w-[42%] aspect-square rounded-full border border-burnished-gold/[0.07]"></div>
                  <div class="absolute w-[24%] aspect-square rounded-full border border-burnished-gold/[0.05]"></div>
                  <div class="absolute w-2 h-2 rounded-full bg-burnished-gold/20"></div>
                </div>
                <!-- Radiating lines -->
                <div class="absolute top-[20%] left-[10%] w-[30%] h-px bg-gradient-to-r from-burnished-gold/15 to-transparent"></div>
                <div class="absolute top-[45%] right-[5%] w-[25%] h-px bg-gradient-to-l from-burnished-gold/10 to-transparent"></div>
                <div class="absolute bottom-[30%] left-[15%] w-[20%] h-px bg-gradient-to-r from-burnished-gold/10 to-transparent"></div>
                <!-- Label -->
                <div class="absolute bottom-6 left-6 right-6">
                  <span class="font-sans text-[9px] uppercase tracking-[0.25em] text-soft-gray">Intelligence at the core</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Text content -->
          <div class="reveal" style="transition-delay: 0.2s;">
            <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-burnished-gold">Our Mission</span>
            <h2 class="mt-4 font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight text-obsidian">
              Democratizing<br>SEO intelligence
            </h2>

            <div class="mt-8 space-y-5">
              <p class="font-sans text-base text-obsidian/60 leading-[1.8]">
                Enterprise SEO tools charge thousands per month and bury actionable data under layers of dashboards. Small teams and independent creators deserve the same caliber of insight without the enterprise price tag.
              </p>
              <p class="font-sans text-base text-obsidian/60 leading-[1.8]">
                trySEO.ai uses live web data from Jina AI and large language model analysis to surface the recommendations that actually move rankings. Every result includes an evidence chain showing the raw data, prompts, and reasoning behind it. No black boxes.
              </p>
            </div>

            <!-- Pull quote -->
            <div class="mt-10 pl-6 border-l-2 border-burnished-gold/30">
              <p class="pull-quote font-display italic text-xl md:text-2xl text-obsidian/70 leading-relaxed">
                What used to require agencies and months, our AI delivers in seconds.
              </p>
            </div>

            <!-- Stats -->
            <div class="mt-12 grid grid-cols-3 gap-6">
              <div class="reveal" style="transition-delay: 0.3s;">
                <div class="font-serif text-3xl md:text-4xl text-obsidian tracking-tight">10</div>
                <div class="mt-1 font-sans text-[11px] text-soft-gray leading-snug">Specialized<br>tools</div>
              </div>
              <div class="reveal" style="transition-delay: 0.4s;">
                <div class="font-serif text-3xl md:text-4xl text-obsidian tracking-tight">30</div>
                <div class="mt-1 font-sans text-[11px] text-soft-gray leading-snug">Scoring<br>criteria</div>
              </div>
              <div class="reveal" style="transition-delay: 0.5s;">
                <div class="font-serif text-3xl md:text-4xl text-burnished-gold tracking-tight">&lt;60<span class="text-lg">s</span></div>
                <div class="mt-1 font-sans text-[11px] text-soft-gray leading-snug">Full<br>strategy</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>


    <!-- ═══════════════════════════════════════
         02 / HOW IT WORKS (dark section)
         ═══════════════════════════════════════ -->
    <section id="how-it-works" class="relative bg-obsidian py-32 md:py-44 px-6 md:px-12 lg:px-20 overflow-hidden" data-dark-section>
      <div class="max-w-7xl mx-auto">

        <!-- Section label -->
        <div class="mb-16 md:mb-24 reveal">
          <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-alabaster/30">02 / The Process</span>
          <div class="mt-3 w-12 h-px bg-burnished-gold/30"></div>
        </div>

        <div class="mb-16 reveal">
          <h2 class="font-serif text-4xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tighter text-alabaster">
            Three steps<br>to <span class="font-display italic text-burnished-gold">clarity.</span>
          </h2>
        </div>

        <!-- Horizontal scroll phase cards -->
        <div class="relative">
          <div class="flex gap-6 md:gap-8 overflow-x-auto horizontal-scroll pb-6 -mx-6 px-6 md:-mx-0 md:px-0">

            <!-- Phase 1 -->
            <div class="flex-shrink-0 w-[320px] md:w-[360px] phase-card grayscale-hover rounded-sm border border-alabaster/10 bg-alabaster/[0.03] overflow-hidden" style="margin-top: 0;">
              <!-- Visual -->
              <div class="relative aspect-[3/2] phase-gradient-1 flex items-center justify-center overflow-hidden">
                <!-- URL input visual -->
                <div class="relative w-[70%]">
                  <div class="rounded-full border border-alabaster/15 bg-alabaster/[0.05] px-4 py-3 flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-burnished-gold/40"></div>
                    <span class="font-sans text-[11px] text-alabaster/30 tracking-wide">yoursite.com</span>
                    <div class="ml-auto">
                      <svg class="w-3.5 h-3.5 text-alabaster/25" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </div>
                  </div>
                </div>
                <!-- Number overlay -->
                <div class="absolute top-4 right-5 font-serif text-6xl text-alabaster/[0.06] leading-none">01</div>
              </div>
              <!-- Text content -->
              <div class="p-6">
                <span class="font-sans text-[9px] uppercase tracking-[0.25em] text-burnished-gold/60">Begin</span>
                <h3 class="mt-2 font-serif text-xl text-alabaster tracking-tight">Enter your URL</h3>
                <p class="mt-3 font-sans text-[13px] text-alabaster/40 leading-relaxed">
                  Paste any website URL. Our agent classifies your intent and selects the right combination of tools automatically.
                </p>
              </div>
            </div>

            <!-- Phase 2 -->
            <div class="flex-shrink-0 w-[320px] md:w-[360px] phase-card grayscale-hover rounded-sm border border-alabaster/10 bg-alabaster/[0.03] overflow-hidden" style="margin-top: 48px;">
              <!-- Visual -->
              <div class="relative aspect-[3/2] phase-gradient-2 flex items-center justify-center overflow-hidden">
                <!-- Concentric circles / orbital dots -->
                <div class="relative w-[140px] h-[140px]">
                  <div class="absolute inset-0 rounded-full border border-alabaster/10"></div>
                  <div class="absolute inset-[18%] rounded-full border border-alabaster/[0.07]"></div>
                  <div class="absolute inset-[38%] rounded-full border border-burnished-gold/15"></div>
                  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-burnished-gold/30"></div>
                  <!-- Orbital dots -->
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-alabaster/30"></div>
                  <div class="absolute bottom-[18%] right-0 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-burnished-gold/40"></div>
                  <div class="absolute top-[38%] left-0 -translate-x-1/2 w-1 h-1 rounded-full bg-alabaster/20"></div>
                </div>
                <!-- Number overlay -->
                <div class="absolute top-4 right-5 font-serif text-6xl text-alabaster/[0.06] leading-none">02</div>
              </div>
              <!-- Text content -->
              <div class="p-6">
                <span class="font-sans text-[9px] uppercase tracking-[0.25em] text-burnished-gold/60">Analyze</span>
                <h3 class="mt-2 font-serif text-xl text-alabaster tracking-tight">AI analyzes everything</h3>
                <p class="mt-3 font-sans text-[13px] text-alabaster/40 leading-relaxed">
                  Live web scraping via Jina AI feeds real-time data to LLM analysis. 30 criteria scored across performance, SEO, content, and technical health.
                </p>
              </div>
            </div>

            <!-- Phase 3 (gold accent) -->
            <div class="flex-shrink-0 w-[320px] md:w-[360px] phase-card grayscale-hover rounded-sm border border-burnished-gold/25 bg-burnished-gold/[0.04] overflow-hidden" style="margin-top: 16px;">
              <!-- Visual -->
              <div class="relative aspect-[3/2] phase-gradient-3 flex items-end justify-center overflow-hidden pb-6">
                <!-- Bar chart visual -->
                <div class="flex items-end gap-3 h-[60%]">
                  <div class="w-8 rounded-t-sm bg-burnished-gold/25" style="height: 92%;"></div>
                  <div class="w-8 rounded-t-sm bg-alabaster/10" style="height: 78%;"></div>
                  <div class="w-8 rounded-t-sm bg-burnished-gold/20" style="height: 85%;"></div>
                  <div class="w-8 rounded-t-sm bg-alabaster/[0.07]" style="height: 71%;"></div>
                </div>
                <!-- Score labels -->
                <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                  <span class="font-sans text-[8px] text-burnished-gold/40 w-8 text-center">92</span>
                  <span class="font-sans text-[8px] text-alabaster/20 w-8 text-center">78</span>
                  <span class="font-sans text-[8px] text-burnished-gold/35 w-8 text-center">85</span>
                  <span class="font-sans text-[8px] text-alabaster/15 w-8 text-center">71</span>
                </div>
                <!-- Number overlay -->
                <div class="absolute top-4 right-5 font-serif text-6xl text-alabaster/[0.06] leading-none">03</div>
              </div>
              <!-- Text content -->
              <div class="p-6">
                <span class="font-sans text-[9px] uppercase tracking-[0.25em] text-burnished-gold/60">Deliver</span>
                <h3 class="mt-2 font-serif text-xl text-alabaster tracking-tight">Get actionable strategy</h3>
                <p class="mt-3 font-sans text-[13px] text-alabaster/40 leading-relaxed">
                  Prioritized roadmap sorted by potential point gain. Every recommendation links back to the evidence that produced it.
                </p>
                <!-- Output footer -->
                <div class="mt-4 pt-4 border-t border-burnished-gold/10">
                  <span class="font-sans text-[9px] uppercase tracking-[0.2em] text-burnished-gold/50">Output: Complete SEO Roadmap</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Scroll hint (mobile) -->
          <div class="mt-4 text-center md:text-left">
            <span class="font-sans text-[10px] text-alabaster/20 tracking-widest uppercase">Scroll horizontally &rarr;</span>
          </div>
        </div>

        <!-- Bottom note -->
        <div class="mt-16 reveal">
          <div class="flex items-center gap-3">
            <div class="w-8 h-px bg-burnished-gold/20"></div>
            <span class="font-sans text-[11px] text-alabaster/25 italic">Parallel execution where possible &mdash; Sequential where necessary</span>
          </div>
        </div>
      </div>
    </section>


    <!-- ═══════════════════════════════════════
         03 / TECHNOLOGY
         ═══════════════════════════════════════ -->
    <section class="relative py-32 md:py-44 px-6 md:px-12 lg:px-20">
      <div class="max-w-7xl mx-auto">

        <!-- Section label -->
        <div class="mb-16 md:mb-24 reveal">
          <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-soft-gray">03 / Built with Precision</span>
          <div class="mt-3 w-12 h-px bg-burnished-gold/40"></div>
        </div>

        <!-- Two-column editorial (reversed) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">

          <!-- Left: Text content (md:order-1) -->
          <div class="md:order-1 reveal" style="transition-delay: 0.1s;">
            <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-burnished-gold">Built with Precision</span>
            <h2 class="mt-4 font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight text-obsidian">
              The technology<br>behind the<br>intelligence
            </h2>

            <p class="mt-8 font-sans text-base text-obsidian/60 leading-[1.8]">
              Every layer of our stack is chosen for a reason. From real-time web intelligence to deterministic scoring, trySEO.ai is engineered for accuracy and transparency.
            </p>

            <!-- Tech items -->
            <div class="mt-10 space-y-8">
              <div class="tech-item pl-6 reveal" style="transition-delay: 0.2s;">
                <div class="flex items-baseline gap-3">
                  <span class="font-serif text-lg text-burnished-gold/60">01</span>
                  <h4 class="font-sans text-sm font-medium text-obsidian">AI-Powered Analysis</h4>
                </div>
                <p class="mt-1.5 font-sans text-[13px] text-obsidian/45 leading-relaxed pl-8">
                  LLM reasoning applied to real web data, not cached indexes. Every insight is generated fresh from live sources.
                </p>
              </div>

              <div class="tech-item pl-6 reveal" style="transition-delay: 0.3s;">
                <div class="flex items-baseline gap-3">
                  <span class="font-serif text-lg text-burnished-gold/60">02</span>
                  <h4 class="font-sans text-sm font-medium text-obsidian">Real-Time Web Intelligence</h4>
                </div>
                <p class="mt-1.5 font-sans text-[13px] text-obsidian/45 leading-relaxed pl-8">
                  Jina AI provides live search and scraping, so analysis reflects the web as it is right now, not weeks ago.
                </p>
              </div>

              <div class="tech-item pl-6 reveal" style="transition-delay: 0.4s;">
                <div class="flex items-baseline gap-3">
                  <span class="font-serif text-lg text-burnished-gold/60">03</span>
                  <h4 class="font-sans text-sm font-medium text-obsidian">30-Criteria Scoring Rubric</h4>
                </div>
                <p class="mt-1.5 font-sans text-[13px] text-obsidian/45 leading-relaxed pl-8">
                  Scores are computed deterministically using weighted averages across four categories. The LLM evaluates; the math is fixed.
                </p>
              </div>

              <div class="tech-item pl-6 reveal" style="transition-delay: 0.5s;">
                <div class="flex items-baseline gap-3">
                  <span class="font-serif text-lg text-burnished-gold/60">04</span>
                  <h4 class="font-sans text-sm font-medium text-obsidian">Evidence-Backed Recommendations</h4>
                </div>
                <p class="mt-1.5 font-sans text-[13px] text-obsidian/45 leading-relaxed pl-8">
                  Full data traces from raw scrape to final insight. See the prompts, sources, and reasoning behind every recommendation.
                </p>
              </div>
            </div>
          </div>

          <!-- Right: Architecture visual (md:order-2) -->
          <div class="md:order-2 reveal" style="transition-delay: 0.2s;">
            <div class="parallax-wrap">
              <div data-parallax data-speed="0.02" class="parallax-visual relative aspect-[4/5] rounded-sm overflow-hidden abstract-panel-2">
                <!-- Architecture flow nodes -->
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">

                  <!-- Query -->
                  <div class="flex items-center gap-3 w-full max-w-[200px]">
                    <div class="w-3 h-3 rounded-full border border-obsidian/15 flex items-center justify-center">
                      <div class="w-1 h-1 rounded-full bg-obsidian/20"></div>
                    </div>
                    <div class="flex-1 h-px bg-obsidian/10"></div>
                    <span class="font-sans text-[10px] text-obsidian/40 tracking-wider uppercase">Query</span>
                  </div>

                  <!-- Connector -->
                  <div class="w-px h-4 bg-gradient-to-b from-obsidian/10 to-burnished-gold/15"></div>

                  <!-- Agent -->
                  <div class="flex items-center gap-3 w-full max-w-[200px]">
                    <div class="w-3 h-3 rounded-full border border-burnished-gold/20 flex items-center justify-center">
                      <div class="w-1 h-1 rounded-full bg-burnished-gold/30"></div>
                    </div>
                    <div class="flex-1 h-px bg-burnished-gold/10"></div>
                    <span class="font-sans text-[10px] text-burnished-gold/50 tracking-wider uppercase">Agent</span>
                  </div>

                  <!-- Connector -->
                  <div class="w-px h-4 bg-gradient-to-b from-burnished-gold/15 to-obsidian/10"></div>

                  <!-- Jina AI -->
                  <div class="flex items-center gap-3 w-full max-w-[200px]">
                    <div class="w-3 h-3 rounded-full border border-obsidian/15 flex items-center justify-center">
                      <div class="w-1 h-1 rounded-full bg-obsidian/20"></div>
                    </div>
                    <div class="flex-1 h-px bg-obsidian/10"></div>
                    <span class="font-sans text-[10px] text-obsidian/40 tracking-wider uppercase">Jina AI</span>
                  </div>

                  <!-- Connector -->
                  <div class="w-px h-4 bg-gradient-to-b from-obsidian/10 to-burnished-gold/15"></div>

                  <!-- LLM -->
                  <div class="flex items-center gap-3 w-full max-w-[200px]">
                    <div class="w-3 h-3 rounded-full border border-burnished-gold/20 flex items-center justify-center">
                      <div class="w-1 h-1 rounded-full bg-burnished-gold/30"></div>
                    </div>
                    <div class="flex-1 h-px bg-burnished-gold/10"></div>
                    <span class="font-sans text-[10px] text-burnished-gold/50 tracking-wider uppercase">LLM</span>
                  </div>

                  <!-- Connector -->
                  <div class="w-px h-4 bg-gradient-to-b from-burnished-gold/15 to-burnished-gold/25"></div>

                  <!-- Insight -->
                  <div class="flex items-center gap-3 w-full max-w-[200px]">
                    <div class="w-3 h-3 rounded-full border border-burnished-gold/30 flex items-center justify-center">
                      <div class="w-1.5 h-1.5 rounded-full bg-burnished-gold/40"></div>
                    </div>
                    <div class="flex-1 h-px bg-burnished-gold/15"></div>
                    <span class="font-sans text-[10px] text-burnished-gold/60 tracking-wider uppercase font-medium">Insight</span>
                  </div>
                </div>

                <!-- Label -->
                <div class="absolute bottom-6 left-6 right-6">
                  <span class="font-sans text-[9px] uppercase tracking-[0.25em] text-soft-gray">Architecture flow</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>


    <!-- ═══════════════════════════════════════
         VALUES / PRINCIPLES
         ═══════════════════════════════════════ -->
    <section class="relative py-32 md:py-44 px-6 md:px-12 lg:px-20">
      <div class="max-w-4xl mx-auto text-center">

        <div class="reveal">
          <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-burnished-gold">Our Principles</span>
          <h2 class="mt-6 font-serif text-4xl md:text-6xl leading-[0.95] tracking-tighter text-obsidian">
            Guided by three<br><span class="font-display italic">convictions.</span>
          </h2>
        </div>

        <!-- Gold divider -->
        <div class="flex justify-center mt-10 mb-16">
          <div class="gold-divider-grow h-px bg-burnished-gold/40"></div>
        </div>

        <!-- Principle cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 reveal-stagger">

          <!-- I. Evidence over opinion -->
          <div class="principle-card text-left p-8 rounded-sm border border-obsidian/[0.06] bg-white/30 reveal-child">
            <span class="font-serif text-3xl text-obsidian/10">I.</span>
            <h3 class="mt-4 font-serif text-xl text-obsidian tracking-tight">Evidence over opinion</h3>
            <p class="mt-3 font-sans text-[13px] text-obsidian/45 leading-relaxed">
              Every recommendation is backed by real web data. Full evidence traces from raw scrape to final insight, so you can verify every claim.
            </p>
          </div>

          <!-- II. Clarity over complexity -->
          <div class="principle-card text-left p-8 rounded-sm border border-obsidian/[0.06] bg-white/30 reveal-child">
            <span class="font-serif text-3xl text-obsidian/10">II.</span>
            <h3 class="mt-4 font-serif text-xl text-obsidian tracking-tight">Clarity over complexity</h3>
            <p class="mt-3 font-sans text-[13px] text-obsidian/45 leading-relaxed">
              Complex analysis, simple output. We distill 30 scoring criteria and multi-tool analysis into clear, actionable language.
            </p>
          </div>

          <!-- III. Action over analysis -->
          <div class="principle-card text-left p-8 rounded-sm border border-obsidian/[0.06] bg-white/30 reveal-child">
            <span class="font-serif text-3xl text-obsidian/10">III.</span>
            <h3 class="mt-4 font-serif text-xl text-obsidian tracking-tight">Action over analysis</h3>
            <p class="mt-3 font-sans text-[13px] text-obsidian/45 leading-relaxed">
              Prioritized roadmaps sorted by impact. You get a path to 80+ with the exact steps ranked by potential point gain.
            </p>
          </div>
        </div>
      </div>
    </section>


    <!-- ═══════════════════════════════════════
         BOTTOM CTA
         ═══════════════════════════════════════ -->
    <section class="relative py-32 md:py-44 px-6 md:px-12 lg:px-20">
      <div class="max-w-3xl mx-auto text-center reveal">
        <h2 class="font-serif text-4xl md:text-6xl leading-[0.95] tracking-tighter text-obsidian">
          See it for <span class="font-display italic text-burnished-gold">yourself.</span>
        </h2>
        <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#/" class="inline-flex items-center gap-3 px-8 py-4 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.25em] font-sans hover:bg-obsidian/85 transition-colors group" data-nav-link>
            Start Free Audit
            <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
          </a>
          <a href="#/features" class="inline-flex items-center gap-3 px-8 py-4 border border-obsidian/15 text-obsidian rounded-full text-[10px] uppercase tracking-[0.25em] font-sans hover:border-obsidian/40 transition-colors group" data-nav-link>
            View Features
            <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
          </a>
        </div>
      </div>
    </section>


    <!-- ═══════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════ -->
    <footer class="border-t border-obsidian/[0.06] py-12 px-6 md:px-12 lg:px-20">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="flex items-center gap-3">
          <span class="w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></span>
          <span class="font-sans text-[10px] uppercase tracking-widest text-soft-gray">AI Engine Online</span>
        </div>
        <nav class="flex items-center gap-8">
          <a href="#/" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Home</a>
          <a href="#/features" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Features</a>
          <a href="#/pricing" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Pricing</a>
          <a href="#/about" class="font-sans text-[11px] text-burnished-gold transition-colors">About</a>
        </nav>
        <span class="font-sans text-[10px] text-soft-gray/50">&copy; ${new Date().getFullYear()} trySEO.ai</span>
      </div>
    </footer>

  </div>`;
}
