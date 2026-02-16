"""SERP analysis tool: analyzes search result pages for patterns and features."""

from __future__ import annotations

import json

from src.models import SERPAnalysisResult
from src.prompts.templates import SERP_ANALYSIS_SYSTEM, SERP_ANALYSIS_USER
from src.tools import jina, llm


async def run(query: str) -> tuple[SERPAnalysisResult, dict]:
    results = await jina.search(query, num_results=10)

    serp_data = "\n\n".join(
        f"Position {i + 1}:\nTitle: {r['title']}\nURL: {r['url']}\nSnippet: {r['description']}\nContent preview: {r['content'][:500]}"
        for i, r in enumerate(results)
    )

    result = await llm.complete(
        system=SERP_ANALYSIS_SYSTEM,
        user=SERP_ANALYSIS_USER.format(query=query, serp_data=serp_data),
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 1,
        "jina_scrapes": 0,
    }
    return SERPAnalysisResult(**data), usage
