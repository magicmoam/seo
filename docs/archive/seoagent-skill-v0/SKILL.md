---
name: seoagent
description: Audit and optimize any web project for classic SEO and GEO (Generative Engine Optimization — AI search like ChatGPT, Perplexity, Google AI Overviews, Claude). Applies fixes in-repo (meta tags, schema.org JSON-LD, sitemap, robots.txt, llms.txt, semantic HTML, OG/Twitter cards) and writes a client-facing maintenance guide at `seo/GUIDE.md`. Triggers on "/seoagent", "optimize this for SEO", "add GEO", "prep for AI search", "make this rank", "add schema", "add llms.txt", or when the user wants on-page SEO work across a project.
---

# SEO Agent

Audit a web project, apply concrete SEO + GEO optimizations to the code, and write a maintenance playbook the client can follow after you leave. Classic SEO (Google) and GEO (AI search: ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini, You.com) share fundamentals but diverge in important ways — this skill treats them as equally first-class.

## When to use

- User says `/seoagent`, "optimize for SEO", "add GEO", "prep for AI search", "make this rank", "schema markup please"
- User is shipping a marketing site, docs site, landing page, or product site and wants on-page fundamentals handled
- User mentions ChatGPT/Perplexity/AI Overviews citations
- After a design overhaul, before launch, or during a content refresh

**Not for**: off-page link building, paid search, keyword research across a full domain (this is an on-page + technical + GEO pass, not a full-service SEO engagement).

## Process

### 1. Detect the project

Before touching anything, understand what you're working on. Run these in parallel:

- `ls` the repo root — identify framework (look for `next.config.*`, `astro.config.*`, `nuxt.config.*`, `gatsby-config.*`, `vite.config.*`, `package.json`, `_config.yml`, `config.toml`, plain `index.html`, `public/`, `src/`)
- Read `package.json` if present — framework + version
- Find entry HTML or layout files:
  - Next.js App Router: `app/layout.tsx`, `app/(*)/page.tsx`, `app/sitemap.ts`, `app/robots.ts`
  - Next.js Pages: `pages/_document.tsx`, `pages/_app.tsx`
  - Astro: `src/layouts/*.astro`, `src/pages/**/*.astro`
  - Nuxt: `app.vue`, `nuxt.config.ts`
  - Vite/SPA: `index.html`, `src/main.*`
  - Static: `index.html`, `public/*.html`
  - Hugo/Jekyll/11ty: `layouts/`, `_layouts/`, `_includes/`
- Check for existing SEO assets: `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`, `public/favicon.*`, `public/og-image.*`
- Get the site's stated purpose — read README.md or top of homepage content

If you can't tell what the site is about from code + README, **ask one question**: "What does this site do, and who's the audience?" GEO depends on clear positioning more than classic SEO does — AI engines retrieve on entities and intent, not just keywords.

### 2. Audit — produce a findings list

Check every item below. Mark each ✅ present, ⚠️ partial/weak, ❌ missing. Don't fix yet — collect first so the user sees the scope.

**Classic SEO (on-page / technical)**

- [ ] `<title>` — unique per page, 50–60 chars, primary keyword front-loaded
- [ ] `<meta name="description">` — unique per page, 140–160 chars, has a CTA verb
- [ ] Canonical tag (`<link rel="canonical">`) on every page
- [ ] One `<h1>` per page, descriptive, matches intent
- [ ] Logical `<h2>`/`<h3>` hierarchy (no skipped levels)
- [ ] Open Graph: `og:title`, `og:description`, `og:image` (1200×630), `og:url`, `og:type`
- [ ] Twitter Card: `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`
- [ ] `<html lang="...">` set
- [ ] Favicon + Apple touch icon + `theme-color`
- [ ] `robots.txt` at site root, references sitemap
- [ ] `sitemap.xml` (or framework-generated equivalent) at site root
- [ ] Alt text on all `<img>` (empty `alt=""` only for decorative)
- [ ] Images have explicit `width`/`height` (CLS) and use WebP/AVIF where possible
- [ ] Internal links use descriptive anchor text (no "click here")
- [ ] URLs are clean, lowercase, hyphenated, no tracking cruft in internal links
- [ ] 404 page exists and is useful
- [ ] HTTPS + HSTS (deployment-level; flag if missing)
- [ ] Mobile viewport meta tag present
- [ ] Core Web Vitals reasonable — flag obvious issues (render-blocking JS, huge images, layout shift)

**Structured data (JSON-LD)**

