"""Technical SEO audit: deep analysis of Core Web Vitals, schema, crawlability, and speed."""

from __future__ import annotations

import json

from src.models import TechnicalSEOAudit
from src.prompts.templates import TECHNICAL_SEO_SYSTEM, TECHNICAL_SEO_USER
from src.tools import jina, llm


async def run(url: str) -> tuple[TechnicalSEOAudit, dict]:
    """Run a deep technical SEO audit on a URL."""
    # Scrape the target page
    try:
        page = await jina.scrape(url)
        scrape_count = 1
    except Exception:
        page = {"title": url, "url": url, "content": ""}
        scrape_count = 0

    # Also try to scrape robots.txt and sitemap hints
    robots_content = ""
    base_url = url.rstrip("/").split("//")[-1].split("/")[0]
    try:
        robots = await jina.scrape(f"https://{base_url}/robots.txt")
        robots_content = robots.get("content", "")[:1500]
        scrape_count += 1
    except Exception:
        pass

    page_data = f"URL: {url}\n"
    page_data += f"Title: {page.get('title', 'N/A')}\n"
    page_data += f"Description: {page.get('description', 'N/A')}\n\n"
    page_data += f"Page content:\n{page.get('content', '')[:6000]}\n\n"
    if robots_content:
        page_data += f"--- robots.txt ---\n{robots_content}\n\n"

    result = await llm.complete(
        system=TECHNICAL_SEO_SYSTEM,
        user=TECHNICAL_SEO_USER.format(url=url, page_data=page_data),
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 0,
        "jina_scrapes": scrape_count,
    }
    return TechnicalSEOAudit(**data), usage
