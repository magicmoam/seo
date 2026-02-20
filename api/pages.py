"""Vercel serverless function for SSR pages — blog, metrics, tools, RSS.

Returns complete HTML documents (not JSON) with full SEO metadata.
Cached by Vercel's CDN via Cache-Control headers.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from html import escape

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response

app = FastAPI()

BASE_URL = "https://tryseo.ai"

# ────────────────────────────────────────────
# Shared HTML template helpers
# ────────────────────────────────────────────

def _head(title: str, description: str, canonical_url: str, og_image: str = "", schema_json: str = "", extra_head: str = "") -> str:
    og_img = og_image or f"{BASE_URL}/og-image.svg"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">

  <link rel="canonical" href="{escape(canonical_url)}">

  <meta property="og:type" content="article">
  <meta property="og:url" content="{escape(canonical_url)}">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(description)}">
  <meta property="og:image" content="{escape(og_img)}">
  <meta property="og:site_name" content="trySEO.ai">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title)}">
  <meta name="twitter:description" content="{escape(description)}">
  <meta name="twitter:image" content="{escape(og_img)}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;1,6..96,400&family=Inter:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,500;1,400&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script>
    tailwind.config = {{
      theme: {{
        extend: {{
          colors: {{
            'alabaster': '#F0F0EB',
            'obsidian': '#0F0F0F',
            'burnished-gold': '#B89E5F',
            'soft-gray': '#A0A09C',
          }},
          fontFamily: {{
            serif: ['"Bodoni Moda"', 'serif'],
            sans: ['"Inter"', 'sans-serif'],
            display: ['"Cormorant Garamond"', 'serif'],
          }},
        }}
      }}
    }}
  </script>
  <link rel="alternate" type="application/rss+xml" title="trySEO.ai Blog" href="{BASE_URL}/feed.xml">
  <link rel="stylesheet" href="/css/main.css">
  {schema_json}
  {extra_head}
</head>"""


def _nav(active_page: str = "") -> str:
    def _cls(page: str) -> str:
        if page == active_page:
            return 'font-display text-base italic text-obsidian transition-colors relative'
        return 'font-display text-base italic text-obsidian/50 hover:text-obsidian transition-colors'

    def _underline(page: str) -> str:
        if page == active_page:
            return '<span class="absolute -bottom-1 left-0 w-full h-px bg-burnished-gold"></span>'
        return ''

    return f"""
<header class="fixed top-0 left-0 right-0 z-40 p-4 md:p-6">
  <div class="max-w-7xl mx-auto flex justify-between items-center nav-pill px-6 md:px-8 py-4 rounded-full">
    <div class="flex items-center gap-4">
      <a href="/" class="group relative">
        <span class="font-serif text-2xl md:text-3xl font-semibold tracking-tighter">trySEO<span class="text-burnished-gold">.ai</span></span>
      </a>
      <span class="hidden md:inline-block h-px w-6 bg-obsidian/15"></span>
      <span class="hidden md:inline-block font-sans text-[9px] tracking-[0.2em] uppercase text-soft-gray">SEO Intelligence</span>
    </div>
    <nav class="hidden md:flex items-center gap-10">
      <a href="/" class="{_cls('home')}">Home{_underline('home')}</a>
      <a href="/features" class="{_cls('features')}">Features{_underline('features')}</a>
      <a href="/pricing" class="{_cls('pricing')}">Pricing{_underline('pricing')}</a>
      <a href="/about" class="{_cls('about')}">About{_underline('about')}</a>
      <a href="/blog" class="{_cls('blog')}">Blog{_underline('blog')}</a>
    </nav>
    <a href="/" class="hidden md:inline-flex items-center gap-2 px-5 py-2.5 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.2em] font-sans hover:bg-obsidian/85 transition-colors">
      Free Audit
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
    </a>
  </div>
</header>"""


def _footer() -> str:
    return """
<footer class="border-t border-obsidian/[0.06] py-12 px-6 md:px-12 lg:px-20 mt-20">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
    <div class="flex items-center gap-3">
      <span class="w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></span>
      <span class="font-sans text-[10px] uppercase tracking-widest text-soft-gray">AI Engine Online</span>
    </div>
    <nav class="flex items-center gap-8">
      <a href="/" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Home</a>
      <a href="/features" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Features</a>
      <a href="/pricing" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Pricing</a>
      <a href="/about" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">About</a>
      <a href="/blog" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Blog</a>
      <a href="/tools/website-analyzer" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Tools</a>
      <a href="/metrics" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">Our SEO Score</a>
      <a href="/feed.xml" class="font-sans text-[11px] text-soft-gray hover:text-obsidian transition-colors">RSS</a>
    </nav>
    <span class="font-sans text-[10px] text-soft-gray/50">&copy; 2026 trySEO.ai</span>
  </div>
</footer>"""


