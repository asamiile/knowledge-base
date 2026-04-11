"""arXiv **公式** Atom API 由来のメタ（タイトル・要約・著者など）。

`app.services.source_import.arxiv` の取得ロジックを再利用する。
公式 API には「引用数」「自動 TLDR」は含まれない（要約は `<summary>` = abstract）。
"""

from __future__ import annotations

from app.services.source_import.arxiv import fetch_arxiv_entries

from app.services.external.textutil import truncate_summary


def fetch_arxiv_paper_meta(
    arxiv_id_for_api: str,
) -> tuple[str, str | None, str | None, tuple[str, ...]]:
    """タイトル・要約・主カテゴリ・全カテゴリ。`arxiv_id_for_api` は stem（例: 2410.09380v1）。"""
    entries = fetch_arxiv_entries(
        arxiv_ids=[arxiv_id_for_api],
        search_query=None,
        max_results=1,
    )
    if not entries:
        return arxiv_id_for_api, None, None, ()
    e = entries[0]
    summary = e.summary.strip() if e.summary else None
    summ = truncate_summary(summary) if summary else None
    return (
        e.title.strip(),
        summ,
        e.primary_category,
        e.categories,
    )
