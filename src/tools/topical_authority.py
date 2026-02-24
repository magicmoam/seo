"""Topical authority map builder: creates content cluster architecture for domain authority."""

from __future__ import annotations

import asyncio
import json

from src.models import TopicalAuthorityMap
from src.prompts.templates import TOPICAL_AUTHORITY_SYSTEM, TOPICAL_AUTHORITY_USER
from src.tools import jina, llm


async def run(domain: str, niche: str = "") -> tuple[TopicalAuthorityMap, dict]:
    """Build a topical authority map with content clusters and silo architecture."""
    # Scrape the domain homepage to understand current state
    scrape_count = 0
    try:
        homepage = await jina.scrape(domain)
        scrape_count += 1
    except Exception:
        homepage = {"title": domain, "url": domain, "content": ""}

    # Search for the domain's niche to understand the competitive landscape
    niche_query = niche if niche else homepage.get("title", domain)

    # Run all three searches in parallel
    niche_results, cluster_results, questions = await asyncio.gather(
        jina.search(niche_query, num_results=8),
        jina.search(f"{niche_query} comprehensive guide topics", num_results=5),
        jina.search(f"{niche_query} most important topics to cover", num_results=5),
    )

    research_data = f"--- Homepage ---\nTitle: {homepage.get('title', '')}\n"
    research_data += f"URL: {homepage.get('url', domain)}\n"
    research_data += f"Content preview:\n{homepage.get('content', '')[:2000]}\n\n"

    research_data += "--- Niche landscape ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\nURL: {r['url']}\n{r['content'][:800]}"
        for r in niche_results
    )

    research_data += "\n\n--- Topic cluster ideas ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\n{r['content'][:600]}" for r in cluster_results
    )

    research_data += "\n\n--- Key topics in niche ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\n{r['content'][:600]}" for r in questions
    )

    result = await llm.complete(
        system=TOPICAL_AUTHORITY_SYSTEM,
        user=TOPICAL_AUTHORITY_USER.format(
            domain=domain, niche=niche_query, research_data=research_data
        ),
        temperature=0.3,
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 3,
        "jina_scrapes": scrape_count,
    }
    return TopicalAuthorityMap(**data), usage
