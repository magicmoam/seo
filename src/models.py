from __future__ import annotations

from pydantic import BaseModel


class KeywordMetric(BaseModel):
    keyword: str
    search_volume: str  # estimated from SERP context
    difficulty: str  # low / medium / high
    intent: str  # informational / commercial / transactional / navigational
    cpc_estimate: str
    notes: str = ""


class KeywordResearchResult(BaseModel):
    seed_keyword: str
    keywords: list[KeywordMetric]
    long_tail_suggestions: list[str]
    summary: str


class CompetitorPage(BaseModel):
    url: str
    title: str
    strengths: list[str]
    weaknesses: list[str]
    content_type: str  # blog, product page, landing page, etc.
    estimated_word_count: str


class CompetitorAnalysisResult(BaseModel):
    query: str
    competitors: list[CompetitorPage]
    common_themes: list[str]
    opportunities: list[str]
    summary: str


class SERPEntry(BaseModel):
    position: int
    url: str
    title: str
    snippet: str
    content_type: str


class SERPAnalysisResult(BaseModel):
    query: str
    entries: list[SERPEntry]
    serp_features: list[str]  # featured snippets, PAA, video, etc.
    dominant_intent: str
    summary: str


class ContentGap(BaseModel):
    topic: str
    gap_type: str  # missing topic, thin content, outdated, no EEAT
    opportunity_score: str  # low / medium / high
    suggested_angle: str


class ContentGapResult(BaseModel):
    query: str
    gaps: list[ContentGap]
    underserved_subtopics: list[str]
    summary: str


class GeneratedContent(BaseModel):
    title: str
    meta_description: str
    target_keyword: str
    secondary_keywords: list[str]
    outline: list[str]
    content: str
    word_count: int
    seo_notes: list[str]


class SEOIssue(BaseModel):
    issue: str
    severity: str  # critical / warning / info
    description: str
    recommendation: str


class WebsiteAnalysisResult(BaseModel):
    url: str
    page_title: str
    meta_description: str
    overall_score: int  # 0-100
    performance_score: str  # poor / fair / good / excellent
    seo_score: str
    content_score: str
    technical_score: str
    word_count: int
    internal_links: int
    external_links: int
    heading_structure: list[str]  # e.g. ["H1: Main Title", "H2: Section"]
    issues: list[SEOIssue]
    schema_markup: list[str]
    summary: str


# ---------------------------------------------------------------------------
# Multi-Agent SEO Strategy Models
# ---------------------------------------------------------------------------


class TopicalCluster(BaseModel):
    """A content cluster within a topical authority map."""
    cluster_name: str
    pillar_page: str  # title/topic for the pillar page
    pillar_keyword: str
    pillar_search_volume: str
    supporting_pages: list[str]  # titles for cluster content
    supporting_keywords: list[str]
    internal_linking_notes: str


class TopicalAuthorityMap(BaseModel):
    """Complete topical authority architecture for a domain."""
    domain: str
    niche: str
    clusters: list[TopicalCluster]
    content_hierarchy: list[str]  # silo structure description
    interlinking_strategy: str
    estimated_total_pages: int
    summary: str


class CalendarEntry(BaseModel):
    """A single content piece in the publishing calendar."""
    week: int  # week number (1-based)
    title: str
    target_keyword: str
    content_type: str  # pillar | cluster | supporting | linkbait
    priority: str  # critical | high | medium | low
    cluster: str  # which topical cluster this belongs to
    estimated_word_count: int
    estimated_cost_usd: float  # content production cost estimate
    notes: str = ""


class ContentCalendar(BaseModel):
    """A prioritized content publishing calendar."""
    domain: str
    total_weeks: int
    publishing_frequency: str  # e.g. "3 articles per week"
    entries: list[CalendarEntry]
    seasonal_notes: list[str]
    total_estimated_cost_usd: float
    summary: str


class TechnicalFix(BaseModel):
    """A specific technical SEO fix to implement."""
    category: str  # core_web_vitals | schema | crawlability | indexation | mobile | security | speed
    issue: str
    impact: str  # critical | high | medium | low
    current_state: str
    recommendation: str
    implementation_notes: str
    estimated_effort: str  # e.g. "2 hours developer time"


class SchemaRecommendation(BaseModel):
    """A schema markup recommendation with JSON-LD."""
    schema_type: str  # Article, FAQ, HowTo, Product, LocalBusiness, etc.
    description: str
    json_ld_example: str  # actual JSON-LD code


class TechnicalSEOAudit(BaseModel):
    """Comprehensive technical SEO audit with actionable fixes."""
    url: str
    fixes: list[TechnicalFix]
    schema_recommendations: list[SchemaRecommendation]
    core_web_vitals_notes: list[str]
    crawl_budget_notes: str
    mobile_readiness: str  # poor | fair | good | excellent
    site_speed_notes: list[str]
    priority_actions: list[str]  # top 5 things to do first
    estimated_total_effort: str
    summary: str


class BacklinkOpportunity(BaseModel):
    """A single backlink acquisition opportunity."""
    strategy: str  # guest_post | resource_link | broken_link | digital_pr | skyscraper | haro | niche_edit
    target_description: str
    outreach_angle: str
    difficulty: str  # easy | medium | hard
    estimated_domain_authority_range: str
    estimated_cost_usd: float  # cost per link acquisition
    notes: str = ""


class LinkableAsset(BaseModel):
    """Content designed specifically to attract backlinks."""
    asset_type: str  # original_research | infographic | tool | template | ultimate_guide | data_study
    title: str
    description: str
    target_keywords: list[str]
    estimated_links_potential: str  # low | medium | high
    estimated_production_cost_usd: float


class BacklinkStrategy(BaseModel):
    """Complete off-page SEO and link building strategy."""
    domain: str
    opportunities: list[BacklinkOpportunity]
    linkable_assets: list[LinkableAsset]
    competitor_link_insights: list[str]
    monthly_link_target: int
    estimated_monthly_cost_usd: float
    priority_actions: list[str]
    summary: str


class CostBreakdown(BaseModel):
    """Estimated costs for a strategy component."""
    category: str
    description: str
    monthly_cost_usd: float
    one_time_cost_usd: float
    notes: str = ""


class AgentAction(BaseModel):
    """A specific action from the multi-agent strategy."""
    agent: str  # which agent recommended this
    action: str
    priority: str  # critical | high | medium | low
    timeline: str  # immediate | week_1 | month_1 | month_2_3 | ongoing
    expected_impact: str
    estimated_cost_usd: float


class SEOStrategy(BaseModel):
    """Master SEO strategy synthesizing all agent outputs."""
    domain: str
    overall_health_score: int  # 0-100
    executive_summary: str
    priority_actions: list[AgentAction]
    topical_authority: TopicalAuthorityMap
    content_calendar: ContentCalendar
    technical_audit: TechnicalSEOAudit
    backlink_strategy: BacklinkStrategy
    cost_breakdown: list[CostBreakdown]
    total_monthly_investment_usd: float
    total_setup_cost_usd: float
    expected_timeline_to_results: str
    roi_projection: str
    risk_factors: list[str]


class AgentResponse(BaseModel):
    tool_used: str
    query: str
    result: (
        KeywordResearchResult
        | CompetitorAnalysisResult
        | SERPAnalysisResult
        | ContentGapResult
        | GeneratedContent
        | WebsiteAnalysisResult
        | TopicalAuthorityMap
        | ContentCalendar
        | TechnicalSEOAudit
        | BacklinkStrategy
        | SEOStrategy
    )
    raw_sources: list[str] = []
