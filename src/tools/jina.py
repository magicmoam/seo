"""Jina AI integration for web search and page scraping."""

from __future__ import annotations

import asyncio
import logging

import httpx

from src.config import config

logger = logging.getLogger(__name__)

SEARCH_URL = "https://s.jina.ai"
READER_URL = "https://r.jina.ai"

_TIMEOUT = 30.0
_MAX_RETRIES = 2
_RETRY_BACKOFF = 1.0  # seconds, doubles each retry

# Module-level pooled client — reuses TCP connections across requests.
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Return a shared httpx client, creating it on first use."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=_TIMEOUT,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )
    return _client


def _is_retryable(exc: Exception) -> bool:
    """Return True if the error is transient and worth retrying."""
    if isinstance(exc, (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout)):
        return True
    if isinstance(exc, httpx.ConnectError):
        return True
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in (429, 502, 503, 504):
        return True
    return False


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if config.jina_api_key:
        headers["Authorization"] = f"Bearer {config.jina_api_key}"
    return headers


async def search(query: str, num_results: int = 5) -> list[dict]:
    """Search the web via Jina Search API. Returns list of {title, url, description, content}."""
    client = _get_client()
    resp = await client.get(
        f"{SEARCH_URL}/{query}",
        headers=_headers(),
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in (data.get("data") or [])[:num_results]:
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "description": item.get("description", ""),
                "content": item.get("content", "")[:3000],
            }
        )
    return results


async def scrape(url: str) -> dict:
    """Scrape a page via Jina Reader API. Returns {title, url, content}."""
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            client = _get_client()
            resp = await client.get(
                f"{READER_URL}/{url}",
                headers=_headers(),
            )
            resp.raise_for_status()
            data = resp.json()

            page = data.get("data") or {}
            return {
                "title": page.get("title", ""),
                "url": page.get("url", url),
                "content": (page.get("content") or "")[:8000],
            }
        except Exception as exc:
            last_exc = exc
            if attempt < _MAX_RETRIES and _is_retryable(exc):
                wait = _RETRY_BACKOFF * (2 ** attempt)
                logger.warning("Jina scrape attempt %d failed for %s: %s. Retrying in %.1fs...", attempt + 1, url, exc, wait)
                await asyncio.sleep(wait)
            else:
                break
    raise last_exc  # type: ignore[misc]


async def search_with_raw(query: str, num_results: int = 5) -> tuple[list[dict], list[dict]]:
    """Search and return both truncated and raw (untruncated) results."""
    client = _get_client()
    resp = await client.get(
        f"{SEARCH_URL}/{query}",
        headers=_headers(),
    )
    resp.raise_for_status()
    data = resp.json()

    truncated = []
    raw = []
    for item in (data.get("data") or [])[:num_results]:
        full_content = item.get("content", "")
        raw.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "description": item.get("description", ""),
                "content": full_content,
            }
        )
        truncated.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "description": item.get("description", ""),
                "content": full_content[:3000],
            }
        )
    return truncated, raw


async def scrape_with_raw(url: str) -> tuple[dict, dict]:
    """Scrape and return both truncated and raw (untruncated) results."""
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            client = _get_client()
            resp = await client.get(
                f"{READER_URL}/{url}",
                headers=_headers(),
            )
            resp.raise_for_status()
            data = resp.json()

            page = data.get("data") or {}
            full_content = page.get("content") or ""
            raw = {
                "title": page.get("title", ""),
                "url": page.get("url", url),
                "content": full_content,
            }
            truncated = {
                "title": page.get("title", ""),
                "url": page.get("url", url),
                "content": full_content[:8000],
            }
            return truncated, raw
        except Exception as exc:
            last_exc = exc
            if attempt < _MAX_RETRIES and _is_retryable(exc):
                wait = _RETRY_BACKOFF * (2 ** attempt)
                logger.warning("Jina scrape attempt %d failed for %s: %s. Retrying in %.1fs...", attempt + 1, url, exc, wait)
                await asyncio.sleep(wait)
            else:
                break
    raise last_exc  # type: ignore[misc]


async def search_and_scrape_with_raw(query: str, num_results: int = 3) -> tuple[list[dict], list[dict]]:
    """Search then scrape in parallel, returning both truncated and raw results."""
    search_truncated, search_raw = await search_with_raw(query, num_results)

    async def _scrape_one(i: int, result: dict) -> tuple[dict, dict]:
        try:
            return await scrape_with_raw(result["url"])
        except Exception:
            return result, search_raw[i]

    pairs = await asyncio.gather(
        *(_scrape_one(i, r) for i, r in enumerate(search_truncated))
    )
    scraped_truncated = [p[0] for p in pairs]
    scraped_raw = [p[1] for p in pairs]
    return scraped_truncated, scraped_raw


async def search_and_scrape(query: str, num_results: int = 3) -> list[dict]:
    """Search then scrape top results in parallel for deeper content."""
    search_results = await search(query, num_results)

    async def _scrape_one(result: dict) -> dict:
        try:
            return await scrape(result["url"])
        except Exception:
            return result  # fall back to search snippet

    return list(await asyncio.gather(*(_scrape_one(r) for r in search_results)))
