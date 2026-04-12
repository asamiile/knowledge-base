"""arXiv **公式** Atom API 由来のメタ（タイトル・要約・著者など）。

`app.services.source_import.arxiv` の取得ロジックを再利用する。
公式 API には「引用数」「自動 TLDR」は含まれない（要約は `<summary>` = abstract）。
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

import httpx

from app.services.source_import.arxiv import fetch_arxiv_entries

from app.services.external.textutil import truncate_summary


def fetch_arxiv_paper_meta(
    arxiv_id_for_api: str,
) -> tuple[str | None, str | None, str | None, tuple[str, ...]]:
    """タイトル・要約・主カテゴリ・全カテゴリ。取得失敗時はすべて None / 空タプル。"""
    try:
        entries = fetch_arxiv_entries(
            arxiv_ids=[arxiv_id_for_api],
            search_query=None,
            max_results=1,
        )
    except (httpx.HTTPError, ET.ParseError):
        return None, None, None, ()
    if not entries:
        return None, None, None, ()
    e = entries[0]
    summary = e.summary.strip() if e.summary else None
    summ = truncate_summary(summary) if summary else None
    return (
        e.title.strip(),
        summ,
        e.primary_category,
        e.categories,
    )