def _article_schema(post: dict) -> str:
    import json
    schema = {
        "@context": "https://schema.org",
        "@type": post.get("schema_type", "Article"),
        "headline": post.get("title", ""),
        "description": post.get("meta_description", ""),
        "url": f"{BASE_URL}/blog/{post.get('slug', '')}",
        "datePublished": post.get("published_at", ""),
        "dateModified": post.get("updated_at", post.get("published_at", "")),
        "wordCount": post.get("word_count", 0),
        "author": {
            "@type": "Organization",
            "name": "trySEO.ai",
            "url": BASE_URL,
        },
        "publisher": {
            "@type": "Organization",
            "name": "trySEO.ai",
            "url": BASE_URL,
        },
    }
    return f'<script type="application/ld+json">{json.dumps(schema)}</script>'


def _breadcrumb_schema(items: list[tuple[str, str]]) -> str:
    import json
    schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": name,
                "item": url,
            }
            for i, (name, url) in enumerate(items)
        ],
    }
    return f'<script type="application/ld+json">{json.dumps(schema)}</script>'


def _cache_headers() -> dict:
    return {"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"}


# ────────────────────────────────────────────
# Blog Index
# ────────────────────────────────────────────

@app.get("/blog")
async def blog_index(request: Request):
    """Blog index page — lists published posts grouped by cluster."""
    from src.db.blog import list_published_posts

    posts = await list_published_posts(limit=100)

    # Group by cluster
    clusters: dict[str, list] = {}
    for p in posts:
        c = p.get("cluster_slug") or "general"
        clusters.setdefault(c, []).append(p)

    breadcrumbs = _breadcrumb_schema([
        ("Home", BASE_URL),
        ("Blog", f"{BASE_URL}/blog"),
    ])

    posts_html = ""
    if not posts:
        posts_html = '<p class="font-sans text-obsidian/40 text-center py-20">No articles published yet. Check back soon.</p>'
    else:
        for cluster_name, cluster_posts in clusters.items():
            display_name = cluster_name.replace("-", " ").title()
            posts_html += f'<div class="mb-16"><h2 class="font-serif text-2xl text-obsidian tracking-tight mb-6">{escape(display_name)}</h2>'
            posts_html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">'
            for p in cluster_posts:
                badge = "Pillar" if p.get("content_type") == "pillar" else ""
                badge_html = f'<span class="font-sans text-[9px] uppercase tracking-[0.2em] text-burnished-gold">{badge}</span>' if badge else ""
                date_str = (p.get("published_at") or "")[:10]
                posts_html += f"""
                <a href="/blog/{escape(p['slug'])}" class="block p-6 rounded-sm border border-obsidian/[0.06] bg-white/30 hover:border-burnished-gold/30 transition-colors group">
                  {badge_html}
                  <h3 class="font-serif text-lg text-obsidian tracking-tight mt-2 group-hover:text-burnished-gold transition-colors">{escape(p['title'])}</h3>
                  <p class="font-sans text-[13px] text-obsidian/45 leading-relaxed mt-2">{escape(p.get('meta_description', ''))}</p>
                  <span class="font-sans text-[10px] text-soft-gray mt-3 block">{date_str}</span>
                </a>"""
            posts_html += '</div></div>'

    html = _head(
        "Blog | trySEO.ai — SEO Intelligence & Strategy",
        "Expert guides on SEO strategy, keyword research, content optimization, technical SEO, and more. Powered by AI analysis.",
        f"{BASE_URL}/blog",
        schema_json=breadcrumbs,
    )
    html += f"""
<body class="relative font-sans bg-alabaster text-obsidian">
  {_nav('blog')}
  <main class="pt-32 pb-20 px-6 md:px-12 lg:px-20">
    <div class="max-w-7xl mx-auto">
      <div class="mb-16">
        <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-soft-gray">SEO Intelligence Blog</span>
        <div class="mt-3 w-12 h-px bg-burnished-gold/40"></div>
      </div>
      <h1 class="font-serif text-4xl md:text-6xl leading-[0.95] tracking-tighter text-obsidian mb-16">
        Insights & <span class="font-display italic text-burnished-gold">guides.</span>
      </h1>
      {posts_html}
    </div>
  </main>
  {_footer()}
</body>
</html>"""

    return HTMLResponse(content=html, headers=_cache_headers())


