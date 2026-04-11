"""arXiv **公式** Atom API 由来のメタ（タイトル・要約・著者など）。

`app.services.source_import.arxiv` の取得ロジックを再利用する。
公式 API には「引用数」「自動 TLDR」は含まれない（要約は `<summary>` = abstract）。
"""

from __future__ import annotations

from app.services.source_import.arxiv import fetch_arxiv_entries

from app.services.external.textutil import truncate_summary


def fetch_title_and_summary(arxiv_id_for_api: str) -> tuple[str, str | None]:
    """`arxiv_id_for_api` はファイル名の stem どおり（例: 2410.09380v1）でよい。"""
    entries = fetch_arxiv_entries(
        arxiv_ids=[arxiv_id_for_api],
        search_query=None,
        max_results=1,
    )
    if not entries:
        return arxiv_id_for_api, None
    e = entries[0]
    summary = e.summary.strip() if e.summary else None
    return e.title.strip(), truncate_summary(summary) if summary else None
