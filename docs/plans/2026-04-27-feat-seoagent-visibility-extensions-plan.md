---
title: seoagent visibility extensions — IndexNow, directory checklist, outreach kit
type: feat
status: phase-1-complete
date: 2026-04-27
brainstorm: docs/brainstorms/2026-04-27-seoagent-visibility-extensions-brainstorm.md
deepened: 2026-04-27
phase_1_shipped: 2026-04-27
---

## Phase 1 — Shipped 2026-04-27

Phase 1 (indexing + directories + visibility plumbing) is complete and dogfooded on this Retune repo. Phase 2 (outreach kit + Jina-powered competitor backlinks) is not yet shipped.

**Phase 1 deliverables (all in `~/.claude/skills/seoagent/`):**
- Schema: `findings.schema.json` extended (`visibility` category enum + optional `visibility_summary` top-level block); no migration shim needed
- New subpackage `_seoagent/visibility/` with 6 modules: `__init__.py`, `types.py`, `categorize.py`, `state.py`, `render.py`, `config.py`, `framework_paths.py`, `indexnow_client.py`
- New scripts: `submit_index.py` (~250 lines, ships into client kit; XXE-safe sitemap parser; symlink/`O_NOFOLLOW`/`O_EXCL` guards; `secrets.token_hex(16)` keys; CRLF/userinfo URL validation)
- New SSOT files: `templates/directories.json` (38 entries × 4 buckets, 2026 verified) + `templates/indexnow-engines.json`
- New schema: `scripts/schema/directories.schema.json`
- New references: `references/topic-indexing.md`, `references/topic-directories.md`
- `audit.py` v1.1.0: emits `vis_category_detected` finding + `visibility_summary` block
- `install.py` extension: ships full visibility kit; auto-appends `seo/visibility/.config.json` + `.state.json` + `.state.json.corrupt-*` to `<project>/.gitignore` (IndexNow key safety blocker)
- `parsers.py`: added `body_text` field to `ParsedPage` (256KB cap) for category keyword detection
- `SKILL.md`: Step 6 visibility section + 2 new disclosure rules
- New tests: `test_categorize.py` (9 tests), `test_visibility_security.py` (18 tests covering XXE/billion-laughs, symlink rejection, key file safety, slug regex, state corruption recovery, IndexNow chunking)
- **Total: 56 passing tests** (29 original + 27 new)

**Dogfood result on Retune (this repo):**
- Audit ran successfully; framework detected as `unknown`; visibility category fell back to `generic` (correct — SPA shell with minimal static signals)
- Install wrote 33 files / 311KB to `seo/`; `.gitignore` correctly auto-appended with the 3 IndexNow safety entries
- `seo/visibility/submit_index.py` from the installed kit successfully resolved site URL, generated key, picked durable source dir, refused to POST without sitemap (correct — Retune has no sitemap.xml)

**Bug found + fixed during dogfood:** sys.path resolution in `submit_index.py` — needed both `_HERE` (skill location) and `_HERE.parent` (kit location at `seo/visibility/`) for the `_seoagent` import to resolve in both contexts.

**Phase 2 not yet shipped:** `competitor_backlinks.py`, outreach templates, `topic-outreach.md`. Defer until user signals demand.

---


# seoagent visibility extensions — IndexNow, directory checklist, outreach kit

## Enhancement Summary

**Deepened on:** 2026-04-27 (same day as plan; 6 parallel agents consulted)
**Agents consulted:** security-sentinel, code-simplicity-reviewer, kieran-python-reviewer, architecture-strategist, performance-oracle, data-integrity-guardian.

**Verdict:** core architecture survives review; one structural redesign adopted (visibility lives inside `findings[]`, not as a sibling key); ~30% of the original v1 scope cut as YAGNI; 4 security blockers must land before any phase ships. None require rethinking the brainstorm decisions.

### Structural change adopted (eliminates the migration-shim concern entirely)

**Visibility findings live in the existing `findings[]` array with `category: "visibility"` + `score_impact: 0`** — not under a sibling `output["visibility"]` top-level key. Rationale (architecture-strategist): the `findings[]` pipe is already category-scoped; extending the category enum is a one-line schema change; `path_to_80` mechanically picks up visibility findings; v2 scored-promotion becomes a weight rebalance only. Eliminates: backward-compat shim, parallel render path in `install.py`, schema-version-comparison logic. The `output["visibility"]` key shrinks to a small **summary block** (category, indexing status, completed counts) — *not* a parallel findings repository.

### Security blockers (must land before Phase 1)

1. **Sitemap parser is currently a string-search heuristic** (`live_check.py:386–402` counts `<loc>` substrings). Real XML parser required for `group_urls_by_host` + 10k chunking. `xml.etree.ElementTree` ≤Python 3.12 is **vulnerable to entity expansion DoS**. Must use `XMLParser` with `feed()` + custom handler that rejects DOCTYPE/external-entity pre-parse, hard caps at 50k elements + 50MB body. Add billion-laughs payload test.
2. **Symlink traversal on durable-static-dir write.** After framework detection picks `public/`/`static/`, re-call `_assert_inside(project, static_dir.resolve())` AND `if static_dir.is_symlink(): refuse`. Open key file with `os.O_NOFOLLOW | os.O_CREAT | os.O_EXCL` (mirror `install.py:261`).
3. **`.config.json` leaks IndexNow key into git.** Plan must (a) `install.py` appends `seo/visibility/.config.json` + `.state.json` to `<project>/.gitignore`; (b) emit `visibility.indexing.config_committed` finding if file is already git-tracked; (c) document risk in `topic-indexing.md`. An attacker with the leaked key can submit arbitrary URLs *as the user's site* to IndexNow → reputation/quota damage.
4. **CSV formula injection in `tracking.csv`.** Prefix any cell starting with `=`, `+`, `-`, `@`, `\t`, `\r` with single-quote, OR wrap cell in `"\t" + value`. Apply uniformly to URL, contact_name, notes columns. `_sanitize_csv_cell()` helper, used on every append.

### Data-integrity blockers (silent-corruption class)

5. **`tempfile.NamedTemporaryFile(dir=target.parent, delete=False)`** — explicit. System tmpdir on a different volume → `os.replace` becomes copy+unlink, NOT atomic. Applies to every state-write path.
6. **Semver compared as tuple, not lexicographic string.** `tuple(map(int, version.split(".")))`. Without this, the day v1.10.x ships, the (then-deleted) shim wouldn't fire correctly anyway — but document for future migrations.
7. **Lock around read-modify-write, not just write.** `fcntl.flock` held for the entire transaction (read state → render → write state), not just the final write. Applies to all visibility scripts that touch `.state.json`.

### Cuts (v1 YAGNI — net ~30% LOC reduction)