# ────────────────────────────────────────────
# Blog Article
# ────────────────────────────────────────────

@app.get("/blog/{slug}")
async def blog_article(slug: str, request: Request):
    """Individual blog article with full SEO markup."""
    from src.db.blog import get_post_by_slug, get_related_posts

    post = await get_post_by_slug(slug)
    if not post:
        return HTMLResponse(
            content=_head("Not Found | trySEO.ai", "Page not found.", f"{BASE_URL}/blog/{slug}")
            + f'<body class="font-sans bg-alabaster text-obsidian">{_nav("blog")}'
            + '<main class="pt-40 pb-20 text-center"><h1 class="font-serif text-4xl">Article not found.</h1>'
            + f'<a href="/blog" class="font-sans text-burnished-gold mt-4 inline-block">Back to Blog</a></main>{_footer()}</body></html>',
            status_code=404,
            headers=_cache_headers(),
        )

    related = await get_related_posts(post["id"], limit=4)

    cluster_name = (post.get("cluster_slug") or "blog").replace("-", " ").title()
    breadcrumbs = _breadcrumb_schema([
        ("Home", BASE_URL),
        ("Blog", f"{BASE_URL}/blog"),
        (cluster_name, f"{BASE_URL}/blog"),
        (post["title"], f"{BASE_URL}/blog/{slug}"),
    ])
    article_schema = _article_schema(post)

    # Related posts sidebar
    related_html = ""
    if related:
        related_html = '<div class="mt-16 pt-12 border-t border-obsidian/[0.06]">'
        related_html += '<h3 class="font-serif text-xl text-obsidian tracking-tight mb-6">Related Articles</h3>'
        related_html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">'
        for r in related:
            related_html += f"""
            <a href="/blog/{escape(r['slug'])}" class="block p-4 rounded-sm border border-obsidian/[0.06] hover:border-burnished-gold/30 transition-colors">
              <h4 class="font-serif text-base text-obsidian">{escape(r['title'])}</h4>
              <p class="font-sans text-[12px] text-obsidian/40 mt-1">{escape(r.get('meta_description', '')[:100])}</p>
            </a>"""
        related_html += '</div></div>'

    date_str = (post.get("published_at") or "")[:10]

    html = _head(
        f"{post['title']} | trySEO.ai Blog",
        post.get("meta_description", ""),
        f"{BASE_URL}/blog/{slug}",
        og_image=post.get("og_image_url", ""),
        schema_json=breadcrumbs + "\n" + article_schema,
    )
    html += f"""
<body class="relative font-sans bg-alabaster text-obsidian">
  {_nav('blog')}
  <main class="pt-32 pb-20 px-6 md:px-12 lg:px-20">
    <div class="max-w-3xl mx-auto">
      <nav class="font-sans text-[11px] text-soft-gray mb-8">
        <a href="/" class="hover:text-obsidian transition-colors">Home</a>
        <span class="mx-2">/</span>
        <a href="/blog" class="hover:text-obsidian transition-colors">Blog</a>
        <span class="mx-2">/</span>
        <span class="text-obsidian/60">{escape(post['title'][:50])}</span>
      </nav>
      <article>
        <header class="mb-12">
          <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-burnished-gold">{escape(post.get('content_type', '').title())}</span>
          <h1 class="font-serif text-3xl md:text-5xl leading-[1.05] tracking-tight text-obsidian mt-3">{escape(post['title'])}</h1>
          <div class="flex items-center gap-4 mt-6 font-sans text-[11px] text-soft-gray">
            <span>{date_str}</span>
            <span class="w-1 h-1 rounded-full bg-soft-gray/40"></span>
            <span>{post.get('word_count', 0)} words</span>
          </div>
          <div class="mt-4 h-px bg-burnished-gold/20"></div>
        </header>
        <div class="prose prose-lg max-w-none font-sans text-obsidian/70 leading-[1.8]
                    prose-headings:font-serif prose-headings:text-obsidian prose-headings:tracking-tight
                    prose-a:text-burnished-gold prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-obsidian prose-code:text-sm">
          {post.get('content_html', '<p>Content not available.</p>')}
        </div>
      </article>

      <!-- Product CTA -->
      <div class="mt-16 p-8 rounded-sm border border-burnished-gold/20 bg-burnished-gold/[0.03] text-center">
        <h3 class="font-serif text-xl text-obsidian tracking-tight">Try trySEO.ai Free</h3>
        <p class="font-sans text-[13px] text-obsidian/45 mt-2 mb-4">Get an AI-powered audit of your website in under 60 seconds.</p>
        <a href="/" class="inline-flex items-center gap-2 px-6 py-3 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.2em] font-sans hover:bg-obsidian/85 transition-colors">
          Start Free Audit
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
        </a>
      </div>

      {related_html}
    </div>
  </main>
  {_footer()}
</body>
</html>"""

    return HTMLResponse(content=html, headers=_cache_headers())


