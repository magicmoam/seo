"""Backlink strategy agent: develops off-page SEO and link building plans with cost estimates."""

from __future__ import annotations

import json

from src.models import BacklinkStrategy
from src.prompts.templates import BACKLINK_STRATEGY_SYSTEM, BACKLINK_STRATEGY_USER
from src.tools import jina, llm


async def run(domain: str, niche: str = "") -> tuple[BacklinkStrategy, dict]:
    """Build a comprehensive backlink acquisition strategy."""
    # Scrape domain homepage
    scrape_count = 0
    try:
        homepage = await jina.scrape(domain)
        scrape_count += 1
    except Exception:
        homepage = {"title": domain, "url": domain, "content": ""}

    niche_query = niche if niche else homepage.get("title", domain)

    # Search for competitor backlink patterns
    competitor_results = await jina.search(
        f"{niche_query} best sites resources", num_results=5
    )

    # Search for guest posting and outreach opportunities
    outreach_results = await jina.search(
        f"{niche_query} write for us guest post", num_results=5
    )

    # Search for link-worthy content ideas in niche
    linkbait_results = await jina.search(
        f"{niche_query} statistics data research study", num_results=5
    )

    research_data = f"--- Domain homepage ---\nTitle: {homepage.get('title', '')}\n"
    research_data += f"URL: {homepage.get('url', domain)}\n"
    research_data += f"Content:\n{homepage.get('content', '')[:1500]}\n\n"

    research_data += "--- Competitor landscape ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\nURL: {r['url']}\n{r['content'][:600]}"
        for r in competitor_results
    )

    research_data += "\n\n--- Guest post / outreach opportunities ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\nURL: {r['url']}\n{r['content'][:400]}"
        for r in outreach_results
    )

    research_data += "\n\n--- Link-worthy content ideas ---\n\n"
    research_data += "\n\n".join(
        f"### {r['title']}\n{r['content'][:400]}" for r in linkbait_results
    )

    result = await llm.complete(
        system=BACKLINK_STRATEGY_SYSTEM,
        user=BACKLINK_STRATEGY_USER.format(
            domain=domain, research_data=research_data
        ),
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 3,
        "jina_scrapes": scrape_count,
    }
    return BacklinkStrategy(**data), usage
