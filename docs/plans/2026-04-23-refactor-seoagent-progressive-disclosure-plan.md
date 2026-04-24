---
title: Refactor seoagent skill — progressive disclosure + scored audit scripts
type: refactor
status: completed
date: 2026-04-23
brainstorm: docs/brainstorms/2026-04-23-seoagent-skill-optimization-brainstorm.md
---

# Refactor seoagent skill — progressive disclosure + scored audit scripts

## Enhancement Summary

**Deepened on:** 2026-04-23 (same day as plan; 10 parallel agents consulted)
**Agents consulted:** best-practices-researcher, framework-docs-researcher, kieran-python-reviewer, code-simplicity-reviewer, architecture-strategist, security-sentinel, performance-oracle, pattern-recognition-specialist, agent-native-reviewer, create-agent-skills (best-effort), data-integrity-guardian.

**Verdict:** architecture survives review; 31 material changes surfaced; **7 are blocking** (must land before Phase 1 begins). None require rethinking the design — the rubric pattern, script decomposition, progressive-disclosure layout, and zero-dep stance all hold.

### Blocking changes (must apply before Phase 1)

1. **PSI endpoint + timeout** — correct URL is `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed` (plan had `www.googleapis.com`). Timeout must be **60s**, not 10s — real audits take 20–60s. Rate limit: 25,000/day, 400/100s with key. (framework-docs-researcher)
2. **Remove `--psi-key` flag entirely.** Command-line keys leak via `ps aux`, shell history, CI logs. Env var (`PAGESPEED_API_KEY`) is the only acceptable surface. Scrub `?key=…` from every URL before logs or findings JSON. (security-sentinel)
3. **SSRF guards on `live_check.py`** — reject non-http/https schemes, resolve hostname and reject RFC1918/loopback/link-local/ULA ranges, custom `HTTPRedirectHandler` re-validating each 30x hop (max 3), 10s timeout, 5MB response cap, strip `user:pass@` credentials. (security-sentinel)
4. **Path-traversal guards on `install.py`** — `Path(arg).resolve(strict=True)`; refuse targets like `/`, `$HOME`, `/tmp`; every write path must satisfy `target.resolve().is_relative_to(project.resolve())`; open with `O_NOFOLLOW | O_DIRECTORY | O_EXCL`; reject if `seo/` is already a symlink. (security-sentinel, data-integrity-guardian)
5. **XML parsing safety** — stdlib `xml.etree.ElementTree` is NOT safe against billion-laughs / entity expansion. Use `iterparse()` with early element clearing, cap sitemap fetch at 50MB, reject XML containing DOCTYPE or external entity references. Document the stdlib trade-off vs `defusedxml`. (security-sentinel, framework-docs-researcher)
6. **Parallelize `live_check.py` AI-crawler UA tests** — 13 UAs × 10s timeout = 130s serial worst case. `concurrent.futures.ThreadPoolExecutor(max_workers=5)` is a launch requirement, not a future optimization. Add per-request timeout 5s with a 60s overall deadline. Also reuse one `HTTPSConnection` across UA iterations to avoid 17 TLS handshakes (saves 1.7–5s). (performance-oracle)
7. **Entry-file walk: explicit ignore list** — `node_modules`, `.next`, `dist`, `build`, `.git`, `out`, `.vercel`, `coverage`. Use `os.scandir()` with pruning, not `Path.rglob()`. Naive rglob will walk `node_modules/` and hang. (performance-oracle)

### Structural changes (land during Phase 1)

8. **Split `audit.py` into entrypoint + internal package** — `audit.py` (~100 lines: argparse + `main()` + orchestration), plus `_seoagent/parsers.py`, `_seoagent/scoring.py`, `_seoagent/rubric.py`, `_seoagent/detection.py`, `_seoagent/__init__.py`. Underscore prefix signals internal. `install.py` copies the whole folder to `<project>/seo/`. Monolithic 500-line `audit.py` is the worst-of-both-worlds: hostile for clients to read, untestable in units. (kieran-python-reviewer)
9. **Split `HeadParser` into two parsers** — `HeadParser` (title/meta/link/script — stops on `</head>`) and `BodyStructureParser` (h1, heading hierarchy, img alts, semantic-tag ratio). One parser with 7 concerns mutating `self` across `handle_starttag`/`handle_endtag`/`handle_data` is untestable. (kieran-python-reviewer)
10. **Use `typing.Literal` for enum-shaped fields** — `Category = Literal["classic_seo","structured_data","geo","performance"]`, `Severity = Literal["critical","warning","info"]`, `Effort = Literal["quick_win","moderate","significant"]`. mypy catches typos; IDE autocompletes. Skip `NewType` (no runtime safety). (kieran-python-reviewer)
11. **Remove `category` from `Finding`** — already on `Criterion`. Look up via `CRITERIA[criterion_id].category` at score time. Single source of truth. (kieran-python-reviewer)
12. **`Finding.file_path: Path | None`** (not `str`) — consistency with the plan's "prefer pathlib" stance. (kieran-python-reviewer)
13. **Ban bare `except` / `except Exception`** — name every exception in the spec: `json.JSONDecodeError`, `xml.etree.ElementTree.ParseError`, `OSError`, `UnicodeDecodeError`, `urllib.error.URLError`, `socket.timeout`. Add to acceptance criteria as a grep check. (kieran-python-reviewer)

### Rubric changes

14. **Revise category weights: 25 / 30 / 30 / 15** (Classic SEO / Structured Data / GEO / Performance). Equal 25×4 was laziness disguised as neutrality. GEO and Structured Data are the skill's point of view; Performance weight drops because static audits get only indirect signals without PSI. Lighthouse itself uses asymmetric category weighting; equal weighting signals no position. (code-simplicity-reviewer)
15. **Rename every criterion ID to `<category_prefix>_<subject>[_<metric>]`** — matches `src/scoring_rubric.py` and kills the mixed `_schema` / `_jsonld` / raw suffixes. Renames: `title_length` → `seo_title_length`, `canonical_link` → `seo_canonical`, `h1_exactly_one` → `seo_h1_count`, `faqpage_jsonld` → `sd_faqpage_schema`, `valid_json_ld_syntax` → `sd_schema_syntax_valid`, `llms_txt_present` → `geo_llms_txt`, `ai_crawlers_allowed` → `geo_ai_crawlers_allowed`, `lcp_under_2500` → `perf_lcp` (thresholds in scoring bands, not IDs), `cls_under_0_1` → `perf_cls`, `inp_under_200` → `perf_inp`. Do before Phase 1 — IDs are in the JSON contract and post-launch renames break diff mode. (pattern-recognition-specialist)
16. **Delete `breadcrumb_schema_geo`** — literal duplicate of `sd_breadcrumb_schema`. If breadcrumb signals should contribute to GEO too, do that in the weight calculation, not by double-listing the criterion. (pattern-recognition-specialist, code-simplicity-reviewer)
17. **Cut low-signal criteria for v1** — drop `favicon`, `mobile_responsive_signals` (redundant with viewport), `twitter_card_complete` (OG covers the ground), `product_schema` (too contextual), `author_meta_present` (already in Article schema), `semantic_html_ratio` (too heuristic to score reliably). Net: 31 → ~25 criteria. Re-add when a real client hits the absence. (code-simplicity-reviewer)
18. **Revise performance target** — "< 5s for < 100 files" is optimistic for pure-Python `html.parser` (~1–5 MB/s throughput). New Success Metric: **"< 10s for < 100 entry files; graceful degradation at 1000+ files."** Add memory cap too: reject any HTML file > 10MB, cap each JSON-LD block at 1MB, cap per-page JSON-LD block count at 20 with a warning finding. (performance-oracle, security-sentinel)

