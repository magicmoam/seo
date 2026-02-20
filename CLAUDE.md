# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

trySEO.ai is an AI-powered SEO intelligence SaaS platform deployed on Vercel. It uses Jina AI for web search/scraping, an LLM (OpenAI or Anthropic via `LLM_PROVIDER` env var) for analysis, Google Auth for identity, Stripe for billing, Supabase for persistence, and a credit-based usage model (Free: 5 credits/mo, Pro: 200 credits/mo at $49/mo).

## Commands

```bash
pip install -e .                           # Install dependencies
python -m src.main                         # Run interactive CLI
tryseo                                     # Entry point (after install)
uvicorn api.query:app --port 3002 --reload # Local dev server

# Tests
python -m pytest tests/ -v                 # Run all 217 tests
python -m pytest tests/unit/ -v            # Run 147 unit tests
python -m pytest tests/integration/ -v     # Run 70 integration tests
python -m pytest tests/unit/test_db.py -v  # Run a single test file
```

Test dependencies: `pytest`, `pytest-asyncio`, `respx` (install via `pip install pytest pytest-asyncio respx`).

## Architecture

```
Browser (public/index.html SPA, hash-based routing)
  ↓ POST /api/query (authenticated, credit-deducting)
  ↓ POST /api/free-audit (unauthenticated, rate-limited, redacted)
api/query.py (FastAPI)
  → src/middleware.py authenticate() (Google token + DB upsert)
  → src/credits.py get_tool_cost() (credit check before execution)
  → src/agent.py route() (LLM classifies intent → tool name + query + extras)
  → src/tools/{tool}.py run() (Jina scrape/search → LLM analysis → Pydantic model)
  → src/db.py (Supabase: users, credit_transactions, search_history, evidence_traces, api_usage)
  → JSON response
```

### Vercel Deployment

Each `api/*.py` is a standalone FastAPI app. Vercel's `@vercel/python` runtime serves them as serverless functions. Routes are mapped in `vercel.json`. Note: `/api/report` and `/api/client-report` both route to `api/query.py` which has multiple FastAPI endpoints.

When adding a new API endpoint: add both a `builds` entry and a `routes` entry in `vercel.json` (route must come before the catch-all `/(.*)`).

### Frontend SPA

Modular SPA with hash-based routing (`/#/`, `/#/features`, `/#/pricing`, `/#/about`, `/#/app`, `/#/account`, `/#/admin`). Each page exports `mount(container)` and `unmount()`.

```
public/
  index.html                    -- SPA shell: Tailwind CDN config, fonts, Three.js importmap, cursor, nav/page containers
  css/main.css                  -- Design system CSS (light theme)
  js/
    router.js                   -- Hash-based SPA router with auth-guarded routes, dynamic import()
    auth.js                     -- Google Sign-In, sessionStorage token, JWT parsing, user state
    api.js                      -- Shared fetch helpers with auth headers, 401/402 handling, Stripe helpers
    pages/
      landing.js                -- Three.js 3D hero (glass TorusKnot, gold rings), 4 scrollable sections, dot nav
      features.js               -- 10 tool cards with filter, orchestrator section
      pricing.js                -- Billing toggle, 3 tiers, Stripe checkout integration
      about.js                  -- Mission, how-it-works, technology, values
      app.js                    -- Authenticated app (dark theme): sidebar, query, results, history
      account.js                -- Tier, credits, Stripe portal
      admin.js                  -- Admin dashboard: users table, stats, impersonate
    components/
      nav.js                    -- Glass morphism pill nav (marketing) / dark nav (app)
      cursor.js                 -- Custom cursor with dark section inversion
      scroll-effects.js         -- IntersectionObserver reveal, parallax, scroll progress
```

