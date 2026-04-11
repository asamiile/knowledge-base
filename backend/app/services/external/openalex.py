"""OpenAlex API — arXiv 由来の Work（タイトル・Abstract・引用数）。"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

_OPENALEX_WORKS = "https://api.openalex.org/works"
_USER_AGENT = "knowledge-base/0.1 (https://github.com/local-dev; contact: dev@local)"


def openalex_doi_url_for_arxiv(arxiv_base: str) -> str:
    """DataCite DOI（OpenAlex が arXiv プレプリントを解決する形式）。"""
    return f"https://doi.org/10.48550/arxiv.{arxiv_base.lower()}"


def abstract_from_inverted_index(inv: dict[str, list[int]] | None) -> str:
    if not inv:
        return ""
    max_pos = max(max(positions) for positions in inv.values())
    words: list[str] = [""] * (max_pos + 1)
    for word, positions in inv.items():
        for pos in positions:
            if 0 <= pos <= max_pos:
                words[pos] = word
    return " ".join(w for w in words if w).strip()


def fetch_work_for_arxiv_base(arxiv_base: str) -> dict[str, Any] | None:
    """`arxiv_base` はバージョンなし（例: 1709.06342）。"""
    doi_page = openalex_doi_url_for_arxiv(arxiv_base)
    url = f"{_OPENALEX_WORKS}/{quote(doi_page, safe='')}"
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            r = client.get(
                url,
                headers={"User-Agent": _USER_AGENT, "Accept": "application/json"},
            )
    except httpx.HTTPError as e:
        logger.warning("OpenAlex request failed: %s", e)
        return None
    if r.status_code == 404:
        return None
    if not r.is_success:
        logger.warning("OpenAlex HTTP %s for %s", r.status_code, arxiv_base)
        return None
    try:
        return r.json()
    except ValueError as e:
        logger.warning("OpenAlex JSON decode failed: %s", e)
        return None
