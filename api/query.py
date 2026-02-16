"""Vercel serverless function for /api/query."""

from __future__ import annotations

import json
import os
import re
import sys

# Ensure src/ is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


@app.post("/api/query")
async def query(request: Request):
    from src.agent import route
    from src.models import AgentResponse
    from src.tools import (
        competitor_analysis,
        content_gap,
        content_generator,
        keyword_research,
        serp_analysis,
    )

    body = await request.json()
    user_input = body.get("query", "").strip()
    if not user_input:
        return JSONResponse({"error": "Empty query"}, status_code=400)

    try:
        routing = await route(user_input)
        tool_name = routing["tool"]
        q = routing["query"]
        extras = routing.get("extras", {})

        if tool_name == "content_generation":
            result = await content_generator.run(
                keyword=q,
                content_type=extras.get("content_type", "blog post"),
                tone=extras.get("tone", "professional"),
            )
        elif tool_name == "keyword_research":
            result = await keyword_research.run(q)
        elif tool_name == "competitor_analysis":
            result = await competitor_analysis.run(q)
        elif tool_name == "serp_analysis":
            result = await serp_analysis.run(q)
        elif tool_name == "content_gap":
            result = await content_gap.run(q)
        else:
            return JSONResponse({"error": f"Unknown tool: {tool_name}"}, status_code=400)

        response = AgentResponse(tool_used=tool_name, query=q, result=result)
        return JSONResponse(json.loads(response.model_dump_json()))

    except json.JSONDecodeError as e:
        return JSONResponse({"error": f"LLM returned invalid JSON: {e}"}, status_code=502)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
