"""ベクトル索引用: `DATA_DIR` 内ファイルの列挙とプレーンテキスト抽出。"""

from __future__ import annotations

from pathlib import Path

# フェーズ 3 以降で PDF 等を足すときは suffix / glob / extract の分岐をここに集約する。
VECTOR_INDEX_NATIVE_SUFFIXES: frozenset[str] = frozenset({".md", ".txt"})


def collect_vector_source_paths(data_dir: Path) -> list[Path]:
    """再取り込みでチャンク化の対象とするファイルパス（現状は `.md` / `.txt` のみ）。"""
    root = data_dir.resolve()
    paths: list[Path] = []
    for pattern in ("**/*.md", "**/*.txt"):
        paths.extend(sorted(p for p in root.glob(pattern) if p.is_file()))
    return paths


def extract_text_for_vector_ingest(path: Path) -> str:
    """拡張子に応じてベクトル投入用の正規化前テキストを返す。

    現状は `.md` / `.txt` のみ（UTF-8、不正バイトは置換）。その他は `ValueError`。

    PostgreSQL の `text` 列には U+0000（NUL）を格納できない。PDF 由来の抽出に混ざるため除去する。
    """
    suf = path.suffix.lower()
    if suf in VECTOR_INDEX_NATIVE_SUFFIXES:
        raw = path.read_text(encoding="utf-8", errors="replace")
        return raw.replace("\x00", "")
    raise ValueError(
        f"vector ingest で未対応の拡張子です: {path.suffix!r} ({path})",
    )
