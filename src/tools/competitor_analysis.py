"""Competitor analysis tool: scrapes top-ranking pages and analyzes them."""

from __future__ import annotations

import json

from src.models import CompetitorAnalysisResult, EvidenceTrace
from src.prompts.templates import COMPETITOR_ANALYSIS_SYSTEM, COMPETITOR_ANALYSIS_USER
from src.tools import jina, llm


async def run(query: str) -> tuple[CompetitorAnalysisResult, dict, EvidenceTrace]:
    # Scrape top-ranking pages for deeper content analysis
    pages, raw_pages = await jina.search_and_scrape_with_raw(query, num_results=5)

    competitor_data = "\n\n".join(
        f"### {p['title']}\nURL: {p['url']}\n\n{p['content'][:2000]}"
        for p in pages
    )

    system_prompt = COMPETITOR_ANALYSIS_SYSTEM
    user_prompt = COMPETITOR_ANALYSIS_USER.format(
        query=query, competitor_data=competitor_data
    )

    result = await llm.complete(
        system=system_prompt,
        user=user_prompt,
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 1,
        "jina_scrapes": min(len(pages), 5),
    }
    trace = EvidenceTrace(
        jina_raw_responses=raw_pages,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="competitor_analysis",
        query=query,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return CompetitorAnalysisResult(**data), usage, trace
