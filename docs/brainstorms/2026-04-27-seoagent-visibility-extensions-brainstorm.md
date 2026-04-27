---
date: 2026-04-27
topic: seoagent-visibility-extensions
status: ready-for-planning
---

# seoagent Skill — Max-Visibility Extensions

## What We're Building

Three additions to the existing `seoagent` skill that move it from "audit + fix on-page" to "max visibility on deploy" for any website the user ships. The skill stays zero-dep, stdlib-only, progressively-disclosed. No new agents, no orchestration spine, no scope creep into Writer/Social/Mail/Scout/Analyst territory.

The trigger use case: the user deploys a new site (their own), runs `/seoagent`, and walks away with a complete punch list — not just "your meta tags are fine" but "submit to these 12 places, ping these search engines, run this outreach to 8 sites by next Friday."

## Why This Approach

The current skill (post Phases 1–6) is excellent at *on-page truth* — schema, meta, alt text, llms.txt, AI crawler policy, etc. It is silent on *off-page visibility actions* — indexing, directories, backlinks. Off-page is where 60% of the visibility gain on a fresh site lives, and none of it requires new agents or a multi-agent system.

Three extensions, each shippable independently, each surgical:

- **Indexing submission** — fastest possible time-to-discovery for new pages
- **Directory submission checklist** — high-quality early backlinks + brand surface area
- **Outreach kit** — backlink seeding via templates + tracking, with optional Retune handoff for prospect generation

Each addition is one reference doc + (optionally) one small script. Total scope: ~3–5h of work.

## Key Decisions

- **Stay zero-dep, stdlib-only.** Same constraints as existing skill. Anything requiring an API (Jina, Ahrefs, GSC OAuth) is gated behind an env var check or punted to manual instructions. Skill must work offline against any project.

- **No new agents.** These are additions to existing skill scripts/references, not a new agent layer. The friend's Marketing Autopilot territory is explicitly off-limits — we are extending Retune's SEO lane, not building Social/Mail/Scout/Writer agents.

- **Curated knowledge over generated knowledge.** The directory list and outreach templates are hand-curated (the moat). The skill ships a static, dated, category-tagged knowledge base in `templates/directories/` and `templates/outreach/`. Refreshed manually, not scraped.

- **Category detection drives output.** The existing skill detects framework (Next.js, Astro, etc.); add lightweight category detection (SaaS, agency, e-commerce, local biz, blog/media, indie/creator) from homepage content + meta. Directory checklist + outreach templates filter by category. Wrong category → wrong directories → wasted hours, so detection accuracy matters.

- **Visibility findings flow into the existing rubric.** Add a new category — `visibility` — at 10% weight, drawn off the existing 4-category split (proposed: Classic SEO 25 → 22, Structured Data 30 → 27, GEO 30 → 26, Performance 15 → 15, Visibility 0 → 10). Or alternatively keep weights and treat visibility as a separate report section. Open question for the plan phase.

- **Indexing submission is fully automated; directories and outreach are checklists.** IndexNow can be done in stdlib Python with no auth. GSC and Bing Webmaster sitemap submit require OAuth — too heavy for a zero-dep skill, so we ship deeplinks + 60-second instructions instead. Directory submissions and outreach are intrinsically human work (signup, copy/paste, follow-up) and are scoped as tracked checklists, not automation.

## Proposed Additions

```
~/.claude/skills/seoagent/
  scripts/
    submit_index.py              # NEW — IndexNow ping, stdlib only
    _seoagent/
      categorization.py          # NEW — detect site category from homepage
  templates/
    directories/                 # NEW — curated lists per category
      saas.md
      agency.md
      ecommerce.md
      local-business.md
      blog-media.md
      indie-creator.md
    outreach/                    # NEW — kit
      email-templates.md         # 4 templates: link reclamation, broken link, resource page, guest post
      tracking.csv.template      # CSV header: prospect_url, contact, sent_date, replied, status, notes
      finding-prospects.md       # how to find prospects (manual + Retune backlink_strategy hand-off)
  references/
    topic-indexing.md            # NEW — IndexNow + GSC/Bing setup walkthrough
    topic-directories.md         # NEW — selection criteria, anti-spam principles, what counts
    topic-outreach.md            # NEW — outreach playbook, ethics, response handling
  SKILL.md                       # update — dispatcher routes to new flows
```

`install.py` extension: copy the relevant `directories/<category>.md` + `outreach/` files into `<project>/seo/visibility/` so the user has a checklist they can work against and tick off. Add `seo/visibility/checklist.md` (generated, not template) summarising open actions across all three.

## Script Contracts (for the plan phase)

