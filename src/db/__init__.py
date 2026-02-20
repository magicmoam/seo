"""Database package — re-exports all public symbols for backwards compatibility.

All existing ``from src.db import X`` statements continue to work unchanged.
"""

from src.db.client import PRICING, _get_client, calculate_cost
from src.db.ga4 import (
    delete_ga4_connection,
    get_ga4_connection,
    refresh_ga4_access_token,
    save_ga4_connection,
    update_ga4_access_token,
    update_ga4_property,
)
from src.db.history import (
    get_evidence,
    get_history,
    get_usage_stats,
    save_evidence,
    save_search,
    save_usage,
)
from src.db.tracking import (
    get_all_active_tracked_urls,
    get_audit_snapshots,
    get_score_trends,
    get_tracked_urls,
    remove_tracked_url,
    save_audit_snapshot,
    save_tracked_url,
)
from src.db.blog import (
    create_post,
    get_all_published_slugs,
    get_cluster_posts,
    get_internal_links,
    get_post_by_id,
    get_post_by_slug,
    get_related_posts,
    list_all_posts,
    list_published_posts,
    publish_post,
    save_internal_link,
    unpublish_post,
    update_post,
)
from src.db.users import (
    count_pro_users,
    count_users,
    deduct_credits,
    get_or_create_user,
    get_queries_today,
    get_user,
    get_user_by_stripe_customer,
    list_all_users,
    reset_credits,
    update_user_tier,
)

__all__ = [
    # client
    "PRICING", "_get_client", "calculate_cost",
    # users
    "get_or_create_user", "get_user", "get_user_by_stripe_customer",
    "update_user_tier", "deduct_credits", "reset_credits",
    "list_all_users", "count_users", "count_pro_users", "get_queries_today",
    # history
    "save_search", "save_evidence", "get_evidence", "save_usage",
    "get_usage_stats", "get_history",
    # tracking
    "save_tracked_url", "get_tracked_urls", "get_all_active_tracked_urls",
    "remove_tracked_url", "save_audit_snapshot", "get_audit_snapshots",
    "get_score_trends",
    # ga4
    "save_ga4_connection", "get_ga4_connection", "update_ga4_property",
    "update_ga4_access_token", "delete_ga4_connection", "refresh_ga4_access_token",
    # blog
    "create_post", "update_post", "publish_post", "unpublish_post",
    "get_post_by_slug", "get_post_by_id", "list_published_posts", "list_all_posts",
    "get_cluster_posts", "get_related_posts", "get_all_published_slugs",
    "save_internal_link", "get_internal_links",
]
