"""Vercel serverless function for /api/admin/* — Admin dashboard endpoints."""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


@app.get("/api/admin/users")
async def list_users(request: Request):
    """List all users (paginated)."""
    from src.db import count_users, list_all_users
    from src.middleware import authenticate_admin

    auth_result = await authenticate_admin(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    limit = int(request.query_params.get("limit", "50"))
    offset = int(request.query_params.get("offset", "0"))
    search = request.query_params.get("search", "")

    users = await list_all_users(limit, offset)
    total = await count_users()

    # Filter by search if provided
    if search:
        search_lower = search.lower()
        users = [u for u in users if search_lower in u.get("email", "").lower() or search_lower in u.get("name", "").lower()]

    return JSONResponse({
        "users": users,
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@app.get("/api/admin/users/{email}")
async def get_user_detail(email: str, request: Request):
    """Get detailed user info including usage stats and history."""
    from src.db import get_history, get_usage_stats, get_user
    from src.middleware import authenticate_admin

    auth_result = await authenticate_admin(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    user = await get_user(email)
    if not user:
        return JSONResponse({"error": "User not found"}, status_code=404)

    stats = await get_usage_stats(email)
    history = await get_history(email, limit=20)

    return JSONResponse({
        "user": user,
        "usage_stats": stats,
        "recent_history": history,
    })


@app.post("/api/admin/users/{email}/credits")
async def adjust_credits(email: str, request: Request):
    """Manually adjust a user's credits."""
    from src.db import get_user
    from src.middleware import authenticate_admin

    auth_result = await authenticate_admin(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    amount = body.get("amount")
    if amount is None or not isinstance(amount, int):
        return JSONResponse({"error": "amount (integer) is required"}, status_code=400)

    user = await get_user(email)
    if not user:
        return JSONResponse({"error": "User not found"}, status_code=404)

    new_balance = max(0, user.get("credits_remaining", 0) + amount)

    from src.db import _get_client
    from datetime import datetime, timezone
    client = _get_client()
    if client:
        client.table("users").update({
            "credits_remaining": new_balance,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("email", email).execute()

        # Log the adjustment
        client.table("credit_transactions").insert({
            "user_email": email,
            "credits_used": -amount,
            "tool_used": "admin_adjustment",
            "query": body.get("reason", "Manual admin adjustment"),
            "balance_after": new_balance,
        }).execute()

    return JSONResponse({
        "email": email,
        "credits_remaining": new_balance,
        "adjustment": amount,
    })


@app.post("/api/admin/users/{email}/tier")
async def change_tier(email: str, request: Request):
    """Manually change a user's tier."""
    from src.db import get_user, reset_credits, update_user_tier
    from src.middleware import authenticate_admin

    auth_result = await authenticate_admin(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    tier = body.get("tier")
    if tier not in ("free", "pro"):
        return JSONResponse({"error": "tier must be 'free' or 'pro'"}, status_code=400)

    user = await get_user(email)
    if not user:
        return JSONResponse({"error": "User not found"}, status_code=404)

    await update_user_tier(email, tier)

    # Reset credits based on tier
    from src.credits import TIER_CREDITS
    await reset_credits(email, TIER_CREDITS.get(tier, 5))

    return JSONResponse({"email": email, "tier": tier})


@app.post("/api/admin/impersonate")
async def impersonate(request: Request):
    """Run a query as another user."""
    from src.agent import route
    from src.credits import get_tool_cost
    from src.db import deduct_credits, get_user, save_evidence, save_search, save_usage
    from src.middleware import authenticate_admin
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

    auth_result = await authenticate_admin(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    target_email = body.get("email", "")
    user_input = body.get("query", "").strip()

    if not target_email or not user_input:
        return JSONResponse({"error": "email and query are required"}, status_code=400)

    target_user = await get_user(target_email)
    if not target_user:
        return JSONResponse({"error": "Target user not found"}, status_code=404)

    try:
        routing, router_usage = await route(user_input)
        tool_name = routing["tool"]
        q = routing["query"]
        extras = routing.get("extras", {})

        # Deduct credits from the target user
        cost = get_tool_cost(tool_name)
        if not await deduct_credits(target_email, cost, tool_name, q):
            return JSONResponse({
                "error": "Target user has insufficient credits",
                "credits_required": cost,
            }, status_code=402)

        from api.query import _unpack_tool_result

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
                user_email=target_email,
            )
        else:
            return JSONResponse({"error": f"Unknown tool: {tool_name}"}, status_code=400)

        # Save under target user's account
        total_input = router_usage.get("input_tokens", 0) + tool_usage.get("input_tokens", 0)
        total_output = router_usage.get("output_tokens", 0) + tool_usage.get("output_tokens", 0)

        response = AgentResponse(tool_used=tool_name, query=q, result=result)
        response_data = json.loads(response.model_dump_json())

        search_id = await save_search(target_email, q, tool_name, response_data["result"])
        if search_id:
            trace_dict = json.loads(trace.model_dump_json())
            await save_evidence(target_email, search_id, trace_dict)

        response_data["search_id"] = search_id
        response_data["impersonated_user"] = target_email

        await save_usage(
            user_email=target_email,
            tool_used=tool_name,
            query=q,
            model=tool_usage.get("model", ""),
            input_tokens=total_input,
            output_tokens=total_output,
            jina_searches=tool_usage.get("jina_searches", 0),
            jina_scrapes=tool_usage.get("jina_scrapes", 0),
        )

        return JSONResponse(response_data)

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/admin/stats")
async def platform_stats(request: Request):
    """Get platform-wide statistics."""
    from src.db import count_pro_users, count_users, get_queries_today
    from src.middleware import authenticate_admin

    auth_result = await authenticate_admin(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result

    total_users = await count_users()
    pro_users = await count_pro_users()
    queries_today = await get_queries_today()

    return JSONResponse({
        "total_users": total_users,
        "pro_users": pro_users,
        "mrr": pro_users * 49,
        "queries_today": queries_today,
    })
