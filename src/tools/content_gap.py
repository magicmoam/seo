"""Content gap analysis: identifies underserved topics and opportunities."""

from __future__ import annotations

import json

from src.models import ContentGapResult
from src.prompts.templates import CONTENT_GAP_SYSTEM, CONTENT_GAP_USER
from src.tools import jina, llm


async def run(query: str) -> tuple[ContentGapResult, dict]:
    # Search for existing content in the niche
    existing = await jina.search(query, num_results=8)

    # Search for questions people ask
    questions = await jina.search(f"{query} questions answers", num_results=5)

    # Search for gaps explicitly
    gaps_search = await jina.search(f"{query} underserved topics", num_results=3)

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

    result = await llm.complete(
        system=CONTENT_GAP_SYSTEM,
        user=CONTENT_GAP_USER.format(query=query, gap_data=gap_data),
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 3,
        "jina_scrapes": 0,
    }
    return ContentGapResult(**data), usage