# ────────────────────────────────────────────
# Metrics Page
# ────────────────────────────────────────────

@app.get("/metrics")
async def metrics_page(request: Request):
    """Public metrics page — trySEO.ai's own SEO score over time."""
    from src.db.tracking import get_audit_snapshots

    snapshots = await get_audit_snapshots("system@tryseo.ai", "https://tryseo.ai", limit=52)
    snapshots = list(reversed(snapshots))  # chronological

    current_score = snapshots[-1].get("overall_score", 0) if snapshots else 0
    first_score = snapshots[0].get("overall_score", 0) if snapshots else 0
    score_change = current_score - first_score

    breadcrumbs = _breadcrumb_schema([
        ("Home", BASE_URL),
        ("Our SEO Score", f"{BASE_URL}/metrics"),
    ])

    # Build chart data
    import json
    chart_labels = [s.get("created_at", "")[:10] for s in snapshots]
    chart_scores = [s.get("overall_score", 0) for s in snapshots]

    no_data_msg = ""
    if not snapshots:
        no_data_msg = '<p class="font-sans text-obsidian/40 text-center py-12">No audit data yet. Our first self-audit is scheduled for next Monday.</p>'

    html = _head(
        "Our SEO Score | trySEO.ai — Practice What We Preach",
        f"trySEO.ai publicly tracks its own SEO score. Current score: {current_score}/100. We use our own tools to improve.",
        f"{BASE_URL}/metrics",
        schema_json=breadcrumbs,
        extra_head='<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>',
    )
    html += f"""
<body class="relative font-sans bg-alabaster text-obsidian">
  {_nav('metrics')}
  <main class="pt-32 pb-20 px-6 md:px-12 lg:px-20">
    <div class="max-w-5xl mx-auto">
      <div class="mb-16">
        <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-soft-gray">Practice What We Preach</span>
        <div class="mt-3 w-12 h-px bg-burnished-gold/40"></div>
      </div>

      <h1 class="font-serif text-4xl md:text-6xl leading-[0.95] tracking-tighter text-obsidian mb-6">
        Our SEO <span class="font-display italic text-burnished-gold">score.</span>
      </h1>
      <p class="font-sans text-base text-obsidian/50 max-w-2xl mb-16 leading-relaxed">
        We audit trySEO.ai every week using our own tools. This page shows our real score over time — no cherry-picking, no hiding.
      </p>

      <!-- Score hero -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div class="p-8 rounded-sm border border-obsidian/[0.06] bg-white/30 text-center">
          <span class="font-serif text-5xl text-obsidian">{current_score}</span>
          <span class="font-serif text-2xl text-obsidian/30">/100</span>
          <p class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray mt-2">Current Score</p>
        </div>
        <div class="p-8 rounded-sm border border-obsidian/[0.06] bg-white/30 text-center">
          <span class="font-serif text-5xl {'text-green-600' if score_change >= 0 else 'text-red-500'}">{'+'  if score_change >= 0 else ''}{score_change}</span>
          <p class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray mt-2">Since First Audit</p>
        </div>
        <div class="p-8 rounded-sm border border-obsidian/[0.06] bg-white/30 text-center">
          <span class="font-serif text-5xl text-obsidian">{len(snapshots)}</span>
          <p class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray mt-2">Weeks Tracked</p>
        </div>
      </div>

      {no_data_msg}

      <!-- Chart -->
      <div class="p-6 rounded-sm border border-obsidian/[0.06] bg-white/30 mb-16" style="{'display:none' if not snapshots else ''}">
        <canvas id="scoreChart" height="120"></canvas>
      </div>

      <!-- CTA -->
      <div class="text-center mt-16">
        <h2 class="font-serif text-2xl text-obsidian tracking-tight mb-4">Check your own score</h2>
        <a href="/" class="inline-flex items-center gap-2 px-8 py-4 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.25em] font-sans hover:bg-obsidian/85 transition-colors">
          Start Free Audit
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
        </a>
      </div>
    </div>
  </main>
  {_footer()}
  <script>
    (function() {{
      var ctx = document.getElementById('scoreChart');
      if (!ctx) return;
      new Chart(ctx, {{
        type: 'line',
        data: {{
          labels: {json.dumps(chart_labels)},
          datasets: [{{
            label: 'SEO Score',
            data: {json.dumps(chart_scores)},
            borderColor: '#B89E5F',
            backgroundColor: 'rgba(184, 158, 95, 0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#B89E5F',
          }}]
        }},
        options: {{
          responsive: true,
          plugins: {{ legend: {{ display: false }} }},
          scales: {{
            y: {{ min: 0, max: 100, grid: {{ color: 'rgba(15,15,15,0.05)' }} }},
            x: {{ grid: {{ display: false }} }}
          }}
        }}
      }});
    }})();
  </script>
</body>
</html>"""

    return HTMLResponse(content=html, headers=_cache_headers())


