"""`extract_plain_text_from_pdf_bytes` のユニットテスト。"""

from __future__ import annotations

import pytest

from app.services.extract.pdf_text import extract_plain_text_from_pdf_bytes


def test_extract_plain_text_from_pdf_bytes_rejects_garbage() -> None:
    with pytest.raises(ValueError, match="PDF"):
        extract_plain_text_from_pdf_bytes(b"not a pdf")
