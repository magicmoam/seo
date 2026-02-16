"""Interactive CLI for Wongzo."""

from __future__ import annotations

import asyncio
import json
import sys

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from src.agent import run
from src.config import config
from src.models import (
    BacklinkStrategy,
    CompetitorAnalysisResult,
    ContentCalendar,
    ContentGapResult,
    GeneratedContent,
    KeywordResearchResult,
    SEOStrategy,
    SERPAnalysisResult,
    TechnicalSEOAudit,
    TopicalAuthorityMap,
)

console = Console()


def display_keyword_research(result: KeywordResearchResult) -> None:
    table = Table(title=f"Keyword Research: {result.seed_keyword}", show_lines=True)
    table.add_column("Keyword", style="cyan", min_width=25)
    table.add_column("Volume", style="green")
    table.add_column("Difficulty", style="yellow")
    table.add_column("Intent", style="magenta")
    table.add_column("CPC", style="blue")
    table.add_column("Notes", style="dim", max_width=30)

    for kw in result.keywords:
        diff_style = {"low": "green", "medium": "yellow", "high": "red"}.get(
            kw.difficulty.lower(), "white"
        )
        table.add_row(
            kw.keyword,
            kw.search_volume,
            Text(kw.difficulty, style=diff_style),
            kw.intent,
            kw.cpc_estimate,
            kw.notes,
        )

    console.print(table)
    console.print()
    console.print(
        Panel(
            "\n".join(f"  - {lt}" for lt in result.long_tail_suggestions),
            title="Long-tail suggestions",
            border_style="cyan",
        )
    )
    console.print(Panel(result.summary, title="Summary", border_style="green"))


def display_competitor_analysis(result: CompetitorAnalysisResult) -> None:
    for comp in result.competitors:
        console.print(
            Panel(
                f"[bold]{comp.title}[/bold]\n"
                f"[dim]{comp.url}[/dim]\n"
                f"Type: {comp.content_type} | ~{comp.estimated_word_count} words\n\n"
                f"[green]Strengths:[/green]\n"
                + "\n".join(f"  + {s}" for s in comp.strengths)
                + "\n\n[red]Weaknesses:[/red]\n"
                + "\n".join(f"  - {w}" for w in comp.weaknesses),
                border_style="blue",
            )
        )

    console.print(
        Panel(
            "[bold]Common themes:[/bold]\n"
            + "\n".join(f"  - {t}" for t in result.common_themes)
            + "\n\n[bold green]Opportunities:[/bold green]\n"
            + "\n".join(f"  * {o}" for o in result.opportunities),
            title="Analysis",
            border_style="green",
        )
    )
    console.print(Panel(result.summary, title="Summary", border_style="green"))


def display_serp_analysis(result: SERPAnalysisResult) -> None:
    table = Table(title=f"SERP Analysis: {result.query}", show_lines=True)
    table.add_column("#", style="bold", width=3)
    table.add_column("Title", style="cyan", min_width=30)
    table.add_column("Type", style="magenta")
    table.add_column("URL", style="dim", max_width=40)

    for entry in result.entries:
        table.add_row(
            str(entry.position), entry.title, entry.content_type, entry.url
        )

    console.print(table)
    console.print(
        Panel(
            f"[bold]Dominant intent:[/bold] {result.dominant_intent}\n\n"
            f"[bold]SERP features:[/bold]\n"
            + "\n".join(f"  - {f}" for f in result.serp_features),
            title="SERP Features",
            border_style="yellow",
        )
    )
    console.print(Panel(result.summary, title="Summary", border_style="green"))


def display_content_gap(result: ContentGapResult) -> None:
    table = Table(title=f"Content Gaps: {result.query}", show_lines=True)
    table.add_column("Topic", style="cyan", min_width=25)
    table.add_column("Gap Type", style="yellow")
    table.add_column("Opportunity", style="green")
    table.add_column("Suggested Angle", style="white", max_width=35)

    for gap in result.gaps:
        score_style = {"low": "dim", "medium": "yellow", "high": "bold green"}.get(
            gap.opportunity_score.lower(), "white"
        )
        table.add_row(
            gap.topic,
            gap.gap_type,
            Text(gap.opportunity_score, style=score_style),
            gap.suggested_angle,
        )

    console.print(table)
    console.print(
        Panel(
            "\n".join(f"  - {s}" for s in result.underserved_subtopics),
            title="Underserved Subtopics",
            border_style="cyan",
        )
    )
    console.print(Panel(result.summary, title="Summary", border_style="green"))