# ────────────────────────────────────────────
# Public Metrics API (JSON)
# ────────────────────────────────────────────

@app.get("/api/public-metrics")
async def public_metrics_api():
    """Return trySEO.ai's own audit snapshots as JSON (no auth required)."""
    from src.db.tracking import get_audit_snapshots

    snapshots = await get_audit_snapshots("system@tryseo.ai", "https://tryseo.ai", limit=52)
    snapshots = list(reversed(snapshots))

    current_score = snapshots[-1].get("overall_score", 0) if snapshots else 0
    first_score = snapshots[0].get("overall_score", 0) if snapshots else 0

    return JSONResponse(
        {
            "url": "https://tryseo.ai",
            "current_score": current_score,
            "score_change": current_score - first_score,
            "weeks_tracked": len(snapshots),
            "snapshots": snapshots,
        },
        headers=_cache_headers(),
    )


# ────────────────────────────────────────────
# RSS Feed
# ────────────────────────────────────────────

@app.get("/feed.xml")
async def rss_feed(request: Request):
    """RSS 2.0 feed of latest published blog posts."""
    from src.db.blog import list_published_posts

    posts = await list_published_posts(limit=20)

    items = ""
    for p in posts:
        pub_date = p.get("published_at", "")
        # Format as RFC 822 if we have an ISO date
        rfc_date = pub_date
        if pub_date and len(pub_date) >= 10:
            try:
                dt = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                rfc_date = dt.strftime("%a, %d %b %Y %H:%M:%S +0000")
            except (ValueError, TypeError):
                rfc_date = pub_date

        items += f"""
    <item>
      <title>{escape(p.get('title', ''))}</title>
      <link>{BASE_URL}/blog/{escape(p.get('slug', ''))}</link>
      <description>{escape(p.get('meta_description', ''))}</description>
      <pubDate>{escape(rfc_date)}</pubDate>
      <guid isPermaLink="true">{BASE_URL}/blog/{escape(p.get('slug', ''))}</guid>
    </item>"""

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>trySEO.ai Blog</title>
    <link>{BASE_URL}/blog</link>
    <description>Expert guides on SEO strategy, keyword research, content optimization, technical SEO, and more. Powered by AI analysis.</description>
    <language>en-us</language>
    <atom:link href="{BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>{datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")}</lastBuildDate>
    {items}
  </channel>
