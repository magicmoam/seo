"""Content generation tool: creates SEO-optimized articles using EEAT principles."""

from __future__ import annotations

import json

from src.models import EvidenceTrace, GeneratedContent
from src.prompts.templates import CONTENT_GENERATION_SYSTEM, CONTENT_GENERATION_USER
from src.tools import jina, llm


async def run(
    keyword: str,
    content_type: str = "blog post",
    tone: str = "professional",
) -> tuple[GeneratedContent, dict, EvidenceTrace]:
    # Research the topic thoroughly
    search_results, raw_search = await jina.search_with_raw(keyword, num_results=5)

    # Scrape top 3 for depth
    scraped = []
    raw_scraped = []
    scrape_count = 0
    for i, result in enumerate(search_results[:3]):
        try:
            page, raw_page = await jina.scrape_with_raw(result["url"])
            scraped.append(page)
            raw_scraped.append(raw_page)
            scrape_count += 1
        except Exception:
            scraped.append(result)
            raw_scraped.append(raw_search[i])

    # Also get related questions for FAQ section
    questions, raw_questions = await jina.search_with_raw(f"{keyword} frequently asked questions", num_results=3)

    research_data = "--- Top ranking content ---\n\n"
    research_data += "\n\n".join(
        f"### {p['title']}\nURL: {p['url']}\n{p['content'][:2000]}"
        for p in scraped
    )
    research_data += "\n\n--- Related questions ---\n\n"
    research_data += "\n\n".join(
        f"- {q['title']}: {q['description']}" for q in questions
    )

    system_prompt = CONTENT_GENERATION_SYSTEM
    user_prompt = CONTENT_GENERATION_USER.format(
        keyword=keyword,
        content_type=content_type,
        tone=tone,
        research_data=research_data,
    )

    result = await llm.complete(
        system=system_prompt,
        user=user_prompt,
        temperature=0.5,  # slightly more creative for content
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 2,
        "jina_scrapes": scrape_count,
    }
    trace = EvidenceTrace(
        jina_raw_responses=raw_search + raw_scraped + raw_questions,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="content_generation",
        query=keyword,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return GeneratedContent(**data), usage, trace
