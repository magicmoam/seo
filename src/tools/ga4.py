"""GA4 Analytics tool — pulls traffic data from Google Analytics Data API v1beta."""

from __future__ import annotations

import base64
import json

from src.config import config
from src.models import (
    EvidenceTrace,
    GA4ChannelData,
    GA4CountryData,
    GA4Report,
    GA4TopPage,
    GA4TrafficOverview,
)


def _get_ga4_client():
    """Create GA4 BetaAnalyticsData client using service account credentials."""
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.oauth2 import service_account

    creds_json = config.ga4_credentials_json
    if not creds_json:
        raise ValueError("GA4_CREDENTIALS_JSON env var is not set")

    # Support both raw JSON and base64-encoded JSON
    try:
        creds_dict = json.loads(creds_json)
    except json.JSONDecodeError:
        creds_dict = json.loads(base64.b64decode(creds_json))

    credentials = service_account.Credentials.from_service_account_info(
        creds_dict,
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )
    return BetaAnalyticsDataClient(credentials=credentials)


def _format_duration(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m}m {s}s" if m else f"{s}s"


async def run(property_id: str, date_range: str = "last_30_days") -> tuple[GA4Report, dict, EvidenceTrace]:
    """Fetch GA4 analytics data for a property.

    Args:
        property_id: GA4 property ID (e.g. "properties/123456789")
        date_range: "last_7_days", "last_30_days", or "last_90_days"
    """
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )

    client = _get_ga4_client()

    # Normalize property_id
    if not property_id.startswith("properties/"):
        property_id = f"properties/{property_id}"

    # Map date range string to API format
    date_map = {
        "last_7_days": ("7daysAgo", "today"),
        "last_30_days": ("30daysAgo", "today"),
        "last_90_days": ("90daysAgo", "today"),
    }
    start, end = date_map.get(date_range, ("30daysAgo", "today"))
    dr = DateRange(start_date=start, end_date=end)

    # 1. Overview metrics
    overview_req = RunReportRequest(
        property=property_id,
        date_ranges=[dr],
        metrics=[
            Metric(name="totalUsers"),
            Metric(name="newUsers"),
            Metric(name="sessions"),
            Metric(name="screenPageViews"),
            Metric(name="averageSessionDuration"),
            Metric(name="bounceRate"),
        ],
    )
    overview_resp = client.run_report(overview_req)
    row = overview_resp.rows[0] if overview_resp.rows else None
    overview = GA4TrafficOverview(
        total_users=int(row.metric_values[0].value) if row else 0,
        new_users=int(row.metric_values[1].value) if row else 0,
        sessions=int(row.metric_values[2].value) if row else 0,
        pageviews=int(row.metric_values[3].value) if row else 0,
        avg_session_duration=_format_duration(float(row.metric_values[4].value)) if row else "0s",
        bounce_rate=f"{float(row.metric_values[5].value) * 100:.1f}%" if row else "0%",
        period=date_range,
    )

    # 2. Traffic by channel
    channel_req = RunReportRequest(
        property=property_id,
        date_ranges=[dr],
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        metrics=[
            Metric(name="totalUsers"),
            Metric(name="sessions"),
        ],
        limit=10,
    )
    channel_resp = client.run_report(channel_req)
    total_users = overview.total_users or 1
    channels = []
    for r in channel_resp.rows:
        users = int(r.metric_values[0].value)
        channels.append(GA4ChannelData(
            channel=r.dimension_values[0].value,
            users=users,
            sessions=int(r.metric_values[1].value),
            percentage=round(users / total_users * 100, 1),
        ))

    # 3. Top pages
    pages_req = RunReportRequest(
        property=property_id,
        date_ranges=[dr],
        dimensions=[
            Dimension(name="pagePath"),
            Dimension(name="pageTitle"),
        ],
        metrics=[
            Metric(name="screenPageViews"),
            Metric(name="averageSessionDuration"),
            Metric(name="bounceRate"),
        ],
        limit=20,
    )
    pages_resp = client.run_report(pages_req)
    top_pages = []
    for r in pages_resp.rows:
        top_pages.append(GA4TopPage(
            page_path=r.dimension_values[0].value,
            page_title=r.dimension_values[1].value,
            pageviews=int(r.metric_values[0].value),
            avg_time_on_page=_format_duration(float(r.metric_values[1].value)),
            bounce_rate=f"{float(r.metric_values[2].value) * 100:.1f}%",
        ))

    # 4. Top countries
    country_req = RunReportRequest(
        property=property_id,
        date_ranges=[dr],
        dimensions=[Dimension(name="country")],
        metrics=[
            Metric(name="totalUsers"),
            Metric(name="sessions"),
        ],
        limit=15,
    )
    country_resp = client.run_report(country_req)
    countries = []
    for r in country_resp.rows:
        countries.append(GA4CountryData(
            country=r.dimension_values[0].value,
            users=int(r.metric_values[0].value),
            sessions=int(r.metric_values[1].value),
        ))

    # 5. Daily users trend
    daily_req = RunReportRequest(
        property=property_id,
        date_ranges=[dr],
        dimensions=[Dimension(name="date")],
        metrics=[Metric(name="totalUsers")],
    )
    daily_resp = client.run_report(daily_req)
    daily_users = []
    for r in daily_resp.rows:
        raw = r.dimension_values[0].value  # YYYYMMDD
        formatted = f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
        daily_users.append({"date": formatted, "users": int(r.metric_values[0].value)})
    daily_users.sort(key=lambda x: x["date"])

    # Build insights
    insights = []
    if channels:
        top_channel = max(channels, key=lambda c: c.users)
        insights.append(f"Top traffic source: {top_channel.channel} ({top_channel.percentage}% of users)")
    if overview.total_users > 0:
        returning = overview.total_users - overview.new_users
        pct = round(returning / overview.total_users * 100, 1)
        insights.append(f"Returning visitors: {pct}% ({returning} users)")
    if top_pages:
        insights.append(f"Most visited page: {top_pages[0].page_path} ({top_pages[0].pageviews} views)")

    report = GA4Report(
        property_id=property_id,
        date_range=date_range,
        overview=overview,
        channels=channels,
        top_pages=top_pages,
        countries=countries,
        daily_users=daily_users,
        insights=insights,
    )

    usage = {"input_tokens": 0, "output_tokens": 0, "model": "ga4_api", "jina_searches": 0, "jina_scrapes": 0}
    trace = EvidenceTrace(tool_used="ga4_analytics", query=property_id)

    return report, usage, trace
