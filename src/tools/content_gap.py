"""Content gap analysis: identifies underserved topics and opportunities."""

from __future__ import annotations

import json

from src.models import ContentGapResult, EvidenceTrace
from src.prompts.templates import CONTENT_GAP_SYSTEM, CONTENT_GAP_USER
from src.tools import jina, llm


async def run(query: str) -> tuple[ContentGapResult, dict, EvidenceTrace]:
    # Search for existing content in the niche
    existing, raw_existing = await jina.search_with_raw(query, num_results=8)

    # Search for questions people ask
    questions, raw_questions = await jina.search_with_raw(f"{query} questions answers", num_results=5)

    # Search for gaps explicitly
    gaps_search, raw_gaps = await jina.search_with_raw(f"{query} underserved topics", num_results=3)

    gap_data = "--- Existing top content ---\n\n"
    gap_data += "\n\n".join(
        f"### {r['title']}\nURL: {r['url']}\n{r['content'][:1000]}"
        for r in existing
    )
    gap_data += "\n\n--- Questions people ask ---\n\n"
    gap_data += "\n\n".join(
        f"### {r['title']}\n{r['content'][:600]}" for r in questions
    )
    gap_data += "\n\n--- Underserved areas ---\n\n"
    gap_data += "\n\n".join(
        f"### {r['title']}\n{r['content'][:600]}" for r in gaps_search
    )

    system_prompt = CONTENT_GAP_SYSTEM
    user_prompt = CONTENT_GAP_USER.format(query=query, gap_data=gap_data)

    result = await llm.complete(
        system=system_prompt,
        user=user_prompt,
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 3,
        "jina_scrapes": 0,
    }
    trace = EvidenceTrace(
        jina_raw_responses=raw_existing + raw_questions + raw_gaps,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="content_gap",
        query=query,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return ContentGapResult(**data), usage, trace
