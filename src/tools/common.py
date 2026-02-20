"""Shared utilities for tool result handling."""

from __future__ import annotations

from src.models import EvidenceTrace


def unpack_tool_result(result_tuple, tool_name: str, query: str):
    """Unpack tool result, handling both 2-tuple and 3-tuple returns."""
    if len(result_tuple) == 3:
        return result_tuple[0], result_tuple[1], result_tuple[2]
    # Legacy 2-tuple tools: create a minimal evidence trace
    return result_tuple[0], result_tuple[1], EvidenceTrace(tool_used=tool_name, query=query)