</rss>"""

    return Response(
        content=xml,
        media_type="application/rss+xml",
        headers=_cache_headers(),
    )


# ────────────────────────────────────────────
# Tool Landing Pages
# ────────────────────────────────────────────

TOOLS = {
    "website-analyzer": {
        "name": "Website SEO Analyzer",
        "tagline": "Comprehensive SEO audit in under 60 seconds",
        "description": "Get a complete SEO health check of any website. Our AI analyzes 31 criteria across performance, SEO, content, and technical categories — then gives you a prioritized fix roadmap.",
        "features": [
            "31-point scoring rubric across 4 categories",
            "Core Web Vitals and performance analysis",
            "Meta tags, headings, and content structure audit",
            "Technical SEO checks (robots.txt, sitemap, HTTPS)",
            "Prioritized fix roadmap sorted by point impact",
        ],
        "use_cases": ["Site launch audit", "Monthly health check", "Client onboarding report", "Competitor benchmarking"],
        "credits": 1,
        "cluster": "website-seo-audit",
        "cta_text": "Run a Free Audit",
    },
    "keyword-research": {
        "name": "Keyword Research",
        "tagline": "Discover high-value keywords with AI-powered analysis",
        "description": "Find the right keywords for your content strategy. Our AI searches the web, analyzes SERPs, and clusters keywords by intent, difficulty, and commercial value.",
        "features": [
            "AI-powered keyword discovery from seed terms",
            "Search intent classification (informational, commercial, transactional)",
            "Keyword difficulty and competition analysis",
            "Long-tail keyword expansion",
            "CPC and commercial value indicators",
        ],
        "use_cases": ["Content planning", "Niche research", "PPC campaign prep", "Blog topic ideation"],
        "credits": 1,
        "cluster": "keyword-research",
        "cta_text": "Research Keywords",
    },
    "serp-analysis": {
        "name": "SERP Analysis",
        "tagline": "Understand what Google rewards for any query",
        "description": "Analyze the search engine results page for any keyword. See who ranks, why they rank, and what content format Google prefers — so you can create content that competes.",
        "features": [
            "Top 10 SERP breakdown with content analysis",
            "Featured snippet and SERP feature detection",
            "Content format and word count patterns",
            "Domain authority distribution analysis",
            "Content gap identification vs. top rankers",
        ],
        "use_cases": ["Pre-writing research", "Content format decisions", "Competitive positioning", "Featured snippet targeting"],
        "credits": 1,
        "cluster": "keyword-research",
        "cta_text": "Analyze SERPs",
    },
    "technical-seo": {
        "name": "Technical SEO Audit",
        "tagline": "Deep-dive into your site's technical SEO health",
        "description": "Go beyond surface-level checks. Our AI crawls your site and analyzes robots.txt, sitemaps, canonical tags, structured data, page speed, and more — with actionable fix recommendations.",
        "features": [
            "Robots.txt and crawl directives analysis",
            "XML sitemap validation",
            "Structured data (schema markup) check",
            "Canonical URL and redirect chain analysis",
            "Security headers and HTTPS verification",
        ],
        "use_cases": ["Technical audit", "Site migration prep", "Crawl budget optimization", "Developer handoff report"],
        "credits": 1,
        "cluster": "technical-seo",
        "cta_text": "Run Technical Audit",
    },
    "competitor-analysis": {
        "name": "Competitor Analysis",
        "tagline": "Reverse-engineer your competitors' SEO strategy",
        "description": "Discover how your competitors rank, what content drives their traffic, and where they're vulnerable. Our AI analyzes multiple competitors simultaneously for a complete competitive landscape.",
        "features": [
            "Multi-competitor comparison dashboard",
            "Content strategy reverse engineering",
            "Keyword overlap and gap analysis",
            "Backlink profile comparison",
            "SERP positioning analysis across queries",
        ],
        "use_cases": ["Market entry research", "Quarterly competitive review", "Content gap discovery", "Strategic planning"],
        "credits": 2,
        "cluster": "competitor-analysis",
        "cta_text": "Analyze Competitors",
    },
    "content-gap": {
        "name": "Content Gap Analysis",
        "tagline": "Find the content your competitors have that you don't",
        "description": "Identify topics and keywords your competitors rank for but you don't. Our AI maps the content landscape and shows you exactly what to create to close the gap.",
        "features": [
            "Competitor-vs-you keyword comparison",
            "Missing topic identification",
            "Content opportunity scoring by traffic potential",
            "Priority ranking by difficulty and impact",
            "Content brief suggestions for each gap",
        ],
        "use_cases": ["Content calendar planning", "Traffic growth strategy", "Competitor catch-up", "Editorial prioritization"],
        "credits": 2,
        "cluster": "competitor-analysis",
        "cta_text": "Find Content Gaps",
    },
    "content-generator": {
        "name": "Content Generator",
        "tagline": "AI-powered SEO content that ranks",
        "description": "Generate comprehensive, SEO-optimized articles based on real SERP research. Our AI researches the topic, analyzes top-ranking content, and creates structured content designed to compete.",
        "features": [
            "SERP-researched content generation",
            "SEO-optimized headings and structure",
            "Target keyword integration",
            "Meta description and title suggestions",
            "Internal linking recommendations",
        ],
        "use_cases": ["Blog content at scale", "Product page copy", "Pillar page creation", "Content refresh"],
        "credits": 2,
        "cluster": "topical-authority",
        "cta_text": "Generate Content",
    },
    "topical-authority": {
        "name": "Topical Authority Planner",
        "tagline": "Build authority through strategic content clustering",
        "description": "Map out a complete topical authority strategy. Our AI identifies content clusters, pillar pages, and supporting articles — with internal linking plans to establish your site as an authority.",
        "features": [
            "Topic cluster mapping and visualization",
            "Pillar and supporting page identification",
            "Internal linking strategy (hub-and-spoke model)",
            "Content velocity recommendations",
            "Authority gap analysis vs. competitors",
        ],
        "use_cases": ["Content strategy overhaul", "New site content plan", "Authority building", "Editorial roadmap"],
        "credits": 2,
        "cluster": "topical-authority",
        "cta_text": "Plan Authority Strategy",
    },
    "backlink-strategy": {
        "name": "Backlink Strategy",
        "tagline": "Build a link profile that moves the needle",
        "description": "Get a data-driven backlink strategy tailored to your niche. Our AI analyzes your current link profile, identifies opportunities, and creates an outreach-ready plan.",
        "features": [
            "Current backlink profile analysis",
            "Link opportunity identification",
            "Competitor backlink reverse engineering",
            "Outreach target recommendations",
            "Link building ROI prioritization",
        ],
        "use_cases": ["Link building campaigns", "Digital PR planning", "Authority building", "Penalty recovery"],
        "credits": 2,
        "cluster": "link-building",
        "cta_text": "Plan Link Building",
    },
    "ga4-analytics": {
        "name": "GA4 Analytics",
        "tagline": "AI-powered insights from your Google Analytics data",
        "description": "Connect your GA4 property and get AI-generated insights about your traffic, top-performing content, and growth opportunities — without wrestling with complex dashboards.",
        "features": [
            "Automated traffic trend analysis",
            "Top-performing pages identification",
            "User behavior and engagement insights",
            "Growth opportunity detection",
            "Plain-English summary of complex data",
        ],
        "use_cases": ["Monthly reporting", "Content performance review", "Traffic source analysis", "Executive summaries"],
        "credits": 1,
        "cluster": "website-seo-audit",
        "cta_text": "Connect GA4",
    },
}


@app.get("/tools/{slug}")
async def tool_landing_page(slug: str, request: Request):
    """Programmatic tool landing page with SEO markup."""
    import json

    tool = TOOLS.get(slug)
    if not tool:
        return HTMLResponse(
            content=_head("Not Found | trySEO.ai", "Tool not found.", f"{BASE_URL}/tools/{slug}")
            + f'<body class="font-sans bg-alabaster text-obsidian">{_nav()}'
            + '<main class="pt-40 pb-20 text-center"><h1 class="font-serif text-4xl">Tool not found.</h1>'
            + f'<a href="/features" class="font-sans text-burnished-gold mt-4 inline-block">View All Features</a></main>{_footer()}</body></html>',
            status_code=404,
            headers=_cache_headers(),
        )

    breadcrumbs = _breadcrumb_schema([
        ("Home", BASE_URL),
        ("Features", f"{BASE_URL}/features"),
        (tool["name"], f"{BASE_URL}/tools/{slug}"),
    ])

    software_schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": f"trySEO.ai — {tool['name']}",
        "description": tool["description"],
        "url": f"{BASE_URL}/tools/{slug}",
        "applicationCategory": "SEO Tool",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "description": f"Free tier includes {tool['credits']} credit per use",
        },
        "author": {
            "@type": "Organization",
            "name": "trySEO.ai",
            "url": BASE_URL,
        },
    })

    features_html = ""
    for f in tool["features"]:
        features_html += f"""
        <div class="flex items-start gap-3">
          <div class="w-1.5 h-1.5 rounded-full bg-burnished-gold mt-2 shrink-0"></div>
          <span class="font-sans text-[14px] text-obsidian/60 leading-relaxed">{escape(f)}</span>
        </div>"""

    use_cases_html = ""
    for u in tool["use_cases"]:
        use_cases_html += f"""
        <div class="px-4 py-2 rounded-full border border-obsidian/[0.08] font-sans text-[12px] text-obsidian/50">
          {escape(u)}
        </div>"""

    # Related blog posts from same cluster
    from src.db.blog import list_published_posts
    cluster_posts = await list_published_posts(limit=100)
    related = [p for p in cluster_posts if p.get("cluster_slug") == tool["cluster"]][:4]

    related_html = ""
    if related:
        related_html = '<div class="mt-20"><h2 class="font-serif text-2xl text-obsidian tracking-tight mb-8">Related Guides</h2>'
        related_html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">'
        for r in related:
            related_html += f"""
            <a href="/blog/{escape(r['slug'])}" class="block p-5 rounded-sm border border-obsidian/[0.06] hover:border-burnished-gold/30 transition-colors">
              <h3 class="font-serif text-base text-obsidian">{escape(r['title'])}</h3>
              <p class="font-sans text-[12px] text-obsidian/40 mt-1">{escape(r.get('meta_description', '')[:120])}</p>
            </a>"""
        related_html += '</div></div>'

    # Other tools
    other_tools = [(s, t) for s, t in TOOLS.items() if s != slug][:4]
    other_html = '<div class="mt-20"><h2 class="font-serif text-2xl text-obsidian tracking-tight mb-8">Other Tools</h2>'
    other_html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">'
    for s, t in other_tools:
        other_html += f"""
        <a href="/tools/{escape(s)}" class="block p-5 rounded-sm border border-obsidian/[0.06] hover:border-burnished-gold/30 transition-colors">
          <h3 class="font-serif text-base text-obsidian">{escape(t['name'])}</h3>
          <p class="font-sans text-[11px] text-obsidian/40 mt-1">{escape(t['tagline'])}</p>
        </a>"""
    other_html += '</div></div>'

    html = _head(
        f"{tool['name']} — Free SEO Tool | trySEO.ai",
        tool["description"],
        f"{BASE_URL}/tools/{slug}",
        schema_json=breadcrumbs + f'\n<script type="application/ld+json">{software_schema}</script>',
    )
    html += f"""
