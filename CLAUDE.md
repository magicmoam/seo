# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wongzo is an AI-powered SEO intelligence platform for keyword research, competitor analysis, and content generation. It uses Jina AI for web search/scraping, an LLM (OpenAI or Anthropic) for analysis, Google Auth for access control, and Supabase for search history persistence. Deployed on Vercel at wongzo.com.

## Commands

```bash
# Install dependencies
pip install -e .

# Run the agent
python -m src.main

# Or via entry point (after install)
wongzo
```

## Architecture

```
User query → Agent Router (LLM classifies intent)
                ↓
        Tool Selection (1 of 5)
                ↓
    Jina AI (search/scrape web data)
                ↓
    LLM (analyze data, produce structured JSON)
                ↓
    Rich CLI (formatted tables/panels)
```

- **`src/agent.py`** - Core orchestrator. Uses LLM to route user input to the correct tool, then returns structured `AgentResponse`.
- **`src/tools/jina.py`** - Jina AI client: `search()` hits `s.jina.ai`, `scrape()` hits `r.jina.ai`, `search_and_scrape()` combines both.
- **`src/tools/llm.py`** - Thin async wrapper over OpenAI and Anthropic APIs. Provider chosen via `LLM_PROVIDER` env var.
- **`src/tools/{keyword_research,competitor_analysis,serp_analysis,content_gap,content_generator}.py`** - Each tool gathers data via Jina, then sends it with a structured prompt to the LLM, expecting JSON back matching the Pydantic models.
- **`src/prompts/templates.py`** - All system/user prompt templates. Each tool has a paired `*_SYSTEM` and `*_USER` template.
- **`src/models.py`** - Pydantic models for all tool outputs. The LLM must return JSON conforming to these schemas.
- **`src/main.py`** - Interactive CLI loop with Rich-formatted output. Each tool result type has its own display function.

## Key Conventions

- All tool functions are `async def run(...)` returning a Pydantic model.
- LLM prompts always request raw JSON (no markdown fences) matching the exact Pydantic model schema.
- Jina content is truncated to prevent token overflow (search: 3000 chars, scrape: 8000 chars).
- Config is loaded from environment variables via `.env` file (see `.env.example`).
