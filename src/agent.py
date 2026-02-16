"""Core agent: routes user queries to the right SEO tool."""

from __future__ import annotations

import json

from src.models import AgentResponse
from src.prompts.templates import AGENT_ROUTER_SYSTEM
from src.tools import (
    backlink_strategy,
    competitor_analysis,
    content_gap,
    content_generator,
    keyword_research,
    llm,
    serp_analysis,
    strategy_orchestrator,
    technical_seo,
    topical_authority,
    website_analyzer,
)

TOOLS = {
    "keyword_research": keyword_research.run,
    "competitor_analysis": competitor_analysis.run,
    "serp_analysis": serp_analysis.run,
    "content_gap": content_gap.run,
    "content_generation": content_generator.run,
    "website_analyzer": website_analyzer.run,
}


async def route(user_input: str) -> tuple[dict, dict]:
    """Use the LLM to determine which tool to call and with what query."""
    result = await llm.complete(
        system=AGENT_ROUTER_SYSTEM,
        user=user_input,
        temperature=0.0,
    )
    routing = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
    }
    return routing, usage


async def run(user_input: str) -> AgentResponse:
    """Process a user query end-to-end."""
    routing, _ = await route(user_input)
    tool_name = routing["tool"]
    query = routing["query"]
    extras = routing.get("extras", {})

    if tool_name == "content_generation":
        result, _ = await content_generator.run(
            keyword=query,
            content_type=extras.get("content_type", "blog post"),
            tone=extras.get("tone", "professional"),
        )
    elif tool_name == "website_analyzer":
        result, _ = await website_analyzer.run(query)
    elif tool_name == "topical_authority":
        result, _ = await topical_authority.run(
            domain=query,
            niche=extras.get("niche", ""),
        )
    elif tool_name == "technical_seo":
        result, _ = await technical_seo.run(query)
    elif tool_name == "backlink_strategy":
        result, _ = await backlink_strategy.run(
            domain=query,
            niche=extras.get("niche", ""),
        )
    elif tool_name == "seo_strategy":
        result, _ = await strategy_orchestrator.run(
            url=query,
            niche=extras.get("niche", ""),
        )
    elif tool_name in TOOLS:
        result, _ = await TOOLS[tool_name](query)
    else:
        raise ValueError(f"Unknown tool: {tool_name}")

    return AgentResponse(tool_used=tool_name, query=query, result=result)