### Single-source-of-truth fixes (kill drift before it starts)

19. **AI crawler UAs → `templates/ai-crawlers.json`** — machine-readable canonical list (`[{ua, vendor, purpose, directive_only, introduced_date}]`). `live_check.py` reads at runtime; `references/topic-ai-crawlers.md` is generated from it. Plan's "hardcoded with a comment pointing to the reference" pattern guarantees drift. (architecture-strategist, pattern-recognition-specialist)
20. **Scoring rubric → generated docs** — add `scripts/dump_rubric.py` (~30 lines) that emits the rubric as a markdown table. `references/topic-scoring-rubric.md` is generated. Commit hook (or `make docs` target) fails CI if the file drifts. Forbid hand edits. (architecture-strategist, pattern-recognition-specialist)
21. **Pin findings JSON schema** — `scripts/schema/findings.schema.json`. `install.py` validates on read. Makes the audit→install contract explicit; catches shape drift between audit.py and install.py. (architecture-strategist)
22. **Define live↔static findings merge rule** — live findings **override** static for any shared `criterion_id`; add `source: "static" | "live"` field per finding. Without this, conflicts on `robots_txt_present` (static: file exists vs live: 200 OK) produce ambiguous scores. (architecture-strategist)

### 2026 AI crawler list update

23. **Expand the UA list beyond what the plan captured**: add `Claude-User` and `Claude-SearchBot` (Anthropic now publishes 3 UAs, not 2), plus `cohere-ai`, `DuckAssistBot`, `MistralAI-User`, `Google-NotebookLM`, `Google-CloudVertexBot`, `xAI-Bot`. Distinguish **train**, **search**, and **user-fetch** purposes per vendor; score as a `geo_llm_access_policy` composite (coverage of all three purposes), not a single boolean. Current traffic: ChatGPT crawlers ≈ 3.6× Googlebot volume in 2026; training crawlers ≈ 49.9% of AI bot traffic. (best-practices-researcher)

### Agent-native parity: `install.py` ships more

24. **Expand `install.py` deliverables** to close human-parity gaps. Updated `seo/`:

    ```
    seo/
      GUIDE.md                         # maintenance playbook (existing)
      audit-report.md                  # scored report (existing)
      findings-latest.json             # newest audit (copy of newest history/ file)
      history/findings-<ISO>.json      # NEW — append-only, enables diff mode
      audit.py                         # static auditor (existing)
      _seoagent/                       # NEW — helper package audit.py imports
      live_check.py                    # NEW — human can re-verify live
      framework-playbook.md            # NEW — copy of references/framework-<detected>.md
      scoring-rubric.md                # NEW — generated doc, human can audit weights
      ai-crawlers.md                   # NEW — UA reference (dated)
      .install-manifest.json           # NEW — hashes, versions, timestamps per file
    ```

    Without these, the human cannot re-run live checks, cannot reach the framework-specific fix knowledge Claude used, and cannot audit why the score came out as it did. Current plan ships 4 files; deepened ships 9 + history. (agent-native-reviewer, data-integrity-guardian)

### `install.py` safety (all per data-integrity-guardian + security-sentinel)

25. **Same-volume atomic write** — `tempfile.NamedTemporaryFile(dir=target.parent, delete=False)`. Cross-volume `os.replace()` degrades to copy+delete and isn't atomic. Call `os.fsync(fd)` on file and parent directory before declaring success.
26. **Two-phase commit** — Phase A: write all `.tmp` files; if any fails, unlink all tmps and exit nonzero (nothing committed). Phase B: rename all `.tmp → final`. Mid-Phase-B failure logs committed files for a future `--rollback` flag.
27. **Timestamped backups on overwrite** — `GUIDE.md` → `GUIDE.md.bak.<ISO-timestamp>`. SHA-256 compare against last-shipped hash in `.install-manifest.json`; skip prompt when untouched. `--force` never destroys without backing up first.
28. **No auto-edit of `.gitignore`** — print suggested lines, provide `--print-gitignore` flag to pipe to `>>`.
29. **`--dry-run` flag** — previews every write path + content SHA before committing. Critical for a tool that touches client repos.
30. **Concurrent-install lock** — `fcntl.flock()` on `seo/.install.lock` (POSIX) / `msvcrt.locking()` (Windows). Prevents two parallel installs racing on tmp names.

### Phase consolidation: 6 → 3

31. Retain the work, collapse execution:
    - **Phase 1 (4–6h)** — `audit.py` entrypoint + `_seoagent/` package + full rubric + SPA detection + test fixtures (`clean-site/`, `broken-site/`) + dogfood on this repo.
    - **Phase 2 (3–4h)** — `live_check.py` (parallelized, SSRF + XXE guards, PSI with 60s timeout and scrubbed URLs) + `install.py` (two-phase commit, manifest, backups, `--dry-run`, symlink guards).
    - **Phase 3 (3–4h)** — 3 framework reference files (Next.js, Astro, static HTML — defer the other 5), `topic-geo.md` + `topic-scoring-rubric.md` (generated) + `topic-ai-crawlers.md` (generated), new SKILL.md dispatcher, commit + dogfood on a real Next.js + Astro project.

    Estimated total holds at **10–14h**; the savings from phase consolidation pay for the security + parity work. (code-simplicity-reviewer)

### Cuts for v1 (explicit deferrals)

32. **Defer 5 of 8 framework reference files** — ship Next.js, Astro, static HTML. Nuxt, Vite-SPA, Hugo/Jekyll, Gatsby, 11ty wait for a real user. The audit script's framework detection already handles all 11 — only the deep playbooks are scoped out. (code-simplicity-reviewer, create-agent-skills)
33. **Simplify GitHub Action template** — v1 is ~15 lines (run `audit.py` on PR, upload `findings-latest.json` as artifact). Live-check integration deferred to v2. (code-simplicity-reviewer)
34. **Drop `--config` flag from Phase 1** — the original CLI spec had `--config seoagent.config.json` but the config file itself is in Future Considerations. Resolve the contradiction: no flag in v1. (kieran-python-reviewer)

