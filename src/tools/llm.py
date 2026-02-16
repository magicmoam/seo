"""LLM integration supporting OpenAI and Anthropic."""

from __future__ import annotations

import re
from dataclasses import dataclass

from src.config import config


@dataclass
class LLMResult:
    text: str
    input_tokens: int
    output_tokens: int
    model: str
    raw_text: str = ""


def _strip_fences(text: str) -> str:
    """Strip markdown code fences (```json ... ```) from LLM output."""
    return re.sub(r"^```(?:json)?\s*\n?", "", text.strip(), flags=re.MULTILINE).rstrip("`").strip()


async def complete(system: str, user: str, temperature: float = 0.3) -> LLMResult:
    """Send a chat completion request to the configured LLM provider."""
    if config.llm_provider == "anthropic":
        return await _anthropic(system, user, temperature)
    else:
        return await _openai(system, user, temperature)


async def _openai(system: str, user: str, temperature: float) -> LLMResult:
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
    raw = resp.choices[0].message.content or ""
    text = _strip_fences(raw)
    usage = resp.usage
    return LLMResult(
        text=text,
        input_tokens=usage.prompt_tokens if usage else 0,
        output_tokens=usage.completion_tokens if usage else 0,
        model=config.openai_model,
        raw_text=raw,
    )


async def _anthropic(system: str, user: str, temperature: float) -> LLMResult:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=config.anthropic_api_key)
    resp = await client.messages.create(
        model=config.anthropic_model,
        max_tokens=config.content_max_tokens,
        system=system,
        temperature=temperature,
        messages=[{"role": "user", "content": user}],
    )
    raw = resp.content[0].text
    text = _strip_fences(raw)
    return LLMResult(
        text=text,
        input_tokens=resp.usage.input_tokens,
        output_tokens=resp.usage.output_tokens,
        model=config.anthropic_model,
        raw_text=raw,
    )