- [ ] `Organization` or `Person` schema on homepage (with `sameAs` to social profiles)
- [ ] `WebSite` schema with `SearchAction` (enables sitelinks search box)
- [ ] `BreadcrumbList` on nested pages
- [ ] `Article` / `BlogPosting` on content pages (with `author`, `datePublished`, `dateModified`)
- [ ] `FAQPage` on any page with Q&A content
- [ ] `Product` + `Offer` + `AggregateRating` on product pages
- [ ] `HowTo` on tutorial content
- [ ] `SoftwareApplication` for SaaS landing pages

**GEO — Generative Engine Optimization**

GEO is how you get cited in ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini. AI engines chunk, retrieve, and synthesize — optimize for **extraction**, not just ranking.

- [ ] **`llms.txt`** at site root — the emerging standard (proposed by Answer.AI, adopted by Anthropic, Vercel, Supabase, Cloudflare). Curated, markdown-formatted index of the site's most important content for LLM consumption. See template in §4.
- [ ] **`llms-full.txt`** (optional) — full-text concatenation of key docs/pages for one-shot LLM ingestion
- [ ] **Answer-first paragraphs** — lead each page/section with a definitive one-sentence answer, then support it. AI engines extract lead sentences.
- [ ] **FAQ blocks with semantic Q&A** — use real `<h2>`/`<h3>` questions and direct answers. Mark up with `FAQPage` JSON-LD. This is the single highest-ROI GEO tactic.
- [ ] **Named entities explicit** — spell out product names, company names, people, places. AI retrieval weights named entities heavily. Don't rely on pronouns across sections.
- [ ] **Citation-ready facts** — include dates, numbers, sources. "As of March 2026, X supports Y" beats "recently, X added support." AI engines prefer dated, sourced claims.
- [ ] **Author + date metadata** — `<meta name="author">`, `datePublished`, `dateModified`. AI engines weight authorship/freshness for E-E-A-T.
- [ ] **Clear hierarchical structure** — one topic per section, one question per heading. AI chunkers split on headings.
- [ ] **Semantic HTML** — `<article>`, `<section>`, `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`. Not a sea of `<div>`s.
- [ ] **Plain-text fallbacks** — if the site is JS-rendered, ensure meaningful content is in initial HTML (SSR/SSG) or a prerendered snapshot. AI crawlers often don't execute JS (Perplexity's does; ChatGPT's often doesn't; GPTBot doesn't).
- [ ] **`robots.txt` allows AI crawlers** (or consciously blocks them) — `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `PerplexityBot`, `Perplexity-User`, `ClaudeBot`, `Claude-Web`, `anthropic-ai`, `Google-Extended`, `CCBot`, `Applebot-Extended`, `meta-externalagent`, `Amazonbot`, `Bytespider`. Confirm the user's intent before changing this — blocking = not in AI answers.
- [ ] **Brand consistency** — same NAP (name/address/phone) and descriptions across site, social, and any directories. AI triangulates entities across sources.
- [ ] **Comparison/"vs" content** — if the product has competitors, a comparison page is a strong GEO lever (AI engines love "X vs Y" queries).
- [ ] **Glossary/definitions page** — one-line canonical definitions of domain terms. High AI-retrieval value.

### 3. Present findings, then fix

Report findings in a compact table (present/partial/missing per category). Then ask: "Apply all fixes, or pick which?" Default to applying the safe batch (meta tags, schema, llms.txt, robots.txt, sitemap, alt text, semantic headings) and flagging anything that needs editorial judgment (copy rewrites, positioning).

**When fixing:**

- Respect the framework — use its idioms (Next.js `metadata` export, Astro `<head>` slot, `next-sitemap`, etc.). Don't hand-roll what the framework provides.
- For dynamic pages, add metadata at the route level, not globally.
- JSON-LD: inject as `<script type="application/ld+json">` in the head. Keep one block per schema type per page — don't stuff.
- `og:image`: if one doesn't exist, generate a 1200×630 PNG using the project's brand (or flag for the user to supply).
- Don't invent facts for schema (`foundingDate`, `address`, ratings). Ask or leave as placeholder with a `TODO` comment.
- Don't block AI crawlers without explicit user consent.

**Framework cheat-sheet:**

- **Next.js App Router**: `export const metadata = {...}` in `layout.tsx`/`page.tsx`; `app/sitemap.ts`, `app/robots.ts` for dynamic; put `llms.txt` in `public/`.
- **Next.js Pages**: use `next/head` or `next-seo`; `public/robots.txt`, `public/sitemap.xml` (or `next-sitemap` package).
- **Astro**: `<head>` in layouts; `@astrojs/sitemap` integration; `public/robots.txt`, `public/llms.txt`.
- **Nuxt**: `useSeoMeta()`, `@nuxtjs/sitemap`; `public/robots.txt`, `public/llms.txt`.
- **Vite/plain HTML**: edit `<head>` directly; `public/` or site root for text files.
- **Gatsby**: `react-helmet-async` or `gatsby-plugin-react-helmet`; `gatsby-plugin-sitemap`.
- **11ty/Hugo/Jekyll**: front-matter + layout partials; built-in sitemap plugins.

### 4. Write `seo/GUIDE.md`

This is the deliverable the client keeps. Place it at `<project>/seo/GUIDE.md` (create the `seo/` folder). Structure:

```markdown
# SEO + GEO Maintenance Guide

