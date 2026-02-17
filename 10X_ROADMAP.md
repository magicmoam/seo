# Wongzo 10x Roadmap

**Goal**: 10x the offering while targeting $50-75/mo pricing.

## Current Competitive Position

### Strengths
- **AI-native workflow** — Natural language in, structured analysis out. LLM agent auto-routes queries to the right tool.
- **Evidence traces** — Full transparency into prompts, raw data, and LLM reasoning. Valuable for client trust.
- **Strategy orchestrator** — 11 tools running in phased parallel, synthesized into a unified plan. No competitor does this.
- **Topical authority mapping + content calendar** — Usually only in expensive enterprise tools or done manually by consultants.
- **Price** — At API cost pass-through, dramatically cheaper than any competitor for occasional use.

### Weaknesses
- **No proprietary data** — No historical crawl index or backlink database. Relies on live Jina scrapes.
- **Single-page analysis** — Site audit scores one URL at a time. Competitors crawl entire sites.
- **No rank tracking** — Can't track keyword positions over time.
- **No backlink index** — Backlink strategy is AI-suggested, not data-driven from an actual link graph.
- **Scale** — Jina timeout + LLM latency + Vercel function limits mean the full strategy orchestrator could be fragile on complex sites.

### Competitive Landscape

| | **Wongzo** | **Ahrefs / SEMrush** | **Surfer SEO** | **SE Ranking** | **Seobility** |
|---|---|---|---|---|---|
| Keyword Research | AI-derived from SERP | Massive proprietary DB | Limited | Large DB | Basic |
| Site Audit | 30-point rubric, scored | Deep crawler (1000s of pages) | Content-focused | Full crawler | Full-site crawl |
| Competitor Analysis | AI + live scraping | Historical backlink/traffic data | Content comparison | Rank tracking | Basic |
| Content Generation | Built-in | No (Ahrefs has basic) | Editor + NLP scoring | AI writer add-on | No |
| Technical SEO | Single-page analysis | Full-site crawl | No | Full-site crawl | Full-site crawl |
| Topical Authority Map | Built-in | Manual | No | No | No |
| Strategy Orchestrator | Multi-agent synthesis | Manual | No | No | No |
| Evidence/Transparency | Full audit trail | Opaque | Opaque | Opaque | Opaque |
| Client Reports (.docx) | Built-in | PDF export | No | White-label PDF | PDF |
| Price | Usage-based (API costs) | $99-449/mo | $89-219/mo | $44-191/mo | Free / $50+/mo |

---

## The Core Insight

Right now Wongzo is **transactional** — ask a question, get an answer, done. A $50-75/mo product needs to deliver **compounding value over time**. That means stored state, change detection, and proactive alerts.

---

## The 10x Features

### 1. Site Crawler (Multi-Page)

Currently Wongzo audits one page at a time. Build a BFS crawler on top of the existing `jina.scrape()`.

- User enters a domain, crawler follows internal `<a>` links for 100-200 pages
- Run the 30-point scoring rubric on every page, store results in Supabase
- Surface site-wide patterns: "47 pages missing meta descriptions", "12 orphan pages", "3 redirect chains"
- **Cost**: ~200 Jina calls per crawl — pennies at Jina's pricing

### 2. Weekly Rank Tracking

The #1 reason people pay for SEO tools.

- User saves 50-100 target keywords
- Weekly Vercel Cron runs `jina.search()` for each keyword, parses where their domain appears
- Store position history in Supabase, show trend charts on dashboard
- Alert on significant changes: "You dropped from #3 to #8 for 'best crm software'"
- **Cost**: 100 Jina search calls/week — negligible

### 3. Change Monitoring & Alerts

Turn one-time audits into ongoing surveillance.

- **Own site**: Re-crawl weekly, diff against previous. "Your /pricing page score dropped from 74 to 61 — meta description was removed"
- **Competitors**: Track 3-5 competitor URLs. "competitor.com published 4 new pages targeting your keywords this week"
- **SERP shifts**: "Featured snippet for 'seo audit tool' changed from competitor A to competitor B"
- Deliver via email digest using Resend (free tier: 100 emails/day)

### 4. Backlink Discovery (Cheap)

No need for Ahrefs' index. Use what's available:

- **CommonCrawl** (free) — query their index API for pages linking to a domain
- **Google Search via Jina** — `"competitor.com" -site:competitor.com` finds pages mentioning them
- **New link alerts** — diff weekly, surface new links competitors earned
- Combine with existing AI backlink strategy tool for actionable recommendations

### 5. Dashboard with History

Replace the "query then result" flow with a persistent project view:

- **Health score over time** — line chart of 0-100 score, week by week
- **Keyword rank grid** — positions for all tracked keywords with sparklines
- **Action items queue** — prioritized fixes from latest crawl, checkable
- **Competitor comparison** — side-by-side score trends
- Mostly a frontend build. The API already stores everything in Supabase.

### 6. White-Label for Agencies

Agencies are the ideal $75/mo customer. They run 5-10 client sites.

- Custom logo/colors on reports (extend existing .docx export with template variables)
- Per-client project workspaces
- Shareable read-only dashboard links (no login required)
- Agency tier: 10 projects, 500 tracked keywords, weekly crawls

---

## Cost Math

| Resource | Monthly cost at scale |
|---|---|
| Jina API (5 sites x 200 pages/crawl x 4 crawls/mo + rank tracking) | ~$10-20 |
| LLM (analysis on crawl diffs, not every page every time) | ~$5-15 |
| Supabase (free tier covers most, Pro at $25/mo for growth) | $0-25 |
| Vercel (Pro for cron jobs) | $20 |
| Resend (email alerts, free tier) | $0 |
| **Total infrastructure per user** | **~$3-5/mo** |

At $50-75/mo this yields 90%+ margins even for heavier users.

---

## Implementation Priority

| Phase | What | Why First |
|---|---|---|
| **Phase 1** | Rank tracking + keyword dashboard | Stickiest feature — once users see keyword history, they can't leave |
| **Phase 2** | Site crawler (multi-page) | Biggest gap vs. competitors, existing scoring rubric ready to scale |
| **Phase 3** | Change monitoring + email alerts | Converts from "tool I use" to "tool that works for me while I sleep" |
| **Phase 4** | White-label + agency features | Unlocks the highest-willingness-to-pay segment |
| **Phase 5** | Backlink discovery via CommonCrawl | Rounds out the offering |

---

## Positioning

> "Ahrefs for $50/mo" isn't the play — you'd lose on data.
>
> **"Your AI SEO team for $50/mo"** is the play. No one else gives you a full strategy, monitors your site weekly, tracks your rankings, alerts you when competitors move, and generates client-ready reports — all from a single natural language interface.

The moat isn't data (Ahrefs wins that). The moat is **intelligence + automation + transparency** at a price point that freelancers and small agencies can actually afford.