<body class="relative font-sans bg-alabaster text-obsidian">
  {_nav('features')}
  <main class="pt-32 pb-20 px-6 md:px-12 lg:px-20">
    <div class="max-w-5xl mx-auto">

      <nav class="font-sans text-[11px] text-soft-gray mb-8">
        <a href="/" class="hover:text-obsidian transition-colors">Home</a>
        <span class="mx-2">/</span>
        <a href="/features" class="hover:text-obsidian transition-colors">Features</a>
        <span class="mx-2">/</span>
        <span class="text-obsidian/60">{escape(tool['name'])}</span>
      </nav>

      <div class="mb-16">
        <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-soft-gray">SEO Tool</span>
        <div class="mt-3 w-12 h-px bg-burnished-gold/40"></div>
      </div>

      <h1 class="font-serif text-4xl md:text-6xl leading-[0.95] tracking-tighter text-obsidian mb-4">
        {escape(tool['name'])}<span class="font-display italic text-burnished-gold">.</span>
      </h1>
      <p class="font-display italic text-xl md:text-2xl text-obsidian/40 mb-8">{escape(tool['tagline'])}</p>
      <p class="font-sans text-base text-obsidian/55 max-w-2xl leading-relaxed mb-12">{escape(tool['description'])}</p>

      <a href="/" class="inline-flex items-center gap-2 px-8 py-4 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.25em] font-sans hover:bg-obsidian/85 transition-colors mb-20">
        {escape(tool['cta_text'])}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
      </a>

      <!-- Features -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
        <div>
          <h2 class="font-serif text-2xl text-obsidian tracking-tight mb-8">What it does</h2>
          <div class="space-y-4">{features_html}</div>
        </div>
        <div>
          <h2 class="font-serif text-2xl text-obsidian tracking-tight mb-8">Use cases</h2>
          <div class="flex flex-wrap gap-2">{use_cases_html}</div>
          <div class="mt-12 p-6 rounded-sm border border-obsidian/[0.06] bg-white/30">
            <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray block mb-2">Credits per use</span>
            <span class="font-serif text-3xl text-obsidian">{tool['credits']}</span>
            <p class="font-sans text-[12px] text-obsidian/40 mt-2">Free tier: 5 credits/month. Pro: 200 credits/month.</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="p-8 rounded-sm border border-burnished-gold/20 bg-burnished-gold/[0.03] text-center mb-12">
        <h2 class="font-serif text-xl text-obsidian tracking-tight">Try it free</h2>
        <p class="font-sans text-[13px] text-obsidian/45 mt-2 mb-4">No credit card required. Start with 5 free credits.</p>
        <a href="/" class="inline-flex items-center gap-2 px-6 py-3 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.2em] font-sans hover:bg-obsidian/85 transition-colors">
          {escape(tool['cta_text'])}
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
        </a>
      </div>

      {related_html}
      {other_html}
    </div>
  </main>
  {_footer()}
</body>
</html>"""

    return HTMLResponse(content=html, headers=_cache_headers())
