"""Core agent: routes user queries to the right SEO tool."""

from __future__ import annotations

import json

from src.models import AgentResponse, EvidenceTrace
from src.prompts.templates import AGENT_ROUTER_SYSTEM
from src.tools import llm
from src.tools.runner import run_tool


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

    result, _, trace = await run_tool(tool_name, query, extras)

    # Attach routing evidence to trace
    trace.routing_prompt = router_usage.get("routing_prompt", "")
    trace.routing_raw_response = router_usage.get("routing_raw_response", "")
    trace.routing_reasoning = router_usage.get("routing_reasoning", "")
    trace.total_input_tokens += router_usage.get("input_tokens", 0)
    trace.total_output_tokens += router_usage.get("output_tokens", 0)

    return AgentResponse(tool_used=tool_name, query=query, result=result), trace
