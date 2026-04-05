"""PDF からプレーンテキストを取り出す（外部依存は `pypdf`）。"""

from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError


def extract_plain_text_from_pdf_bytes(data: bytes) -> str:
    """バイト列からページごとの抽出テキストを結合して返す。

    読み取り不能な PDF は `ValueError`。
    """
    try:
        reader = PdfReader(BytesIO(data), strict=False)
    except PdfReadError as e:
        raise ValueError(f"PDF の形式が無効です: {e}") from e
    parts: list[str] = []
    for page in reader.pages:
        try:
            t = page.extract_text()
        except Exception as e:  # pragma: no cover - 壊れたページ単体
            raise ValueError(f"PDF ページのテキスト抽出に失敗しました: {e}") from e
        if t:
            parts.append(t)
    return "\n\n".join(parts).strip()
