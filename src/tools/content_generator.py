"""Content generation tool: creates SEO-optimized articles using EEAT principles."""

from __future__ import annotations

import json

from src.models import GeneratedContent
from src.prompts.templates import CONTENT_GENERATION_SYSTEM, CONTENT_GENERATION_USER
from src.tools import jina, llm


async def run(
    keyword: str,
    content_type: str = "blog post",
    tone: str = "professional",
) -> tuple[GeneratedContent, dict]:
    # Research the topic thoroughly
    search_results = await jina.search(keyword, num_results=5)

    # Scrape top 3 for depth
    scraped = []
    scrape_count = 0
    for result in search_results[:3]:
        try:
            page = await jina.scrape(result["url"])
            scraped.append(page)
            scrape_count += 1
        except Exception:
            scraped.append(result)

    # Also get related questions for FAQ section
    questions = await jina.search(f"{keyword} frequently asked questions", num_results=3)

    research_data = "--- Top ranking content ---\n\n"
    research_data += "\n\n".join(
        f"### {p['title']}\nURL: {p['url']}\n{p['content'][:2000]}"
        for p in scraped
    )
    research_data += "\n\n--- Related questions ---\n\n"
    research_data += "\n\n".join(
        f"- {q['title']}: {q['description']}" for q in questions
    )

    result = await llm.complete(
        system=CONTENT_GENERATION_SYSTEM,
        user=CONTENT_GENERATION_USER.format(
            keyword=keyword,
            content_type=content_type,
            tone=tone,
            research_data=research_data,
        ),
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
    return GeneratedContent(**data), usage