def display_content(result: GeneratedContent) -> None:
    console.print(
        Panel(
            f"[bold]{result.title}[/bold]\n"
            f"[dim]{result.meta_description}[/dim]\n\n"
            f"Target: [cyan]{result.target_keyword}[/cyan]\n"
            f"Secondary: {', '.join(result.secondary_keywords)}\n"
            f"Words: {result.word_count}",
            title="Content Meta",
            border_style="blue",
        )
    )
    console.print(
        Panel(
            "\n".join(f"  {h}" for h in result.outline),
            title="Outline",
            border_style="cyan",
        )
    )
    console.print(Markdown(result.content))
    console.print(
        Panel(
            "\n".join(f"  - {n}" for n in result.seo_notes),
            title="SEO Notes",
            border_style="yellow",
        )
    )


# ---------------------------------------------------------------------------
# Multi-Agent Display Functions
# ---------------------------------------------------------------------------


def display_topical_authority(result: TopicalAuthorityMap) -> None:
    console.print(
        Panel(
            f"[bold cyan]Topical Authority Map[/bold cyan]\n"
            f"Domain: [green]{result.domain}[/green]\n"
            f"Niche: {result.niche}\n"
            f"Total clusters: {len(result.clusters)}\n"
            f"Estimated total pages: [bold]{result.estimated_total_pages}[/bold]",
            border_style="cyan",
        )
    )

    for i, cluster in enumerate(result.clusters, 1):
        supporting_list = "\n".join(
            f"    [dim]{j}.[/dim] {page} [dim]({kw})[/dim]"
            for j, (page, kw) in enumerate(
                zip(cluster.supporting_pages, cluster.supporting_keywords), 1
            )
        )
        console.print(
            Panel(
                f"[bold yellow]Pillar:[/bold yellow] {cluster.pillar_page}\n"
                f"[bold]Keyword:[/bold] [cyan]{cluster.pillar_keyword}[/cyan] "
                f"(Volume: {cluster.pillar_search_volume})\n\n"
                f"[bold green]Supporting Content ({len(cluster.supporting_pages)} pages):[/bold green]\n"
                f"{supporting_list}\n\n"
                f"[bold]Internal Linking:[/bold] {cluster.internal_linking_notes}",
                title=f"Cluster {i}: {cluster.cluster_name}",
                border_style="blue",
            )
        )

    console.print(
        Panel(
            "[bold]Content Hierarchy:[/bold]\n"
            + "\n".join(f"  {h}" for h in result.content_hierarchy)
            + f"\n\n[bold]Interlinking Strategy:[/bold]\n  {result.interlinking_strategy}",
            title="Architecture",
            border_style="magenta",
        )
    )
    console.print(Panel(result.summary, title="Summary", border_style="green"))


def display_content_calendar(result: ContentCalendar) -> None:
    console.print(
        Panel(
            f"[bold cyan]Content Calendar[/bold cyan]\n"
            f"Domain: [green]{result.domain}[/green]\n"
            f"Duration: {result.total_weeks} weeks\n"
            f"Frequency: {result.publishing_frequency}\n"
            f"Total estimated cost: [bold yellow]${result.total_estimated_cost_usd:,.2f}[/bold yellow]",
            border_style="cyan",
        )
    )

    table = Table(title="Publishing Schedule", show_lines=True)
    table.add_column("Week", style="bold", width=5)
    table.add_column("Title", style="cyan", min_width=30)
    table.add_column("Keyword", style="green")
    table.add_column("Type", style="magenta")
    table.add_column("Priority", style="yellow")
    table.add_column("Cluster", style="blue")
    table.add_column("Words", style="dim", justify="right")
    table.add_column("Cost", style="bold yellow", justify="right")

    for entry in result.entries:
        priority_style = {
            "critical": "bold red",
            "high": "bold yellow",
            "medium": "yellow",
            "low": "dim",
        }.get(entry.priority.lower(), "white")
        type_style = {
            "pillar": "bold magenta",
            "cluster": "magenta",
            "supporting": "dim magenta",
            "linkbait": "bold cyan",
        }.get(entry.content_type.lower(), "white")
        table.add_row(
            str(entry.week),
            entry.title,
            entry.target_keyword,
            Text(entry.content_type, style=type_style),
            Text(entry.priority, style=priority_style),
            entry.cluster,
            str(entry.estimated_word_count),
            f"${entry.estimated_cost_usd:.0f}",
        )

    console.print(table)

    if result.seasonal_notes:
        console.print(
            Panel(
                "\n".join(f"  - {n}" for n in result.seasonal_notes),
                title="Seasonal Notes",
                border_style="yellow",
            )
        )
    console.print(Panel(result.summary, title="Summary", border_style="green"))


