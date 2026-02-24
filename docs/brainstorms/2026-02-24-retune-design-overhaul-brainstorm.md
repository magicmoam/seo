---
title: "Retune Design Overhaul"
topic: design-overhaul-rebrand
date: 2026-02-24
status: complete
---

# Retune Design Overhaul — Brainstorm

## What We're Building

A total visual rebrand of trySEO.ai to **Retune** with a new dark "neural intelligence" design language. The underlying SEO product (10 tools, credits, billing, admin) stays identical — this is a pure frontend design overhaul + brand rename.

### Scope

- **All pages**: landing, features, pricing, about, app dashboard, account, admin
- **Full rebrand**: trySEO.ai → Retune (logo, copy, meta tags, everything)
- **New design system**: dark neural aesthetic replacing the current light Alabaster theme
- **No light/dark split**: everything is dark theme
- **Desktop-first with responsive breakpoints**
- **Zero-build**: stay with vanilla ES modules + Tailwind CDN, no bundler

### Design Reference

4 HTML mockups in `new design/` folder define the visual language:

| Mockup File | Page Type | Key Elements |
|---|---|---|
| `home_page_design-38ae136f.html` | Landing page | Shard grid hero, wave grid viz, tech grid with orbital nodes, "Brain Tattoos" reveal |
| `Product_design-c328b003.html` | Analysis dashboard | 2x2 insight cards, retention stats sidebar, linkage map with animated nodes |
| `design-6e9bd743.html` | Insight deep-dive | 3-column: excerpts + knowledge graph + spaced repetition |
| `design-f5a1ca79.html` | Archive/history | Monospace table, filter tabs, score bars |

### New Design System

**Colors:**
| Token | Value | Usage |
|---|---|---|
| `--bg-deep` | `#030808` | Page background |
| `--bg-panel` | `#061111` | Card/panel background |
| `--bg-panel-light` | `#0B1A1A` | Elevated panel background |
| `--text-main` | `#EAECE8` | Primary text |
| `--text-muted` | `#5C6B69` | Secondary/label text |
| `--text-dim` | `#2A3836` | Tertiary/decorative text |
| `--accent-olive` | `#9CAA7E` | Primary accent (CTAs, highlights) |
| `--accent-orange` | `#C44D30` | Warning/emphasis accent |
| `--accent-cyan` | `#00D1E6` | Active/interactive accent |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Borders, dividers |

**Typography:**
| Font | Role |
|---|---|
| Helvetica Neue (Arial fallback) | Display/body text |
| Courier New | Monospace labels, data, status text |

**UI Patterns:**
- Bracket notation labels: `[LABEL_TEXT]` (monospace, uppercase, olive accent)
- Grid overlay frame (3-column, pointer-events: none)
- Scan line animation across viewport
- Monospace status footers with system info
- Glass-style nav with backdrop blur on dark bg
- Animated node graphs with floating/pulsing nodes
- Score bars with colored fills
- Action buttons: monospace, bordered, hover-fill transition

### Mockup → Current Page Mapping

| Mockup | Current Page(s) | Adaptation Notes |
|---|---|---|
| Landing | `landing.js` + static `features/`, `pricing/`, `about/` shells | Replace Three.js hero with shard grid + wave grid |
| Dashboard | `app.js` results view | Show tool results as insight cards + stats sidebar |
| Deep-dive | New detail view within app | Drill into specific tool results |
| Archive | History panel in app | Search history as monospace table |
| *(no mockup)* | `features.js` | Extrapolate: dark cards with tool descriptions |
| *(no mockup)* | `pricing.js` | Extrapolate: dark tier cards with olive/cyan accents |
| *(no mockup)* | `about.js` | Extrapolate: dark sections with system-status feel |
| *(no mockup)* | `account.js` | Extrapolate: dark stats cards, usage meters |
| *(no mockup)* | `admin.js` | Extrapolate: dark data tables like archive |

## Why This Approach

**Big Bang** — Build complete design system first, then rewrite all pages in parallel using Claude agents, ship everything at once.

Rationale:
- Can't ship a half-rebranded product (trySEO.ai pages mixed with Retune pages)
- Parallel agent implementation is fast — 4 agents rewriting pages simultaneously
- Design system foundation ensures consistency across all pages
- Single deployment flips the entire brand

## Key Decisions

1. **Rebrand to Retune** — New name, new identity, full brand switch
2. **Same SEO product underneath** — All 10 tools, credits, billing, admin unchanged
3. **All-dark theme** — No more light/dark split. Everything uses the dark neural aesthetic
4. **Zero-build stays** — Vanilla ES modules + Tailwind CDN, no bundler
5. **Desktop-first responsive** — Match mockups for desktop, add breakpoints for tablet/mobile
6. **Big Bang implementation** — Design system → parallel page rewrites → ship
7. **Agents assist development** — Claude agents implement pages in parallel, final output is standard HTML/CSS/JS
8. **Replace Three.js hero** — Swap TorusKnot scene with shard grid assembly + wave grid from mockups (pure CSS/JS, no WebGL dependency)

## Implementation Phases

### Phase 1: Design System Foundation
- Define all CSS custom properties in `:root` (colors, spacing, fonts)
- Build base component classes (`.card`, `.label`, `.btn-action`, `.score-bar`, `.data-table`, etc.)
- Implement shared animations (shard grid, wave grid, node graph, scan line)
- Update `index.html` shell (remove Alabaster refs, add new fonts, update meta)
- Rewrite `nav.js` (single dark nav, remove dual-mode logic)
- Update `cursor.js` for dark theme
- Rewrite `main.css` as the design system source of truth

### Phase 2: Parallel Page Rewrites
- **Agent 1**: `landing.js` — Hero with shard grid, wave visualization, marketing sections
- **Agent 2**: `app.js` + all 11 renderers — Dashboard, results as insight cards, history as archive table
- **Agent 3**: `features.js` + `pricing.js` + `about.js` — Extrapolate dark design for marketing pages
- **Agent 4**: `account.js` + `admin.js` — Dark stats cards, data tables

### Phase 3: Integration & Polish
- Cross-page consistency review
- Update all 3 static marketing HTML shells (`features/index.html`, `pricing/index.html`, `about/index.html`)
- Add responsive breakpoints (tablet: 768px, mobile: 480px)
- Update all brand references (meta tags, titles, footer text, API config)
- Accessibility pass (contrast ratios, focus states, ARIA labels)
- Performance check (animation frame rates, load times)

## What Stays Unchanged

- **Router** (`router.js`): Hash-based routing, `mount()`/`unmount()` page contract
- **Auth** (`auth.js`): Google Sign-In, sessionStorage, auth state callbacks
- **API layer** (`api.js`): All fetch helpers, 401/402 handling, Stripe helpers
- **Backend**: All Python API endpoints, tools, database, billing
- **Vercel config**: Serverless function routing (may need minor route additions)
- **Renderer contract**: Each renderer exports `render(result)` returning HTML string

## Open Questions

*None — all key decisions resolved during brainstorm.*
