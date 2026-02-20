"""Supabase client initialization and cost calculation."""

from __future__ import annotations

from src.config import config

_client = None

# Pricing per million tokens (USD)
PRICING = {
    "anthropic": {"input": 3.0, "output": 15.0},
    "openai": {"input": 2.5, "output": 10.0},
}


def _get_client():
    global _client
    if _client is None:
        if not config.supabase_url or not config.supabase_key:
            return None
        from supabase import create_client
        _client = create_client(config.supabase_url, config.supabase_key)
    return _client


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate estimated cost in USD based on model and token counts."""
    provider = "anthropic" if "claude" in model.lower() else "openai"
    rates = PRICING.get(provider, PRICING["anthropic"])
    cost = (input_tokens * rates["input"] + output_tokens * rates["output"]) / 1_000_000
    return round(cost, 6)