_Generated by seoagent on {DATE}. Tailored to {PROJECT NAME}._

## What was done

- {concrete list of every fix applied, with file paths}
- {e.g., "Added Organization + WebSite JSON-LD to app/layout.tsx:12"}

## What still needs you

- {items that need human judgment — copy, imagery, positioning, paid tools}
- {e.g., "Supply 1200×630 og-image.png at public/og-image.png"}

## Monthly checklist (15 min)

- [ ] Run the site through [PageSpeed Insights](https://pagespeed.web.dev/) — keep LCP < 2.5s, CLS < 0.1, INP < 200ms
- [ ] Check [Google Search Console](https://search.google.com/search-console) — fix any Coverage errors, review Top Queries for content gaps
- [ ] Check [Bing Webmaster Tools](https://www.bing.com/webmasters) — Bing powers ChatGPT Search and Copilot; do not skip this
- [ ] Search your brand in ChatGPT, Perplexity, and Google AI Overviews — are you cited accurately? If wrong, the fix is almost always clearer on-page copy + schema, not "ranking"
- [ ] Update `dateModified` on any page you touched
- [ ] Review `llms.txt` — add any new high-value pages

## Quarterly checklist (1 hr)

- [ ] Audit internal linking — every important page reachable in ≤ 3 clicks from homepage
- [ ] Check for broken links (use [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) free tier or `lychee` CLI)
- [ ] Re-submit sitemap in Search Console + Bing Webmaster Tools
- [ ] Review robots.txt AI-crawler policy — still match your stance?
- [ ] Add one comparison page or FAQ expansion — GEO compounds with coverage
- [ ] Refresh one cornerstone page's stats/dates — freshness signal

## Publishing new content — the 10-minute checklist

Before you hit publish on any new page or post:

1. **Title** — 50–60 chars, primary keyword front, brand at end if it fits
2. **Meta description** — 140–160 chars, has a verb, earns the click
3. **One H1** — matches the user's question or intent
4. **Answer-first paragraph** — one sentence that directly answers what the page is about. AI engines extract this.
5. **H2/H3 hierarchy** — one topic per section, questions as headings where it fits
6. **Named entities spelled out** — your product, your company, key concepts. No vague pronouns across sections.
7. **One dated fact or stat** — "As of {month year}, …" — AI engines prefer dated claims
8. **FAQ block at the bottom** — 3–5 real questions with direct answers, marked up as `FAQPage` JSON-LD
9. **Internal links** — link to 2–3 related pages with descriptive anchor text
10. **Images** — compressed, WebP, `alt=""` written, `width`/`height` set
11. **Schema** — `Article` or `BlogPosting` with `author`, `datePublished`, `dateModified`
12. **Add to `llms.txt`** — if it's a cornerstone page, add the link with a one-line summary

## GEO specifics — why AI search is different

Classic SEO optimizes for _ranking_. GEO optimizes for _citation_. AI engines (ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini) chunk content, retrieve the most relevant chunks, and synthesize an answer. Your job is to be **the chunk that gets picked**.

Rules of thumb:

- **Lead with the answer.** The first sentence of a section is the most likely to be extracted. Write it like it's the tweet.
- **Be specific, dated, and sourced.** "47% of X in 2025 (Source: Y report)" beats "most X."
- **Mark up everything with schema.** `FAQPage`, `Article`, `Product`, `HowTo`, `Organization`. AI engines use structured data as a retrieval signal.
- **`llms.txt` is your hand-curated site index for LLMs.** It's not a ranking signal yet, but Anthropic, Vercel, Supabase, Cloudflare, and others publish one. Low cost, meaningful upside.
- **Let AI crawlers in** (unless you have a strong reason not to). If GPTBot/ClaudeBot/PerplexityBot are blocked, you are literally invisible in those answers.
- **Monitor citations, not just rankings.** Search your brand + key queries in ChatGPT, Perplexity, Google AI Overviews monthly. Track which pages get cited.

## Useful links

- [Google Search Central](https://developers.google.com/search)
- [Schema.org](https://schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [llms.txt spec](https://llmstxt.org/)
- [web.dev Core Web Vitals](https://web.dev/vitals/)
- [Ahrefs free tools](https://ahrefs.com/free-seo-tools) / [Screaming Frog free tier](https://www.screamingfrog.co.uk/seo-spider/)
```

### 5. Templates to apply during fixes

**`robots.txt`** (permissive default — confirm with user):

```
User-agent: *
Allow: /

# AI crawlers — allowed by default. Remove or disallow to opt out of AI answers.
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: meta-externalagent
Allow: /

Sitemap: https://{DOMAIN}/sitemap.xml
```

**`llms.txt`** (root-level, markdown — replace placeholders):

```markdown
# {Project Name}

> {One-sentence description of what this is and who it's for.}

{Optional: 1–2 paragraph context — what the product/site does, key differentiators, who uses it.}

## Docs

- [Getting Started]({URL}): {one-line summary}
- [API Reference]({URL}): {one-line summary}

## Product

- [Features]({URL}): {one-line summary}
- [Pricing]({URL}): {one-line summary}

## Company

- [About]({URL}): {one-line summary}
- [Contact]({URL}): {one-line summary}

## Optional

- [Blog]({URL}): {one-line summary}
- [Changelog]({URL}): {one-line summary}
```

**Organization + WebSite JSON-LD** (homepage):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://{DOMAIN}/#organization",
      "name": "{Brand}",
      "url": "https://{DOMAIN}",
      "logo": "https://{DOMAIN}/logo.png",
      "sameAs": [
        "https://twitter.com/{handle}",
        "https://linkedin.com/company/{handle}",
        "https://github.com/{handle}"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://{DOMAIN}/#website",
      "url": "https://{DOMAIN}",
      "name": "{Brand}",
      "publisher": { "@id": "https://{DOMAIN}/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://{DOMAIN}/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
</script>
```

**Article JSON-LD** (content pages):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{Page Title}",
  "description": "{Meta description}",
  "image": "https://{DOMAIN}/og/{slug}.png",
  "author": { "@type": "Person", "name": "{Author}" },
  "publisher": { "@id": "https://{DOMAIN}/#organization" },
  "datePublished": "{YYYY-MM-DD}",
  "dateModified": "{YYYY-MM-DD}",
  "mainEntityOfPage": "https://{DOMAIN}/{slug}"
}
</script>
```

**FAQPage JSON-LD** (wherever there's Q&A):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{Question}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Direct answer in 1–3 sentences.}"
      }
    }
  ]
}
</script>
```

**Canonical meta block** (every page):

```html
<link rel="canonical" href="https://{DOMAIN}/{path}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="author" content="{Author or Brand}" />
<meta property="og:type" content="{website|article}" />
<meta property="og:url" content="https://{DOMAIN}/{path}" />
<meta property="og:title" content="{Title}" />
<meta property="og:description" content="{Description}" />
<meta property="og:image" content="https://{DOMAIN}/og/{slug}.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{Title}" />
<meta name="twitter:description" content="{Description}" />
<meta name="twitter:image" content="https://{DOMAIN}/og/{slug}.png" />
```

## Principles

- **Measure, then cut.** Audit before changing anything. Surface the list. Let the user choose.
- **Framework-native.** Use the framework's metadata APIs — don't duplicate what `next/head`, Astro `<head>`, `useSeoMeta`, etc., already handle.
- **GEO is SEO's future, not a replacement.** Do both. Classic signals (titles, schema, internal links, speed) are still the foundation; GEO adds `llms.txt`, answer-first writing, entity clarity, citation-ready facts.
- **Don't fabricate schema.** If you don't know the founding date, author, or address, leave a `TODO` — lying in JSON-LD gets pages demoted.
- **Confirm before blocking AI crawlers.** Default is allow. Many clients don't realize blocking = invisible in ChatGPT answers.
- **The guide is the point.** Clients forget what you did in 3 weeks. `seo/GUIDE.md` is what compounds.

## Output

At the end of a run, report in this shape:

```
## Audit
- Classic SEO: {N}/{total} items present
- Structured data: {N}/{total} items present
- GEO: {N}/{total} items present

## Applied
- {file:line} — {what}
- {file:line} — {what}

## Needs you
- {thing that needs user input, e.g., og-image, brand social URLs, founding date}

## Deliverable
- seo/GUIDE.md written ({N} sections)
```

Keep the report under 30 lines. Detail belongs in the guide, not the terminal.
