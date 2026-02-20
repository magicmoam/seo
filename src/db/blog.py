"""Blog post CRUD operations for SSR content system."""

from __future__ import annotations

from datetime import datetime, timezone

import src.db.client as _db_client


async def create_post(
    slug: str,
    title: str,
    meta_description: str,
    target_keyword: str,
    secondary_keywords: list[str] | None = None,
    content_markdown: str = "",
    content_html: str = "",
    outline: list[str] | None = None,
    word_count: int = 0,
    seo_notes: list[str] | None = None,
    cluster_slug: str = "",
    content_type: str = "supporting",
    pillar_post_id: str | None = None,
    schema_type: str = "Article",
) -> str | None:
    """Create a new blog post as draft. Returns post id."""
    client = _db_client._get_client()
    if not client:
        return None

    row = {
        "slug": slug,
        "title": title,
        "meta_description": meta_description,
        "target_keyword": target_keyword,
        "secondary_keywords": secondary_keywords or [],
        "content_markdown": content_markdown,
        "content_html": content_html,
        "outline": outline or [],
        "word_count": word_count,
        "seo_notes": seo_notes or [],
        "cluster_slug": cluster_slug,
        "content_type": content_type,
        "schema_type": schema_type,
        "status": "draft",
        "canonical_url": f"https://tryseo.ai/blog/{slug}",
        "og_image_url": "",
    }
    if pillar_post_id:
        row["pillar_post_id"] = pillar_post_id

    resp = client.table("blog_posts").insert(row).execute()
    if resp.data and len(resp.data) > 0:
        return resp.data[0].get("id")
    return None


async def update_post(post_id: str, **fields) -> bool:
    """Update a blog post by id."""
    client = _db_client._get_client()
    if not client:
        return False

    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    client.table("blog_posts").update(fields).eq("id", post_id).execute()
    return True


async def publish_post(post_id: str) -> bool:
    """Publish a draft post."""
    client = _db_client._get_client()
    if not client:
        return False

    now = datetime.now(timezone.utc).isoformat()
    client.table("blog_posts").update({
        "status": "published",
        "published_at": now,
        "updated_at": now,
    }).eq("id", post_id).execute()
    return True


async def unpublish_post(post_id: str) -> bool:
    """Revert a post to draft."""
    client = _db_client._get_client()
    if not client:
        return False

    client.table("blog_posts").update({
        "status": "draft",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", post_id).execute()
    return True


async def get_post_by_slug(slug: str) -> dict | None:
    """Get a single published post by slug."""
    client = _db_client._get_client()
    if not client:
        return None

    resp = (
        client.table("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    return None


async def get_post_by_id(post_id: str) -> dict | None:
    """Get a post by id (any status)."""
    client = _db_client._get_client()
    if not client:
        return None

    resp = (
        client.table("blog_posts")
        .select("*")
        .eq("id", post_id)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    return None


async def list_published_posts(cluster_slug: str | None = None, limit: int = 50) -> list[dict]:
    """List published posts, optionally filtered by cluster."""
    client = _db_client._get_client()
    if not client:
        return []

    query = (
        client.table("blog_posts")
        .select("id,slug,title,meta_description,target_keyword,cluster_slug,content_type,published_at,updated_at,word_count,schema_type")
        .eq("status", "published")
        .order("published_at", desc=True)
        .limit(limit)
    )
    if cluster_slug:
        query = query.eq("cluster_slug", cluster_slug)

    resp = query.execute()
    return resp.data or []


async def list_all_posts(limit: int = 100) -> list[dict]:
    """List all posts including drafts (for admin)."""
    client = _db_client._get_client()
    if not client:
        return []

    resp = (
        client.table("blog_posts")
        .select("id,slug,title,meta_description,cluster_slug,content_type,status,published_at,updated_at,word_count")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


async def get_cluster_posts(cluster_slug: str) -> list[dict]:
    """Get pillar + supporting posts for a cluster."""
    client = _db_client._get_client()
    if not client:
        return []

    resp = (
        client.table("blog_posts")
        .select("id,slug,title,meta_description,content_type,status,published_at")
        .eq("cluster_slug", cluster_slug)
        .eq("status", "published")
        .order("content_type", desc=True)  # pillar first
        .execute()
    )
    return resp.data or []


async def get_related_posts(post_id: str, limit: int = 5) -> list[dict]:
    """Get related posts from the same cluster."""
    post = await get_post_by_id(post_id)
    if not post or not post.get("cluster_slug"):
        return []

    client = _db_client._get_client()
    if not client:
        return []

    resp = (
        client.table("blog_posts")
        .select("id,slug,title,meta_description,content_type")
        .eq("cluster_slug", post["cluster_slug"])
        .eq("status", "published")
        .neq("id", post_id)
        .limit(limit)
        .execute()
    )
    return resp.data or []


async def get_all_published_slugs() -> list[dict]:
    """Get all published post slugs with dates (for sitemap generation)."""
    client = _db_client._get_client()
    if not client:
        return []

    resp = (
        client.table("blog_posts")
        .select("slug,content_type,published_at,updated_at")
        .eq("status", "published")
        .order("published_at", desc=True)
        .execute()
    )
    return resp.data or []


async def save_internal_link(source_post_id: str, target_post_id: str, anchor_text: str, link_context: str = "") -> str | None:
    """Record an internal link between two posts."""
    client = _db_client._get_client()
    if not client:
        return None

    resp = client.table("internal_links").insert({
        "source_post_id": source_post_id,
        "target_post_id": target_post_id,
        "anchor_text": anchor_text,
        "link_context": link_context,
    }).execute()
    if resp.data and len(resp.data) > 0:
        return resp.data[0].get("id")
    return None


async def get_internal_links(post_id: str) -> list[dict]:
    """Get all internal links from a post."""
    client = _db_client._get_client()
    if not client:
        return []

    resp = (
        client.table("internal_links")
        .select("*")
        .eq("source_post_id", post_id)
        .execute()
    )
    return resp.data or []