def display_technical_seo(result: TechnicalSEOAudit) -> None:
    console.print(
        Panel(
            f"[bold cyan]Technical SEO Audit[/bold cyan]\n"
            f"URL: [green]{result.url}[/green]\n"
            f"Mobile readiness: {result.mobile_readiness}\n"
            f"Total effort: {result.estimated_total_effort}",
            border_style="cyan",
        )
    )

    # Priority actions
    console.print(
        Panel(
            "\n".join(f"  [bold]{i}.[/bold] {a}" for i, a in enumerate(result.priority_actions, 1)),
            title="Priority Actions (Top 5)",
            border_style="red",
        )
    )

    # Technical fixes table
    table = Table(title="Technical Fixes", show_lines=True)
    table.add_column("Category", style="magenta")
    table.add_column("Issue", style="cyan", min_width=20)
    table.add_column("Impact", style="yellow")
    table.add_column("Current State", style="dim", max_width=30)
    table.add_column("Recommendation", style="green", max_width=35)
    table.add_column("Effort", style="blue")

    for fix in result.fixes:
        impact_style = {
            "critical": "bold red",
            "high": "bold yellow",
            "medium": "yellow",
            "low": "dim",
        }.get(fix.impact.lower(), "white")
        table.add_row(
            fix.category,
            fix.issue,
            Text(fix.impact, style=impact_style),
            fix.current_state,
            fix.recommendation,
            fix.estimated_effort,
        )

    console.print(table)

    # Schema recommendations
    if result.schema_recommendations:
        for schema in result.schema_recommendations:
            console.print(
                Panel(
                    f"[bold]Type:[/bold] {schema.schema_type}\n"
                    f"[bold]Why:[/bold] {schema.description}\n\n"
                    f"[bold]JSON-LD:[/bold]\n{schema.json_ld_example}",
                    title=f"Schema: {schema.schema_type}",
                    border_style="blue",
                )
            )

    # Core Web Vitals
    if result.core_web_vitals_notes:
        console.print(
            Panel(
                "\n".join(f"  - {n}" for n in result.core_web_vitals_notes),
                title="Core Web Vitals",
                border_style="yellow",
            )
        )

    # Speed notes
    if result.site_speed_notes:
        console.print(
            Panel(
                "\n".join(f"  - {n}" for n in result.site_speed_notes),
                title="Speed Optimization",
                border_style="magenta",
            )
        )

    console.print(Panel(result.summary, title="Summary", border_style="green"))


