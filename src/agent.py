"""Core agent: routes user queries to the right SEO tool."""

from __future__ import annotations

import json

from src.models import AgentResponse
from src.prompts.templates import AGENT_ROUTER_SYSTEM
from src.tools import (
    competitor_analysis,
    content_gap,
    content_generator,
    keyword_research,
    llm,
    serp_analysis,
)

TOOLS = {
    "keyword_research": keyword_research.run,
    "competitor_analysis": competitor_analysis.run,
    "serp_analysis": serp_analysis.run,
    "content_gap": content_gap.run,
    "content_generation": content_generator.run,
}


async def route(user_input: str) -> dict:
    """Use the LLM to determine which tool to call and with what query."""
    response = await llm.complete(
        system=AGENT_ROUTER_SYSTEM,
        user=user_input,
        temperature=0.0,
    )
    return json.loads(response)


async def run(user_input: str) -> AgentResponse:
    """Process a user query end-to-end."""
    routing = await route(user_input)
    tool_name = routing["tool"]
    query = routing["query"]
    extras = routing.get("extras", {})

    if tool_name == "content_generation":
        result = await content_generator.run(
            keyword=query,
            content_type=extras.get("content_type", "blog post"),
            tone=extras.get("tone", "professional"),
        )
    elif tool_name in TOOLS:
        result = await TOOLS[tool_name](query)
    else:
        raise ValueError(f"Unknown tool: {tool_name}")

    return AgentResponse(tool_used=tool_name, query=query, result=result)
