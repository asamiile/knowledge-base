"""資料詳細の外部メタ合成結果。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PaperEnrichment:
    display_name: str
    arxiv_id: str | None
    citation_count: int | None
    summary: str | None
    tldr: str | None
    sources: list[str]
    arxiv_primary_category: str | None
    arxiv_categories: tuple[str, ...]
