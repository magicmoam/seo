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
    CompetitorAnalysisResult,
    ContentGapResult,
    GeneratedContent,
    KeywordResearchResult,
    SERPAnalysisResult,
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


DISPLAY_MAP = {
    "keyword_research": display_keyword_research,
    "competitor_analysis": display_competitor_analysis,
    "serp_analysis": display_serp_analysis,
    "content_gap": display_content_gap,
    "content_generation": display_content,
}


async def interactive() -> None:
    console.print(
        Panel(
            "[bold cyan]Wongzo[/bold cyan]\n\n"
            "I can help you with:\n"
            "  1. [green]Keyword Research[/green] - Find high-value keywords\n"
            "  2. [green]Competitor Analysis[/green] - Analyze top-ranking pages\n"
            "  3. [green]SERP Analysis[/green] - Understand search result patterns\n"
            "  4. [green]Content Gap Analysis[/green] - Find untapped opportunities\n"
            "  5. [green]Content Generation[/green] - Create SEO-optimized articles\n\n"
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
