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


class AgentResponse(BaseModel):
    tool_used: str
    query: str
    result: (
        KeywordResearchResult
        | CompetitorAnalysisResult
        | SERPAnalysisResult
        | ContentGapResult
        | GeneratedContent
    )
    raw_sources: list[str] = []
