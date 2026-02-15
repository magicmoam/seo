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
) -> GeneratedContent:
    # Research the topic thoroughly
    search_results = await jina.search(keyword, num_results=5)

    # Scrape top 3 for depth
    scraped = []
    for result in search_results[:3]:
        try:
            page = await jina.scrape(result["url"])
            scraped.append(page)
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

    response = await llm.complete(
        system=CONTENT_GENERATION_SYSTEM,
        user=CONTENT_GENERATION_USER.format(
            keyword=keyword,
            content_type=content_type,
            tone=tone,
            research_data=research_data,
        ),
        temperature=0.5,  # slightly more creative for content
    )

    data = json.loads(response)
    return GeneratedContent(**data)
