"""アップロード済み PDF から案 A: `uploads/extracted/*.md` へ書き出す。"""

from __future__ import annotations

from pathlib import Path

_EMPTY_PDF_HINT = (
    "この PDF から抽出できるテキストはありませんでした。"
    "画像のみの PDF では OCR 等が別途必要です。"
)


def write_pdf_extracted_markdown(
    data_dir: Path,
    *,
    upload_filename: str,
    pdf_bytes: bytes,
) -> str:
    """`uploads/{upload_filename}` と対になる抽出結果を `uploads/extracted/{stem}.md` に保存する。

    Returns:
        `DATA_DIR` からの相対パス（POSIX）。
    """
    data_dir = data_dir.resolve()
    base = Path(upload_filename).name
    stem = Path(base).stem
    try:
        from app.services.extract.pdf_text import extract_plain_text_from_pdf_bytes
    except ModuleNotFoundError as e:
        raise ValueError(
            "PDF 処理には pypdf が必要です。requirements.txt をイン"
            "ストールするか、backend コンテナを再ビルドしてください。",
        ) from e
    text = extract_plain_text_from_pdf_bytes(pdf_bytes)
    body = text if text else _EMPTY_PDF_HINT
    md = (
        f"# {base}\n\n"
        f"<!-- source: uploads/{base} (PDF 抽出) -->\n\n"
        f"{body}\n"
    )
    out_dir = data_dir / "uploads" / "extracted"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{stem}.md"
    out.write_text(md, encoding="utf-8")
    return str(out.relative_to(data_dir)).replace("\\", "/")

