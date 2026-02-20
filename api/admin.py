"""Vercel serverless function for /api/admin/* — Admin dashboard endpoints."""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from api._deps import get_admin_user

app = FastAPI()


@app.get("/api/admin/users")
async def list_users(request: Request, auth_result=Depends(get_admin_user)):
    """List all users (paginated)."""
    from src.db import count_users, list_all_users

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
async def get_user_detail(email: str, request: Request, auth_result=Depends(get_admin_user)):
    """Get detailed user info including usage stats and history."""
    from src.db import get_history, get_usage_stats, get_user

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
async def adjust_credits(email: str, request: Request, auth_result=Depends(get_admin_user)):
    """Manually adjust a user's credits."""
    from src.db import get_user

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

    import src.db.client as _db_client
    from datetime import datetime, timezone
    client = _db_client._get_client()
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
async def change_tier(email: str, request: Request, auth_result=Depends(get_admin_user)):
    """Manually change a user's tier."""
    from src.db import get_user, reset_credits, update_user_tier

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
async def impersonate(request: Request, auth_result=Depends(get_admin_user)):
    """Run a query as another user."""
    from src.agent import route
    from src.credits import get_tool_cost
    from src.db import deduct_credits, get_user, save_evidence, save_search, save_usage
    from src.models import AgentResponse
    from src.tools.runner import run_tool

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

        try:
            result, tool_usage, trace = await run_tool(
                tool_name, q, extras, user_email=target_email,
            )
        except ValueError:
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


@app.get("/api/admin/blog")
async def list_blog_posts(request: Request, auth_result=Depends(get_admin_user)):
    """List all blog posts (including drafts) for admin review."""
    from src.db.blog import list_all_posts

    if isinstance(auth_result, JSONResponse):
        return auth_result

    posts = await list_all_posts(limit=200)
    return JSONResponse({"posts": posts})


@app.post("/api/admin/blog/generate")
async def generate_blog_post(request: Request, auth_result=Depends(get_admin_user)):
    """Generate a single blog article via the content pipeline."""
    from src.content_pipeline import generate_and_store_article

    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    keyword = body.get("keyword", "").strip()
    if not keyword:
        return JSONResponse({"error": "keyword is required"}, status_code=400)

    post_id = await generate_and_store_article(
        keyword=keyword,
        content_type=body.get("content_type", "blog post"),
        cluster_slug=body.get("cluster_slug", ""),
        post_content_type=body.get("post_content_type", "supporting"),
        pillar_post_id=body.get("pillar_post_id"),
        tone=body.get("tone", "professional"),
    )

    if not post_id:
        return JSONResponse({"error": "Failed to generate article"}, status_code=500)

    return JSONResponse({"post_id": post_id, "status": "draft"})


@app.post("/api/admin/blog/generate-cluster")
async def generate_blog_cluster(request: Request, auth_result=Depends(get_admin_user)):
    """Generate a full content cluster (pillar + supporting articles)."""
    from src.content_pipeline import generate_cluster

    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    cluster_name = body.get("cluster_name", "").strip()
    pillar_keyword = body.get("pillar_keyword", "").strip()
    supporting_keywords = body.get("supporting_keywords", [])

    if not cluster_name or not pillar_keyword or not supporting_keywords:
        return JSONResponse(
            {"error": "cluster_name, pillar_keyword, and supporting_keywords are required"},
            status_code=400,
        )

    result = await generate_cluster(
        cluster_name=cluster_name,
        pillar_keyword=pillar_keyword,
        supporting_keywords=supporting_keywords,
        tone=body.get("tone", "professional"),
    )

    return JSONResponse(result)


@app.post("/api/admin/blog/{post_id}/publish")
async def publish_blog_post(post_id: str, request: Request, auth_result=Depends(get_admin_user)):
    """Publish a draft blog post."""
    from src.content_pipeline import inject_internal_links
    from src.db.blog import publish_post

    if isinstance(auth_result, JSONResponse):
        return auth_result

    success = await publish_post(post_id)
    if not success:
        return JSONResponse({"error": "Failed to publish post"}, status_code=500)

    links_added = await inject_internal_links(post_id)

    return JSONResponse({"post_id": post_id, "status": "published", "internal_links_added": links_added})


@app.post("/api/admin/blog/{post_id}/unpublish")
async def unpublish_blog_post(post_id: str, request: Request, auth_result=Depends(get_admin_user)):
    """Unpublish a blog post (revert to draft)."""
    from src.db.blog import unpublish_post

    if isinstance(auth_result, JSONResponse):
        return auth_result

    success = await unpublish_post(post_id)
    if not success:
        return JSONResponse({"error": "Failed to unpublish post"}, status_code=500)

    return JSONResponse({"post_id": post_id, "status": "draft"})


@app.put("/api/admin/blog/{post_id}")
async def update_blog_post(post_id: str, request: Request, auth_result=Depends(get_admin_user)):
    """Update a blog post's content."""
    from src.db.blog import update_post

    if isinstance(auth_result, JSONResponse):
        return auth_result

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    allowed_fields = {"title", "meta_description", "content_markdown", "content_html", "slug", "cluster_slug", "content_type", "schema_type", "og_image_url"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}

    if not updates:
        return JSONResponse({"error": "No valid fields to update"}, status_code=400)

    # Auto-regenerate HTML if markdown is updated but HTML is not
    if "content_markdown" in updates and "content_html" not in updates:
        import markdown
        updates["content_html"] = markdown.markdown(
            updates["content_markdown"],
            extensions=["extra", "toc", "sane_lists"],
            output_format="html",
        )

    success = await update_post(post_id, **updates)
    if not success:
        return JSONResponse({"error": "Failed to update post"}, status_code=500)

    return JSONResponse({"post_id": post_id, "updated_fields": list(updates.keys())})


@app.get("/api/admin/stats")
async def platform_stats(request: Request, auth_result=Depends(get_admin_user)):
    """Get platform-wide statistics."""
    from src.db import count_pro_users, count_users, get_queries_today

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
