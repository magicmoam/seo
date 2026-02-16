"""Website analyzer tool: scrapes a URL and performs a comprehensive SEO audit."""

from __future__ import annotations

import json

from src.models import WebsiteAnalysisResult
from src.prompts.templates import WEBSITE_ANALYZER_SYSTEM, WEBSITE_ANALYZER_USER
from src.tools import jina, llm


async def run(url: str) -> tuple[WebsiteAnalysisResult, dict]:
    # Scrape the target page
    page = await jina.scrape(url)

    page_data = f"URL: {url}\n"
    page_data += f"Title: {page.get('title', 'N/A')}\n"
    page_data += f"Description: {page.get('description', 'N/A')}\n\n"
    page_data += f"Page content:\n{page.get('content', '')[:8000]}"

    result = await llm.complete(
        system=WEBSITE_ANALYZER_SYSTEM,
        user=WEBSITE_ANALYZER_USER.format(url=url, page_data=page_data),
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 0,
        "jina_scrapes": 1,
    }
    return WebsiteAnalysisResult(**data), usage
