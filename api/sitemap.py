"""Vercel serverless function for /sitemap.xml — Dynamic XML sitemap."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI
from fastapi.responses import Response

app = FastAPI()

BASE_URL = "https://tryseo.ai"


def _url_entry(loc: str, lastmod: str | None = None, changefreq: str = "weekly", priority: str = "0.5") -> str:
    entry = f"  <url>\n    <loc>{loc}</loc>\n"
    if lastmod:
        entry += f"    <lastmod>{lastmod}</lastmod>\n"
    entry += f"    <changefreq>{changefreq}</changefreq>\n"
    entry += f"    <priority>{priority}</priority>\n"
    entry += "  </url>"
    return entry


@app.get("/api/sitemap")
async def sitemap():
    """Generate dynamic XML sitemap with all public URLs."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    urls = []

    # Static marketing pages
    urls.append(_url_entry(f"{BASE_URL}/", now, "weekly", "1.0"))
    urls.append(_url_entry(f"{BASE_URL}/features", now, "monthly", "0.8"))
    urls.append(_url_entry(f"{BASE_URL}/pricing", now, "monthly", "0.8"))
    urls.append(_url_entry(f"{BASE_URL}/about", now, "monthly", "0.7"))

    # Blog index (Phase 3)
    urls.append(_url_entry(f"{BASE_URL}/blog", now, "daily", "0.9"))

    # Metrics page (Phase 4)
    urls.append(_url_entry(f"{BASE_URL}/metrics", now, "weekly", "0.6"))

    # Dynamic blog posts (Phase 3 — query from DB)
    try:
        from src.db.blog import get_all_published_slugs
        published = await get_all_published_slugs()
        for post in published:
            slug = post.get("slug", "")
            lastmod = post.get("updated_at") or post.get("published_at") or now
            if isinstance(lastmod, str) and "T" in lastmod:
                lastmod = lastmod[:10]
            content_type = post.get("content_type", "supporting")
            priority = "0.8" if content_type == "pillar" else "0.6"
            urls.append(_url_entry(f"{BASE_URL}/blog/{slug}", lastmod, "weekly", priority))
    except (ImportError, Exception):
        # Blog module not yet available or no posts — skip
        pass

    # Tool landing pages (Phase 6)
    tool_slugs = [
        "website-analyzer", "keyword-research", "serp-analysis",
        "technical-seo", "competitor-analysis", "content-gap",
        "content-generator", "topical-authority", "backlink-strategy",
        "ga4-analytics",
    ]
    for slug in tool_slugs:
        urls.append(_url_entry(f"{BASE_URL}/tools/{slug}", now, "monthly", "0.7"))

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>\n"

    return Response(content=xml, media_type="application/xml")
