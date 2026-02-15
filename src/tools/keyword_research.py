"""Keyword research tool: combines Jina search with LLM analysis."""

from __future__ import annotations

import json

from src.models import KeywordResearchResult
from src.prompts.templates import KEYWORD_RESEARCH_SYSTEM, KEYWORD_RESEARCH_USER
from src.tools import jina, llm


async def run(seed_keyword: str) -> KeywordResearchResult:
    # Gather real search data via Jina
    results = await jina.search(seed_keyword, num_results=8)

    search_data = "\n\n".join(
        f"### {r['title']}\nURL: {r['url']}\n{r['description']}\n{r['content'][:1500]}"
        for r in results
    )

    # Also search for related queries
    related = await jina.search(f"{seed_keyword} best keywords", num_results=3)
    search_data += "\n\n--- Related searches ---\n\n"
    search_data += "\n\n".join(
        f"### {r['title']}\n{r['description']}\n{r['content'][:800]}"
        for r in related
    )

    response = await llm.complete(
        system=KEYWORD_RESEARCH_SYSTEM,
        user=KEYWORD_RESEARCH_USER.format(
            seed_keyword=seed_keyword, search_data=search_data
        ),
    )

    data = json.loads(response)
    return KeywordResearchResult(**data)