8. **Cut `dump_directories.py` + per-category generated `.md` files.** Load `directories.json` at runtime, render the one relevant category into `seo/visibility/directories.md`. Saves: ~80 lines + pre-commit hook + drift CI + 4 generated files. (code-simplicity, confirmed by data-integrity which made the regen pattern's correctness expensive to test.)
9. **Cut 6-category detection → 4 buckets** (`saas`, `agency`, `blog-media`, `generic`). Detecting `ecommerce`/`local-business`/`indie-creator` only to fall through to `generic` is theatre. Saves: ~30 lines scoring + 6 fixtures.
10. **Cut `runner_up` + `margin` + `confidence` + `fallback_reason` fields.** Emit only `primary` + `fallback_to_generic: bool`. Nothing reads the diagnostic fields in v1.
11. **Cut archived slugs `<details>` block.** Slugs won't change for the first year. Defer until one actually retires.
12. **Cut user-additions H2 round-trip.** User keeps personal notes in `seo/visibility/notes.md` (untouched by skill). Removes ~30 lines parser logic + sentinel-comment design + 1 test.
13. **Cut `state_schema_version` + `visibility-state.schema.json`.** Premature versioning of a file the user owns. Add when v2 lands.
14. **Cut backward-compat migration shim.** With visibility-in-findings[] (structural change above), `visibility` is no longer a top-level key — there's nothing to migrate. Skill shipped recently, no real prior files.
15. **Cut Bluesky DM template.** User hasn't asked for it. Ship 4 emails + 1 LinkedIn note.
16. **Cut `cf-indexnow` auto-detect.** Submitting to IndexNow when CF already submits is idempotent on CF's side. Save 1 HEAD request + finding type + edge-case test.
17. **Cut conditional install of `competitor_backlinks.py`.** Always-ship, fail-closed at runtime. Removes install-time env-var branching, manifest variants, and re-install surprises (architecture-strategist + code-simplicity, both agreed).

### Module reshape (kieran-python + architecture)

18. **Convert `_seoagent/visibility.py` to subpackage `_seoagent/visibility/`** with: `config.py` (site URL + IndexNow key), `state.py` (read/write/quarantine, lock), `render.py` (checklist + indexing + outreach markdown), `categorize.py` (moved from peer location — categorisation IS visibility, not framework detection). Each becomes independently testable; mirrors existing `_seoagent/` one-concern-per-file convention.
19. **Split `submit_index.py` into helpers** under `_seoagent/visibility/`: `framework_paths.py` (the 9-row table becomes data, not control flow), `indexnow_client.py` (POST + retry + chunking). `submit_index.py` shrinks to ~80 lines of `main()` + glue.

### Type-hint hardening (kieran-python)

20. `Category = Literal["saas", "agency", "blog-media", "generic"]` (and `friction = Literal["low", "medium", "high"]` in `directories.json` schema).
21. Add `socket.gaierror` + `ValueError` to named-exception list (DNS failure semantics + URL parsing). Drop `UnicodeDecodeError` if not provably triggered.
22. Document exit codes: `EXIT_OK=0`, `EXIT_USAGE=2`, `EXIT_NETWORK=1`, `EXIT_CONFIG=3`. Caller-friendly for the eventual GitHub Action.
23. `TypedDict` for `VisibilityBlock` — typo-catch at static-analysis time.
24. `secrets.token_hex(16)` for IndexNow key (not `uuid.uuid4().hex`) — signals security intent.

### Performance revisions (performance-oracle)

25. **Parallelise `competitor_backlinks.py`** across competitors with `ThreadPoolExecutor(max_workers=5)`. Target: **<30s** for 5×3 queries (was <90s). Jina charges per query regardless of concurrency — original "no parallelism for cost reasons" rationale was wrong.
26. **Sitemap index + gzip support.** `submit_index.py` follows `<sitemapindex>`, decompresses `.xml.gz` via `gzip.decompress`, hard-caps at 100k URLs total with explicit `indexing.urls_truncated` finding.
27. **Cap `Retry-After` at 10s.** If server requests longer wait, fail-soft with `indexing.rate_limited_deferred` finding (next run resumes); don't hang the whole script.
28. **JSON-LD parsed once** in categorize: `jsonld_types: set[str]` cached, then membership-tested. Currently pseudocode re-parses 6+ times on each detect call.
29. **`fcntl.flock` with `LOCK_NB` + 30s max-wait + stale-lock detection** (POSIX `os.kill(pid, 0)`). Indefinite blocking on a hung peer is a hostile UX.
30. **Connection reuse for Jina** via `http.client.HTTPSConnection` keep-alive — saves ~15 TLS handshakes (~2.25s) across 15 sequential queries.
31. **Revised acceptance:** `submit_index.py < 5s for 1k URLs; < 30s for 100k URLs; categorize < 100ms on 1MB HTML; competitor_backlinks < 30s with parallelism; archived directories cap at 20 rendered (full set in state).`

### SSOT consistency (architecture)

32. **JSON-source IndexNow engines list** (`templates/indexnow-engines.json`) so `topic-indexing.md` + `submit_index.py` log strings + `findings.engines_pinged` validation all derive from one place. ~30min cost; eliminates known-drift risk.
33. **Defer outreach SSOT (`templates/outreach.json`).** Architecture suggested it; simplicity-reviewer cut the dump-pipeline pattern. Land outreach as raw `.md` templates with header-comment metadata in v1 — promote to JSON SSOT only when a third use case emerges.

### Phase consolidation: 3 → 2

34. **Phase 1 (5–7h)** — schema enum extension + `_seoagent/visibility/` subpackage scaffolding + `submit_index.py` + categorize + render directories checklist + state mgmt + tests. (Was Phases 1+2.)
35. **Phase 2 (3–4h)** — outreach templates + always-ship `competitor_backlinks.py` (parallelised, fail-closed) + `topic-outreach.md` + tests.

Estimated total holds at **8–11h** (down from 10–14h) — savings come from cuts, not from compromising rigor.

---

## Overview

Three additions to the existing `seoagent` Claude Code skill (`~/.claude/skills/seoagent/`) that move it from "audit + fix on-page" to "max visibility on deploy" for any website the user ships. The skill stays zero-dep stdlib Python; visibility data emits under a new sibling `output["visibility"]` key (parallel to `findings[]`); state survives across re-runs via slug-keyed `.state.json`; `install.py` ships a `seo/visibility/` kit alongside the existing `seo/` deliverables.

Three extensions, each shippable independently, each phased:

1. **Indexing submission** — IndexNow protocol POST + framework-aware key file placement + GSC/Bing manual deeplinks
2. **Directory submission infrastructure** — JSON SSOT (`templates/directories.json`) + heuristic site categorisation (6-category detect, 3-curated + generic fallback) + per-category checklist generation
3. **Outreach kit** — 4 email templates + LinkedIn note + Bluesky DM + tracking CSV + optional Jina-powered prospect generation when `JINA_API_KEY` is set

All decisions resolved in the brainstorm (Q1: separate report section unscored; Q2: option-c Jina-if-present + Retune fallback; Q3: JSON SSOT with generated docs; Q4: 3 curated categories with on-demand expansion; Q5: unscored v1).

## Problem Statement

The current seoagent skill is excellent at on-page truth (schema, meta, llms.txt, AI crawler policy). It is silent on three classes of off-page visibility action that drive 60%+ of fresh-site visibility gain:

- **Indexing latency** — new pages may sit unindexed by Bing/Yandex/Naver/Seznam for weeks. IndexNow ingests near-instantly. Stdlib-only POST. Free.
- **Directory backlinks** — high-DR editorial directories (Product Hunt, G2, Clutch, AllTop) provide both real referral traffic and trust signals. Submission requires curation knowledge (which directories, what they accept, time-to-list, signup friction) the user otherwise has to build engagement-by-engagement.
- **Outreach** — link reclamation, broken-link, resource-page, and guest-post outreach still produce 5–18% reply rates in 2026 with the right templates and deliverability hygiene. Without a scaffold, users either don't ship outreach or ship spam.

For the user (deploying their own websites), each `/seoagent` run should produce a complete punch list — not just "your meta tags are fine," but "submit to these N places, ping these search engines, run this outreach to these N sites by next Friday."

## Proposed Solution

### Architecture (slot-in to existing skill) — REVISED post-deepening

```
~/.claude/skills/seoagent/
  SKILL.md                                  -- update: add Step 6 (visibility) + 3 disclosure rules
  templates/
    directories.json                        -- NEW: JSON SSOT, 4 buckets (saas, agency, blog-media, generic)
    indexnow-engines.json                   -- NEW: SSOT for participating engines
    outreach/                               -- NEW: 5 templates + tracking CSV header (Bluesky cut)
      email-link-reclamation.md
      email-broken-link.md
      email-resource-page.md
      email-guest-post.md
      linkedin-note.md
      tracking.csv.template
    visibility-checklist.md.template        -- NEW: render template for seo/visibility/directories.md
  references/
    topic-indexing.md                       -- NEW: IndexNow + GSC/Bing manual setup (engines from indexnow-engines.json)
    topic-directories.md                    -- NEW: hand-curated playbook (NOT generated; loads JSON at use time)
    topic-outreach.md                       -- NEW: outreach playbook + 2026 deliverability hygiene
  scripts/
    submit_index.py                         -- NEW: ~80-line orchestrator (main + glue), ships into client kit
    competitor_backlinks.py                 -- NEW: Jina prospect generator, ALWAYS shipped, fail-closed at runtime
    _seoagent/
      visibility/                           -- NEW: subpackage, one-concern-per-file
        __init__.py                         -- public API re-exports
        config.py                           -- site URL resolution, IndexNow key gen + persist + verify
        state.py                            -- .state.json read/write/quarantine, lock acquisition
        render.py                           -- directories checklist + indexing.md + outreach token pre-fill
        categorize.py                       -- 4-bucket heuristic detector (saas/agency/blog-media/generic)
        framework_paths.py                  -- durable-source-dir table per framework (data, not code)
        indexnow_client.py                  -- POST + retry + chunking + sitemap parser (XXE-safe)
    schema/
      findings.schema.json                  -- EXTEND: add "visibility" to category enum (one-line change)
      directories.schema.json               -- NEW: validates directories.json (slug regex, DR range, friction Literal)
  tests/
    fixtures/
      audit/                                -- moved from clean-site/, broken-site/ (fixture convention)
        clean-site/
        broken-site/
      categorization/                       -- NEW: 4 fixtures (1 per bucket — saas, agency, blog, generic)
    test_categorize.py                      -- NEW: ≥3/4 precision, 0 false-positives on generic ground truth
    test_submit_index.py                    -- NEW: mocked IndexNow flow + sitemap parsing + symlink + CSV injection
    test_visibility_state.py                -- NEW: state preservation, slug normalisation, corruption recovery
    test_competitor_backlinks.py            -- NEW: fail-closed (Jina key missing/invalid/quota), CSV cell sanitization
```

**Removed from original plan (per Enhancement Summary cuts):** `dump_directories.py`, `references/directories/{saas,agency,blog-media,generic}.md` (generated files), `_seoagent/categorization.py` peer module (moved into subpackage), `_seoagent/visibility.py` god module (split into subpackage), `templates/outreach/bluesky-dm.md`, `visibility-state.schema.json`.

### Client kit (what `install.py` writes into `<project>/seo/`)

```
seo/
  ... existing audit deliverables ...
  visibility/
    directories.md                          -- rendered checklist, slug-keyed, idempotent across re-runs
    indexing.md                             -- IndexNow status + GSC/Bing deeplinks
    outreach/
      email-link-reclamation.md             -- {brand}, {your_url} pre-filled; rest as visible placeholders
      email-broken-link.md
      email-resource-page.md
      email-guest-post.md
      linkedin-note.md
      bluesky-dm.md
      tracking.csv                          -- header only; user appends
      finding-prospects.md                  -- Retune handoff instructions
    submit_index.py                         -- shipped (mirror audit.py pattern); user can re-run
    competitor_backlinks.py                 -- shipped CONDITIONALLY (only if JINA_API_KEY was set at install)
    .state.json                             -- slug-keyed completion state, schema-versioned
    .config.json                            -- resolved site URL, IndexNow key (32-char hex), CF auto-submit detection
```

`dump_directories.py` stays skill-side (regen utility, not user tool).

### Visibility data in `findings.json` — REVISED post-deepening

**Visibility findings live INSIDE the existing `findings[]` array** with `category: "visibility"` and `score_impact: 0` (unscored in v1; weight rebalance becomes a one-line change in v2 if promoted to a scored category).

The schema change is a one-line enum extension on the `category` field of the finding-item subschema:
```diff
- "category": { "enum": ["classic_seo", "structured_data", "geo", "performance"] }
+ "category": { "enum": ["classic_seo", "structured_data", "geo", "performance", "visibility"] }
```

**Score-renormalisation safety:** `_seoagent/scoring.py:score_category` and `score_overall` (existing) iterate `CATEGORY_WEIGHTS` directly — they will silently ignore findings whose category isn't in the weights dict. Add an explicit guard: `score_category` filters findings to known-weighted categories only. Visibility findings never reach the scorer.

A small **summary block** (not a parallel findings repository) lives at top-level for convenience — used by `install.py` to render the visibility section without iterating `findings[]`:

```json
{
  "timestamp": "...",
  "seoagent_version": "1.1.0",
  "project_path": "...",
  "framework": "...",
  "scores": { /* existing 4 categories, untouched */ },
  "findings": [
    /* existing 4-category findings, untouched */
    { "criterion_id": "vis_indexing_submitted",
      "category": "visibility",
      "severity": "info",
      "score_impact": 0,
      "observation": "Submitted 47 URLs to IndexNow across 5 engines",
      "recommendation": "Re-run on every deploy" }
  ],
  "path_to_80": [ /* visibility actions appear here when promotable to score gain */ ],
  "visibility_summary": {
    "category": { "primary": "saas", "fallback_to_generic": false },
    "indexing": {
      "status": "submitted" | "deeplinks_only" | "no_site_url" | "rate_limited_deferred",
      "key_id": "abc123...",
      "urls_submitted": 47
    },
    "directories": { "list_slug": "saas", "total": 10, "completed": 3 },
    "outreach": {
      "templates_rendered": 5,
      "prospects_generated": 0 | 12,
      "jina_status": "ok" | "key_missing" | "key_invalid_401" | "quota_exhausted" | "partial"
    }
  }
}
```

**Backward compatibility:** with visibility folded into `findings[]`, there is no migration shim. Old `findings.json` files (no visibility findings, no `visibility_summary`) validate fine — `findings[]` items with the old 4-category enum still pass the new 5-category enum (subset relation). The `visibility_summary` field is optional. Diff mode: prior files lacking `visibility_summary` → render baseline. No backward-compat shim, no version comparison logic, no schema bump beyond the one-line enum extension.

**Score-impact field on findings:** `score_impact: int` — what this finding's path-to-80 weight would be if promoted to scored. v1: always 0 for visibility findings. v2: rebalance category weights, set per-finding `score_impact` per the rubric.

## Technical Approach

> **POST-DEEPENING PHASE MAP**
>
> The original 3-phase breakdown is preserved below for full detail (script contracts, pseudocode, test specs). The shipping plan **collapses to 2 phases** per the Enhancement Summary:
>
> - **Revised Phase 1** (5–7h) = original Phase 1 + Phase 2, with cuts: drop `dump_directories.py`, drop per-category generated `.md`, drop user-additions H2 round-trip, drop archived `<details>`, drop migration shim, drop CF-IndexNow auto-detect, drop state-schema versioning, simplify category detection 6→4 buckets, drop `runner_up`/`margin`/`fallback_reason` fields. Add: real XXE-safe sitemap parser, sitemap-index + gzip handling, symlink/O_NOFOLLOW guards on key file write, `.gitignore` auto-append for `.config.json`, `secrets.token_hex(16)` for key generation, `_seoagent/visibility/` subpackage with config/state/render/categorize/framework_paths/indexnow_client modules.
> - **Revised Phase 2** (3–4h) = original Phase 3, with: always-ship `competitor_backlinks.py` (fail-closed at runtime), `ThreadPoolExecutor(max_workers=5)` parallelism across competitors (target <30s), `http.client.HTTPSConnection` keep-alive for Jina, CSV cell sanitization (`_sanitize_csv_cell` for formula injection), drop Bluesky DM template.
>
> Where the detailed sections below specify behaviour that conflicts with the Enhancement Summary, **the Enhancement Summary wins**.

### Implementation phases

Three phases, each independently shippable. Phase 1 + 2 cover the visibility surface; Phase 3 is the outreach kit which depends only on Phase 2's site categorisation.

---

#### Phase 1 — Indexing submission (4–6h)

**Deliverables:**
- `scripts/submit_index.py` (~250 lines)
- `references/topic-indexing.md` (~80 lines)
- `_seoagent/visibility.py` partial: site URL resolution, IndexNow key management
- `tests/test_submit_index.py`
- Schema bump (`findings.schema.json` v1.1.0)

**Site URL resolution (precedence):**
1. CLI flag `--site-url https://example.com`
2. Env var `SEOAGENT_SITE_URL`
3. Canonical link tag from `audit.py`'s parsed homepage HTML
4. First `<loc>` host in `public/sitemap.xml`
5. None → emit `visibility.indexing.no_site_url` finding, write deeplinks-only `indexing.md`, do zero network calls

Once resolved, persist to `seo/visibility/.config.json` so re-runs don't re-prompt.

**Framework-aware key file placement (durable source dir, NEVER build output):**

| Framework | Durable source dir | Build output (DO NOT WRITE) |
|---|---|---|
| Next.js (App + Pages) | `public/` | `.next/`, `out/` |
| Astro | `public/` | `dist/` |
| Nuxt | `public/` | `.output/` |
| Vite/React | `public/` | `dist/` |
| Plain static HTML | repo root or `static/` | n/a |
| Hugo | `static/` | `public/` (NB: Hugo's source is `static/`, build is `public/` — opposite of others) |
| Jekyll | repo root + `.nojekyll` (or `assets/`) | `_site/` |
| 11ty | repo root or `_static/` | `_site/` |
| Gatsby | `static/` | `public/` |

If detected dir matches any `.gitignore` entry → refuse to write, emit `visibility.indexing.unsafe_keyfile_path` finding listing the build dir the user must redeploy after writing. For Hugo/Jekyll/11ty, where build dir collisions are common, double-check `.gitignore` before write.

**`submit_index.py` contract:**

```python
# scripts/submit_index.py
import argparse, json, os, sys, urllib.parse, urllib.request, uuid
from pathlib import Path

def main() -> int:
    args = parse_args()
    project = Path(args.project_path).resolve(strict=True)
    site_url = resolve_site_url(project, args.site_url, env=os.environ)
    if not site_url:
        emit_no_site_url_finding(project)
        return 0  # success: deeplinks-only mode is valid

    config = load_or_create_config(project)  # generates 32-char hex key on first run
    static_dir = detect_durable_static_dir(project)  # framework-aware, gitignore-checked
    write_key_file(static_dir, config["key"], dry_run=args.dry_run)

    cf_auto = detect_cloudflare_auto_indexnow(site_url)  # HEAD on apex, look for cf-indexnow header
    if cf_auto:
        emit_skipped_cf_auto_finding(project, site_url)
        return 0

    sitemap_urls = parse_sitemap(static_dir / "sitemap.xml")  # reuse XXE-safe parser from audit.py
    by_host = group_urls_by_host(sitemap_urls)  # one POST per host
    if site_url's host not in by_host:
        emit_finding("indexing.host_mismatch", ...)
        return 1

    for host, urls in by_host.items():
        verify_key_file_reachable(host, config["key"])  # pre-flight HEAD
        for batch in chunk(urls, size=10000):
            response = post_indexnow(host, config["key"], batch, dry_run=args.dry_run)
            handle_response(response)  # 200/202=ok, 429=Retry-After+1 retry, 4xx=fail-soft
    write_visibility_indexing_block(project, ...)
    return 0
```

**IndexNow request shape (confirmed via framework-docs research):**
- Endpoint: `https://api.indexnow.org/indexnow` (lowercase; `/IndexNow` deprecated but resolves)
- POST, `Content-Type: application/json; charset=utf-8`
- Body: `{"host": "<hostname>", "key": "<32-char hex>", "keyLocation": "<url>", "urlList": [...]}`
- Response: 200 ok / 202 accepted / 400 malformed / 403 invalid key / 422 host mismatch / 429 rate limit
- Max 10k URLs per POST
- Key file at `https://host/<key>.txt`, plain UTF-8, contents = key only

**Cloudflare auto-IndexNow detection:**
HEAD request on `https://<host>/`; if response includes `cf-indexnow: 1` header → CF is already submitting, skip our submission with `skipped_cf_auto` finding. Reuse `live_check.py:_safe_fetch` for SSRF+size+redirect guards.

**Reuse from `live_check.py`:**
- `_validate_url` (SSRF + scheme whitelist + creds-strip)
- `_assert_host_is_public` (RFC1918/loopback/link-local rejection)
- `_safe_fetch` (size cap, timeout, redirect cap, key sanitisation in logs)
- `_strip_sensitive` (extend to cover request headers, not just URL query — Jina key risk in Phase 3)

**Pseudocode for `references/topic-indexing.md` outline:**
- What IndexNow is + what engines participate (Bing/Yandex/Naver/Seznam/Yep — explicitly NOT Google)
- Why submit_index.py exists + when to re-run (after every deploy)
- GSC manual instructions: 60-second walkthrough, sitemap submit deeplink template
- Bing Webmaster Tools manual instructions: same
- Cloudflare auto-IndexNow note: if you're on CF, you may already be covered

**Tests (`test_submit_index.py`):**
- Site URL resolution: each precedence rung in isolation, plus resolution-failure path
- Key generation idempotence: re-run produces same key (read from `.config.json`)
- IndexNow POST shape: mock urlopen, assert request body matches spec
- 429 retry: mock first response 429 with `Retry-After: 1`, second 200 → assert retry happened
- Host mismatch: sitemap with `other.com` URL but key host is `example.com` → emit `host_mismatch` finding
- 10k chunking: 25k-URL sitemap → assert 3 POSTs
- CF auto detection: mock HEAD with `cf-indexnow: 1` → assert zero POSTs + correct finding
- Unsafe path: gitignored static dir → assert refuse-to-write + correct finding
- Dry-run: assert no network, no file writes, but rendered indexing.md preview output

**Acceptance criteria for Phase 1:**
- [ ] `submit_index.py --help` works, exits 0
- [ ] No-site-URL run emits exactly one `visibility.indexing.deeplinks_only` finding, makes zero network calls
- [ ] Successful run writes key file to durable source dir, persists key in `.config.json`, emits ≥1 batch POST to IndexNow
- [ ] CF auto-detect short-circuits with correct finding
- [ ] All HTTP via `urllib.request` with `_safe_fetch`-equivalent guards
- [ ] Schema validation passes for all new findings
- [ ] All test cases above pass

---

#### Phase 2 — Directory submission infrastructure (4–6h)

**Deliverables:**
- `templates/directories.json` (JSON SSOT, ~30 entries across 3 categories + generic)
- `_seoagent/categorization.py` (6-category heuristic detector)
- `scripts/dump_directories.py` (regenerator)
- `references/topic-directories.md` (generated)
- `references/directories/{saas,agency,blog-media,generic}.md` (generated)
- `templates/visibility-checklist.md.template`
- `_seoagent/visibility.py` partial: state mgmt, slug resolution, checklist render
- `scripts/schema/visibility-state.schema.json` (NEW)
- `tests/test_categorization.py`, `tests/test_visibility.py`
- `tests/fixtures/categorization/{saas,agency,blog,ecom,local,indie}/` (12 HTMLs, 2 per category)

**`templates/directories.json` schema (mirrors `ai-crawlers.json` pattern):**

```json
{
  "$schema_note": "Curated directory list. Hand-edit this file; references/topic-directories.md and per-category .md files are GENERATED via scripts/dump_directories.py.",
  "last_reviewed": "2026-04",
  "categories": {
    "saas": { "description": "B2B / SaaS / dev tools", "directories": [/* slug-stable entries */] },
    "agency": { "description": "Marketing / SEO / dev agencies", "directories": [...] },
    "blog-media": { "description": "Content / blogs / newsletters", "directories": [...] },
    "generic": { "description": "Universal high-DR directories for uncurated categories", "directories": [...] }
  }
}
```

Per-directory record:
```json
{
  "slug": "producthunt",
  "name": "Product Hunt",
  "url": "https://www.producthunt.com/posts/new",
  "homepage": "https://producthunt.com",
  "accepts": "New product launches",
  "time_to_list": "Same-day (launch event)",
  "friction": "medium",
  "dr": 91,
  "signup_required": true,
  "dofollow": true,
  "notes": "Need maker account + ideally a hunter. Plan launch carefully — single shot.",
  "added": "2026-04",
  "last_verified": "2026-04"
}
```

`slug` is **immutable once shipped** — renames create new slugs, old slugs go to `archived[]`.

**Seed content (from best-practices research, 2026-current):**

SaaS (10): Product Hunt, G2 (note: Capterra/GetApp/Software Advice consolidated under Gartner — single submission), AlternativeTo, SaaSHub, BetaList, Indie Hackers, Crunchbase, F6S, Trustpilot, SourceForge (open-source only).

Agency (10): Clutch, GoodFirms, DesignRush, The Manifest, Sortlist, Agency Spotter, TechBehemoths, Expertise.com, UpCity, Awwwards (free agency listing).

Blog/Media (10): AllTop, Feedly (auto-discovery, no submission needed but feed must validate), Flipboard, Substack Reads, Medium publication submission, NewsBreak, Hacker News (per-post), Reddit (per-post, relevant subs), Bluesky (custom feed inclusion + starter packs), Mastodon Trunk.

Generic fallback (8 universal high-DR): Crunchbase, LinkedIn Company Page, Trustpilot, Wikipedia (where eligible), Wikidata, Hacker News (per-post), Reddit (per-post), Product Hunt (where applicable).

**`_seoagent/categorization.py` heuristics (deterministic, no LLM):**

Score each of 6 categories 0–N from parsed homepage HTML (already available in `audit.py`):

```python
def categorize(parsed_head, parsed_body, framework: str | None) -> CategoryResult:
    scores = {"saas": 0, "agency": 0, "blog-media": 0,
              "ecommerce": 0, "local-business": 0, "indie-creator": 0}
    text = (parsed_body.text or "").lower()

    # SaaS signals
    if "/pricing" in collected_links: scores["saas"] += 3
    if any(w in text for w in ["free trial", "start free", "book a demo", "request a demo"]): scores["saas"] += 2
    if has_jsonld_type(parsed_body, "SoftwareApplication"): scores["saas"] += 4
    if has_login_signup_links(parsed_head): scores["saas"] += 1

    # Agency signals
    if any(w in text for w in ["our services", "case studies", "case study", "our work", "portfolio"]): scores["agency"] += 2
    if any(w in collected_links for w in ["/services", "/case-studies", "/work", "/clients"]): scores["agency"] += 2
    if has_jsonld_type(parsed_body, "ProfessionalService"): scores["agency"] += 3

    # Blog/Media signals
    if has_jsonld_type(parsed_body, "Blog") or has_jsonld_type(parsed_body, "NewsMediaOrganization"): scores["blog-media"] += 4
    if "/feed" in collected_links or "/rss" in collected_links: scores["blog-media"] += 2
    if count_article_tags(parsed_body) >= 3: scores["blog-media"] += 2
    if has_author_meta(parsed_head): scores["blog-media"] += 1

    # E-commerce signals
    if has_jsonld_type(parsed_body, "Product") or has_jsonld_type(parsed_body, "Store"): scores["ecommerce"] += 4
    if any(w in text for w in ["add to cart", "checkout", "buy now", "shop"]): scores["ecommerce"] += 3
    if "/cart" in collected_links or "/products" in collected_links: scores["ecommerce"] += 2

    # Local business signals
    if has_jsonld_type(parsed_body, "LocalBusiness"): scores["local-business"] += 4
    if has_address_or_phone(parsed_head, parsed_body): scores["local-business"] += 2
    if any(w in text for w in ["opening hours", "visit us", "directions"]): scores["local-business"] += 1

    # Indie creator signals
    if has_jsonld_type(parsed_body, "Person"): scores["indie-creator"] += 3
    if any(w in text for w in ["i'm a", "i am a", "my projects", "things i've built", "hi, i'm"]): scores["indie-creator"] += 2
    if not has_jsonld_type(parsed_body, "Organization"): scores["indie-creator"] += 1

    # Tie-break: require margin ≥2 over runner-up; else fall back to "generic"
    primary, runner_up = sorted(scores.items(), key=lambda x: -x[1])[:2]
    margin = primary[1] - runner_up[1]
    if margin < 2 or primary[1] < 3:
        return CategoryResult(
            primary="generic", confidence=primary[1], runner_up=primary[0], margin=0,
            fallback_reason="ambiguous" if margin < 2 else "low_signal"
        )
    return CategoryResult(
        primary=primary[0], confidence=primary[1], runner_up=runner_up[0], margin=margin,
        fallback_reason=None
    )
```

For the 3 uncurated categories (e-commerce, local-business, indie-creator), still emit them as the chosen `primary` label but render the **generic** directory list — don't pretend an e-commerce site is a SaaS.

**`scripts/dump_directories.py` (mirrors `dump_rubric.py` pattern, ~80 lines):**
- Read `templates/directories.json`
- Write `references/topic-directories.md` (full merged table, all categories)
- Write `references/directories/{saas,agency,blog-media,generic}.md` (per-category)
- Each generated file has `<!-- AUTOGENERATED — do not hand-edit. Source: templates/directories.json -->` header
- Pre-commit hook: re-run `dump_directories.py`, fail CI on any drift

**Visibility checklist render (`_seoagent/visibility.py`):**

```python
def render_directories_checklist(
    project: Path,
    category_result: CategoryResult,
    state: dict,
    directories_json: dict,
) -> str:
    list_slug = category_result.primary if category_result.primary in {"saas", "agency", "blog-media"} \
                else "generic"
    fallback = list_slug == "generic" and category_result.primary != "generic"
    items = directories_json["categories"][list_slug]["directories"]

    lines = [build_header(category_result, fallback)]
    lines.append("## Active checklist")
    for entry in items:
        completed = state.get("directories", {}).get(entry["slug"], {}).get("completed", False)
        lines.append(format_checklist_item(entry, completed))

    archived = identify_archived_slugs(state, items)
    if archived:
        lines.append("\n<details><summary>Previously listed (no longer in current set)</summary>\n")
        for slug in archived:
            lines.append(format_archived_item(state["directories"][slug]))
        lines.append("</details>")

    user_additions = state.get("user_additions", "")
    if user_additions:
        lines.append("\n## User additions (round-tripped from prior render)\n")
        lines.append(user_additions)

    return "\n".join(lines)
```

**State management (`seo/visibility/.state.json`):**

```json
{
  "state_schema_version": 1,
  "last_updated": "...",
  "directories": {
    "producthunt": { "completed": true, "completed_at": "...", "notes": "" },
    "g2": { "completed": false }
  },
  "user_additions": "## User additions\n\n- [ ] My custom directory ...",
  "indexing": { "key": "...", "last_submitted_at": "..." }
}
```

On re-run, the renderer:
1. Reads `.state.json`. If parse fails → quarantine to `.state.json.corrupt-<ISO>` and emit `visibility.state.recovered` finding with a fresh state file
2. Renders checklist from `directories.json` + state, preserving completed-bit by slug
3. Slugs in state but no longer in JSON → render in archived `<details>` block
4. Parses prior rendered file's `## User additions` H2 block (everything after that header until EOF) and round-trips into new render
5. Atomic write via tempfile + `os.replace`, mirroring `install.py:_write_tmp`

**Schema migration (compatibility):**
- `findings.schema.json` bumped to v1.1.0; `visibility` is **optional** (not in `required`)
- `install.py` reader: when prior `findings.json` lacks `visibility`, treat as "no prior visibility data, render baseline" (no error)
- Inject `visibility: null` in-memory before validation if `seoagent_version < 1.1.0`
- New `visibility-state.schema.json` validates `.state.json` on every read

**Tests (`test_categorization.py`):**
- 12 fixture HTMLs (2 per category) under `tests/fixtures/categorization/`
- Acceptance: ≥10/12 correct categorisation; 0 false-positives where ground truth is "generic"
- Edge case fixtures: SaaS-with-blog (should be SaaS, blog is runner-up), agency-with-case-studies (should be agency), low-signal placeholder page (should be generic)

**Tests (`test_visibility.py`):**
- State preservation: completed slug survives re-run with same `directories.json`
- Slug archived: completed slug removed from JSON → render in archived block, state retained
- User additions round-trip: rendered file with `## User additions` block → next render preserves verbatim
- Corruption recovery: malformed `.state.json` → quarantined, fresh state, finding emitted
- Concurrent invocation: two `submit_index.py` runs against same project → second blocks on `seo/.install.lock`, no race
- Schema validation: `visibility` block emitted by `audit.py` validates against `findings.schema.json` v1.1.0
- Backward compat: prior `findings.json` without `visibility` validates after migration shim

**Acceptance criteria for Phase 2:**
- [ ] Categoriser scores ≥10/12 on fixtures with 0 false-positives on generic
- [ ] `dump_directories.py` regenerates all derived `.md` files; pre-commit fails on drift
- [ ] Checklist render preserves completion state across 3 re-runs (clean / with completions / with manual edits)
- [ ] Archived slugs render in `<details>` block; state isn't silently dropped
- [ ] Fallback-to-generic emits explicit finding with `category_result.primary` ≠ `list_slug`
- [ ] State corruption → quarantine + finding + fresh state
- [ ] All HTTP/file IO via `urllib`/atomic-write patterns; no third-party deps
- [ ] All test cases above pass

---

#### Phase 3 — Outreach kit (3–4h)

**Deliverables:**
- `templates/outreach/` — 6 templates + `tracking.csv.template` + `finding-prospects.md`
- `scripts/competitor_backlinks.py` (~200 lines, conditional ship)
- `references/topic-outreach.md` (~150 lines, hand-curated playbook)
- Outreach block in `_seoagent/visibility.py` (template render with token pre-fill, prospect CSV write)
- `tests/test_competitor_backlinks.py`

**Email templates (4 + 2 non-email surfaces, all tokens documented in header block):**

Each template starts with:
```markdown
<!--
TEMPLATE: link-reclamation
USE WHEN: Site mentions your brand without linking it.
TOKENS:
  {first}                  REQUIRED — recipient first name
  {their_article_title}    REQUIRED — exact article title
  {brand}                  AUTO-FILLED if your site has og:site_name or <title>
  {anchor_phrase}          REQUIRED — desired anchor text
  {your_url}               AUTO-FILLED from canonical
  {sig}                    REQUIRED — sender signature
EXPECTED REPLY RATE: 12–18% (highest of the four)
-->
```

Body content from best-practices research, 2026-current. Subject lines validated against 2026 spam-filter patterns (avoid "collaboration", "partnership", "guest post", "[FREE]", emoji). Apple MPP makes open-rate tracking noise — track replies + clicks only. Tracking pixels intentionally omitted.

**Tracking CSV header (`tracking.csv.template`):**
```
prospect_url,contact_name,contact_email,template_used,sent_date,replied,reply_date,outcome,backlink_landed,notes
```

**`finding-prospects.md` (Retune handoff):**
- When `JINA_API_KEY` is NOT set: instructions to run Retune's `backlink_strategy` tool, export competitor backlinks, paste rows into `tracking.csv`
- When `JINA_API_KEY` IS set: pointer to `competitor_backlinks.py` (auto-runs as part of `/seoagent` if env var present at install time)

**`scripts/competitor_backlinks.py` contract:**

```python
import argparse, csv, json, os, socket, sys, urllib.parse, urllib.request
from pathlib import Path

# Reuse from skill: _safe_fetch, _validate_url, _strip_sensitive (extended for headers)

def main() -> int:
    args = parse_args()  # --project-path, --competitors (CSV of URLs), --csv-out, --dry-run
    api_key = os.environ.get("JINA_API_KEY")

    # Fail-closed (institutional learning): emit explicit "key not set" finding, do NOT silently skip
    if not api_key:
        emit_finding("visibility.outreach.jina_skipped_key_not_set", ...)
        write_retune_handoff_instructions(args.project_path)
        return 0

    competitors = parse_competitors(args.competitors)[:5]  # hard-cap at 5
    csv_path = Path(args.csv_out)
    rendered_rows = 0

    with csv_path.open("a", newline="") as f:
        writer = csv.writer(f)
        for competitor in competitors:
            try:
                prospects = jina_search_backlinks(competitor, api_key)  # 3 query patterns
                for url in prospects:
                    writer.writerow([url, "", "", "", "", "", "", "pending", "", f"via {competitor}"])
                    rendered_rows += 1
                f.flush()  # incremental — partial success preserved on mid-run failure
            except urllib.error.HTTPError as e:
                if e.code == 401:
                    emit_finding("visibility.outreach.jina_key_invalid_401", ...)
                    return 1
                if e.code in (402, 429):
                    emit_finding("visibility.outreach.jina_quota_exhausted", ...)
                    break  # write what we have, stop early
                continue  # other 4xx — skip competitor, continue
            except (socket.timeout, urllib.error.URLError):
                emit_finding("visibility.outreach.jina_partial_results",
                             competitor=competitor, rows_so_far=rendered_rows)
                continue

    write_visibility_outreach_block(args.project_path, jina_status="ok" if rendered_rows else "partial",
                                    prospects_generated=rendered_rows)
    return 0


def jina_search_backlinks(competitor_url: str, api_key: str) -> list[str]:
    host = urllib.parse.urlparse(competitor_url).hostname or competitor_url
    queries = [
        f'"{host}" -site:{host}',                    # mentions of the host elsewhere
        f'"{host}" "wrote about" OR "via {host}"',   # link reclamation candidates
        f'"{host}" inurl:resources OR inurl:tools',  # resource pages linking to host
    ]
    seen = set()
    out = []
    for q in queries:
        url = "https://s.jina.ai/" + urllib.parse.quote(q, safe="")
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        })
        # _safe_fetch with size cap, 30s timeout, _strip_sensitive on errors
        with safe_urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        for item in data.get("data", [])[:10]:
            url_field = item.get("url", "").strip()
            if url_field and url_field not in seen and host not in url_field:
                seen.add(url_field)
                out.append(url_field)
    return out
```

**Token pre-fill policy (from SpecFlow gap #12):**
- AUTO-FILL only fields the audit knows with high confidence:
  - `{brand}` from `og:site_name` or `<title>` (audit already parses these)
  - `{your_url}` from `<link rel="canonical">`
- Leave all prospect-side tokens (`{first}`, `{their_article_title}`, `{their_url}`, `{anchor_phrase}`) as visible placeholders
- Header block lists every token + which are auto-filled vs required-from-user
- Never auto-fill from guessed data

**Conditional install of `competitor_backlinks.py`:**
- If `JINA_API_KEY` is set in the env at install time → ship the script into `<project>/seo/visibility/`
- If not set → don't ship; render the Retune-handoff `finding-prospects.md` only
- Manifest entry records whether the script was shipped (so re-install changes are visible)

**Tests (`test_competitor_backlinks.py`):**
- Fail-closed: `JINA_API_KEY=""` → emits `jina_skipped_key_not_set` finding, makes ZERO `s.jina.ai` requests (mocked urlopen asserts no calls)
- Invalid key: mock 401 → emits `jina_key_invalid_401`, exits 1
- Quota exhausted: mock 402 → emits `jina_quota_exhausted`, writes any partial rows
- Partial failure: 3 competitors, 2nd raises socket.timeout → CSV has rows from #1 + finding emitted for #2 + #3 skipped
- Dedup: same URL across 3 query patterns → CSV has it once
- Empty results: Jina returns empty `data` → 0 rows written, `prospects_generated: 0`, `jina_status: "ok"`
- Header sanitisation: error path doesn't leak `Authorization: Bearer <key>` to logs (test reads stderr capture)

**Acceptance criteria for Phase 3:**
- [ ] All 6 templates parse, every `{token}` is documented in the header block
- [ ] `tracking.csv` header matches the documented schema
- [ ] Token pre-fill works for `{brand}` + `{your_url}` from audit data
- [ ] Fail-closed test passes (zero Jina calls when key missing)
- [ ] Conditional install: skill with key in env ships `competitor_backlinks.py`; skill without key doesn't
- [ ] Auth header never appears in logs or evidence files
- [ ] All test cases above pass

---

## System-Wide Impact

### Interaction graph
- `audit.py` calls `_seoagent/categorization.categorize()` → reads parsed homepage HTML, returns `CategoryResult`
- `audit.py` calls `_seoagent/visibility.build_visibility_block()` → composes the new `output["visibility"]` payload from category + state + indexing config + outreach status
- `install.py` reads `findings.json`, calls `_seoagent/visibility.render_directories_checklist()`, writes `seo/visibility/directories.md`
- `submit_index.py` (when shipped into `seo/visibility/`) reads `seo/visibility/.config.json`, makes IndexNow POSTs, updates state
- `competitor_backlinks.py` (conditional) reads competitor CSV, calls Jina, appends to `seo/visibility/outreach/tracking.csv`
- All visibility scripts acquire `seo/.install.lock` (`fcntl.flock`) before read-modify-write on state

### Error & failure propagation
- Network failures (IndexNow, Jina) → fail-soft with explicit findings; never break `audit.py` exit code 0
- File-write failures (state corruption, disk full) → fall back to safe defaults + emit recovery finding
- Schema validation failures on `findings.json` → loud error (this is the contract surface), refuse install
- All exceptions named: `urllib.error.URLError`, `urllib.error.HTTPError`, `socket.timeout`, `json.JSONDecodeError`, `xml.etree.ElementTree.ParseError`, `OSError`, `UnicodeDecodeError` (no bare `except`)

### State lifecycle risks
- `.state.json` write is atomic (tempfile + `os.replace`); a half-written state cannot poison re-runs
- `.config.json` (key + site URL) is similarly atomic
- `tracking.csv` is appended row-by-row with `f.flush()` between rows so a mid-run crash leaves N-1 valid rows
- Schema migration: shimming missing `visibility` → in-memory injection only, never writes back to old files (preserves user audit history immutably)

### API surface parity
- `submit_index.py` shipped into `<project>/seo/visibility/` so user can re-run without the skill
- `competitor_backlinks.py` shipped conditionally
- `dump_directories.py` is skill-only (regen utility)
- All shipped scripts in install manifest with sha256 — tampering visible on re-install

### Integration test scenarios (cross-layer)
1. End-to-end on a Next.js site: `audit.py` → `submit_index.py` → `install.py` writes full `seo/visibility/` kit, including key file in `public/`, `directories.md` for SaaS, all 6 outreach templates with `{brand}` pre-filled
2. Re-run on the same project after user ticks 3 directory checkboxes: state preserved, IndexNow re-submission idempotent (same key), outreach templates unchanged
3. Run on Hugo site: key file written to `static/` (NOT `public/` which is build output), correct framework warning in `indexing.md`
4. Run on a local-business site (uncurated category): category detection emits `local-business`, checklist falls back to generic with explicit `fallback_to_generic: true` finding
5. Run with `JINA_API_KEY=invalid-key`: `competitor_backlinks.py` emits `jina_key_invalid_401`, no auth header leakage in logs

## Acceptance Criteria — REVISED post-deepening

### Functional Requirements
- [ ] `submit_index.py` POSTs to IndexNow with correct shape; key file at durable source dir (NOT build-output); symlink + `O_NOFOLLOW`/`O_EXCL` guards prevent traversal
- [ ] Sitemap parser is real XML (XXE-safe via `XMLParser.feed()` with DOCTYPE/external-entity rejection); follows `<sitemapindex>`; decompresses `.xml.gz`; caps at 100k URLs with truncation finding
- [ ] `categorize.py` correctly categorises ≥3/4 fixtures, 0 false-positives on generic ground truth (4 buckets: saas, agency, blog-media, generic)
- [ ] State preservation across re-runs: completed slugs survive (slug regex `^[a-z0-9][a-z0-9-]{1,48}$`); slug missing from JSON → state retained but unrendered; user notes go in untouched `seo/visibility/notes.md`
- [ ] `directories.json` validates against `directories.schema.json` at SSOT-load (DR ∈ [0,100], slug-uniqueness across all categories, friction Literal)
- [ ] All 5 outreach templates parse, tokens documented in header block, `{brand}` + `{your_url}` auto-filled from audit data; prospect-side tokens stay as visible placeholders
- [ ] `competitor_backlinks.py` fails-closed on missing key with explicit finding; differentiates 401/402/429/partial; ALWAYS shipped (no install-time conditional); CSV cells starting with `=`/`+`/`-`/`@`/`\t`/`\r` are sanitized
- [ ] Visibility findings emit inside `findings[]` with `category: "visibility"` + `score_impact: 0`; `score_category` filter ignores them; `visibility_summary` block is optional; **no backward-compat shim**
- [ ] `install.py` appends `seo/visibility/.config.json` + `.state.json` to `<project>/.gitignore`; emits `vis_indexing_config_committed` finding if file already git-tracked
- [ ] `install.py` two-phase commit extends to all `seo/visibility/` files; tempfile co-located with target via `dir=target.parent`; manifest written LAST after data + parent-dir fsync
- [ ] All HTTP via `urllib.request` (or `http.client.HTTPSConnection` keep-alive for Jina) with SSRF/size-cap/redirect-cap/header-sanitisation guards from `live_check.py`; HEAD requests get the same guards as GET
- [ ] `_strip_sensitive` extended to redact `Authorization`/`Cookie`/`X-API-Key` from headers (case-insensitive) — verified in error paths, evidence files, and traceback formatters; test asserts `JINA_API_KEY` value never appears in any file under `seo/`
- [ ] `secrets.token_hex(16)` for IndexNow key (not `uuid.uuid4().hex`); `Literal` types for Category/friction; named exceptions include `socket.gaierror` + `ValueError`; no bare `except` / `except Exception`
- [ ] Exit codes documented: `EXIT_OK=0`, `EXIT_USAGE=2`, `EXIT_NETWORK=1`, `EXIT_CONFIG=3`

### Non-Functional Requirements (revised)
- [ ] `submit_index.py` total runtime < 5s for 1k URLs / 1 host; < 30s for 100k URLs / 1 host; document linear scaling at ~1s per 10k-URL POST batch
- [ ] `competitor_backlinks.py` total runtime < 30s for 5 competitors × 3 queries (parallelised across competitors via `ThreadPoolExecutor(max_workers=5)`; queries within a competitor stay sequential to dedup)
- [ ] `categorize` runs < 100ms on 1MB HTML (JSON-LD parsed once into `set[str]`)
- [ ] `fcntl.flock` uses `LOCK_NB` with 30s max-wait + stale-lock detection (`os.kill(pid, 0)`); explicit error on contention
- [ ] All atomic writes use `tempfile.NamedTemporaryFile(dir=target.parent, delete=False)` — same-volume requirement explicit; `os.fsync` on file + parent dir before declaring success
- [ ] `json.dump(..., indent=2, sort_keys=True, ensure_ascii=False)` for deterministic diffs
- [ ] No third-party Python deps (zero-dep stdlib promise preserved); no `defusedxml` (custom DOCTYPE-rejecting parser used instead)
- [ ] No secrets in logs, evidence files, rendered markdown, or tracebacks
- [ ] Quarantined `.state.json.corrupt-<ISO>` files capped at most-recent 5; older deleted; gitignored by install

### Quality Gates
- [ ] All tests in `tests/test_submit_index.py`, `tests/test_categorization.py`, `tests/test_visibility.py`, `tests/test_competitor_backlinks.py` pass
- [ ] Existing tests (`test_integration.py`, `test_scoring.py`, `test_parsers.py`, `test_detection.py`) still pass
- [ ] Manual dogfood: run on this repo (Retune itself, SaaS category) → directories.md lists Product Hunt, G2, etc.; IndexNow ping goes through (or CF auto-detect short-circuits cleanly)
- [ ] Manual dogfood: run on a Hugo-based personal site → key file lands in `static/`, directories list defaults to generic (uncurated category) with explicit fallback finding
- [ ] No drift in `references/topic-directories.md` or `references/directories/*.md` after `dump_directories.py` regen

## Risk Analysis & Mitigation — REVISED post-deepening

| Risk | Mitigation |
|---|---|
| **IndexNow key leaks via committed `.config.json`** (attacker submits arbitrary URLs as user's site → reputation/quota damage) | `install.py` auto-appends `seo/visibility/.config.json` + `.state.json` to `<project>/.gitignore`; emits `vis_indexing_config_committed` finding if already tracked; `topic-indexing.md` documents the risk |
| **Sitemap XML entity-expansion DoS (billion laughs)** | Custom stdlib XML parser via `XMLParser.feed()` rejects DOCTYPE + external entities pre-parse; caps element count (50k) + body size (50MB); billion-laughs payload test in `test_submit_index.py` |
| **Symlink traversal on durable-source-dir write** (`public/` is a symlink to `~/.ssh`) | Re-call `_assert_inside(project, static_dir.resolve())` after framework detection; reject if `static_dir.is_symlink()`; key file open with `os.O_NOFOLLOW \| os.O_CREAT \| os.O_EXCL` |
| **CSV formula injection in `tracking.csv`** (Jina returns `=cmd\|...` URL → opens in Excel → executes) | `_sanitize_csv_cell()` prefixes any cell starting with `=`/`+`/`-`/`@`/`\t`/`\r` with single-quote; applied uniformly on append; unit test with malicious URL fixture |
| **`tempfile` on different volume from target → `os.replace` non-atomic** (silent state corruption on crash) | `tempfile.NamedTemporaryFile(dir=target.parent, delete=False)` — explicit; `os.fsync` on file + parent dir before declaring success; acceptance criterion |
| **Header injection via CRLF in site URL** (canonical/sitemap host with `\r\n`) | `host.isascii() and "\r" not in host and "\n" not in host` guard in `resolve_site_url`; one assertion + test |
| **Jina API key leaks via traceback / error body / evidence file** | `_strip_sensitive_headers` redacts `Authorization`/`Cookie`/`X-API-Key` (case-insensitive); applied in error messages, EvidenceTrace writes, `sys.excepthook` override; test asserts the key value never appears in any file under `seo/` |
| **SSRF via attacker-controlled site URL** (canonical pointing at `169.254.169.254` / `localhost:6379`) | `_safe_fetch` extends to HEAD; `_assert_host_is_public` runs on every URL; explicit test: `--site-url http://169.254.169.254` exits non-zero with `unsafe_site_url` finding, zero network calls |
| Key file written to build-output dir gets clobbered on next build | Per-framework durable-source-dir table; refuse to write to `.gitignore`-matched paths; emit finding listing build dir |
| Slug case/normalisation mismatch (`producthunt` vs `productHunt`) silently splits state | `directories.schema.json` enforces slug regex `^[a-z0-9][a-z0-9-]{1,48}$`; uniqueness validated across ALL categories at SSOT load |
| Concurrent `/seoagent` runs corrupt state | Visibility scripts hold `seo/.install.lock` for entire read-modify-write transaction (not just write); `LOCK_NB` + 30s max-wait + stale-lock detection via `os.kill(pid, 0)`; NFS warning documented |
| `Retry-After: 60` from IndexNow blocks the whole script | Cap at 10s; longer → fail-soft with `vis_indexing_rate_limited_deferred` finding (next run resumes) |
| Outreach templates trigger spam filters | 2026-validated subject lines; deliverability preflight in `topic-outreach.md` (SPF/DKIM/DMARC + List-Unsubscribe RFC 8058); no tracking pixels (Apple MPP makes them noise + spam signal) |
| Pure LLM-personalised outreach underperforms in 2026 | Templates explicitly note: AI surfaces facts, human writes personalised line; tokens require human substitution |

## Dependencies & Prerequisites

- Python 3.9+ on the user's machine (skill is already this — no new constraint)
- For Phase 3 Jina path: `JINA_API_KEY` env var (user has confirmed they will provide for personal use)
- Optional: `gh` CLI for the eventual GitHub Action (deferred to v2)
- No backend/server changes; all client-side
- No Retune SaaS changes (Retune `backlink_strategy.py` is the handoff target, not modified)

## Resource Requirements

- 10–14h total (Phase 1: 4–6h, Phase 2: 4–6h, Phase 3: 3–4h)
- One developer (the user); no external review needed pre-merge
- One dogfood pass on this repo + one Hugo site after each phase ships

## Future Considerations

- v2: GitHub Action that runs `submit_index.py` on every deploy
- v2: Promote visibility from "separate report section" to scored 5th rubric category (requires rebalancing weights, schema change)
- v2: Score the directory checklist (e.g., "5/10 submitted = +X path-to-80 points") if the unscored v1 doesn't drive enough action
- v2: Expand directory categories from 3 → 6 (e-commerce, local-business, indie-creator) when the user's site mix demands them
- v2: PSI integration in `submit_index.py` to verify key-file reachability from a real edge node (not just direct fetch)
- v2: Live ranking monitoring (delta scoring across re-runs) — closer to Phase 4 of the friend's Marketing Autopilot concept; gated until user-need is concrete
- v3: Outreach reply tracking via IMAP poll on a designated mailbox (heavy, deferred indefinitely)

## Documentation Plan

- `references/topic-indexing.md` — IndexNow protocol explainer + GSC/Bing manual instructions
- `references/topic-directories.md` — generated, lists all directories with metadata
- `references/topic-outreach.md` — outreach playbook + 2026 deliverability hygiene
- `references/directories/{saas,agency,blog-media,generic}.md` — generated per-category lists
- `SKILL.md` — update Step 6 (visibility) + 3 disclosure rules (load `topic-indexing.md` when user mentions deploy/launch/index; load `topic-directories.md` when user asks about backlinks/directories; load `topic-outreach.md` when user mentions outreach/email)
- `templates/outreach/*.md` — 6 templates, each with header documenting tokens + expected reply rate

## References & Research

### Internal references
- Brainstorm: `docs/brainstorms/2026-04-27-seoagent-visibility-extensions-brainstorm.md`
- Patterns to mirror in `~/.claude/skills/seoagent/`:
  - `scripts/audit.py:32-126` — argparse + `_HERE` shim + JSON output shape
  - `scripts/install.py:24` — atomic tempfile write
  - `scripts/install.py:51-194` — path traversal guards (`REFUSED_TARGETS`, `_validate_project`, `_assert_inside`)
  - `scripts/install.py:69-121` — two-phase commit
  - `scripts/install.py:241-256` — manifest format
  - `scripts/install.py:316-369` — `_render_report` (extend with visibility section)
  - `scripts/dump_rubric.py:21-50` — SSOT-to-doc transform pattern (template for `dump_directories.py`)
  - `scripts/live_check.py:148-236` — SSRF + size + redirect + sanitisation guards
  - `scripts/live_check.py:243-250` — `_strip_sensitive` (extend to headers)
  - `scripts/live_check.py:258-268` — JSON SSOT load with try/except fallback
  - `scripts/live_check.py:430-437` — env var detection pattern (PSI → Jina)
  - `scripts/_seoagent/__init__.py:7-44` — public API surface; add `categorization` + `visibility` exports
  - `scripts/_seoagent/detection.py` — heuristic detection pattern (template for `categorization.py`)
  - `scripts/schema/findings.schema.json:55-68` — schema constraints (bump target)
  - `templates/ai-crawlers.json` — JSON SSOT format (template for `directories.json`)
  - `tests/test_integration.py:20-28` — subprocess + `--json-out` test pattern
- Retune source patterns:
  - `src/tools/backlink_strategy.py:26-30` — Jina query construction (port to stdlib in `competitor_backlinks.py`)
  - `src/tools/jina.py:14,47-74` — Jina endpoint, auth, response shape

### External references
- IndexNow protocol: https://www.indexnow.org/documentation
- IndexNow participating engines (2026): https://www.indexnow.org/searchengines (Bing, Yandex, Naver, Seznam, Yep — NOT Google)
- Cloudflare auto-IndexNow integration: detect via `cf-indexnow: 1` header
- Jina Search API: https://jina.ai/reader/, https://docs.jina.ai/
- 2026 directory benchmarks: https://blastra.io/directories/, https://saasconsult.co/blog/top-directories-to-list-your-saas/
- 2026 cold email deliverability: Instantly Cold Email Benchmark Report 2026, Hunter.io State of Email Outreach 2026, Gmail/Yahoo Feb 2024 sender rules + RFC 8058 List-Unsubscribe
- Past learnings to inherit: `docs/solutions/security-issues/unauthenticated-debug-endpoints-and-credential-exposure.md` (fail-closed auth pattern — applied to JINA_API_KEY env detection)

### Related work
- Prior plan: `docs/plans/2026-04-23-refactor-seoagent-progressive-disclosure-plan.md` (Phase 1 of skill rewrite, completed)
- Original brainstorm for Phase 1: `docs/brainstorms/2026-04-23-seoagent-skill-optimization-brainstorm.md`
- Memory: `~/.claude/projects/.../memory/project_scope.md` (boundary: friend's Marketing Autopilot concept off-limits)
