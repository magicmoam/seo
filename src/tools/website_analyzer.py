"""Website analyzer tool: scrapes a URL and performs a comprehensive SEO audit."""

from __future__ import annotations

import json

from src.models import EvidenceTrace, WebsiteAnalysisResult
from src.prompts.templates import WEBSITE_ANALYZER_SYSTEM, WEBSITE_ANALYZER_USER
from src.tools import jina, llm


async def run(url: str) -> tuple[WebsiteAnalysisResult, dict, EvidenceTrace]:
    # Scrape the target page
    page, raw_page = await jina.scrape_with_raw(url)

    page_data = f"URL: {url}\n"
    page_data += f"Title: {page.get('title', 'N/A')}\n"
    page_data += f"Description: {page.get('description', 'N/A')}\n\n"
    page_data += f"Page content:\n{page.get('content', '')[:8000]}"

    system_prompt = WEBSITE_ANALYZER_SYSTEM
    user_prompt = WEBSITE_ANALYZER_USER.format(url=url, page_data=page_data)

    result = await llm.complete(
        system=system_prompt,
        user=user_prompt,
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 0,
        "jina_scrapes": 1,
    }
    trace = EvidenceTrace(
        jina_raw_responses=[raw_page],
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="website_analyzer",
        query=url,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return WebsiteAnalysisResult(**data), usage, trace
