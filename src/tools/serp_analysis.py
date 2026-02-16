"""SERP analysis tool: analyzes search result pages for patterns and features."""

from __future__ import annotations

import json

from src.models import EvidenceTrace, SERPAnalysisResult
from src.prompts.templates import SERP_ANALYSIS_SYSTEM, SERP_ANALYSIS_USER
from src.tools import jina, llm


async def run(query: str) -> tuple[SERPAnalysisResult, dict, EvidenceTrace]:
    results, raw_results = await jina.search_with_raw(query, num_results=10)

    serp_data = "\n\n".join(
        f"Position {i + 1}:\nTitle: {r['title']}\nURL: {r['url']}\nSnippet: {r['description']}\nContent preview: {r['content'][:500]}"
        for i, r in enumerate(results)
    )

    system_prompt = SERP_ANALYSIS_SYSTEM
    user_prompt = SERP_ANALYSIS_USER.format(query=query, serp_data=serp_data)

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
        "jina_scrapes": 0,
    }
    trace = EvidenceTrace(
        jina_raw_responses=raw_results,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="serp_analysis",
        query=query,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return SERPAnalysisResult(**data), usage, trace
