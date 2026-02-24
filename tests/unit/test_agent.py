"""Tests for src/agent.py - Agent routing and tool unpacking."""

from __future__ import annotations

import json
from dataclasses import dataclass
from unittest.mock import AsyncMock, patch

import pytest

from src.agent import route
from src.models import EvidenceTrace
from src.tools.common import unpack_tool_result


@dataclass
class MockLLMResult:
    """Mock for llm.LLMResult."""
    text: str
    input_tokens: int
    output_tokens: int
    model: str
    raw_text: str = ""


class TestUnpackToolResult:
    """Test unpack_tool_result() handles 2- and 3-tuple returns."""

    def test_handles_3_tuple(self):
        result_obj = {"data": "value"}
        usage = {"input_tokens": 100}
        trace = EvidenceTrace(tool_used="keyword_research", query="test")

        result, usage_out, trace_out = unpack_tool_result(
            (result_obj, usage, trace), "keyword_research", "test"
        )

        assert result == result_obj
        assert usage_out == usage
        assert trace_out is trace
        assert trace_out.tool_used == "keyword_research"

    def test_3_tuple_preserves_trace_fields(self):
        trace = EvidenceTrace(
            tool_used="serp_analysis",
            query="test query",
            model="gpt-4o",
            total_input_tokens=500,
            total_output_tokens=200,
        )
        result, _, trace_out = unpack_tool_result(
            ("result", {}, trace), "serp_analysis", "test query"
        )
        assert trace_out.model == "gpt-4o"
        assert trace_out.total_input_tokens == 500
        assert trace_out.total_output_tokens == 200


class TestRoute:
    """Test route() function."""

    @patch("src.agent.llm.complete", new_callable=AsyncMock)
    async def test_route_calls_llm_and_parses_json(self, mock_complete):
        routing_json = {
            "tool": "keyword_research",
            "query": "best coffee beans",
            "reasoning": "User wants keyword data",
            "extras": {},
        }
        mock_complete.return_value = MockLLMResult(
            text=json.dumps(routing_json),
            input_tokens=150,
            output_tokens=50,
            model="gpt-4o",
            raw_text=json.dumps(routing_json),
        )

        routing, usage = await route("find keywords for best coffee beans")

        assert routing["tool"] == "keyword_research"
        assert routing["query"] == "best coffee beans"
        assert usage["input_tokens"] == 150
        assert usage["output_tokens"] == 50
        assert usage["model"] == "gpt-4o"
        assert usage["routing_reasoning"] == "User wants keyword data"

    @patch("src.agent.llm.complete", new_callable=AsyncMock)
    async def test_route_with_website_analyzer_tool(self, mock_complete):
        routing_json = {
            "tool": "website_analyzer",
            "query": "https://example.com",
            "reasoning": "User wants site analysis",
            "extras": {},
        }
        mock_complete.return_value = MockLLMResult(
            text=json.dumps(routing_json),
            input_tokens=100,
            output_tokens=40,
            model="gpt-4o",
            raw_text=json.dumps(routing_json),
        )

        routing, usage = await route("analyze https://example.com")

        assert routing["tool"] == "website_analyzer"
        assert routing["query"] == "https://example.com"

    @patch("src.agent.llm.complete", new_callable=AsyncMock)
    async def test_route_with_extras(self, mock_complete):
        routing_json = {
            "tool": "content_generation",
            "query": "healthy eating tips",
            "reasoning": "User wants content",
            "extras": {"content_type": "blog post", "tone": "casual"},
        }
        mock_complete.return_value = MockLLMResult(
            text=json.dumps(routing_json),
            input_tokens=120,
            output_tokens=60,
            model="gpt-4o",
            raw_text=json.dumps(routing_json),
        )

        routing, usage = await route("write a blog post about healthy eating")

        assert routing["extras"]["content_type"] == "blog post"
        assert routing["extras"]["tone"] == "casual"

    @patch("src.agent.llm.complete", new_callable=AsyncMock)
    async def test_route_includes_routing_prompt(self, mock_complete):
        routing_json = {"tool": "serp_analysis", "query": "test", "reasoning": "r", "extras": {}}
        mock_complete.return_value = MockLLMResult(
            text=json.dumps(routing_json),
            input_tokens=50,
            output_tokens=30,
            model="gpt-4o",
            raw_text=json.dumps(routing_json),
        )

        _, usage = await route("test query")

        assert "routing_prompt" in usage
        assert usage["routing_prompt"] != ""
