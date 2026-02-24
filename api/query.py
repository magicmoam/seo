"""Vercel serverless function for /api/query."""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tryseo.ai", "https://www.tryseo.ai", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _authenticate(request: Request) -> dict | JSONResponse:
    """Verify Google token from Authorization header."""
    from src.middleware import authenticate
    return await authenticate(request)


@app.post("/api/query")
async def query(request: Request):
    auth_result = await _authenticate(request)
    from src.agent import route
    from src.db import save_evidence, save_search, save_usage
    from src.models import AgentResponse
    from src.tools.runner import run_tool

    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    body = await request.json()
    user_input = body.get("query", "").strip()
    if not user_input:
        return JSONResponse({"error": "Empty query"}, status_code=400)
    if len(user_input) > 2000:
        return JSONResponse({"error": "Query too long (max 2000 characters)"}, status_code=400)

    try:
        # Direct tool invocation: skip LLM router when tool is specified
        direct_tool = body.get("tool", "").strip()
        if direct_tool:
            from src.credits import TOOL_COSTS
            if direct_tool not in TOOL_COSTS:
                return JSONResponse({"error": f"Unknown tool: {direct_tool}"}, status_code=400)
            tool_name = direct_tool
            q = user_input
            extras = body.get("extras", {})
            router_usage = {"input_tokens": 0, "output_tokens": 0}
        else:
            routing, router_usage = await route(user_input)
            tool_name = routing["tool"]
            q = routing["query"]
            extras = routing.get("extras", {})

        # Credit enforcement
        from src.credits import get_tool_cost
        from src.db import deduct_credits
        cost = get_tool_cost(tool_name)
        if not await deduct_credits(user["email"], cost, tool_name, q):
            return JSONResponse({
                "error": "Insufficient credits",
                "credits_required": cost,
                "tool": tool_name,
                "upgrade_url": "/#/pricing",
            }, status_code=402)

        try:
            result, tool_usage, trace = await run_tool(
                tool_name, q, extras, user_email=user["email"],
            )
        except ValueError:
            return JSONResponse({"error": f"Unknown tool: {tool_name}"}, status_code=400)

        # Attach routing evidence to trace
        trace.routing_prompt = router_usage.get("routing_prompt", "")
        trace.routing_raw_response = router_usage.get("routing_raw_response", "")
        trace.routing_reasoning = router_usage.get("routing_reasoning", "")
        trace.total_input_tokens += router_usage.get("input_tokens", 0)
        trace.total_output_tokens += router_usage.get("output_tokens", 0)

        # Merge router + tool usage
        total_input = router_usage.get("input_tokens", 0) + tool_usage.get("input_tokens", 0)
        total_output = router_usage.get("output_tokens", 0) + tool_usage.get("output_tokens", 0)

        response = AgentResponse(tool_used=tool_name, query=q, result=result)
        response_data = json.loads(response.model_dump_json())

        # Save to database and get search_id
        search_id = await save_search(user["email"], q, tool_name, response_data["result"])

        # Save evidence trace
        if search_id:
            trace_dict = json.loads(trace.model_dump_json())
            await save_evidence(user["email"], search_id, trace_dict)

        # Add search_id to response
        response_data["search_id"] = search_id

        # Save usage
        await save_usage(
            user_email=user["email"],
            tool_used=tool_name,
            query=q,
            model=tool_usage.get("model", ""),
            input_tokens=total_input,
            output_tokens=total_output,
            jina_searches=tool_usage.get("jina_searches", 0),
            jina_scrapes=tool_usage.get("jina_scrapes", 0),
        )

        return JSONResponse(response_data)

    except json.JSONDecodeError:
        return JSONResponse({"error": "LLM returned invalid JSON"}, status_code=502)
    except Exception:
        import logging
        logging.exception("Unhandled error in /api/query")
        return JSONResponse({"error": "An internal error occurred"}, status_code=500)



@app.post("/api/report")
async def report(request: Request):
    """Generate an HTML report from a previous query result.

    Accepts the same AgentResponse JSON that /api/query returns.
    Returns the HTML report directly (can be opened in a new tab or downloaded).
    """
    auth_result = await _authenticate(request)
    from src.models import AgentResponse
    from src.report_exporter import export_html_string

    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
        response = AgentResponse(**body)
        html = export_html_string(response)
        return HTMLResponse(content=html)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@app.post("/api/client-report")
async def client_report(request: Request):
    """Generate a client-facing Word document (.docx) pitch report."""
    auth_result = await _authenticate(request)
    from starlette.responses import Response

    from src.client_report import generate_client_report
    from src.models import AgentResponse

    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
        response = AgentResponse(**body)
        docx_bytes = generate_client_report(response)
        domain = response.query.replace("https://", "").replace("http://", "").split("/")[0]
        filename = f"tryseo_report_{domain}.docx"
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)
