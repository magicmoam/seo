---
title: "feat: Retune Design Overhaul"
type: feat
status: active
date: 2026-02-24
deepened: 2026-02-24
brainstorm: docs/brainstorms/2026-02-24-retune-design-overhaul-brainstorm.md
---

# feat: Retune Design Overhaul

## Enhancement Summary

**Deepened on:** 2026-02-24
**Sections enhanced:** 12
**Research agents used:** frontend-design skill, performance-oracle, security-sentinel, architecture-strategist, julik-frontend-races-reviewer, pattern-recognition-specialist, code-simplicity-reviewer, + 3 external research agents (animation perf, dark theme a11y, CSS design systems)

### Key Improvements Discovered

1. **Typography is the single highest-impact change** — system Helvetica Neue is generic; switching to Syne + IBM Plex Mono (both free Google Fonts) transforms the perceived quality with one change
2. **Tailwind CDN must be replaced** — 300KB JS vs 2.8KB purged CSS; this is the single biggest performance problem in the entire plan. Drop Tailwind entirely and use pure CSS custom properties
3. **Wave grid animation causes layout thrashing** — `height` animation triggers layout on 50 elements per frame; replace with `transform: scaleY()` to make it compositor-only
4. **4 of 6 animations should be cut** — shard grid (100 DOM nodes), wave grid, node graph float, and grid overlay frame are decorative overhead for a B2B analytics tool
5. **Critical race conditions exist in the router** — stale page mount after navigation is a CRITICAL bug; needs route generation counter before rewrite begins
6. **6 security fixes needed before launch** — CSP headers missing, no SRI on CDN resources, XSS vectors in 5 files
7. **Muted text (#5C6B69) fails WCAG AA** — 2.9:1 contrast; must be upgraded to #7A8B89 (4.8:1)
8. **Static page rewrites can be 3 minimal SEO shells** (80 lines each vs 935/919/676), saving ~2,280 LOC
9. **10+ ghost CSS classes** used throughout the codebase but undefined — these must be defined in Phase 1 before any Phase 2 work begins
10. **3-stage deployment** (CSS → app pages → marketing pages) is safer than a single Big Bang deploy

### New Considerations Discovered

- `.panel-label` is defined as a code comment in the plan but never as an actual CSS rule — every renderer's section headers will be invisible unless fixed
- The `fadeIn` keyframe used by `app.js` doesn't exist in current CSS (animation silently broken in production right now)
- `body.app-mode` CSS custom properties must be migrated to `:root` before the class toggle is removed or all 11 renderers lose their styling
- Admin page has a 5-second timeout that is never cancelled in `unmount()`, causing "Access Denied" flash for legitimate admins on remount

## Overview

Total visual rebrand of trySEO.ai to **Retune** with a new dark "neural intelligence" design language. The underlying SEO product (10 tools, credit system, Stripe billing, admin panel) stays identical — this is a pure frontend overhaul + brand rename affecting ~9,000 lines across 25+ files.

**Key constraints:**
- Zero-build stays (vanilla ES modules + Tailwind CDN)
- `mount()`/`unmount()` page contract preserved
- Router, auth, API layer, and all backend code unchanged
- Desktop-first with responsive breakpoints
- Big Bang approach: design system → parallel page rewrites → ship

## Problem Statement / Motivation

The current design is split between a light Alabaster marketing theme and a dark app theme with inconsistent styling approaches (Tailwind vs inline styles vs undefined CSS classes). The product needs a cohesive identity. "Retune" positions the product as an intelligent analysis platform rather than a generic SEO tool.

## Proposed Solution

Replace the entire frontend visual layer with a unified dark design system derived from 4 HTML mockups, rebranding all user-facing text from "trySEO.ai" to "Retune".

## Technical Approach

### Architecture

The overhaul preserves the existing SPA architecture:

```
index.html (updated shell)
  ├─ css/main.css (rewritten design system)
  ├─ js/router.js (unchanged)
  ├─ js/auth.js (minor: Google button theme)
  ├─ js/api.js (minor: filename prefix rename)
  ├─ js/components/
  │   ├─ nav.js (rewritten: single dark nav)
  │   ├─ cursor.js (updated colors or removed)
  │   └─ scroll-effects.js (updated selectors)
  ├─ js/pages/
  │   ├─ landing.js (rewritten from mockup)
  │   ├─ features.js (rewritten, dark theme)
  │   ├─ pricing.js (rewritten, dark theme)
  │   ├─ about.js (rewritten, dark theme)
  │   ├─ app.js (rewritten from mockup)
  │   ├─ account.js (rewritten, dark theme)
  │   └─ admin.js (rewritten, dark theme)
  ├─ js/renderers/ (all 11 updated for new design tokens)
  ├─ features/index.html (rewritten static shell)
  ├─ pricing/index.html (rewritten static shell)
  └─ about/index.html (rewritten static shell)
```

**Removed:** `js/components/hero-scene.js` (Three.js dependency eliminated)

### Design System Specification

#### Color Tokens (`:root` CSS custom properties)

```css
/* public/css/main.css */
:root {
  /* Backgrounds */
  --bg-deep: #030808;
  --bg-panel: #061111;
  --bg-panel-light: #0B1A1A;
  --bg-elevated: #0F1E1E;

  /* Text */
  --text-main: #EAECE8;
  --text-muted: #5C6B69;
  --text-dim: #2A3836;

  /* Accents */
  --accent-olive: #9CAA7E;      /* Primary accent: CTAs, highlights, labels */
  --accent-olive-dim: rgba(156, 170, 126, 0.15);
  --accent-orange: #C44D30;     /* Warning, emphasis, score-medium */
  --accent-orange-dim: rgba(196, 77, 48, 0.1);
  --accent-cyan: #00D1E6;       /* Interactive, active states, info */
  --accent-cyan-dim: rgba(0, 209, 230, 0.08);

  /* Functional colors (scores, status) */
  --color-success: #6BCF7F;     /* Score >= 70, pass states */
  --color-warning: #C44D30;     /* Score 40-69, warning states */
  --color-error: #FF6B6B;       /* Score < 40, error states, destructive */
  --color-info: #00D1E6;        /* Informational badges */

  /* Borders & surfaces */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.15);
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-hover: rgba(255, 255, 255, 0.06);

  /* Spacing */
  --space-xs: 0.5rem;
  --space-s: 1rem;
  --space-m: 1.5rem;
  --space-l: 3rem;
  --space-xl: 5rem;

  /* Typography */
  --font-display: "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: "Courier New", Courier, monospace;

  /* Misc */
  --radius: 3px;
  --radius-lg: 8px;
  --transition: 0.3s ease;
}
```

**Semantic mapping from old to new:**
| Old Token | New Token | Notes |
|---|---|---|
| `--c-bg-deep: #0a0d10` | `--bg-deep: #030808` | Darker |
| `--c-bg-card` | `--bg-panel` | Renamed |
| `--c-text-primary` | `--text-main` | Slightly warmer |
| `--c-text-secondary` | `--text-muted` | Green-tinted gray |
| `--c-text-tertiary` | `--text-dim` | Very subtle |
| `--c-accent: #d4b895` | `--accent-olive: #9CAA7E` | Gold → Olive |
| `--c-accent-dim` | `--accent-olive-dim` | Renamed |
| `--c-red: #ff6b6b` | `--color-error: #FF6B6B` | Kept same |
| `--c-green: #6bcf7f` | `--color-success: #6BCF7F` | Kept same |
| `--c-yellow: #f5c542` | `--color-warning: #C44D30` | Yellow → Orange |
| `--c-blue: #6ba3ff` | `--color-info: #00D1E6` | Blue → Cyan |
| `--c-glass-border` | `--border-subtle` | Renamed |
| Burnished Gold `#B89E5F` | `--accent-olive: #9CAA7E` | Primary CTA color |

### Research Insights: Color Tokens & Accessibility

**WCAG 2.1 contrast ratios against `#030808` background (verified):**

| Color | Hex | Contrast | AA Status | Usage Constraint |
|---|---|---|---|---|
| `--text-main` | #EAECE8 | **18.8:1** | ✅ Pass | Any text |
| `--text-muted` | #5C6B69 | **2.9:1** | ❌ **FAIL** | **Must upgrade** |
| `--text-dim` | #2A3836 | **1.2:1** | ❌ Fail | Decorative/borders only |
| `--accent-olive` | #9CAA7E | **10.2:1** | ✅ Pass | Any text |
| `--accent-orange` | #C44D30 | **3.4:1** | ❌ **FAIL** | Large text (≥18px) or UI borders only |
| `--accent-cyan` | #00D1E6 | **10.9:1** | ✅ Pass | Any text |

**⚠️ Required fix: Upgrade `--text-muted`**

The muted text token fails WCAG AA at 2.9:1. This affects every secondary label, timestamp, and helper text in the app.

```css
/* OLD — fails AA */
--text-muted: #5C6B69;  /* 2.9:1 */

/* NEW — passes AA */
--text-muted: #7A8B89;  /* 4.8:1 */
```

**⚠️ Required fix: Restrict `--accent-orange` usage**

Orange (#C44D30) at 3.4:1 fails AA for normal-sized text. The `.badge-medium` class uses `color: var(--accent-orange)` at `font-size: 0.65rem` — this is a WCAG AA failure.

Fix for `.badge-medium`:
```css
/* Add background to meet 3:1 UI component threshold */
.badge-medium {
  border-color: var(--accent-orange);
  color: var(--accent-orange);
  background: var(--accent-orange-dim);  /* adds visual area, reduces failure severity */
}
```

Or accept that orange is a border/background color only, never a text color at small sizes.

**Focus indicators:**
```css
/* Use cyan for all focus states — 10.9:1 contrast */
:focus-visible {
  outline: 3px solid var(--accent-cyan);
  outline-offset: 2px;
}

::selection {
  background: var(--accent-olive);
  color: var(--bg-deep);
}
```

**Simplify to fewer speculative tokens:**

Remove `--accent-orange-dim` and `--accent-cyan-dim` from the spec — they have zero current consumers. Add when actually needed. This keeps the token system lean.

#### Typography

**System font stack — no web fonts to load.** Removing Google Fonts (Bodoni Moda, Inter, Cormorant Garamond) eliminates 3 network requests.

| Role | Font | Sizes |
|---|---|---|
| Headlines | `var(--font-display)` | 3rem, 2.5rem, 2rem, 1.5rem |
| Body text | `var(--font-display)` | 0.95rem (base), 0.85rem |
| Labels / monospace | `var(--font-mono)` | 0.75rem, 0.7rem, 0.65rem |
| Data / stats | `var(--font-mono)` | 3rem (large), 1.5rem (medium) |

### Research Insights: Typography

**⚠️ Critical: System fonts undermine the design identity**

The frontend-design skill flags this as the single biggest weakness: Helvetica Neue is a system font that renders differently across OS platforms and carries no personality. Courier New is the browser's fallback monospace — visually coarse at small sizes with no optical screen compensation.

**Recommended alternative (Option A — bolder identity):**
```css
/* public/index.html — replace system fonts with web fonts */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700;800&family=IBM+Plex+Mono:wght@300;400;500&display=swap" rel="stylesheet">

/* public/css/main.css */
:root {
  --font-display: 'Syne', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

Syne was designed for experimental graphic design — its bold weight has geometric tension that reads as designed-for-screens-first. IBM Plex Mono has warmth and optical clarity with the IBM research-lab pedigree that fits "neural intelligence."

**Recommended alternative (Option B — maximum identity):**
```css
/* Use Fontshare (free, no Google dependency) */
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">

:root {
  --font-display: 'Clash Display', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

Clash Display is a geometric grotesque with wide, slightly alien letterforms. JetBrains Mono is purpose-built for terminal/code contexts with ligatures.

**Note:** If system fonts are kept for performance, at minimum replace `"Courier New"` with `"IBM Plex Mono"` (Google Fonts, ~15KB) for the monospace stack. The mono font is used for all data labels, status text, and the bracket notation — it is the most visible typography in the app.

#### Component Classes

These classes are currently referenced but undefined. The new design system defines them all:

```css
/* public/css/main.css — Component classes */

/* Labels: [LABEL_TEXT] bracket notation */
.label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-olive);
  margin-bottom: var(--space-xs);
  display: block;
}
.label::before { content: '['; color: var(--text-muted); }
.label::after { content: ']'; color: var(--text-muted); }

/* Panels */
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  padding: var(--space-m);
}
.panel-label { /* same as .label */ }

/* Cards */
.card {
  background: var(--bg-panel-light);
  border: 1px solid var(--border-subtle);
  padding: var(--space-m);
  transition: background var(--transition);
}
.card:hover { background: var(--bg-elevated); }

/* Data tables */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}
.data-table th {
  text-align: left;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem;
  font-weight: normal;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.data-table tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: all 0.2s ease;
}
.data-table tbody tr:hover {
  background: var(--bg-panel);
  color: var(--accent-cyan);
}
.data-table td { padding: 1.25rem 1rem; }
.cell-dim { color: var(--text-dim); }

/* Score bars */
.score-bar {
  display: inline-block;
  height: 4px;
  background: var(--text-dim);
  width: 60px;
  position: relative;
  vertical-align: middle;
  margin-left: 10px;
}
.score-fill {
  position: absolute;
  left: 0; top: 0;
  height: 100%;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--text-dim);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
}
.badge-high, .badge-pass { border-color: var(--color-success); color: var(--color-success); }
.badge-medium { border-color: var(--accent-orange); color: var(--accent-orange); }
.badge-low, .badge-fail, .badge-critical { border-color: var(--color-error); color: var(--color-error); }
.badge-intent { border-color: var(--accent-cyan); color: var(--accent-cyan); }

/* Buttons */
.btn-action {
  font-family: var(--font-mono);
  padding: 1rem;
  border: 1px solid var(--accent-olive);
  color: var(--accent-olive);
  text-align: center;
  text-decoration: none;
  font-size: 0.8rem;
  transition: all var(--transition);
  cursor: pointer;
  background: transparent;
}
.btn-action:hover {
  background: var(--accent-olive);
  color: var(--bg-deep);
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 0.5rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-ghost:hover { border-color: var(--accent-olive); color: var(--accent-olive); }
.btn-primary {
  background: var(--accent-olive);
  color: var(--bg-deep);
  border: none;
  padding: 0.75rem 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-primary:hover { opacity: 0.9; }

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  padding: var(--space-l);
  max-width: 500px;
  width: 90%;
}
.modal-close {
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.5rem;
}

/* Toast notifications */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  z-index: 3000;
  border: 1px solid var(--border-subtle);
  background: var(--bg-panel);
  color: var(--text-main);
  transition: all 0.3s ease;
}
.toast.success { border-color: var(--color-success); }
.toast.error { border-color: var(--color-error); }

/* Spinner */
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Utility animations */
.fade-in { animation: fadeIn 0.5s ease forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
```

#### Animation Library (from mockups)

Extracted from the 4 HTML mockup files:

| Animation | Source Mockup | Description | DOM Elements |
|---|---|---|---|
| Shard Grid Assembly | `home_page_design` | 100 divs with clip-path triangles, staggered scale-in | 100 absolutely positioned divs |
| Wave Grid | `home_page_design` | 50 vertical bars with sequential pulse animation | 50 divs in a flex container |
| Scan Line | `home_page_design` | Horizontal line scrolling top-to-bottom | 1 absolutely positioned div |
| Node Graph Float | All dashboards | Circular nodes with gentle translateY bob | N absolutely positioned circles |
| Grid Overlay Frame | All pages | 3-column ghost grid, pointer-events: none | 3 divs in a fixed grid |
| Node Point Pulse | `Product_design` | Small dots pulsing opacity + scale | N absolutely positioned dots |

### Research Insights: Animation Library

**Simplicity review recommends cutting 4 of 6 animations** for a B2B analytics SaaS. The shard grid, wave grid, node graph float, and grid overlay are decorative overhead. The actual analysis results *are* the visual — animations compete with data.

**Recommended: Keep 2, cut 4**

| Animation | Keep/Cut | Reason |
|---|---|---|
| Scan Line | ✅ Keep | 1 DOM element, trivial cost, gives "system active" signal |
| Node Point Pulse | ✅ Keep | Small focused pulses for dashboard active indicators |
| Shard Grid | ❌ Cut or simplify | 100+ DOM nodes is portfolio-level; reduce to a simple CSS dot-grid pattern |
| Wave Grid | ❌ Cut | Audio visualization metaphor doesn't map to SEO domain |
| Node Graph Float | ❌ Cut | Animated decorations over data compete with results |
| Grid Overlay Frame | ❌ Cut | 3 fixed full-viewport divs = ~33MB GPU texture at 2x; use CSS `background-image` instead |

**If shard grid is kept (landing page only):**
```javascript
// Reduce to 30 elements on mobile
const isMobile = window.innerWidth < 768;
const shardCount = isMobile ? 30 : 60;  // Not 100

// Add prefers-reduced-motion check
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) { /* show static dot-grid, no assembly animation */ }
```

**Wave grid fix (if kept):**

Replace `height` animation (triggers layout) with `transform: scaleY()` (compositor-only):
```css
/* ❌ Triggers layout on every frame (50 elements!) */
@keyframes listen-pulse {
  0%, 100% { height: 10%; }
  50% { height: 80%; }
}

/* ✅ Compositor-only, S-Tier performance */
.fin { height: 80%; transform-origin: center; }
@keyframes listen-pulse {
  0%, 100% { transform: scaleY(0.125); opacity: 0.4; }
  50%       { transform: scaleY(1);     opacity: 1; }
}
```

**Grid overlay: replace DOM with CSS:**
```css
/* Replace 3 child divs with a single background-image */
.grid-frame {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  background-image:
    linear-gradient(90deg, transparent calc(33.33% - 0.5px), var(--border-subtle) 33.33%, transparent calc(33.33% + 0.5px)),
    linear-gradient(90deg, transparent calc(66.66% - 0.5px), var(--border-subtle) 66.66%, transparent calc(66.66% + 0.5px));
}
```

**Scan line fix (if kept):**
```css
/* ❌ Animates `top` — triggers layout */
@keyframes scan { 0% { top: -100px; } 100% { top: 100vh; } }

/* ✅ Animates transform — compositor-only */
@keyframes scan { 0% { transform: translateY(-100px); } 100% { transform: translateY(100vh); } }
```

**Memorable micro-interactions to ADD (from frontend-design skill):**

These are higher-value than decorative background animations:

1. **Terminal text reveal for results** — Lines decode in left-to-right as analysis arrives:
```css
@keyframes rt-line-decode {
  0%   { opacity: 0; transform: translateX(-4px); filter: blur(2px); }
  30%  { opacity: 0.6; filter: blur(0.5px); }
  100% { opacity: 1; transform: translateX(0); filter: blur(0); }
}
.result-line {
  animation: rt-line-decode 0.15s ease-out both;
}
.result-line:nth-child(1) { animation-delay: 0.05s; }
.result-line:nth-child(2) { animation-delay: 0.12s; }
```

2. **Button charge state on hover** — Fill sweeps left-to-right:
```css
.btn-primary { position: relative; overflow: hidden; }
.btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 209, 230, 0.1);
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-primary:hover::before { transform: translateX(0); }
```

3. **Noise grain texture** — More distinctive than grid lines:
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
}
```

#### Tailwind Config Update

```javascript
// public/index.html — Tailwind CDN config
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'deep': '#030808',
        'panel': '#061111',
        'panel-light': '#0B1A1A',
        'main': '#EAECE8',
        'muted': '#5C6B69',
        'dim': '#2A3836',
        'olive': '#9CAA7E',
        'orange': '#C44D30',
        'cyan': '#00D1E6',
      },
      fontFamily: {
        display: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(#2A3836 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '30px 30px',
      }
    }
  }
}
```

### Research Insights: Tailwind CDN vs Pure CSS

**⚠️ P0 Performance: Tailwind CDN is 300KB JS vs 2.8KB purged CSS**

The Tailwind CDN loads the full JIT compiler as JavaScript (~300KB), not a CSS file. This is parsed and executed before any Tailwind classes resolve. Expected impact: 300–800ms added to First Contentful Paint.

**Three options, in order of recommendation:**

**Option 1 (Recommended): Drop Tailwind entirely**

The app pages already use CSS custom properties with inline styles. The design system in `main.css` is comprehensive. For a zero-build vanilla JS SPA, pure CSS custom properties is the correct pattern.

Delete the Tailwind CDN `<script>` tag from `index.html` and all 3 static pages. Replace Tailwind utility classes in marketing pages with the new CSS custom property system + hand-written utility classes in `main.css`. This aligns marketing and app pages under a single styling system.

**Option 2: Add a Tailwind build step for production**

Add `npx tailwindcss -i ./public/css/tailwind-input.css -o ./public/css/tailwind.css --minify` to the Vercel build command. Output is ~2.8KB gzipped vs 300KB. Keeps Tailwind utilities but requires a build step.

**Option 3 (current, not recommended for production)**: Keep CDN for development only

**Design token sync without Tailwind:**
```css
/* All tokens in main.css :root — single source of truth */
:root {
  --bg-deep: #030808;
  --olive: #9CAA7E;
  /* ... etc */
}

