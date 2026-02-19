"""Core agent: routes user queries to the right SEO tool."""

from __future__ import annotations

import json

from src.models import AgentResponse, EvidenceTrace
from src.prompts.templates import AGENT_ROUTER_SYSTEM
from src.tools import (
    backlink_strategy,
    competitor_analysis,
    content_gap,
    content_generator,
    ga4,
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


def _unpack_tool_result(result_tuple, tool_name, query):
    """Unpack tool result, handling both 2-tuple and 3-tuple returns."""
    if len(result_tuple) == 3:
        return result_tuple[0], result_tuple[1], result_tuple[2]
    # Legacy 2-tuple tools: create a minimal evidence trace
    return result_tuple[0], result_tuple[1], EvidenceTrace(tool_used=tool_name, query=query)


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
        "routing_reasoning": routing.get("reasoning", ""),
        "routing_raw_response": result.raw_text,
        "routing_prompt": AGENT_ROUTER_SYSTEM,
    }
    return routing, usage


async def run(user_input: str) -> tuple[AgentResponse, EvidenceTrace]:
    """Process a user query end-to-end."""
    routing, router_usage = await route(user_input)
    tool_name = routing["tool"]
    query = routing["query"]
    extras = routing.get("extras", {})

    if tool_name == "content_generation":
        result, _, trace = await content_generator.run(
            keyword=query,
            content_type=extras.get("content_type", "blog post"),
            tone=extras.get("tone", "professional"),
        )
    elif tool_name == "website_analyzer":
        result, _, trace = await website_analyzer.run(query)
    elif tool_name == "topical_authority":
        result, _, trace = _unpack_tool_result(
            await topical_authority.run(domain=query, niche=extras.get("niche", "")),
            tool_name, query,
        )
    elif tool_name == "technical_seo":
        result, _, trace = _unpack_tool_result(
            await technical_seo.run(query), tool_name, query,
        )
    elif tool_name == "backlink_strategy":
        result, _, trace = _unpack_tool_result(
            await backlink_strategy.run(domain=query, niche=extras.get("niche", "")),
            tool_name, query,
        )
    elif tool_name == "seo_strategy":
        result, _, trace = _unpack_tool_result(
            await strategy_orchestrator.run(url=query, niche=extras.get("niche", "")),
            tool_name, query,
        )
    elif tool_name == "ga4_analytics":
        result, _, trace = await ga4.run(
            property_id=query,
            date_range=extras.get("date_range", "last_30_days"),
        )
    elif tool_name in TOOLS:
        result, _, trace = await TOOLS[tool_name](query)
    else:
        raise ValueError(f"Unknown tool: {tool_name}")

    # Attach routing evidence to trace
    trace.routing_prompt = router_usage.get("routing_prompt", "")
    trace.routing_raw_response = router_usage.get("routing_raw_response", "")
    trace.routing_reasoning = router_usage.get("routing_reasoning", "")
    trace.total_input_tokens += router_usage.get("input_tokens", 0)
    trace.total_output_tokens += router_usage.get("output_tokens", 0)

    return AgentResponse(tool_used=tool_name, query=query, result=result), trace
