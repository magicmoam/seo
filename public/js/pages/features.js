// features.js - Features page for Retune (dark neural aesthetic)
import { navigate } from '../router.js';

let _container = null;
let _filterInterval = null;
let _activeFilter = 'all';

// ── Tool card data ──
const tools = [
  { num: '01', title: 'Website Analyzer', category: 'analysis', desc: 'Full site audit with a 30-criteria scoring rubric across performance, SEO, content & technical dimensions.', credits: 1 },
  { num: '02', title: 'Keyword Research', category: 'research', desc: 'AI-powered keyword discovery with search volume, difficulty scoring, and intent analysis for precision targeting.', credits: 1 },
  { num: '03', title: 'SERP Analysis', category: 'analysis', desc: 'Search results page analysis with ranking factor breakdown, SERP feature detection, and opportunity scoring.', credits: 1 },
  { num: '04', title: 'Technical SEO', category: 'analysis', desc: 'Crawl and diagnose technical issues affecting search performance. Schema, crawlability, Core Web Vitals.', credits: 1 },
  { num: '05', title: 'GA4 Analytics', category: 'tracking', desc: 'Connect your GA4 property for traffic insights, engagement metrics, and performance trend analysis.', credits: 1 },
  { num: '06', title: 'Competitor Analysis', category: 'research', desc: 'Deep competitor intelligence with gap identification, strength mapping, and actionable strategy insights.', credits: 2 },
  { num: '07', title: 'Content Gap', category: 'research', desc: 'Find missing content opportunities that your competitors are ranking for. Uncover the topics you should own.', credits: 2 },
  { num: '08', title: 'Content Generation', category: 'generation', desc: 'AI-generated SEO-optimized content calendars, briefs, and editorial plans tailored to your domain.', credits: 2 },
  { num: '09', title: 'Topical Authority', category: 'research', desc: 'Map and build topical authority clusters. Establish domain expertise through strategic content architecture.', credits: 2 },
  { num: '10', title: 'Backlink Strategy', category: 'research', desc: 'Identify link building opportunities, analyze backlink profiles, and develop authority-building outreach strategies.', credits: 2 },
];

// ── Orchestrator phases ──
const phases = [
  { num: '01', label: 'PHASE 1', title: 'Foundation Analysis', desc: 'Parallel execution of core analysis tools to establish a comprehensive baseline.', items: ['Website Analyzer', 'Keyword Research', 'Competitor Analysis', 'Content Gap'] },
  { num: '02', label: 'PHASE 2', title: 'Deep Intelligence', desc: 'Secondary analysis layer building on Phase 1 findings for deeper strategic insights.', items: ['Topical Authority', 'Technical SEO', 'Backlink Strategy'] },
  { num: '03', label: 'PHASE 3', title: 'Content Planning', desc: 'Sequential content strategy generation informed by all prior analysis phases.', items: ['Content Calendar', 'Editorial Briefs', 'Topic Clusters'] },
  { num: '04', label: 'PHASE 4', title: 'Strategic Synthesis', desc: 'LLM-powered synthesis of all tool outputs into a unified, prioritized action plan.', items: ['Priority Roadmap', 'Quick Wins', 'Long-term Strategy'] },
];

// ── Filter categories ──
const filters = [
  { id: 'all', label: 'ALL' },
  { id: 'analysis', label: 'ANALYSIS' },
  { id: 'research', label: 'RESEARCH' },
  { id: 'generation', label: 'GENERATION' },
  { id: 'tracking', label: 'TRACKING' },
];

export function mount(container) {
  _container = container;
  _activeFilter = 'all';
  _container.innerHTML = _html();
  _bindFilters();
}

export function unmount() {
  if (_filterInterval) clearInterval(_filterInterval);
  _container = null;
}