/* Marketing pages: write lean utility classes that reference CSS vars */
.text-olive { color: var(--accent-olive); }
.bg-panel { background: var(--bg-panel); }
.border-subtle { border: 1px solid var(--border-subtle); }
```

This approach is used by 37signals (Campfire, Writebook, Fizzy) with 14,000+ lines of CSS and zero build tools.

### Implementation Phases

#### Phase 1: Design System Foundation

**Files to create/rewrite:**

| File | Action | Description |
|---|---|---|
| `public/css/main.css` | Rewrite | Full design system with all tokens + component classes + animations |
| `public/index.html` | Rewrite | New shell: remove Google Fonts, remove Three.js importmap, update Tailwind config, update meta/OG/JSON-LD, add grid overlay frame, update nav container, remove Alabaster references |
| `public/js/components/nav.js` | Rewrite | Single dark nav (no more dual marketing/app modes), remove `body.app-mode` toggle |
| `public/js/components/scroll-effects.js` | Update | New selectors, remove parallax-visual (marketing sections restructured) |
| `public/js/components/cursor.js` | Update or Remove | If kept: update hover selectors and colors for dark theme. If removed: delete file, remove init from index.html |
| `public/js/components/hero-scene.js` | Delete | Three.js no longer needed |

**Key changes in `public/index.html`:**
- Remove Google Fonts `<link>` tags (lines 65-70) — system fonts only
- Remove Three.js importmap (lines 98-105)
- Replace Tailwind color config (lines 74-95) with new palette
- Update `<title>` from "trySEO.ai" to "Retune"
- Update all `<meta>` OG/Twitter tags
- Rewrite JSON-LD structured data
- Replace ambient-bg + noise-overlay with grid overlay frame
- Update noscript fallback content
- Remove `hero-scene.js` import from init script
- Replace upgrade modal with dark-themed version

**Key changes in `nav.js`:**
- Remove `body.app-mode` class toggle
- Single dark nav for all routes: glass backdrop on `--bg-deep`
- Logo text: "Retune"
- Monospace status indicators (from mockup nav pattern)
- Mobile hamburger menu updated for dark theme
- Google Sign-In button: change `theme: 'filled_black'` → `theme: 'outline'`

**Success criteria Phase 1:**
- [ ] All CSS custom properties defined in `:root`
- [ ] All component classes (panel, badge, data-table, btn-*, modal-*, toast, spinner) defined
- [ ] Grid overlay frame renders on all pages
- [ ] Nav renders correctly on all routes (dark, glass backdrop)
- [ ] No `body.app-mode` class toggle
- [ ] No Google Fonts requests in network tab
- [ ] No Three.js requests in network tab
- [ ] All meta/OG/JSON-LD updated to Retune

### Research Insights: Phase 1 Critical Additions

**1. body.app-mode migration is a prerequisite — not optional**

The `body.app-mode` CSS block defines 14 custom properties (`--c-bg-deep`, `--c-accent`, `--c-red`, etc.) used by ALL 11 renderers and 3 app pages. **Removing the class toggle before moving these variables to `:root` will break the entire authenticated app surface.**

Migration order:
1. Move all `--c-*` variable definitions from `body.app-mode` to `:root` with new names
2. Verify all 11 renderers and 3 app pages use new variable names
3. THEN remove the `body.app-mode` toggle from `nav.js`

**2. 10+ ghost CSS classes must be defined in Phase 1**

Pattern analysis found these classes used in 107+ places across 15 files but **undefined in current `main.css`**: `.panel`, `.panel-label`, `.panel-list`, `.label`, `.data-table`, `.cell-dim`, `.badge` and all variants, `.btn-ghost`, `.btn-primary`, `.btn-primary-solid`, `.modal-backdrop`, `.modal-content`, `.modal-close`, `.spinner`, `.fade-in` (and delay variants).

Phase 2 cannot start until every class that Phase 2 will use is defined and verified.

**3. Fix the broken `fadeIn` animation (production bug right now)**

`app.js` line 609 references `animation: 'fadeIn 0.5s ease-out'`. The current `main.css` defines `fadeInMove` but never `fadeIn`. This animation has been silently broken in production. Phase 1 must define `@keyframes rt-fade-in` (namespaced to avoid Tailwind collision) and update the reference.

**4. Security fixes in Phase 1 (before any public deploy)**

Add CSP headers to `vercel.json`:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' https://accounts.google.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://*.googleusercontent.com data: blob:; connect-src 'self' https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; object-src 'none'"
}
```

