"""Vercel serverless function for /api/query."""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI()


async def _authenticate(request: Request) -> dict | JSONResponse:
    """Verify Google token from Authorization header. Returns user dict or error response."""
    from src.auth import verify_google_token, is_allowed

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"error": "Missing authorization token"}, status_code=401)

    user = await verify_google_token(auth[7:])
    if not user:
        return JSONResponse({"error": "Invalid or expired token"}, status_code=401)

    if not is_allowed(user["email"]):
        return JSONResponse({"error": "Access denied"}, status_code=403)

    return user


def _unpack_tool_result(result_tuple, tool_name, query):
    """Unpack tool result, handling both 2-tuple and 3-tuple returns."""
    from src.models import EvidenceTrace

    if len(result_tuple) == 3:
        return result_tuple[0], result_tuple[1], result_tuple[2]
    return result_tuple[0], result_tuple[1], EvidenceTrace(tool_used=tool_name, query=query)


@app.post("/api/query")
async def query(request: Request):
    from src.agent import route
    from src.db import save_evidence, save_search, save_usage
    from src.models import AgentResponse
    from src.tools import (
        backlink_strategy,
        competitor_analysis,
        content_gap,
        content_generator,
        ga4,
        keyword_research,
        serp_analysis,
        strategy_orchestrator,
        technical_seo,
        topical_authority,
        website_analyzer,
    )

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    body = await request.json()
    user_input = body.get("query", "").strip()
    if not user_input:
        return JSONResponse({"error": "Empty query"}, status_code=400)

    try:
        routing, router_usage = await route(user_input)
        tool_name = routing["tool"]
        q = routing["query"]
        extras = routing.get("extras", {})

        if tool_name == "content_generation":
            result, tool_usage, trace = await content_generator.run(
                keyword=q,
                content_type=extras.get("content_type", "blog post"),
                tone=extras.get("tone", "professional"),
            )
        elif tool_name == "keyword_research":
            result, tool_usage, trace = await keyword_research.run(q)
        elif tool_name == "competitor_analysis":
            result, tool_usage, trace = await competitor_analysis.run(q)
        elif tool_name == "serp_analysis":
            result, tool_usage, trace = await serp_analysis.run(q)
        elif tool_name == "content_gap":
            result, tool_usage, trace = await content_gap.run(q)
        elif tool_name == "website_analyzer":
            result, tool_usage, trace = await website_analyzer.run(q)
        elif tool_name == "topical_authority":
            result, tool_usage, trace = _unpack_tool_result(
                await topical_authority.run(domain=q, niche=extras.get("niche", "")),
                tool_name, q,
            )
        elif tool_name == "technical_seo":
            result, tool_usage, trace = _unpack_tool_result(
                await technical_seo.run(q), tool_name, q,
            )
        elif tool_name == "backlink_strategy":
            result, tool_usage, trace = _unpack_tool_result(
                await backlink_strategy.run(domain=q, niche=extras.get("niche", "")),
                tool_name, q,
            )
        elif tool_name == "seo_strategy":
            result, tool_usage, trace = _unpack_tool_result(
                await strategy_orchestrator.run(url=q, niche=extras.get("niche", "")),
                tool_name, q,
            )
        elif tool_name == "ga4_analytics":
            result, tool_usage, trace = await ga4.run(
                property_id=q,
                date_range=extras.get("date_range", "last_30_days"),
            )
        else:
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

    except json.JSONDecodeError as e:
        return JSONResponse({"error": f"LLM returned invalid JSON: {e}"}, status_code=502)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/history")
async def history(request: Request):
    from src.db import get_history

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    records = await get_history(user["email"])
    return JSONResponse(records)


@app.post("/api/report")
async def report(request: Request):
    """Generate an HTML report from a previous query result.

    Accepts the same AgentResponse JSON that /api/query returns.
    Returns the HTML report directly (can be opened in a new tab or downloaded).
    """
    from src.models import AgentResponse
    from src.report_exporter import export_html_string

    auth_result = await _authenticate(request)
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
    from starlette.responses import Response

    from src.client_report import generate_client_report
    from src.models import AgentResponse

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
        response = AgentResponse(**body)
        docx_bytes = generate_client_report(response)
        domain = response.query.replace("https://", "").replace("http://", "").split("/")[0]
        filename = f"wongzo_report_{domain}.docx"
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)
