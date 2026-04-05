"""`app.services.extract` — ベクトル索引用パスの列挙とテキスト抽出。"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.services.extract import (
    collect_vector_source_paths,
    extract_text_for_vector_ingest,
)


def test_collect_vector_source_paths_sorted_and_filtered(tmp_path: Path) -> None:
    (tmp_path / "a.md").write_text("a", encoding="utf-8")
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "b.txt").write_text("b", encoding="utf-8")
    (tmp_path / "skip.json").write_text("{}", encoding="utf-8")

    paths = collect_vector_source_paths(tmp_path)
    assert [p.name for p in paths] == ["a.md", "b.txt"]


def test_extract_text_for_vector_ingest_md(tmp_path: Path) -> None:
    p = tmp_path / "n.md"
    p.write_text("hello\u2028", encoding="utf-8")
    assert extract_text_for_vector_ingest(p) == "hello\u2028"


def test_extract_text_for_vector_ingest_rejects_unknown_suffix(
    tmp_path: Path,
) -> None:
    p = tmp_path / "x.pdf"
    p.write_bytes(b"%PDF")
    with pytest.raises(ValueError, match="未対応"):
        extract_text_for_vector_ingest(p)