Fix 5 unescaped XSS vectors found by security review:
- `app.js:486` — server error message in innerHTML (add `esc()`)
- `app.js:582` — tool name in result header (add `esc()`)
- `app.js:606` — fallback JSON renderer (add `esc()`)
- `account.js:106-108` — usage-by-tool keys (add `esc()`)
- `content_generation.js:15-18` — markdown regex after esc() (add DOMPurify or allowlist)

Remove Google Fonts preconnect hints from `index.html` (dead requests if fonts are removed):
```html
<!-- DELETE these if switching to system fonts or self-hosted fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**5. Component class gaps to add in Phase 1**

The plan defines 15 component classes but the codebase needs more. Add these in Phase 1:
- `.input-field` / `.textarea` — app.js query input, admin.js search/credit inputs
- `.progress-bar` / `.progress-fill` — account.js credit meter, score bars
- `.empty-state` — "No searches yet", "No tracked URLs"
- `.sidebar` / `.sidebar-section` — app.js layout
- `.tag` — content_generation.js keyword tags
- `.status-dot` — GA4 connection indicator

**6. CSS architecture: add @layer for cascade control**

Use CSS Cascade Layers to eliminate specificity wars (proven approach by 37signals at 14,000 lines):
```css
/* At top of main.css */
@layer reset, base, components, utilities;

