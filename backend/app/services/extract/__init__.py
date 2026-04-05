"""ローカルファイルからテキスト等を取り出す層（拡張子・形式ごとの処理の置き場）。"""

# pdf_text / pdf_upload は pypdf 依存のため、パッケージ初期化では読み込まない。
# 利用側はサブモジュールから直接 import する。
from app.services.extract.vector_sources import (
    VECTOR_INDEX_NATIVE_SUFFIXES,
    collect_vector_source_paths,
    extract_text_for_vector_ingest,
)

__all__ = [
    "VECTOR_INDEX_NATIVE_SUFFIXES",
    "collect_vector_source_paths",
    "extract_text_for_vector_ingest",
]