def display_backlink_strategy(result: BacklinkStrategy) -> None:
    console.print(
        Panel(
            f"[bold cyan]Backlink Strategy[/bold cyan]\n"
            f"Domain: [green]{result.domain}[/green]\n"
            f"Monthly link target: [bold]{result.monthly_link_target}[/bold]\n"
            f"Estimated monthly cost: [bold yellow]${result.estimated_monthly_cost_usd:,.2f}[/bold yellow]",
            border_style="cyan",
        )
    )

    # Priority actions
    console.print(
        Panel(
            "\n".join(f"  [bold]{i}.[/bold] {a}" for i, a in enumerate(result.priority_actions, 1)),
            title="Priority Actions",
            border_style="red",
        )
    )

    # Opportunities table
    table = Table(title="Link Building Opportunities", show_lines=True)
    table.add_column("Strategy", style="magenta")
    table.add_column("Target", style="cyan", min_width=25)
    table.add_column("Outreach Angle", style="green", max_width=30)
    table.add_column("Difficulty", style="yellow")
    table.add_column("DA Range", style="blue")
    table.add_column("Cost", style="bold yellow", justify="right")

    for opp in result.opportunities:
        diff_style = {"easy": "green", "medium": "yellow", "hard": "red"}.get(
            opp.difficulty.lower(), "white"
        )
        table.add_row(
            opp.strategy,
            opp.target_description,
            opp.outreach_angle,
            Text(opp.difficulty, style=diff_style),
            opp.estimated_domain_authority_range,
            f"${opp.estimated_cost_usd:.0f}",
        )

    console.print(table)

    # Linkable assets
    if result.linkable_assets:
        asset_table = Table(title="Linkable Assets to Create", show_lines=True)
        asset_table.add_column("Type", style="magenta")
        asset_table.add_column("Title", style="cyan", min_width=25)
        asset_table.add_column("Link Potential", style="green")
        asset_table.add_column("Production Cost", style="bold yellow", justify="right")

        for asset in result.linkable_assets:
            potential_style = {"low": "dim", "medium": "yellow", "high": "bold green"}.get(
                asset.estimated_links_potential.lower(), "white"
            )
            asset_table.add_row(
                asset.asset_type,
                asset.title,
                Text(asset.estimated_links_potential, style=potential_style),
                f"${asset.estimated_production_cost_usd:.0f}",
            )

        console.print(asset_table)

    # Competitor insights
    if result.competitor_link_insights:
        console.print(
            Panel(
                "\n".join(f"  - {i}" for i in result.competitor_link_insights),
                title="Competitor Link Insights",
                border_style="yellow",
            )
        )

    console.print(Panel(result.summary, title="Summary", border_style="green"))


def display_seo_strategy(result: SEOStrategy) -> None:
    """Display the full multi-agent SEO strategy."""
    # Executive summary header
    health_color = "red" if result.overall_health_score < 40 else (
        "yellow" if result.overall_health_score < 70 else "green"
    )
    console.print(
        Panel(
            f"[bold cyan]Multi-Agent SEO Strategy[/bold cyan]\n\n"
            f"Domain: [bold green]{result.domain}[/bold green]\n"
            f"Overall health score: [bold {health_color}]{result.overall_health_score}/100[/bold {health_color}]\n\n"
            f"[bold]Executive Summary:[/bold]\n{result.executive_summary}\n\n"
            f"[bold]Timeline to results:[/bold] {result.expected_timeline_to_results}\n"
            f"[bold]ROI projection:[/bold] {result.roi_projection}",
            title="SEO STRATEGY REPORT",
            border_style="bold cyan",
        )
    )

    # Cost overview
    cost_table = Table(title="Investment Overview", show_lines=True)
    cost_table.add_column("Category", style="cyan", min_width=20)
    cost_table.add_column("Description", style="white", max_width=40)
    cost_table.add_column("Monthly", style="bold yellow", justify="right")
    cost_table.add_column("One-time", style="bold green", justify="right")
    cost_table.add_column("Notes", style="dim", max_width=25)

    for cost in result.cost_breakdown:
        cost_table.add_row(
            cost.category,
            cost.description,
            f"${cost.monthly_cost_usd:,.2f}",
            f"${cost.one_time_cost_usd:,.2f}",
            cost.notes,
        )

    console.print(cost_table)
    console.print(
        Panel(
            f"[bold]Total monthly investment:[/bold] [bold yellow]${result.total_monthly_investment_usd:,.2f}/mo[/bold yellow]\n"
            f"[bold]Total setup cost:[/bold] [bold green]${result.total_setup_cost_usd:,.2f}[/bold green]",
            title="Total Investment",
            border_style="bold yellow",
        )
    )

    # Priority actions
    action_table = Table(title="Priority Actions (All Agents)", show_lines=True)
    action_table.add_column("#", style="bold", width=3)
    action_table.add_column("Agent", style="magenta")
    action_table.add_column("Action", style="cyan", min_width=30)
    action_table.add_column("Priority", style="yellow")
    action_table.add_column("Timeline", style="blue")
    action_table.add_column("Impact", style="green", max_width=30)
    action_table.add_column("Cost", style="bold yellow", justify="right")

    for i, action in enumerate(result.priority_actions, 1):
        priority_style = {
            "critical": "bold red",
            "high": "bold yellow",
            "medium": "yellow",
            "low": "dim",
        }.get(action.priority.lower(), "white")
        action_table.add_row(
            str(i),
            action.agent,
            action.action,
            Text(action.priority, style=priority_style),
            action.timeline,
            action.expected_impact,
            f"${action.estimated_cost_usd:.0f}",
        )

    console.print(action_table)

    # Display each sub-strategy
    console.print("\n[bold cyan]--- DETAILED AGENT REPORTS ---[/bold cyan]\n")

    console.print("[bold]1. TOPICAL AUTHORITY MAP[/bold]")
    display_topical_authority(result.topical_authority)

    console.print("\n[bold]2. CONTENT CALENDAR[/bold]")
    display_content_calendar(result.content_calendar)

    console.print("\n[bold]3. TECHNICAL SEO AUDIT[/bold]")
    display_technical_seo(result.technical_audit)

    console.print("\n[bold]4. BACKLINK STRATEGY[/bold]")
    display_backlink_strategy(result.backlink_strategy)

    # Risk factors
    if result.risk_factors:
        console.print(
            Panel(
                "\n".join(f"  - {r}" for r in result.risk_factors),
                title="Risk Factors",
                border_style="red",
            )
        )