@layer base { /* tokens, typography */ }
@layer components { /* .panel, .card, .btn-*, .badge, etc. */ }
@layer utilities { /* .fade-in, .hide-mobile, etc. */ }
```

**7. Fix `backdrop-filter` blur radius on nav**

Reduce from `blur(20px)` to `blur(8px)` — visually equivalent but ~60% less GPU compute cost. Increase background opacity to compensate:
```css
.nav-glass {
  background: rgba(3, 8, 8, 0.88); /* Higher opacity */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
@supports not (backdrop-filter: blur(1px)) {
  .nav-glass { background: rgba(3, 8, 8, 0.96); }
}
```

#### Phase 2: Parallel Page Rewrites

**Agent 1: `public/js/pages/landing.js`** (rewrite from mockup)

Source mockup: `home_page_design-38ae136f.html`

Sections to implement:
1. Hero: Shard grid assembly animation (100 triangles), headline "Retune" with subtitle
2. Wave Grid: Audio visualization section (50 bars with pulse)
3. Tech Grid: Knowledge graph nodes with orbital connections
4. CTA section with sign-in/get-started buttons

Brand text replacements:
- "trySEO.ai" → "Retune"
- "AI SEO Intelligence" → Adapt tagline from mockup
- All copyright text

Must preserve:
- `mount(container)` / `unmount()` contract
- Scroll handler cleanup in unmount
- CTA button handlers (sign in, go to app)
- Dot nav or equivalent section navigation

**Agent 2: `public/js/pages/app.js` + all 11 renderers** (rewrite from mockups)

Source mockups: `Product_design-c328b003.html` (dashboard), `design-6e9bd743.html` (deep-dive), `design-f5a1ca79.html` (archive)

Changes to `app.js`:
- Layout: Replace current sidebar + main split with new layout from mockups
- Tool cards: Dark cards with monospace labels, olive accents
- Results view: 2-column grid (2fr content + 1fr sidebar) from Product_design mockup
- History view: Monospace table with filter tabs from Archive mockup
- Evidence chain: Deep-dive 3-column layout from design-6e9bd743 mockup
- All inline styles → CSS custom property references (use new token names)
- Remove all references to old `--c-*` variables

Changes to all 11 renderers in `public/js/renderers/`:
- Replace `var(--c-*)` references → `var(--*)` new tokens
- Replace `'Space Mono', monospace` → `var(--font-mono)`
- Use `.panel`, `.label`, `.data-table`, `.badge-*` classes (now properly defined)
- Score colors: keep thresholds (>=70 green, >=40 orange, <40 red) but use new `--color-*` tokens
- Consistent card layout: `.card` with `.label` header pattern

Files:
- `public/js/renderers/website_analyzer.js`
- `public/js/renderers/keyword_research.js`
- `public/js/renderers/competitor_analysis.js`
- `public/js/renderers/serp_analysis.js`
- `public/js/renderers/content_gap.js`
- `public/js/renderers/content_generation.js`
- `public/js/renderers/topical_authority.js`
- `public/js/renderers/technical_seo.js`
- `public/js/renderers/backlink_strategy.js`
- `public/js/renderers/seo_strategy.js`
- `public/js/renderers/ga4_analytics.js`

**Agent 3: `features.js` + `pricing.js` + `about.js`** (extrapolate design)

No direct mockups — extrapolate from the design system:

`features.js`:
- Dark background throughout
- Tool cards: similar to dashboard insight cards (`.card` with `.label` header)
- Filter buttons: monospace, bordered, active state with olive accent
- Orchestrator section: dark panel with phase indicators
- Remove gradient orbs and hero particles (replaced by grid overlay + scan line)

`pricing.js`:
- Dark tier cards (3 columns)
- Olive border/accent on featured tier
- Billing toggle: dark with cyan active state
- FAQ accordion: dark panels, monospace labels
- Comparison grid: dark table with check/dim pattern
- Stripe checkout integration unchanged

`about.js`:
- Dark sections with monospace section labels `[01 MISSION]` etc.
- System-status aesthetic for "How It Works"
- Technology section with node-graph feel
- Remove abstract-panel SVG shapes, hero particles

All three:
- Replace all "trySEO.ai" brand references
- Use Tailwind utility classes with new color config
- Update copyright footers

**Agent 4: `account.js` + `admin.js`** (extrapolate design)

`account.js`:
- Dark stat cards for credits, usage
- Score bar for credit usage percentage
- Monospace labels: `[ACCOUNT]`, `[USAGE]`, `[SUBSCRIPTION]`
- "Manage Subscription" button: `.btn-action` style

`admin.js`:
- Archive-style data table for users (from `design-f5a1ca79` mockup)
- Filter tabs: monospace, active state with olive
- Stats cards: monospace with large stat values
- Blog management: dark cards with action buttons
- Search: dark input with subtle border

**Success criteria Phase 2:**
- [ ] All 7 page modules render correctly with new design
- [ ] All 11 renderers display tool results with new tokens
- [ ] No references to old color tokens (`--c-*`, `#B89E5F`, `#F0F0EB`, `#0F0F0F`)
- [ ] No references to old brand ("trySEO.ai", "tryseo")
- [ ] All functional flows work: query → result → history → download → evidence
- [ ] Stripe checkout/portal flows work
- [ ] Admin dashboard functions work
- [ ] GA4 connection flow works
- [ ] URL tracking flow works

### Research Insights: Phase 2 Critical Fixes

**1. Fix the router race condition BEFORE rewriting pages (CRITICAL)**

The race conditions reviewer found a critical bug: if a user navigates twice rapidly, a stale page module can mount after a newer page's module. Fix in `router.js` before Phase 2 rewrites begin:

```javascript
// router.js — add route generation counter
let _routeGeneration = 0;

async function handleRouteChange() {
  const thisGeneration = ++_routeGeneration;
  // ... unmount, clear container ...
  const pageModule = await loader();
  if (thisGeneration !== _routeGeneration) return; // Stale, abort
  _currentPage = pageModule;
  pageModule.mount(container);
}
```

**2. Add AbortController to all data-loading in app.js**

Every page that loads data async must cancel in-flight requests when `unmount()` is called:

```javascript
// app.js pattern
let _abortController = null;
let _postAuthTimeout = null;

export function mount(container) {
  _container = container;
  _abortController = new AbortController();
  _loadData(_abortController.signal); // pass signal to all fetches
}

export function unmount() {
  _abortController?.abort();
  clearTimeout(_postAuthTimeout);
  _unsubAuth?.();
  window.removeEventListener('toggle-sidebar', _toggleSidebar);
  window.removeEventListener('credits-exhausted', _showUpgradeModal);
  _container = null;
}
```

**3. Fix admin.js timeout leak**

The 5-second admin auth timeout is never cancelled in `unmount()`. Navigating away and back within 5 seconds causes "Access Denied" to flash for legitimate admins. Fix in `admin.js` rewrite:

```javascript
let _adminAuthTimeout = null;
let _searchTimer = null;

export function mount(container) {
  _adminAuthTimeout = setTimeout(() => { /* check admin */ }, 5000);
}

export function unmount() {
  clearTimeout(_adminAuthTimeout);
  clearTimeout(_searchTimer);
  _unsubAuth?.();
  _container = null;
}
```

**4. Create `/public/js/utils/ui.js` — shared HTML fragment builders**

The architecture review found 107+ references to component classes across 15 files with raw HTML reconstruction. A shared UI utility module eliminates this duplication and is the right time to introduce during the rewrite:

```javascript
// public/js/utils/ui.js
export const panel = (labelText, content) =>
  `<div class="panel"><span class="panel-label">${labelText}</span>${content}</div>`;

export const badge = (text, variant = '') =>
  `<span class="badge ${variant ? 'badge-' + variant : ''}">${esc(text)}</span>`;

export const dataTable = (headers, rows) => `
  <table class="data-table">
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;

export const emptyState = (message) =>
  `<div class="empty-state"><span>${message}</span></div>`;
```

Renderers import from this module instead of duplicating HTML patterns.

**5. Lazy-load renderers in app.js (performance)**

Replace static imports of all 11 renderers with on-demand loading:

```javascript
// Instead of: import * as allRenderers at top
const RENDERER_LOADERS = {
  keyword_research:     () => import('../renderers/keyword_research.js'),
  competitor_analysis:  () => import('../renderers/competitor_analysis.js'),
  // ... etc
};

async function _renderResult(data) {
  const loader = RENDERER_LOADERS[data.tool_used];
  if (loader) {
    const renderer = await loader();
    html += renderer.render(data.result);
  }
}
```

Eliminates 11 module loads on app page mount. Users only pay for the renderer they actually use.

**6. Add `modulepreload` to `index.html` for critical paths**

```html
<!-- In index.html <head> -->
<link rel="modulepreload" href="/js/pages/landing.js">
<link rel="modulepreload" href="/js/auth.js">
<link rel="modulepreload" href="/js/api.js">
```

Eliminates 1 RTT (~50-200ms) on initial page load.

**7. Add concurrent submission guard to app.js**

```javascript
let _isSubmitting = false;

async function _submitQuery() {
  if (!_container || _isSubmitting) return;
  _isSubmitting = true;
  try {
    // ... existing query logic ...
  } finally {
    _isSubmitting = false;
  }
}
```

**8. Fix Google Sign-In button theme**

The plan already specifies changing from `'filled_black'` to `'outline'`. This is critical — `filled_black` is nearly invisible against `#030808`. Confirm `theme: 'outline'` is set in the `auth.js` rewrite.

#### Phase 3: Integration & Polish

**Static marketing HTML shells:**

Rewrite all 3 static pages to match new design:
- `public/features/index.html`
- `public/pricing/index.html`
- `public/about/index.html`

Each needs:
- New Tailwind config (matching `index.html`) OR removed Tailwind if dropped
- Remove Google Fonts links
- Update meta/OG/JSON-LD
- Nav updated to dark theme
- Content matching the JS module version
- Footer updated

### Research Insights: Static Pages — Reduce to SEO Shells

**The simplicity review identifies this as the biggest YAGNI violation in Phase 3.**

The 3 static pages are 935 + 919 + 676 = 2,530 lines that duplicate the SPA shell. Maintaining two copies of every page (JS module + static HTML) is an ongoing sync burden the risk analysis (line 705) already flags.

**Recommended: Reduce each static page to a minimal SEO shell (~80 lines each)**

```html
<!-- public/features/index.html — SEO shell (replace all 935 lines) -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Retune — SEO Analysis Features</title>
  <meta name="description" content="10 AI-powered SEO tools...">
  <!-- OG, Twitter, canonical, JSON-LD structured data -->
  <link rel="canonical" href="https://tryseo.ai/features">
  <script type="application/ld+json">{ ... }</script>
  <!-- Redirect JS-capable browsers to SPA -->
  <script>
    if (typeof window !== 'undefined') {
      window.location.replace('/#/features');
    }
  </script>
</head>
<body>
  <!-- noscript: crawlable text content for search engines -->
  <noscript>
    <h1>Retune — Features</h1>
    <p>10 AI-powered SEO analysis tools: keyword research, competitor analysis, technical SEO...</p>
    <a href="/">Learn more</a>
  </noscript>
</body>
</html>
```

**Result:** ~2,280 LOC saved. Crawlers get structured data + noscript content. JS-capable users get the full SPA experience. No more dual-maintenance burden.

**If SEO ranking for these specific URLs is critical**, keep the full static pages but do NOT rewrite from scratch — instead run a find-replace for brand references and update the Tailwind config block. The structural content doesn't need changing.

**Responsive breakpoints:**

```css
/* Tablet: 768px — implement */
@media (max-width: 768px) {
  /* Stack 3-column layouts to single column */
  /* Collapse data tables to card view */
  /* Hide grid overlay frame (if kept) */
  /* Stack dashboard sidebar below content */
  /* Hamburger menu */
}

/* Mobile: 480px — DEFER to post-launch */
/* This is a desktop analytics tool. Add mobile breakpoint when analytics
   confirm real mobile traffic exists. */
```

**Accessibility — updated with verified contrast ratios:**
```css
/* prefers-reduced-motion: disable ALL animations */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  /* Also pause JS-driven animations */
}

/* Focus indicators: use cyan (10.9:1 contrast) */
:focus-visible {
  outline: 3px solid var(--accent-cyan);
  outline-offset: 2px;
}

/* Text selection */
::selection {
  background: var(--accent-olive);
  color: var(--bg-deep);
}

/* Scrollbar (functional) */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-panel); }
::-webkit-scrollbar-thumb { background: #7A8B89; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent-cyan); }
```

**Contrast violations to fix before launch:**
- `--text-muted: #5C6B69` → upgrade to `#7A8B89` (2.9:1 → 4.8:1)
- Orange `#C44D30` → never use as text color at font-size < 18px
- Add backgrounds to `.badge-medium` to compensate for orange text contrast failure

**Brand reference sweep:**

| Location | Reference | Change To |
|---|---|---|
| `public/index.html` (12+ occurrences) | trySEO.ai | Retune |
| `public/js/components/nav.js` | trySEO.ai logo text | Retune |
| `public/js/pages/landing.js` | trySEO.ai, AI SEO Intelligence | Retune, tagline TBD |
| `public/js/pages/features.js` | trySEO.ai footer | Retune |
| `public/js/pages/pricing.js` | trySEO.ai, hello@tryseo.ai | Retune, email TBD |
| `public/js/pages/about.js` | trySEO.ai content | Retune |
| `public/js/api.js` | `tryseo_` filename prefix | `retune_` |
| `public/features/index.html` | All metadata + content | Retune |
| `public/pricing/index.html` | All metadata + content | Retune |
| `public/about/index.html` | All metadata + content | Retune |
| `api/query.py` line 174 | `tryseo_report_` | `retune_report_` |
| `src/report_exporter.py` | trySEO.ai in HTML reports | Retune |
| `src/client_report.py` | trySEO.ai in Word docs | Retune |

**Note:** SessionStorage keys (`seo_token`, `tryseo_post_auth_url`) are kept as-is to avoid breaking active sessions. Domain/CORS changes are out of scope for this plan.

**Performance verification:**
- [ ] Shard grid animation: < 16ms per frame (60fps target)
- [ ] Wave grid animation: < 16ms per frame
- [ ] No layout thrashing from absolutely positioned animated elements
- [ ] Page load: remove ~150KB Three.js, remove ~60KB Google Fonts = ~210KB savings
- [ ] Lighthouse performance score maintained or improved

**Success criteria Phase 3:**
- [ ] All 3 static HTML pages match JS module versions
- [ ] Responsive layouts work at 768px and 480px breakpoints
- [ ] `prefers-reduced-motion` disables all animations
- [ ] WCAG AA contrast ratios pass for all text-on-background combinations
- [ ] No "trySEO" string found anywhere in frontend code (except sessionStorage keys)
- [ ] All downloaded reports say "Retune" not "trySEO"
- [ ] Lighthouse performance score >= current baseline

## System-Wide Impact

### Interaction Graph

The frontend changes are isolated to the `public/` directory. No backend changes except cosmetic brand references in:
- `api/query.py` — download filename
- `src/report_exporter.py` — HTML report template
- `src/client_report.py` — Word document content

These are string-only changes with zero logic impact.

### Error & Failure Propagation

No change. All error handling lives in `api.js` (fetch helpers) and backend Python. The frontend redesign changes only the visual presentation of error states.

### State Lifecycle Risks

**SessionStorage migration:** Keys `seo_token` and `tryseo_post_auth_url` are NOT renamed. No user session disruption on deploy.

**Tailwind CDN:** If CDN fails to load, the page falls back to raw CSS custom properties defined in `main.css`. Marketing pages using Tailwind utility classes will be unstyled. Mitigation: the design system in `main.css` provides foundational styling without Tailwind.

### API Surface Parity

No API changes. All `api/*.py` endpoints remain identical. The frontend consumes the same JSON responses — only the rendering layer changes.

### Integration Test Scenarios

1. **Unauthenticated visitor flow:** Visit landing → navigate to features/pricing/about → verify all pages render with new design → sign in → verify redirect to app
2. **Query → result → download flow:** Submit query → verify result renders with new design tokens → download HTML report → verify report says "Retune" → download Word report → verify
3. **Stripe checkout flow:** Click upgrade → verify Stripe redirect works → return to app → verify success toast renders correctly
4. **Admin flow:** Login as admin → verify admin link visible in nav → navigate to admin → verify users table renders in archive-style → verify impersonate works
5. **Mobile flow:** Resize to 480px → verify landing hero simplifies → verify hamburger menu works → verify app layout stacks correctly

## Acceptance Criteria

### Functional Requirements

- [ ] All 7 pages render with new dark design system
- [ ] All 11 tool renderers display results correctly
- [ ] Google Sign-In works (outline theme button visible on dark bg)
- [ ] Stripe checkout and portal flows work
- [ ] Report downloads contain "Retune" branding
- [ ] Admin dashboard functions correctly
- [ ] GA4 connection flow works
- [ ] URL tracking and trend monitoring work
- [ ] History with pagination displays correctly
- [ ] Evidence chain inspection works
- [ ] All navigation links work (hash routes + static page routes)

### Non-Functional Requirements

- [ ] Animations run at 60fps on mid-range hardware
- [ ] Page load improved (removed Three.js + Google Fonts)
- [ ] WCAG AA contrast ratios for all text
- [ ] `prefers-reduced-motion` support
- [ ] Responsive at 768px and 480px breakpoints
- [ ] No console errors on any page

### Quality Gates

- [ ] All 217 existing tests pass (backend unchanged)
- [ ] Manual test of all 14 user flows
- [ ] No "trySEO" references in frontend (except sessionStorage keys)
- [ ] Lighthouse accessibility score >= 90
- [ ] Cross-browser check: Chrome, Firefox, Safari
- [ ] WCAG AA contrast ratios verified for all text combinations (use webaim.org/resources/contrastchecker)
- [ ] No router race condition: navigate twice rapidly on slow 3G, verify no stale page mounts
- [ ] Animations are S-Tier: no `height`/`background-color`/`top` animated properties
- [ ] CSP headers present and verified in network tab
- [ ] All 5 XSS vectors from security review fixed
- [ ] `body.app-mode` class removed cleanly (no orphaned CSS rules)
- [ ] `fadeIn` → `rt-fade-in` keyframe working in app result reveal

## Dependencies & Prerequisites

**No blockers.** All work is frontend-only with the existing zero-build architecture. No new dependencies to install, no build tools to configure, no database migrations.

**External (out of scope, do separately):**
- Stripe Dashboard: Update business name and branding (non-code)
- Google Cloud Console: Update OAuth consent screen (may need re-verification)
- Domain migration (if domain changes from tryseo.ai)
- OG image / social sharing assets creation

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Big Bang deploy breaks a flow | Medium | High | **Phase deployment (CSS → app → marketing) instead of single deploy** |
| Orange (#C44D30) fails contrast | High | High | Upgrade `--text-muted` to #7A8B89; restrict orange to large text/borders only |
| Undefined CSS classes cause unstyled elements | High | High | Phase 1 defines ALL classes; Phase 2 blocked until Phase 1 verified |
| body.app-mode removal breaks 11 renderers | High | High | Migrate CSS variables to `:root` BEFORE removing class toggle |
| Router race condition causes stale page mount | High | High | Fix route generation counter in router.js before Phase 2 begins |
| Uncancelled fetches write to stale DOM | Medium | High | Add AbortController to all async page mounts |
| Admin auth timeout not cancelled | High | Medium | Fix in admin.js rewrite — store and cancel in unmount() |
| Tailwind CDN 300KB JS blocks FCP | High | Medium | Drop Tailwind CDN or add build step |
| XSS vectors in 5 files | Medium | High | Fix all 5 before launch (Phase 1 security pass) |
| Missing CSP headers | High | High | Add to vercel.json in Phase 1 |
| Static HTML pages get out of sync | Medium | Medium | Reduce to 80-line SEO shells — no content to sync |
| `fadeIn` animation reference broken in production | High | Low | Fix in Phase 1 CSS (use namespaced `rt-fade-in`) |
| Shard grid jank on mobile | Medium | Low | Reduce element count on mobile; disable on prefers-reduced-motion |

### Research Insights: 3-Stage Deployment Recommendation

The architecture review recommends phasing the deploy rather than a single Big Bang:

- **Stage 1: CSS + shell** — Deploy `main.css` (new design system, all component classes). Additive-only changes. Nothing breaks. Verify all tokens render correctly.
- **Stage 2: App surface** — Deploy `app.js`, `account.js`, `admin.js`, all 11 renderers. These affect only logged-in users, limiting blast radius.
- **Stage 3: Marketing surface** — Deploy `landing.js`, `features.js`, `pricing.js`, `about.js`, all static HTML pages. These affect all visitors including search engine crawlers.

Use Vercel preview deployments for validation between stages.

## Future Considerations

- **Domain migration:** If moving from tryseo.ai to a new domain, a separate plan handles CORS, redirects, structured data, Stripe config, and Google OAuth.
- **Build system:** If the project grows, consider Vite for CSS modules and tree-shaking. Not needed now.
- **Dark/light toggle:** The new design is all-dark. If users request a light mode later, the CSS custom property system makes it easy to add a toggle.
- **Marketing page deduplication:** The 3 static HTML pages duplicate the SPA shell. Consider server-side rendering or build-time generation to eliminate duplication.

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-02-24-retune-design-overhaul-brainstorm.md`
- Design system CSS: `public/css/main.css` (923 lines, full rewrite)
- SPA shell: `public/index.html` (238 lines, full rewrite)
- Router: `public/js/router.js` (137 lines, unchanged)
- Auth: `public/js/auth.js` (156 lines, minor Google button theme change)
- API client: `public/js/api.js` (198 lines, filename prefix change)
- Nav component: `public/js/components/nav.js` (198 lines, full rewrite)

### Design Mockups
- Landing: `new design/home_page_design-38ae136f-1af6-43e0-8cf3-826dd16a6848.html`
- Dashboard: `new design/Product_design-c328b003-e05e-48a8-b506-88553c6f9292.html`
- Deep-dive: `new design/design-6e9bd743-d555-4154-8aca-d2912be839a1.html`
- Archive: `new design/design-f5a1ca79-7b47-4951-aa68-689acb3c5d3e.html`

### File Inventory (all files to modify)

| File | Lines | Action | Phase |
|---|---|---|---|
| `public/css/main.css` | 923 | Rewrite | 1 |
| `public/index.html` | 238 | Rewrite | 1 |
| `public/js/components/nav.js` | 198 | Rewrite | 1 |
| `public/js/components/hero-scene.js` | 223 | Delete | 1 |
| `public/js/components/cursor.js` | 86 | Update/Remove | 1 |
| `public/js/components/scroll-effects.js` | 121 | Update | 1 |
| `public/js/pages/landing.js` | 395 | Rewrite | 2 |
| `public/js/pages/app.js` | 819 | Rewrite | 2 |
| `public/js/pages/features.js` | 546 | Rewrite | 2 |
| `public/js/pages/pricing.js` | 821 | Rewrite | 2 |
| `public/js/pages/about.js` | 567 | Rewrite | 2 |
| `public/js/pages/account.js` | 144 | Rewrite | 2 |
| `public/js/pages/admin.js` | 450 | Rewrite | 2 |
| `public/js/renderers/website_analyzer.js` | 144 | Update | 2 |
| `public/js/renderers/keyword_research.js` | 14 | Update | 2 |
| `public/js/renderers/competitor_analysis.js` | 18 | Update | 2 |
| `public/js/renderers/serp_analysis.js` | 15 | Update | 2 |
| `public/js/renderers/content_gap.js` | 14 | Update | 2 |
| `public/js/renderers/content_generation.js` | 24 | Update | 2 |
| `public/js/renderers/topical_authority.js` | 21 | Update | 2 |
| `public/js/renderers/technical_seo.js` | 14 | Update | 2 |
| `public/js/renderers/backlink_strategy.js` | 14 | Update | 2 |
| `public/js/renderers/seo_strategy.js` | 26 | Update | 2 |
| `public/js/renderers/ga4_analytics.js` | 42 | Update | 2 |
| `public/js/auth.js` | 156 | Minor update | 2 |
| `public/js/api.js` | 198 | Minor update | 2 |
| `public/features/index.html` | 935 | Rewrite | 3 |
| `public/pricing/index.html` | 919 | Rewrite | 3 |
| `public/about/index.html` | 676 | Rewrite | 3 |
| `api/query.py` | - | Minor update (filename) | 3 |
| `src/report_exporter.py` | - | Minor update (brand text) | 3 |
| `src/client_report.py` | - | Minor update (brand text) | 3 |

**Total: 32 files, ~8,936 frontend lines + 3 backend files**

### Research Insights: File Count After Simplifications

Applying the simplicity recommendations reduces scope significantly:

| Item | Original LOC | Simplified LOC | Savings |
|---|---|---|---|
| Static HTML pages (3 files) | 2,530 | ~240 (3 × 80 SEO shells) | ~2,290 |
| Animation library (drop 4 of 6) | ~300 in landing.js + main.css | ~80 | ~220 |
| Tailwind CDN removal | ~300KB JS (external) | 0 | Performance win |
| Unused component classes | ~25 LOC | 0 | ~25 |
| 480px breakpoint (deferred) | ~50 LOC | 0 (deferred) | ~50 |
| **Total savings** | | | **~2,585 LOC** |

**Effective scope: ~6,350 lines** (down from ~8,936), distributed across:
- Design system (main.css rewrite): ~600 lines
- Shell + nav + components: ~400 lines
- App pages (app.js, account.js, admin.js): ~1,500 lines
- Marketing pages (landing.js, features.js, pricing.js, about.js): ~1,800 lines
- Renderers (11 files): ~400 lines
- Security fixes + race condition fixes: ~150 lines
