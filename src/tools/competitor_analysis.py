"""Competitor analysis tool: scrapes top-ranking pages and analyzes them."""

from __future__ import annotations

import json

from src.models import CompetitorAnalysisResult
from src.prompts.templates import COMPETITOR_ANALYSIS_SYSTEM, COMPETITOR_ANALYSIS_USER
from src.tools import jina, llm


async def run(query: str) -> tuple[CompetitorAnalysisResult, dict]:
    # Scrape top-ranking pages for deeper content analysis
    pages = await jina.search_and_scrape(query, num_results=5)

    competitor_data = "\n\n".join(
        f"### {p['title']}\nURL: {p['url']}\n\n{p['content'][:2000]}"
        for p in pages
    )

    result = await llm.complete(
        system=COMPETITOR_ANALYSIS_SYSTEM,
        user=COMPETITOR_ANALYSIS_USER.format(
            query=query, competitor_data=competitor_data
        ),
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 1,
        "jina_scrapes": min(len(pages), 5),
    }
    return CompetitorAnalysisResult(**data), usage
