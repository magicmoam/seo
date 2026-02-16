"""LLM integration supporting OpenAI and Anthropic."""

from __future__ import annotations

import re

from src.config import config


def _strip_fences(text: str) -> str:
    """Strip markdown code fences (```json ... ```) from LLM output."""
    return re.sub(r"^```(?:json)?\s*\n?", "", text.strip(), flags=re.MULTILINE).rstrip("`").strip()


async def complete(system: str, user: str, temperature: float = 0.3) -> str:
    """Send a chat completion request to the configured LLM provider."""
    if config.llm_provider == "anthropic":
        raw = await _anthropic(system, user, temperature)
    else:
        raw = await _openai(system, user, temperature)
    return _strip_fences(raw)


async def _openai(system: str, user: str, temperature: float) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=config.openai_api_key)
    resp = await client.chat.completions.create(
        model=config.openai_model,
        temperature=temperature,
        max_tokens=config.content_max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return resp.choices[0].message.content or ""


async def _anthropic(system: str, user: str, temperature: float) -> str:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=config.anthropic_api_key)
    resp = await client.messages.create(
        model=config.anthropic_model,
        max_tokens=config.content_max_tokens,
        system=system,
        temperature=temperature,
        messages=[{"role": "user", "content": user}],
    )
    return resp.content[0].text