// ── Full page HTML ──
function _html() {
  return `
<div style="background: var(--bg-deep); min-height: 100vh; color: var(--text-main);">

  <!-- ═══════ HERO ═══════ -->
  <section style="padding: var(--space-xl) var(--space-l); padding-top: 140px; text-align: center; max-width: 800px; margin: 0 auto;">
    <span class="label" style="color: var(--accent-olive); margin-bottom: var(--space-m); display: inline-block;">INTELLIGENCE PLATFORM</span>
    <h1 style="font-family: var(--font-display); font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 700; color: var(--text-main); line-height: 1.1; margin-bottom: var(--space-m);">
      10 AI-Powered SEO Tools
    </h1>
    <p style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--text-muted); max-width: 520px; margin: 0 auto; line-height: 1.7;">
      From keyword discovery to full-site audits, every tool is powered by live SERP data and LLM analysis.
    </p>
  </section>

  <!-- ═══════ FILTER BAR ═══════ -->
  <section style="max-width: 1100px; margin: 0 auto; padding: 0 var(--space-l) var(--space-l);">
    <div id="features-filter-buttons" style="display: flex; flex-wrap: wrap; gap: var(--space-xs);">
      ${filters.map(f => {
        const isActive = f.id === _activeFilter;
        return `<button class="filter-btn" data-filter="${f.id}" style="
          font-family: var(--font-mono);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: var(--space-xs) var(--space-s);
          border: 1px solid ${isActive ? 'var(--accent-olive)' : 'var(--border-subtle)'};
          border-radius: var(--radius);
          background: ${isActive ? 'var(--accent-olive-dim)' : 'transparent'};
          color: ${isActive ? 'var(--accent-olive)' : 'var(--text-muted)'};
          cursor: pointer;
          transition: all var(--transition);
        ">${f.label}</button>`;
      }).join('')}
    </div>
  </section>

  <!-- ═══════ TOOL CARDS GRID ═══════ -->
  <section style="max-width: 1100px; margin: 0 auto; padding: 0 var(--space-l) var(--space-xl);">
    <div id="features-tools-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-s);">
      ${_toolCards()}
    </div>
  </section>

  <!-- ═══════ ORCHESTRATOR ═══════ -->
  <section style="max-width: 1100px; margin: 0 auto; padding: var(--space-xl) var(--space-l);">
    <div class="panel" style="padding: var(--space-l);">
      <span class="label" style="color: var(--accent-cyan); margin-bottom: var(--space-m); display: inline-block;">STRATEGY ORCHESTRATOR</span>
      <h2 style="font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 700; color: var(--text-main); margin-bottom: var(--space-xs);">
        Runs all 10 tools in 4 coordinated phases
      </h2>
      <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); margin-bottom: var(--space-l); max-width: 600px;">
        One command triggers the full pipeline. Each phase feeds the next, building a comprehensive strategy from raw data to actionable roadmap.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-s);">
        ${phases.map(p => `
          <div class="card" style="padding: var(--space-m);">
            <div style="display: flex; align-items: center; gap: var(--space-xs); margin-bottom: var(--space-s);">
              <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-olive); text-transform: uppercase; letter-spacing: 0.08em;">${p.label}</span>
            </div>
            <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin-bottom: var(--space-xs);">${p.title}</h3>
            <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6; margin-bottom: var(--space-s);">${p.desc}</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${p.items.map(item => `
                <li style="display: flex; align-items: center; gap: var(--space-xs); padding: 4px 0;">
                  <span style="width: 4px; height: 4px; border-radius: 50%; background: var(--accent-olive); opacity: 0.5; flex-shrink: 0;"></span>
                  <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${item}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: var(--space-l); padding-top: var(--space-s); border-top: 1px solid var(--border-subtle); display: flex; align-items: center; gap: var(--space-xs);">
        <span class="badge badge-medium">10 CREDITS</span>
        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-dim);">Full orchestration run</span>
      </div>
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

// ── Tool cards HTML ──
function _toolCards() {
  return tools.map(t => `
    <div class="card tool-card" data-category="${t.category}" style="padding: var(--space-m); cursor: pointer; transition: all var(--transition);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-s);">
        <span class="label" style="color: var(--text-dim);">TOOL_${t.num}</span>
        <span class="badge badge-medium">${t.credits} CR</span>
      </div>
      <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; color: var(--text-main); margin-bottom: var(--space-xs);">${t.title}</h3>
      <p style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6; margin-bottom: var(--space-m);">${t.desc}</p>
      <button class="btn-ghost" style="width: 100%; justify-content: center;" onclick="event.stopPropagation();">Run Tool</button>
    </div>
  `).join('');
}

// ── Filter binding ──
function _bindFilters() {
  if (!_container) return;

  const filterBtns = _container.querySelectorAll('#features-filter-buttons .filter-btn');
  const grid = _container.querySelector('#features-tools-grid');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      _activeFilter = filter;

      // Update active state on buttons
      filterBtns.forEach(b => {
        b.style.border = '1px solid var(--border-subtle)';
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
      });
      btn.style.border = '1px solid var(--accent-olive)';
      btn.style.background = 'var(--accent-olive-dim)';
      btn.style.color = 'var(--accent-olive)';

      // Show/hide cards
      if (!grid) return;
      const cards = grid.querySelectorAll('.tool-card');
      cards.forEach((card, idx) => {
        const category = card.dataset.category;
        const shouldShow = filter === 'all' || category === filter;
        if (shouldShow) {
          card.style.display = '';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, idx * 40);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(12px)';
          setTimeout(() => { card.style.display = 'none'; }, 250);
        }
      });
    });
  });

  // Tool card click -> navigate to app
  const toolCards = _container.querySelectorAll('.tool-card');
  toolCards.forEach(card => {
    card.addEventListener('click', () => { navigate('/app'); });
  });

  // Set transition on cards for filter animation
  if (grid) {
    const cards = grid.querySelectorAll('.tool-card');
    cards.forEach(card => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    });
  }
}