DISPLAY_MAP = {
    "keyword_research": display_keyword_research,
    "competitor_analysis": display_competitor_analysis,
    "serp_analysis": display_serp_analysis,
    "content_gap": display_content_gap,
    "content_generation": display_content,
    "topical_authority": display_topical_authority,
    "content_calendar": display_content_calendar,
    "technical_seo": display_technical_seo,
    "backlink_strategy": display_backlink_strategy,
    "seo_strategy": display_seo_strategy,
}


async def interactive() -> None:
    console.print(
        Panel(
            "[bold cyan]Wongzo[/bold cyan] - Multi-Agent SEO Intelligence\n\n"
            "I can help you with:\n"
            "  1. [green]Keyword Research[/green] - Find high-value keywords\n"
            "  2. [green]Competitor Analysis[/green] - Analyze top-ranking pages\n"
            "  3. [green]SERP Analysis[/green] - Understand search result patterns\n"
            "  4. [green]Content Gap Analysis[/green] - Find untapped opportunities\n"
            "  5. [green]Content Generation[/green] - Create SEO-optimized articles\n"
            "  6. [green]Website Analyzer[/green] - Audit a specific page\n\n"
            "[bold yellow]Multi-Agent Tools:[/bold yellow]\n"
            "  7. [bold green]Topical Authority[/bold green] - Build content cluster architecture\n"
            "  8. [bold green]Content Calendar[/bold green] - Prioritized publishing schedule\n"
            "  9. [bold green]Technical SEO[/bold green] - Deep technical audit with schema\n"
            " 10. [bold green]Backlink Strategy[/bold green] - Link building plan with costs\n"
            " 11. [bold cyan]Full SEO Strategy[/bold cyan] - Deploy ALL agents for a comprehensive plan\n\n"
            "Just describe what you need in plain English.\n"
            'Type [bold]"quit"[/bold] to exit.',
            border_style="cyan",
        )
    )

    while True:
        console.print()
        user_input = console.input("[bold cyan]> [/bold cyan]").strip()
        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            console.print("[dim]Goodbye![/dim]")
            break

        try:
            with console.status("[bold green]Working...", spinner="dots"):
                response = await run(user_input)

            console.print(
                f"\n[dim]Tool: {response.tool_used} | Query: {response.query}[/dim]\n"
            )

            display_fn = DISPLAY_MAP.get(response.tool_used)
            if display_fn:
                display_fn(response.result)
            else:
                console.print_json(response.result.model_dump_json(indent=2))

        except json.JSONDecodeError as e:
            console.print(f"[red]Failed to parse LLM response as JSON: {e}[/red]")
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")


def main() -> None:
    errors = config.validate()
    if errors:
        for err in errors:
            console.print(f"[red]Config error: {err}[/red]")
        console.print("\nCopy .env.example to .env and fill in your API keys.")
        sys.exit(1)

    asyncio.run(interactive())


if __name__ == "__main__":
    main()
