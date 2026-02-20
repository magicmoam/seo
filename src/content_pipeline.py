"""Content pipeline — orchestrates content creation using existing tools.

Generates articles via content_generator, converts markdown to HTML,
stores in Supabase as drafts, and injects internal links on publish.
"""

from __future__ import annotations

import re
import json
from html import escape as html_escape

import markdown

from src.db.blog import (
    create_post,
    get_all_published_slugs,
    get_post_by_id,
    get_post_by_slug,
    list_published_posts,
    save_internal_link,
    update_post,
)


def _slugify(text: str) -> str:
    """Convert text to a URL-friendly slug."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def _md_to_html(md_content: str) -> str:
    """Convert markdown to HTML with useful extensions."""
    return markdown.markdown(
        md_content,
        extensions=["extra", "toc", "sane_lists"],
        output_format="html",
    )


async def generate_and_store_article(
    keyword: str,
    content_type: str = "blog post",
    cluster_slug: str = "",
    post_content_type: str = "supporting",
    pillar_post_id: str | None = None,
    tone: str = "professional",
) -> str | None:
    """Generate an article using content_generator and store as draft.

    Returns the post ID on success.
    """
    from src.tools.content_generator import run as generate_content

    result, usage, trace = await generate_content(keyword, content_type, tone)

    slug = _slugify(result.title)
    content_html = _md_to_html(result.content)

    post_id = await create_post(
        slug=slug,
        title=result.title,
        meta_description=result.meta_description,
        target_keyword=result.target_keyword,
        secondary_keywords=result.secondary_keywords,
        content_markdown=result.content,
        content_html=content_html,
        outline=result.outline,
        word_count=result.word_count,
        seo_notes=result.seo_notes,
        cluster_slug=cluster_slug,
        content_type=post_content_type,
        pillar_post_id=pillar_post_id,
    )

    return post_id


async def inject_internal_links(post_id: str) -> int:
    """Scan a post's content for keyword matches against other published posts.

    Inserts <a> tags for the first occurrence of each matching keyword.
    Returns the number of links injected.
    """
    post = await get_post_by_id(post_id)
    if not post:
        return 0

    content_html = post.get("content_html", "")
    if not content_html:
        return 0

    # Get all other published posts
    published = await list_published_posts(limit=200)
    links_added = 0

    for other in published:
        if other["id"] == post_id:
            continue

        target_keyword = other.get("target_keyword", "")
        title = other.get("title", "")
        slug = other.get("slug", "")

        if not target_keyword or not slug:
            continue

        # Check if keyword appears in content (case-insensitive, word boundary)
        pattern = re.compile(
            r"(?<![<\w/])(" + re.escape(target_keyword) + r")(?![^<]*>)",
            re.IGNORECASE,
        )

        if pattern.search(content_html):
            link_tag = f'<a href="/blog/{html_escape(slug)}" title="{html_escape(title)}">'
            # Replace only the first occurrence
            content_html = pattern.sub(
                link_tag + r"\1</a>",
                content_html,
                count=1,
            )
            links_added += 1

            # Record the link
            await save_internal_link(
                source_post_id=post_id,
                target_post_id=other["id"],
                anchor_text=target_keyword,
            )

    if links_added > 0:
        await update_post(post_id, content_html=content_html)

    return links_added


async def generate_cluster(
    cluster_name: str,
    pillar_keyword: str,
    supporting_keywords: list[str],
    tone: str = "professional",
) -> dict:
    """Generate a full content cluster: 1 pillar + N supporting articles.

    All articles are saved as drafts. Returns summary with post IDs.
    """
    cluster_slug = _slugify(cluster_name)

    # Generate pillar article
    pillar_id = await generate_and_store_article(
        keyword=pillar_keyword,
        content_type="comprehensive pillar guide",
        cluster_slug=cluster_slug,
        post_content_type="pillar",
        tone=tone,
    )

    supporting_ids = []
    for kw in supporting_keywords:
        sid = await generate_and_store_article(
            keyword=kw,
            content_type="blog post",
            cluster_slug=cluster_slug,
            post_content_type="supporting",
            pillar_post_id=pillar_id,
            tone=tone,
        )
        supporting_ids.append({"keyword": kw, "post_id": sid})

    return {
        "cluster_slug": cluster_slug,
        "pillar_keyword": pillar_keyword,
        "pillar_post_id": pillar_id,
        "supporting_articles": supporting_ids,
        "total_articles": 1 + len(supporting_ids),
    }
