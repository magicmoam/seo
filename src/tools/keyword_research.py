"""Keyword research tool: combines Jina search with LLM analysis."""

from __future__ import annotations

import asyncio
import json

from src.models import EvidenceTrace, KeywordResearchResult
from src.prompts.templates import KEYWORD_RESEARCH_SYSTEM, KEYWORD_RESEARCH_USER
from src.tools import jina, llm


async def run(seed_keyword: str) -> tuple[KeywordResearchResult, dict, EvidenceTrace]:
    # Run both searches in parallel
    (results, raw_results), (related, raw_related) = await asyncio.gather(
        jina.search_with_raw(seed_keyword, num_results=8),
        jina.search_with_raw(f"{seed_keyword} best keywords", num_results=3),
    )

    search_data = "\n\n".join(
        f"### {r['title']}\nURL: {r['url']}\n{r['description']}\n{r['content'][:1500]}"
        for r in results
    )
    search_data += "\n\n--- Related searches ---\n\n"
    search_data += "\n\n".join(
        f"### {r['title']}\n{r['description']}\n{r['content'][:800]}"
        for r in related
    )

    system_prompt = KEYWORD_RESEARCH_SYSTEM
    user_prompt = KEYWORD_RESEARCH_USER.format(
        seed_keyword=seed_keyword, search_data=search_data
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
        "jina_searches": 2,
        "jina_scrapes": 0,
    }
    trace = EvidenceTrace(
        jina_raw_responses=raw_results + raw_related,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="keyword_research",
        query=seed_keyword,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return KeywordResearchResult(**data), usage, trace