- `submit_index.py <project_path> [--site-url URL] [--dry-run]`
  - Generates IndexNow key file (UUID), writes to `public/<key>.txt` (or framework-appropriate static dir)
  - POSTs sitemap URLs to `https://api.indexnow.org/IndexNow`
  - Falls back to printing manual GSC/Bing submit URLs if site URL is missing
  - Stdlib only (urllib, uuid, json)
  - Prints next-step instructions (verify key file is reachable, GSC sitemap submit deeplink)

- `_seoagent/categorization.py`
  - Reads detected homepage HTML (already parsed by `audit.py`)
  - Heuristics first (pricing page → SaaS; "services" + "case studies" → agency; cart/product schema → e-commerce; address + phone → local biz; author + post list → blog/media; personal name + projects → indie)
  - Returns one of 6 categories + confidence score
  - No LLM call — deterministic, fast, easy to test

## Resolved Questions

1. **Visibility as 5th rubric category vs separate report section?** ✅ **Separate section in v1.** Keeps the existing 4-category rubric stable, no JSON schema change, no diff-mode breakage. Pre-prod runs stay honest (visibility actions can't be executed before deploy, so an unscored checklist is more accurate than a 0/100 score). Promote to scored category in v2 if dogfooding shows post-deploy is the dominant use case.

2. **Outreach prospect generation: Retune handoff or Jina-in-skill?** ✅ **Option (c) — Jina-if-present with Retune-handoff fallback.** Skill checks for `JINA_API_KEY` in env at runtime. If present, runs `competitor_backlinks.py` inline (urllib + Jina API, stdlib HTTP). If absent, generates the outreach kit with manual Retune-handoff instructions. Zero-dep promise preserved (skill works without the key); rich UX when the key is configured. User confirmed they will provide `JINA_API_KEY` for their own use; planning phase needs to spec the env-detection branching.

3. **Directory list refresh cadence?** ✅ **JSON SSOT (b).** `templates/directories.json` is the single source. `scripts/dump_directories.py` (~30 lines) regenerates `references/topic-directories.md` and per-category `templates/directories/<category>.md` files. Same SSOT + generation pattern as `templates/ai-crawlers.json` + `scripts/dump_rubric.py` from the Phase 1 refactor. Forbid hand-edits on generated files.

4. **Category detection: 6 or 3 in v1?** ✅ **Three with on-demand expansion.** Ship SaaS, agency, blog/media. Other detected categories (e-commerce, local-biz, indie-creator) fall back to a `generic.md` high-DR universal directory list with a finding noting "category-specific list not yet curated." Add categories when the user's actual site mix demands them. Detection logic in `_seoagent/categorization.py` recognises all 6+ categories from the start (cheap to detect); only the curated lists are scoped to 3.

5. **Score the outreach checklist?** ✅ **Unscored in v1.** Consistent with Q1's separate-section decision — visibility is a checklist, not a score. Skill writes the checklist; never reads it back. Avoids markdown-parser brittleness. Re-runs regenerate the checklist preserving completed items based on a small `seo/visibility/.state.json` file (lightweight, single-purpose state, no scoring logic). Promotion path: if v2 makes visibility a scored category (Q1), revisit scoring the checklist as part of that change.

6. **Build a Social/Mail/Scout/Writer/Analyst agent?** ❌ No. Out of scope, friend's territory, and not needed for "visibility on deploy" use case. Audience-building and conversion are post-deploy ops, not on-deploy visibility.

7. **GSC API integration?** ❌ No. OAuth + Google Cloud project setup is too heavy for a zero-dep skill. Deeplinks + manual instructions cover 95% of the value at 5% of the build cost.

8. **Automated directory submission?** ❌ No. Most directories require captcha, signup flow, manual verification. Automating it is anti-spam-policy-violating and the moat (relationship + accuracy) lives in human work.

9. **Submit IndexNow to all engines simultaneously?** ✅ Yes. IndexNow is one POST endpoint serving Bing, Yandex, Naver, Seznam. Single call, no per-engine work.

## Next Steps

All open questions resolved. Ready for `/workflows:plan` to produce:
- Script pseudocode for `submit_index.py`, `competitor_backlinks.py` (Jina branch), `dump_directories.py`
- `_seoagent/categorization.py` heuristic spec (6-category detection, 3-category curated output)
- Seed content for `templates/directories.json` (SaaS, agency, blog/media — ~10–15 entries each, dated, DR estimates)
- Outreach kit content: 4 email templates (link reclamation, broken link, resource page, guest post), tracking CSV schema
- Integration plan for `install.py` to ship `seo/visibility/` deliverables alongside existing `seo/` outputs
- Acceptance criteria + test fixtures (visibility section renders for all 3 curated categories + generic fallback)

Implementation note: user will provide `JINA_API_KEY` for personal use. Skill must continue to work without it (Retune-handoff branch tested in CI).