Design system: Alabaster (#F0F0EB) bg, Obsidian (#0F0F0F) text, Burnished Gold (#B89E5F) accent. Bodoni Moda + Inter + Cormorant Garamond fonts. `body.app-mode` class toggles dark theme for authenticated pages.

### Tools (10 total)

All tools follow `async def run(...) → tuple[PydanticModel, dict, EvidenceTrace]`:

| Tool | File | Credits | Data Source |
|------|------|---------|-------------|
| website_analyzer | `src/tools/website_analyzer.py` | 1 | Jina scrape |
| keyword_research | `src/tools/keyword_research.py` | 1 | Jina search |
| serp_analysis | `src/tools/serp_analysis.py` | 1 | Jina search |
| technical_seo | `src/tools/technical_seo.py` | 1 | Jina scrape |
| ga4_analytics | `src/tools/ga4.py` | 1 | GA4 API |
| competitor_analysis | `src/tools/competitor_analysis.py` | 2 | Jina search+scrape |
| content_gap | `src/tools/content_gap.py` | 2 | Jina search |
| content_generation | `src/tools/content_generator.py` | 2 | Jina search |
| topical_authority | `src/tools/topical_authority.py` | 2 | Jina search |
| backlink_strategy | `src/tools/backlink_strategy.py` | 2 | Jina search |
| seo_strategy | `src/tools/strategy_orchestrator.py` | 10 | Runs all above in phases |

Legacy tools return 2-tuples `(result, usage)` — handled by `_unpack_tool_result()` in `api/query.py` and `src/agent.py`.

### Scoring Rubric (`src/scoring_rubric.py`)

31 criteria across 4 categories (25% weight each: performance, seo, content, technical). The LLM evaluates each criterion; scores are **computed deterministically** by `website_analyzer.py` using weighted averages — the LLM does not set final scores. `_build_path_to_80()` generates a fix roadmap sorted by potential point gain.

### Strategy Orchestrator

Runs tools in phases: Phase 1 (parallel: analyzer + keywords + competitors + gaps) → Phase 2 (parallel: topical authority + technical + backlinks) → Phase 3 (sequential: content calendar) → Phase 4 (LLM synthesis with truncated outputs).

### Billing (Stripe)

`api/stripe_billing.py` handles checkout sessions, webhooks (checkout.session.completed, invoice.paid, customer.subscription.deleted), and customer portal. Credit deduction happens in `api/query.py` via `src/db.deduct_credits()` before tool execution. 402 response triggers upgrade modal on frontend.

### Admin (`api/admin.py`)

Protected by `authenticate_admin()` (checks `ADMIN_EMAILS` env var). Endpoints: list users, user detail, adjust credits, change tier, impersonate (run queries as another user), platform stats.

### Free Audit (`api/free_audit.py`)

Unauthenticated endpoint. Runs full `website_analyzer.run()` then applies `_redact_analysis()` server-side — CSS blur alone is insufficient (Network tab). Rate limited: 3 requests/hour/IP (in-memory, hashed). Response includes `_redacted: true` flag.

## Testing

217 tests (147 unit + 70 integration), all passing. Run with `python -m pytest tests/ -v`.

**Unit tests** (`tests/unit/`): config, credits, auth, middleware, scoring rubric, database layer, agent routing. Use `MockSupabaseClient` from `tests/conftest.py` for DB tests.

**Integration tests** (`tests/integration/`): All API endpoints tested via `httpx.AsyncClient` with `ASGITransport`. Covers auth flows (401/403), Stripe webhooks, rate limiting, admin operations, redaction logic.

Shared fixtures in `tests/conftest.py`: `mock_supabase`, `mock_auth`, `mock_admin_auth`, `db_user`, `pro_db_user`, `google_user_info`.

## Key Conventions

- All tool functions are `async def run(...)` returning a Pydantic model + usage dict + EvidenceTrace.
- LLM prompts request raw JSON (no markdown fences) matching Pydantic schemas in `src/models.py`.
- Prompt templates live in `src/prompts/templates.py` — each tool has paired `*_SYSTEM` and `*_USER` templates.
- Jina content is truncated before LLM calls (search: 3000 chars, scrape: 8000 chars) but raw data is preserved in evidence traces.
- Auth via `src/middleware.py`: `authenticate()` verifies Google token + upserts user in DB. `authenticate_admin()` adds admin check.
- Database access via Supabase client directly (no ORM). Tables: `users`, `credit_transactions`, `search_history`, `evidence_traces`, `api_usage`, `tracked_urls`, `audit_snapshots`, `ga4_connections`.
- Config loaded from environment variables via `.env` file. Key vars: `JINA_API_KEY`, `LLM_PROVIDER`, `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `SUPABASE_URL`, `SUPABASE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_EMAILS`.
- Report generation: `src/report_exporter.py` (HTML), `src/client_report.py` (Word .docx via python-docx).
