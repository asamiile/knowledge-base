"""DATA_DIR 相対パス → 表示用 `PaperEnrichment`。

arXiv 取り込み（`imports/arxiv/*.md`）では **arXiv Atom をタイトル・要約の正**とする。
**引用数**は arXiv に無いため、新形式 ID のみ **OpenAlex** で補完する。
"""

from __future__ import annotations

import time
from pathlib import Path
from threading import Lock

from app.services.external.arxiv_atom import fetch_arxiv_paper_meta
from app.services.external.arxiv_import_path import (
    arxiv_import_stem,
    is_modern_arxiv_stem,
    strip_arxiv_version,
)
from app.services.external.openalex import fetch_work_for_arxiv_base
from app.services.external.types import PaperEnrichment

_TTL = 1800  # 30分
_cache: dict[str, tuple[float, PaperEnrichment]] = {}
_lock = Lock()


def enrichment_for_data_relative_path(rel_path: str) -> PaperEnrichment:
    """`DATA_DIR` 相対パス（POSIX）から、表示用タイトル・要約・引用を組み立てる。結果は30分キャッシュ。"""
    rel = rel_path.replace("\\", "/").lstrip("/")
    now = time.monotonic()
    with _lock:
        if rel in _cache:
            ts, cached = _cache[rel]
            if now - ts < _TTL:
                return cached
    stem = arxiv_import_stem(rel)
    if not stem:
        name = Path(rel).stem if rel else rel_path
        return PaperEnrichment(
            display_name=name or rel_path,
            arxiv_id=None,
            citation_count=None,
            summary=None,
            tldr=None,
            sources=[],
            arxiv_primary_category=None,
            arxiv_categories=(),
        )

    sources: list[str] = []
    title, summ, primary_cat, cats = fetch_arxiv_paper_meta(stem)
    display_name = (
        title.strip()
        if isinstance(title, str) and title.strip()
        else stem
    )
    summary = summ
    if title is not None or summ is not None or primary_cat is not None or cats:
        sources.append("arxiv")

    citation_count: int | None = None
    if is_modern_arxiv_stem(stem):
        arxiv_base = strip_arxiv_version(stem)
        oa = fetch_work_for_arxiv_base(arxiv_base)
        if oa:
            sources.append("openalex")
            cit = oa.get("cited_by_count")
            if isinstance(cit, int):
                citation_count = cit

    result = PaperEnrichment(
        display_name=display_name,
        arxiv_id=stem,
        citation_count=citation_count,
        summary=summary,
        tldr=None,
        sources=sources,
        arxiv_primary_category=primary_cat,
        arxiv_categories=cats,
    )
    with _lock:
        _cache[rel] = (time.monotonic(), result)
    return result
