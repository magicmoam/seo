"""Shared utilities for tool result handling."""

from __future__ import annotations


def unpack_tool_result(result_tuple, tool_name: str, query: str):
    """Unpack a 3-tuple tool result (result, usage, trace)."""
    return result_tuple[0], result_tuple[1], result_tuple[2]