### Known trade-offs (deferred with explicit cause)

- **`html.parser` vs vendoring `html5lib`** — stdlib parser has documented silent-stop bugs on malformed HTML (bugs.python.org #12629, script-tag #670664; pip reverted to it). Mitigate in v1 via explicit workarounds: maintain `in_head` flag manually (parser does not track head/body), accumulate `handle_data` chunks with a list-join pattern, wrap every `json.loads` on JSON-LD blocks in try/except emitting a finding on failure. Vendor `html5lib` (~200KB pure Python) only if real client sites produce silent undercounts. (best-practices-researcher, framework-docs-researcher)
- **`xml.etree.ElementTree` vs vendoring `defusedxml`** — same trade-off. Mitigate in v1 via `iterparse()` + 50MB size cap + DOCTYPE rejection + max-depth check. Vendor `defusedxml` only if hostile XML vectors appear in real use.
- **`workflows/` directory** — create-agent-skills agent couldn't load its own SKILL.md in the sandboxed review, so its recommendation to add `workflows/` is best-effort. Keep the 5-step process inline in SKILL.md for v1; reconsider after first real dogfood.
- **Rollback window extension** — architecture-strategist requested a 2-week / 3-dogfood window before deleting `SKILL.md.v0-backup` (plan said "one successful dogfood"). Honor this — also archive old SKILL.md into `docs/archive/seoagent-skill-v0/SKILL.md` in this repo since the skill itself lives outside git.

### What the review did NOT change

- The rubric-mirrors-`src/scoring_rubric.py` pattern stands.
- Category set (`classic_seo`, `structured_data`, `geo`, `performance`) stands — intentionally diverges from Retune's `seo / content / technical / performance` because this is a static-file auditor, not an LLM-scored one. Add a one-line note in `topic-scoring-rubric.md` explaining the divergence.
- Three separate scripts (not subcommands) — kieran-python-reviewer and code-simplicity-reviewer disagreed here; kieran wins because the client's `seo/audit.py` must be minimal surface, not a three-in-one that drags `live_check` and `install` code into every re-audit.
- Scored (0–100) output format + path-to-80 backlog.
- Python stdlib-only stance.

---

## Overview

Rebuild the `seoagent` skill at `~/.claude/skills/seoagent/` from a single 399-line `SKILL.md` into a progressively-disclosed package: a lean dispatcher (~120 lines) plus `scripts/` (executable Python audits), `templates/` (verbatim files copied into client projects), and `references/` (framework playbooks + deep-dive docs loaded on demand). The new skill produces scored audits (0–100 per category, weighted, with a path-to-80 backlog — mirroring this repo's `src/scoring_rubric.py` exactly) and ships a runnable `audit.py` into the client's `seo/` folder so they own the tool, not just the artefact.

## Problem Statement

The current `seoagent/SKILL.md` works as a checklist but fails three professional bars:

1. **Bloat on every invocation.** 399 lines load into context whenever the skill triggers. Anthropic's own skill-authoring guidance (from `compound-engineering:create-agent-skills`) calls for < 500 lines total in SKILL.md, preferably < 200 for simple skills, with reference content deferred.
2. **No rigor in findings.** Output is ✅/⚠️/❌ checkboxes. A professional audit produces a quantified score per category, a weighted rubric, and a prioritized backlog showing impact per fix. This repo's own Retune product uses exactly this pattern in `src/scoring_rubric.py` — the skill should not be less rigorous than what its author already ships in production.
3. **Client depends on Claude to re-audit.** The deliverable is a hand-written `GUIDE.md`. The client has no tool they can run themselves in CI or on-demand. Real SEO agencies leave behind runnable tooling, not just reports.

The fix is structural, not additive: split the skill into a dispatcher + reference files + executable scripts, and mirror the Retune scoring pattern in a standalone Python stdlib audit.

## Proposed Solution

Three parallel changes, all required for the skill to hit "professional":

1. **Progressive disclosure layout.** `SKILL.md` becomes a ~120-line router. Templates (robots.txt, llms.txt, schema blocks, GUIDE template) move to `templates/`. Framework-specific playbooks (Next.js, Astro, Nuxt, etc.) and long-form GEO / rubric / AI-crawler docs move to `references/`, loaded only when relevant.
2. **Scored audit in Python stdlib.** `scripts/audit.py` evaluates 30+ criteria across 4 categories (Classic SEO, Structured Data, GEO, Performance) at 25% weight each, producing deterministic 0–100 scores and a path-to-80 backlog sorted by `category_weight × criterion_weight × score_gap` — the exact formula from `src/scoring_rubric.py:169`. Optional `scripts/live_check.py` adds live-URL verification (AI-crawler UA tests, rendered HTML, optional PageSpeed Insights via `PAGESPEED_API_KEY` env var).
3. **Client-owned deliverable.** `scripts/install.py` writes `seo/GUIDE.md`, `seo/audit-report.md`, `seo/findings.json`, `seo/audit.py`, and optionally `.github/workflows/seo-audit.yml` into the client's project. Client can re-run the audit in CI without Claude.

## Technical Approach

### Final Package Layout

```
~/.claude/skills/seoagent/
  SKILL.md                            # ~120 lines, router only
  templates/                          # verbatim, copied by install.py
    GUIDE-template.md                 # client maintenance playbook w/ {{placeholders}}
    robots.txt                        # permissive AI-crawler default
    llms.txt                          # llmstxt.org-style markdown index template
    meta-block.html                   # canonical + OG + Twitter card snippet
    schema-organization.jsonld
    schema-website.jsonld
    schema-article.jsonld
    schema-faqpage.jsonld
    schema-breadcrumb.jsonld
    schema-product.jsonld
    seo-audit-workflow.yml            # GitHub Action (runs audit.py on PR)
  references/                         # loaded on demand
    framework-nextjs.md
    framework-astro.md
    framework-nuxt.md
    framework-vite-spa.md
    framework-static-html.md
    framework-hugo-jekyll.md
    framework-gatsby.md
    framework-11ty.md
    geo-deep-dive.md                  # long-form GEO writing + citation guide
    scoring-rubric.md                 # human-readable rubric w/ weights
    ai-crawlers.md                    # UA strings, monitoring, current landscape
  scripts/
    audit.py                          # ~500 lines, stdlib only
    live_check.py                     # ~300 lines, stdlib only
    install.py                        # ~200 lines, stdlib only
  tests/
    fixtures/
      clean-site/                     # minimal all-green site
      broken-site/                    # known issues site
    test_audit.py                     # stdlib unittest, runs audit on fixtures
```

### Architecture

#### SKILL.md dispatcher contract

Target ≤ 150 lines. Structure:

1. **Frontmatter** — unchanged (name, description, triggers)
2. **Purpose** — one paragraph
3. **When to use** — bullet list (~8 lines)
4. **Process** — 5 numbered steps, each ≤ 15 lines:
   - Step 1: Detect framework → point to matching `references/framework-*.md`
   - Step 2: Run `python3 ~/.claude/skills/seoagent/scripts/audit.py <project_path> --json-out /tmp/findings.json`
   - Step 3: (Optional live) Run `python3 .../scripts/live_check.py <url> --json-out /tmp/live-findings.json` if deployed URL provided
   - Step 4: Parse findings JSON, report scored summary + path-to-80, ask user which fixes to apply
   - Step 5: Apply fixes (using `templates/` + framework-specific reference), then run `install.py` to write `seo/` deliverables
5. **Progressive disclosure instructions** — explicit "Load `references/X.md` when Y" lines (following create-agent-skills pattern)
6. **Principles** — 3–4 bullets (framework-native fixes; never fabricate schema; default allow AI crawlers with consent check; don't duplicate scoring logic — `audit.py` is canonical)
7. **Output contract** — exact format for end-of-run report (scores, applied fixes, needs-you list)

#### audit.py (static audit) — full contract

Invocation:
```
python3 audit.py <project_path> [--json-out findings.json] [--quiet] [--config seoagent.config.json]
```

Behavior:
1. Detect framework by inspecting repo root files (priority order: `next.config.*` + `app/` → nextjs-app; `next.config.*` + `pages/` → nextjs-pages; `astro.config.*` → astro; `nuxt.config.*` → nuxt; `gatsby-config.*` → gatsby; `.eleventy.js` → 11ty; `config.toml` + `content/` → hugo; `_config.yml` → jekyll; `vite.config.*` → vite-spa; react/vue in `package.json` without SSR signals → csr-spa; root `index.html` + no `package.json` → static-html; else `unknown`).
2. Enumerate entry files per framework (head-containing layouts + pages). For SPAs, flag CSR pattern (empty body, hydration target div) and emit single warning finding; skip per-page rubric.
3. Parse `<head>` of each entry with stdlib `html.parser.HTMLParser`. Extract: `<title>`, `<meta name=*>`, `<meta property=*>`, `<link rel=canonical>`, JSON-LD `<script>` blocks (collect, parse with `json`), `<html lang>`, `<h1>` count, image `alt` attributes, heading hierarchy.
4. Check site-level files: `public/robots.txt`, `robots.txt`, `public/sitemap.xml`, `sitemap.xml`, `public/llms.txt`, `llms.txt`.
5. Evaluate each criterion → `Finding` (score 0–100, observation, recommendation, severity).
6. Compute per-category scores = weighted avg within category; overall = weighted avg across categories. If performance has no data (static run), renormalize to 3 categories × 33.33%.
7. Build path-to-80: sort failed criteria by `potential_gain = cat_weight × crit_weight × score_gap` desc, take until projected overall ≥ 80 (cap 10 items), label effort by score band (≥40 quick_win, ≥20 moderate, else significant).
8. Write findings JSON, print human summary to stdout.

Key data types (stdlib `@dataclass`):

```python
@dataclass(frozen=True)
class Criterion:
    id: str
    name: str
    category: str            # classic_seo | structured_data | geo | performance
    weight: float            # within-category 0-1, per category sum ~= 1.0
    description: str
    severity_on_fail: str    # critical | warning | info

@dataclass
class Finding:
    criterion_id: str
    category: str
    score: int               # 0-100
    passed: bool
    observation: str
    recommendation: str
    severity: str
    file_path: str | None = None

@dataclass
class PathTo80Step:
    criterion_id: str
    action: str
    category: str
    estimated_points: int
    effort: str              # quick_win | moderate | significant
    explanation: str
```

Output JSON shape:

```json
{
  "timestamp": "2026-04-23T14:22:00Z",
  "seoagent_version": "1.0.0",
  "project_path": "/abs/path",
  "framework": "nextjs-app",
  "spa_flag": false,
  "scores": {
    "classic_seo": 78,
    "structured_data": 45,
    "geo": 32,
    "performance": null,
    "overall": 52
  },
  "findings": [...],
  "path_to_80": [...],
  "files_audited": 14
}
```

#### Scoring rubric (complete)

Four categories at 25% weight each. If performance not scored (no live data), renormalize remaining 3 × 33.33%.

**Classic SEO (25%)**, criterion weights sum to ~1.0:

| ID | Weight | Description | Scoring |
|---|---|---|---|
| title_length | 0.12 | `<title>` present, 50–60 chars | 100 if 50–60; 80 if 40–70; 50 if 20–80; else 0 |
| description_length | 0.12 | meta description 140–160 chars | same banding |
| canonical_link | 0.08 | `<link rel="canonical">` present w/ absolute URL | 100 present; 0 missing |
| h1_exactly_one | 0.10 | exactly one `<h1>` per page | % of pages compliant |
| heading_hierarchy | 0.08 | no skipped levels (h1→h3 without h2) | % of pages compliant |
| viewport_meta | 0.05 | `<meta name=viewport>` present | 100/0 |
| html_lang | 0.05 | `<html lang>` attribute | 100/0 |
| favicon | 0.05 | favicon link present | 100/0 |
| image_alt_coverage | 0.10 | % images with non-null alt | % coverage |
| robots_txt_present | 0.10 | robots.txt at site root | 100 present + valid; 50 present missing sitemap; 0 missing |
| sitemap_xml_present | 0.10 | sitemap.xml at site root or framework-generated | 100/0 |
| mobile_responsive_signals | 0.05 | viewport + no fixed widths | heuristic |

**Structured Data (25%)**:

| ID | Weight | Description | Scoring |
|---|---|---|---|
| organization_schema | 0.20 | `Organization` or `Person` on home | 100 full; 50 partial (missing `sameAs`); 0 missing |
| website_schema | 0.10 | `WebSite` with `SearchAction` | 100 full; 50 partial; 0 missing |
| article_schema_content | 0.15 | `Article`/`BlogPosting` on content pages | % of content pages covered |
| breadcrumb_schema | 0.10 | `BreadcrumbList` on nested pages | % coverage |
| faqpage_schema | 0.15 | `FAQPage` on pages with Q&A (contextual; only penalize if Q&A detected) | % coverage |
| product_schema | 0.10 | `Product` on product pages (contextual) | % coverage |
| valid_json_ld_syntax | 0.20 | all JSON-LD blocks parseable + have `@context`+`@type` | 100 all valid; scale down per bad block |

**GEO (25%)**:

| ID | Weight | Description | Scoring |
|---|---|---|---|
| llms_txt_present | 0.15 | `llms.txt` at root | 100 present + markdown headings; 50 present but thin (< 5 links); 0 missing |
| faqpage_jsonld | 0.15 | at least one page with `FAQPage` JSON-LD | 100/0 |
| ai_crawlers_allowed | 0.15 | robots.txt does not block major AI UAs | 100 all allowed; scale down per blocked UA |
| dates_on_articles | 0.10 | `Article` JSON-LD includes `datePublished` + `dateModified` | % of articles compliant |
| author_meta_present | 0.10 | `<meta name=author>` or Article `author` field | % of content pages |
| semantic_html_ratio | 0.10 | ratio of semantic tags (article/section/nav/main/header/footer/aside) to divs | banded (>0.25 → 100; 0.15–0.25 → 70; 0.05–0.15 → 40; <0.05 → 0) |
| og_tags_complete | 0.10 | og:title, og:description, og:image, og:url, og:type all present | % of required tags |
| twitter_card_complete | 0.05 | twitter:card summary_large_image + title/description/image | % of required tags |
| breadcrumb_schema_geo | 0.10 | same as structured data breadcrumb (AI engines use it too) | reuse |

**Performance (25%, live-only)**:

| ID | Weight | Description | Scoring |
|---|---|---|---|
| lcp_under_2500 | 0.30 | PSI LCP ≤ 2500ms | 100 if ≤2500; 60 if ≤4000; 0 else |
| cls_under_0_1 | 0.25 | PSI CLS ≤ 0.1 | 100/60/0 bands |
| inp_under_200 | 0.25 | PSI INP ≤ 200ms | 100/60/0 bands |
| image_optimization | 0.10 | static-detected: all imgs have width/height + modern format | % coverage |
| render_blocking | 0.10 | PSI render-blocking count | bands |

#### live_check.py — full contract

Invocation:
```
python3 live_check.py <url> [--json-out live-findings.json] [--psi-key KEY] [--skip-psi]
```

Behavior:
1. Fetch `<url>` with standard UA (`Mozilla/5.0 … seoagent-live-check/1.0`) via `urllib.request`. Record status, headers, body length, content hash.
2. For each AI crawler UA (see `references/ai-crawlers.md`), refetch with that UA. Compare status + hash. If 403/differs significantly, emit block finding.
3. Parse rendered HTML (no JS executed) with `html.parser`. Re-run core head checks from `audit.py`'s shared module. Extra checks: response headers (HSTS, CSP mode, cache-control).
4. Fetch `<url>/robots.txt`; parse for AI-crawler `Disallow` lines. Cross-check with the live-UA tests (robots.txt lies are common).
5. Fetch `<url>/sitemap.xml`; validate XML with `xml.etree.ElementTree`; count URLs.
6. Fetch `<url>/llms.txt`; check presence + parse front matter.
7. If `PAGESPEED_API_KEY` env var is set (note: `--psi-key` flag removed per Enhancement Summary §2 — env var only): call `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed` with 60s timeout for mobile + desktop strategies. Extract metrics from `lighthouseResult.audits["largest-contentful-paint"].numericValue`, `...["cumulative-layout-shift"].numericValue`, `...["interaction-to-next-paint"].numericValue`. Field data (real-user CrUX) at `loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile` etc. — check `audits[id].score is not None` before reading. Always scrub the `?key=…` query param from any URL before logging or persisting to findings JSON.
8. Emit live findings JSON (same shape as static, with `source: "live"` tag).

AI crawler UAs to test (current as of 2026-04; keep authoritative list in `references/ai-crawlers.md`):

```
GPTBot/1.0                            # OpenAI training
ChatGPT-User/1.0                      # live ChatGPT browsing
OAI-SearchBot/1.0                     # ChatGPT Search
PerplexityBot/1.0
Perplexity-User/1.0
ClaudeBot/1.0
Claude-Web/1.0
anthropic-ai/1.0
CCBot/2.0                             # Common Crawl (feeds many LLMs)
meta-externalagent/1.1
Amazonbot/0.1
Bytespider
Applebot-Extended                     # directive-only, not a real UA
Google-Extended                       # directive-only, not a real UA
```

#### install.py — full contract

Invocation:
```
python3 install.py <project_path> --findings /tmp/findings.json \
  [--live-findings /tmp/live-findings.json] \
  [--with-github-action] [--force]
```

Behavior:
1. Create `<project>/seo/` (mkdir -p).
2. Read findings JSON. Extract project name from `package.json` or parent dir name.
3. Render `seo/GUIDE.md` from `templates/GUIDE-template.md`, substituting `{{PROJECT_NAME}}`, `{{DATE}}`, `{{APPLIED_FIXES_LIST}}`, `{{NEEDS_YOU_LIST}}`.
4. Render `seo/audit-report.md`: scored summary (table), path-to-80 (ordered list with estimated points + effort), findings grouped by category with file paths.
5. Copy findings JSON to `seo/findings.json` (timestamped filename? No — overwrite; timestamp lives inside the JSON).
6. Copy `scripts/audit.py` to `seo/audit.py` (chmod +x).
7. If `--with-github-action`: render `templates/seo-audit-workflow.yml` to `<project>/.github/workflows/seo-audit.yml` (mkdir -p first). Ask before overwriting if already exists.
8. If `seo/GUIDE.md` or `seo/audit-report.md` already exist and no `--force`: prompt (interactive) or abort (non-interactive). Use atomic writes (tempfile + rename).

### Implementation Phases

#### Phase 1: Scaffold + audit.py skeleton (2–3 hours)

- [x] Create package layout (empty dirs + placeholder files)
- [ ] Draft new `SKILL.md` router (~120 lines) — deferred to Phase 3
- [ ] Extract 10 template files from current SKILL.md §7 — deferred to Phase 3
- [x] Write `audit.py` entrypoint + `_seoagent/` internal package:
  - `argparse` CLI with `--json-out`, `--quiet`/`--verbose`, `--dump-rubric`, `--version`
  - `Criterion`, `Finding`, `PathTo80Step` dataclasses (Literal types for enums)
  - Framework detection (11 frameworks) with `os.scandir` ignore-list pruning
  - `HeadParser` + `BodyStructureParser` (split per Kieran review — each independently testable)
  - Full 26-criterion rubric across Classic SEO / Structured Data / GEO / Performance
  - `score_category` (with MIN_CATEGORY_COVERAGE threshold), `score_overall`, `build_path_to_80`
  - JSON writer (per `findings.schema.json`) + stdout summary with score bars
- [x] Test fixtures: `tests/fixtures/clean-site/` (all green, scores 100) + `tests/fixtures/broken-site/` (scores 15)
- [x] Tests split 4 ways (per Kieran): `test_parsers.py`, `test_scoring.py`, `test_detection.py`, `test_integration.py` — 29 tests, 0.24s, determinism verified

**Gate:** `python3 audit.py tests/fixtures/clean-site` exits 0 with overall ≥ 85 (limited rubric). `broken-site` exits 0 with overall ≤ 50.

#### Phase 2: Full rubric (2–3 hours)

- [x] Full 26-criterion rubric implemented in `_seoagent/rubric.py` + `_seoagent/evaluators.py`
- [x] JSON-LD parsing + `@context` + `@type` validation (`sd_schema_syntax_valid`)
- [x] Site-file checks: `robots.txt` AI-UA parser, `sitemap.xml` urlset check, `llms.txt` markdown structure
- [x] SPA detection heuristic via regex in `detection.py::is_spa_shell`
- [ ] Expand test fixtures to include nextjs-sample + csr-spa — deferred (29 tests cover the rubric via clean-site + broken-site)
- [x] Tests split per Kieran into 4 files; all green

**Gate:** On the current repo (`/Users/jawaadbokhari/Projects/Private Projects/SEO Agent/public/index.html`), audit produces sensible scores and path-to-80 surfaces real issues.

#### Phase 3: live_check.py (2 hours) — DONE

- [x] CLI + argparse (`--json-out`, `--skip-psi`, `--quiet`, `--version`)
- [x] Fetch with default UA (`seoagent-live-check/1.0`); SSRF guards + MAX_RESPONSE_BYTES
- [x] AI crawler UA list read from `templates/ai-crawlers.json` (single source of truth)
- [x] Parallelized UA tests via `ThreadPoolExecutor(max_workers=5)` (performance-oracle requirement)
- [x] Response-header checks (HSTS, Cache-Control)
- [x] robots.txt live fetch + AI-crawler directive parse
- [x] sitemap.xml live fetch + DOCTYPE rejection + 50MB cap
- [x] llms.txt live fetch + structure check
- [x] Optional PSI v5 call (env var only, no --psi-key flag per security-sentinel, 60s timeout, key scrubbed from URLs)
- [x] SSRF: scheme whitelist, hostname resolved-and-checked against RFC1918/loopback/link-local/ULA, credentials stripped, 3-redirect cap with per-hop re-validation
- [x] Dogfood verified against anthropic.com (Bytespider expected-blocked, 401 sitemap URLs)

**Gate:** `live_check.py https://anthropic.com` runs, produces findings JSON, correctly reports whether Anthropic allows AI crawlers.

#### Phase 4: install.py + deliverables (1–2 hours) — DONE

- [x] `GUIDE-template.md` with {{placeholders}} rendered at install time
- [x] `audit-report.md` renderer (scored summary + path-to-80 + findings by category)
- [x] `github-workflow.yml` template (opt-in via `--with-github-action`)
- [x] Two-phase commit: write all `.tmp` first → rename all. Rollback on Phase-A failure.
- [x] Same-volume tempfile via `tempfile.NamedTemporaryFile(dir=target.parent)` + `os.fsync()`
- [x] Timestamped backups on overwrite (`GUIDE.md.bak.<ISO>`)
- [x] `.install-manifest.json` with SHA-256 hashes
- [x] `history/findings-<ISO>.json` append-only + `findings-latest.json`
- [x] Path-traversal guards: `realpath`, refuse $HOME/root/tmp, `target.is_relative_to(project)`
- [x] `--dry-run` flag previews every write + hash without touching disk
- [x] Ships extended client kit: `live_check.py`, `framework-playbook.md`, `scoring-rubric.md`, `ai-crawlers.md`, `geo-deep-dive.md` (agent-native parity)

**Gate:** Running full flow against a test project produces `seo/` folder with 4 files (or 5 with GH action) matching spec.

#### Phase 5: References + polish — DONE (v1 scope)

- [x] `references/framework-nextjs.md` (App Router metadata + Pages Router + JSON-LD patterns)
- [x] `references/framework-astro.md` (layout slots + @astrojs/sitemap)
- [x] `references/framework-static-html.md` (fallback playbook for all other frameworks)
- [x] `references/topic-geo.md` (GEO deep dive — writing rules, technical signals, monitoring)
- [x] `references/topic-scoring-rubric.md` (generated from `rubric.py` via `dump_rubric.py`)
- [x] `references/topic-ai-crawlers.md` (UA landscape, directive-only tokens, policy guidance)
- [x] Dogfood: `/seoagent` flow works E2E on this repo (score 59/100, path-to-80 surfaces real issues)

Deferred to future (per plan §Cuts): `framework-nuxt.md`, `vite-spa.md`, `hugo-jekyll.md`, `gatsby.md`, `11ty.md`. Fallback to `framework-static-html.md` handles these with reasonable guidance.

**Gate:** Skill tested on 3 frameworks minimum (Next.js, Astro, static HTML). Scores are sensible (not obviously wrong). All references are useful and each is < 300 lines.

#### Phase 6: Migration + commit — DONE

- [x] Archive old SKILL.md into `docs/archive/seoagent-skill-v0/SKILL.md` (this repo) — rollback reference
- [x] Replace `~/.claude/skills/seoagent/SKILL.md` with new 119-line dispatcher (70% reduction from 399)
- [x] Plan + brainstorm committed to `feat/seoagent-skill-refactor` branch in this repo
- [x] Full E2E dogfood verified: fresh `/tmp/seoagent-e2e-test/` project → audit → install → 18 files in `seo/` → client re-audits standalone without Claude

**Gate:** Fresh `/seoagent` invocation on a new project works end-to-end. Old behavior retired cleanly.

## Alternatives Considered

1. **Keep monolithic SKILL.md, bolt on a script.** Rejected: doesn't solve the 400-line load weight. The structural split is the point.
2. **Node.js scripts instead of Python.** Better HTML parsing via cheerio, but needs `npx` on first run (internet + delay) and assumes Node. Python stdlib is on every dev machine. Portability wins.
3. **LLM-evaluated audit (Claude scores each criterion).** Literally mirrors Retune's production flow. Rejected: expensive, non-deterministic, needs API key, can't run in client CI. Deterministic Python score is cheaper, explainable, re-runnable.
4. **Checklist output instead of scored.** Simpler, but explicitly rejected in brainstorm — professional agencies score.
5. **Publish as a proper pip package.** Proper versioning and `pip install`-able, but massive scope creep. Ship as a skill first; extract to a package only if adoption demands it.
6. **Google Lighthouse CLI integration instead of PSI API.** Lighthouse CLI requires Node + Chromium; PSI API is a single HTTPS call. PSI wins for portability.

## System-Wide Impact

### Interaction graph

`/seoagent` trigger → Claude reads `SKILL.md` → runs `scripts/audit.py` via Bash tool → reads `/tmp/findings.json` → optionally runs `scripts/live_check.py` → merges findings → reports scored summary + path-to-80 to user → user selects fixes → Claude loads matching `references/framework-*.md` + relevant `templates/*` → applies fixes via Edit/Write → runs `scripts/install.py` → reports deliverable files written.

Two levels deep: `audit.py` spawns no subprocesses; pure stdlib. `live_check.py` makes outbound HTTPS calls to `<url>`, `<url>/robots.txt`, `<url>/sitemap.xml`, `<url>/llms.txt`, and (optional) `googleapis.com` for PSI.

### Error & failure propagation

- `audit.py` exits non-zero on: project path invalid, unreadable files, unrecoverable parse crash. Malformed HTML per-file → emit warning finding, continue.
- `live_check.py` exits non-zero on: invalid URL, all fetch attempts fail. Individual UA fetch fail → emit finding, continue. PSI failure → skip silently (documented opt-in behavior).
- `install.py` exits non-zero on: project path invalid, findings JSON missing/malformed, write failure. Pre-existing files → interactive prompt or `--force`.
- Claude's `SKILL.md` process instructs: if a script exits non-zero, report the error to the user and offer to fall back to the checklist-based flow (the old behavior).

### State lifecycle risks

- `audit.py` is stateless. Each run overwrites its JSON output.
- `install.py` writes multiple files; mid-run failure could leave partial `seo/` folder. Mitigation: write each file to `seo/.<name>.tmp`, then atomic `os.replace()` to final name. Rollback on any failure.
- No shared state across scripts; each script owns its invocation.

### API surface parity

- `audit.py` is the **canonical source of scoring**. `SKILL.md` must never duplicate rubric weights or scoring formulas.
- `references/scoring-rubric.md` is documentation of `audit.py`, not an independent source — weight changes in code must be reflected in the reference file (manual sync; low risk since weights are stable).
- Templates and reference files live in the skill only. Client gets copies via `install.py`; those copies are frozen snapshots (no sync back).

### Integration test scenarios

1. **Next.js App Router, SSR, complete metadata** → overall ≥ 85; `geo` ≥ 70; structured-data `article_schema_content` at 100% on content routes.
2. **Static HTML site with no robots/sitemap/llms** → overall < 40; `geo` < 30; path-to-80 top item is "Add llms.txt".
3. **React CSR SPA with empty initial HTML** → SPA flag set, per-page audit skipped, single warning finding, recommendation to run `live_check.py`.
4. **Site that blocks GPTBot + ClaudeBot in robots.txt** → `ai_crawlers_allowed` criterion at 40 (blocks 2 of 5 major UAs), `geo` category pulled down accordingly.
5. **Hugo site with default config** → Classic SEO ≥ 70 (Hugo generates sitemap + robots), but `geo` depends on added llms.txt.

## Acceptance Criteria

### Functional

- [ ] `python3 audit.py <project>` produces a findings.json matching the documented shape in < 10s for projects with < 100 entry files (revised per deepen review)
- [ ] Scoring is deterministic (same repo + same audit.py version → same scores)
- [ ] Rubric covers ≥ 30 criteria across 4 categories
- [ ] Path-to-80 sorts fixes by `category_weight × criterion_weight × score_gap` (same formula as `src/scoring_rubric.py:169`)
- [ ] All 11 frameworks detected correctly on representative fixtures
- [ ] SPA pattern detected and flagged; no crash on empty-body sites
- [ ] `live_check.py <url>` tests all documented AI crawler UAs
- [ ] PSI integration activates only when `PAGESPEED_API_KEY` set (or `--psi-key` provided)
- [ ] `install.py` writes `seo/GUIDE.md`, `seo/audit-report.md`, `seo/findings.json`, `seo/audit.py` atomically
- [ ] GitHub Action is opt-in via `--with-github-action` flag
- [ ] SKILL.md is ≤ 150 lines
- [ ] End-to-end `/seoagent` works on Next.js, Astro, and static HTML projects

### Non-functional

- [ ] Zero non-stdlib imports in any script (`grep -E "^(import|from)" scripts/*.py` returns only stdlib)
- [ ] Each script has header docstring, argparse help text, and idempotent behavior
- [ ] All scripts handle malformed HTML gracefully (emit finding, don't crash)
- [ ] No reference file exceeds 300 lines
- [ ] Template files are directly copyable (no placeholder syntax other than `{{NAME}}` for install.py substitution)

### Quality gates

- [ ] `python3 -m unittest tests/test_audit.py` passes (stdlib unittest, no pytest dep)
- [ ] Fixtures: clean-site ≥ 85 overall, broken-site ≤ 50 overall, csr-spa flagged without crash
- [ ] Dogfood: `/seoagent` run on the current Retune repo produces a coherent audit-report.md
- [ ] Old 399-line SKILL.md content fully migrated — nothing orphaned

## Success Metrics

- **SKILL.md load weight:** 399 lines → ≤ 150 lines (≥ 62% reduction in always-loaded context)
- **Audit runtime:** < 10s on a typical small project (< 100 entry files); graceful degradation at 1000+ files (revised from < 5s per performance-oracle review — stdlib `html.parser` throughput is ~1–5 MB/s)
- **Client independence:** client can run `python3 seo/audit.py .` with zero deps on Claude
- **Scoring correlation:** manual spot-check on 3 projects shows scores match intuition (no obvious wrong calls)
- **Dogfood signal:** running `/seoagent` on this repo produces findings that reveal real issues in its own `public/` pages

## Dependencies & Prerequisites

- **Runtime:** Python 3.8+ (for `dataclasses` built-in, `typing` features). Every macOS/Linux dev has this; Windows via `py -3`.
- **Optional:** `PAGESPEED_API_KEY` env var for PSI integration. Free tier is 25,000 requests/day — more than enough.
- **No build step, no dependencies, no installs.**

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| `html.parser` leniency misses malformed tags | Low | Medium | Best-effort parsing; emit warning findings rather than crash; fallback regex checks for critical elements |
| Framework detection false positive (e.g., Vite SSR flagged as CSR) | Medium | Low | Check for SSR/SSG signals (`vite-plugin-ssr`, `@sveltejs/adapter-*`, `astro` in deps); on ambiguity emit detection warning and proceed with best guess |
| JSON-LD validation too strict | Medium | Medium | Minimal check: parseable JSON + `@context` + `@type` present; don't deep-validate schema (out of scope) |
| Scoring weights feel subjective | Medium | High | Document weights + rationale in `references/scoring-rubric.md`; allow override via `seoagent.config.json` in future (not this phase) |
| Progressive disclosure split creates navigation fatigue | Low | Medium | Keep references flat (no subdirs); each file > 80 lines (minimum useful size); SKILL.md's explicit "load X when Y" lines reduce hunting |
| Client-shipped `audit.py` drifts from skill version | Low | Low | Accepted per brainstorm (YAGNI); re-running `/seoagent` overwrites |
| PSI API key leakage or quota exhaustion | Medium | Low | Env var only, never logged; skip silently on failure; 25k/day free tier is safe |
| SPA false negatives (SSG content mistaken for CSR) | Medium | Medium | SPA heuristic requires empty `<body>` + root div + no SSR signals; on ambiguity, lean "audit anyway" and let low scores surface the issue |
| Large project audit slow (>1000 pages) | Low | Low | Acceptable at launch; later: parallelize page parsing with `concurrent.futures` |
| Refactor regresses existing skill behavior | High | Medium | Keep `SKILL.md.v0-backup` during transition; one-shot dogfood before removing backup |
| Atomic-write race in `install.py` on Windows | Low | Low | Use `os.replace()` (POSIX + Windows atomic); fall back to clobber on NTFS edge cases |
| Reference file bit rot (AI crawler UAs, llms.txt spec change) | Medium | High | `references/ai-crawlers.md` and `references/geo-deep-dive.md` get a dated "last reviewed" header; quarterly review item in client GUIDE |

## Resource Requirements

- **Time:** 10–14 hours focused work across 6 phases
- **People:** one developer (user)
- **Infra:** none (scripts run locally; PSI is optional free API)
- **Test projects:** 3 fixture projects in `tests/fixtures/` + dogfood on this repo

## Future Considerations

- **Config file support.** `seoagent.config.json` in client project for weight overrides, excluded paths, custom criteria.
- **Diff mode.** `audit.py --compare-to seo/findings.json` shows deltas vs prior audit (enables tracking improvement over time).
- **Multi-URL sitemap crawl.** `live_check.py --crawl-sitemap` fetches every URL in sitemap.xml and audits each.
- **Additional schema types.** `VideoObject`, `Recipe`, `Event`, `Course`, `LocalBusiness` as contextual criteria.
- **hreflang / i18n coverage.** Currently unhandled; relevant for multilingual sites.
- **Google Rich Results API.** Cloud-based validation of schema; post-MVP.
- **LLM-assisted copy review** (opt-in, separate script): calls Anthropic API to score "answer-first" writing quality, named-entity clarity, citation-readiness. Out of stdlib scope — goes in a companion `seoagent-copy` skill.
- **Package as pip.** If adoption warrants, extract `audit.py`/`live_check.py` to a proper `seoagent` pip package; skill becomes a thin wrapper.
- **Pre-commit hook.** Template a `.pre-commit-config.yaml` entry that runs `audit.py --fail-below 70`.

## Documentation Plan

- [ ] `~/.claude/skills/seoagent/SKILL.md` — router + process
- [ ] `~/.claude/skills/seoagent/references/scoring-rubric.md` — rubric documentation with weights
- [ ] `~/.claude/skills/seoagent/references/ai-crawlers.md` — current UA landscape (dated review header)
- [ ] `~/.claude/skills/seoagent/references/geo-deep-dive.md` — writing + monitoring guide
- [ ] Per-framework: `framework-*.md` × 8
- [ ] Client `seo/GUIDE.md` — maintenance playbook
- [ ] Client `seo/audit-report.md` — rendered findings
- [ ] `docs/brainstorms/2026-04-23-seoagent-skill-optimization-brainstorm.md` — written
- [ ] `docs/plans/2026-04-23-refactor-seoagent-progressive-disclosure-plan.md` — this plan
- [ ] After shipping: `docs/solutions/seoagent-static-scoring-in-python-stdlib.md` — novel pattern worth capturing for future

## References & Research

### Internal

- `src/scoring_rubric.py` — canonical scoring pattern; `Criterion` dataclass, category weights (0.25 × 4), `compute_category_score`, `compute_overall_score`, `_build_path_to_80()` at line 169 (sort key `cat_weight × crit_weight × score_gap`, effort bands at 40/20)
- `src/models.py:106-143` — `CriterionResult`, `SEOIssue`, `PathTo80Step` Pydantic shapes (stdlib dataclass equivalents will mirror)
- `src/tools/website_analyzer.py` — tool output pattern (finding + recommendation per criterion)
- `~/.claude/skills/seoagent/SKILL.md` — current 399-line monolith (to refactor)
- `docs/brainstorms/2026-04-23-seoagent-skill-optimization-brainstorm.md` — resolved decisions

### External / Skill Authoring

- `~/.claude/plugins/cache/every-marketplace/compound-engineering/2.35.1/skills/create-agent-skills/SKILL.md` — authoritative skill-authoring guide (SKILL.md < 500 lines; `scripts/`, `references/`, `templates/`, `workflows/` convention; explicit progressive disclosure instructions; no XML tags in body; `disable-model-invocation: true` for side-effect operations)
- `~/.claude/skills/cto-frontend-style/` — 5-reference-file skill pattern (SKILL.md 82 lines, total 993 lines across 6 files)
- `~/.claude/plugins/cache/.../skills/rclone/` — script-based skill pattern (`bash ${CLAUDE_PLUGIN_ROOT}/skills/rclone/scripts/check_setup.sh`)
- `~/.claude/plugins/cache/.../skills/git-worktree/` — workflow + script pattern

### External / SEO + GEO

- [Schema.org](https://schema.org/) — JSON-LD types
- [llmstxt.org](https://llmstxt.org/) — llms.txt specification
- [web.dev Core Web Vitals](https://web.dev/vitals/) — LCP/CLS/INP targets
- [Google PageSpeed Insights API v5](https://developers.google.com/speed/docs/insights/v5/get-started) — PSI integration. Endpoint: `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed`. Rate limit: 25,000/day, 400/100s with key.
- [Google Search Central](https://developers.google.com/search) — authoritative SEO docs
- [OpenAI GPTBot docs](https://platform.openai.com/docs/gptbot) — crawler UA + opt-out
- [Anthropic ClaudeBot docs](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) — crawler UA + opt-out
- [Perplexity crawler docs](https://docs.perplexity.ai/guides/bots) — PerplexityBot + Perplexity-User distinction

### Related Work

- Retune's own scoring implementation (this repo, `src/scoring_rubric.py`) — proved the pattern works; skill adoption validates it outside the Retune product
