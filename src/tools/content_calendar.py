"""Content calendar generator: creates a prioritized publishing schedule with cost estimates."""

from __future__ import annotations

import json

from src.models import ContentCalendar, EvidenceTrace
from src.prompts.templates import CONTENT_CALENDAR_SYSTEM, CONTENT_CALENDAR_USER
from src.tools import llm


async def run(domain: str, strategy_data: str) -> tuple[ContentCalendar, dict, EvidenceTrace]:
    """Generate a content calendar based on topical authority map and research data.

    Args:
        domain: The target domain.
        strategy_data: Pre-gathered topical authority and competitive data as text.
    """
    system_prompt = CONTENT_CALENDAR_SYSTEM
    user_prompt = CONTENT_CALENDAR_USER.format(
        domain=domain, strategy_data=strategy_data
    )

    result = await llm.complete(
        system=system_prompt,
        user=user_prompt,
        temperature=0.3,
    )

    data = json.loads(result.text)
    usage = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "model": result.model,
        "jina_searches": 0,
        "jina_scrapes": 0,
    }
    trace = EvidenceTrace(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        llm_raw_response=result.raw_text,
        tool_used="content_calendar",
        query=domain,
        model=result.model,
        total_input_tokens=result.input_tokens,
        total_output_tokens=result.output_tokens,
    )
    return ContentCalendar(**data), usage, trace
