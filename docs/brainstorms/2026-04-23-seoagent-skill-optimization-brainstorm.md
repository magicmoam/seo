---
date: 2026-04-23
topic: seoagent-skill-optimization
status: ready-for-planning
---

# seoagent Skill — Professional Optimization

## What We're Building

Rebuild the `seoagent` skill from a 400-line monolithic `SKILL.md` into a lean, progressively-disclosed skill package that ships executable audit tooling into client projects. The deliverable shifts from "Claude reads a checklist and writes a guide" to "Claude runs a scored audit script, applies fixes, and hands the client a re-runnable tool."

The skill will continue to handle classic SEO + GEO (AI search optimization) on any web project — but now with quantified scoring (0–100 per category, mirroring the Retune `scoring_rubric.py` pattern), a standalone Python audit script the client owns and can run in CI, and a properly structured skill package that follows Anthropic's progressive disclosure guidance.

## Why This Approach

Considered three axes of "professional":

- **Deliverable polish** (fancier reports, pre/post evidence) — useful but secondary. Scoring gives us most of the polish value without extra scope.
- **Depth & rigor** (live site verification, competitor benchmarking) — partly needed; covered by the optional live-audit script.
- **Skill-authoring craft + automation** (user's top picks) — highest leverage. The current `SKILL.md` bloats every invocation; moving templates, framework playbooks, and audit logic out of the trigger file both speeds Claude up and makes the skill maintainable. Shipping a runnable `audit.py` to the client converts a one-shot artefact into a long-lived tool.

The combination of scored audits + runnable script + progressive disclosure is what separates this from a "Claude checklist" — it is what a real SEO agency would leave behind.

## Key Decisions

- **Split structure (progressive disclosure):** `SKILL.md` (~100 lines, dispatcher) + `templates/` (verbatim copyable files) + `references/` (framework playbooks, GEO deep-dive, scoring rubric — loaded on demand) + `scripts/` (`audit.py`, `live_check.py`, `install.py`). Rationale: Anthropic's own guidance — keep the always-loaded part lean; defer detail.

- **Audit scope: both static + live.** Static runs against repo files (pre-deploy, offline, no keys). Live runs against a deployed URL (rendered HTML, AI-crawler UA checks, robots.txt / sitemap reality check). Live is opt-in. Rationale: static always works; live catches production-only issues.

- **Language: Python, stdlib-only.** `urllib`, `html.parser`, `json`, `re`, `xml.etree`. Zero-install on any machine with Python 3. Rationale: maximum portability across all project types (JS, Ruby, Hugo, plain HTML).

- **Client deliverable (written to `<project>/seo/`):**
  - `GUIDE.md` — maintenance playbook (current skill's output, unchanged in spirit)
  - `audit-report.md` — scored report with path-to-80 backlog
  - `findings.json` — timestamped machine-readable snapshot (enables diffs)
  - `audit.py` — standalone re-runnable script (~300 lines Python)
  - `.github/workflows/seo-audit.yml` — optional CI job (offered, not forced)

- **Report format: scored (0–100).** Four categories at 25% weight each: Classic SEO, Structured Data, GEO, Performance (performance only populated if live audit ran). Deterministic Python scoring from findings; "path-to-80" sorts fixes by points gained × weight. Mirrors the Retune pattern the user already trusts.

- **AI-crawler policy: default allow, explicit consent to block.** Covers `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `PerplexityBot`, `Perplexity-User`, `ClaudeBot`, `Claude-Web`, `anthropic-ai`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `meta-externalagent`, `Amazonbot`, `Bytespider`. Blocking = invisible in AI answers; user must opt in explicitly.

- **Framework coverage:** Next.js (App + Pages), Astro, Nuxt, Vite/SPA, plain static HTML, Hugo, Jekyll, 11ty, Gatsby. One reference file per framework in `references/`, loaded only when that framework is detected.

## Proposed Package Layout

```
~/.claude/skills/seoagent/
  SKILL.md                          # ~100 lines, dispatcher + process
  templates/                        # verbatim files, copied into client project
    GUIDE-template.md
    robots.txt
    llms.txt
    meta-block.html
    schema-organization.jsonld
    schema-website.jsonld
    schema-article.jsonld
    schema-faqpage.jsonld
    schema-breadcrumb.jsonld
    schema-product.jsonld
    github-workflow.yml
  references/                       # loaded on demand
    framework-nextjs.md
    framework-astro.md
    framework-nuxt.md
    framework-static.md
    framework-hugo-jekyll.md
    framework-gatsby.md
    framework-11ty.md
    geo-deep-dive.md
    scoring-rubric.md
    ai-crawlers.md
  scripts/
    audit.py                        # static audit, stdlib only
    live_check.py                   # live URL audit, stdlib only
    install.py                      # copies deliverables to client project
```

## Script Contracts (for the plan phase)

- `audit.py <project_path> [--json]` — walks repo, emits `findings.json` + human-readable stdout. Detects framework, parses head of entry files, checks robots/sitemap/llms.txt presence, validates JSON-LD, counts heading issues + missing alts.
- `live_check.py <url> [--json]` — fetches with default + AI-crawler UAs, parses rendered HTML, pulls response headers, validates sitemap XML, returns findings JSON.
- `install.py <project_path>` — writes `seo/GUIDE.md`, `seo/audit-report.md`, `seo/findings.json`, `seo/audit.py`, optional `.github/workflows/seo-audit.yml`.
- Scoring lives in `audit.py` (self-contained) so re-runs in CI don't depend on the skill.

## Resolved Questions

1. **GitHub Action:** ✅ Included. Claude offers to drop `.github/workflows/seo-audit.yml` at the end of a run.
2. **PageSpeed Insights:** ✅ Included. `live_check.py` calls Google PSI API when `PAGESPEED_API_KEY` env var is set, skips silently otherwise. Enables the Performance score category.
3. **JS-rendered SPAs:** ✅ Flag + recommend live audit. `audit.py` detects CSR pattern (empty body, root div, framework hints), emits a warning finding, tells user to run `live_check.py` for a real read.
4. **Versioning of shipped `audit.py`:** ❌ Skipped. YAGNI — drift is a low-severity problem; re-running `/seoagent` overwrites anyway. Revisit if it becomes painful.
5. **OG-image auto-generation:** ❌ Out of scope. Keeps the zero-deps promise. Audit flags missing OG image for the user to supply manually.

## Next Steps

→ `/workflows:plan` to turn this into a concrete implementation plan (file list, script pseudocode, rubric weights, migration path from the existing 400-line `SKILL.md`).
