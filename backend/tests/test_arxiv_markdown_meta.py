"""`arxiv_markdown_meta` — フロントマター解析と主カテゴリ集計。"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from app.services.arxiv_markdown_meta import (
    aggregate_arxiv_primary_category_counts,
    parse_arxiv_frontmatter,
)


def test_parse_arxiv_frontmatter_roundtrip() -> None:
    md = """---
arxiv_primary_category: cs.LG
arxiv_categories:
  - cs.LG
  - stat.ML
---
# Title

body
"""
    primary, cats = parse_arxiv_frontmatter(md)
    assert primary == "cs.LG"
    assert cats == ["cs.LG", "stat.ML"]


@patch("app.services.arxiv_markdown_meta.fetch_primary_categories_for_stems")
def test_aggregate_arxiv_primary_category_counts(
    mock_fetch: object,
    tmp_path: Path,
) -> None:
    mock_fetch.return_value = {}
    arxiv = tmp_path / "imports" / "arxiv"
    arxiv.mkdir(parents=True)
    (arxiv / "a.md").write_text(
        "---\narxiv_primary_category: cs.AI\narxiv_categories:\n  - cs.AI\n---\n# A\n",
        encoding="utf-8",
    )
    (arxiv / "b.md").write_text(
        "---\narxiv_primary_category: cs.AI\n---\n# B\n",
        encoding="utf-8",
    )
    (arxiv / "plain.md").write_text("# No frontmatter\n", encoding="utf-8")
    items, uncategorized, total = aggregate_arxiv_primary_category_counts(tmp_path)
    assert total == 3
    assert uncategorized == 1
    assert items == [("cs.AI", 2)]
    mock_fetch.assert_called_once_with(["plain"])


@patch("app.services.arxiv_markdown_meta.fetch_primary_categories_for_stems")
def test_aggregate_atom_fallback_fill_category(
    mock_fetch: object,
    tmp_path: Path,
) -> None:
    mock_fetch.return_value = {"1709.06342v4": "eess.IV"}
    arxiv = tmp_path / "imports" / "arxiv"
    arxiv.mkdir(parents=True)
    (arxiv / "1709.06342v4.md").write_text("# Title only\n", encoding="utf-8")
    items, uncategorized, total = aggregate_arxiv_primary_category_counts(tmp_path)
    assert total == 1
    assert uncategorized == 0
    assert items == [("eess.IV", 1)]
