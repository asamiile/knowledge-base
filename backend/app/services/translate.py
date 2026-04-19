"""Gemini Flash を使った翻訳ユーティリティ。"""

from __future__ import annotations

import logging

from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from app.core.settings import get_gemini_llm_model, get_google_api_key
from app.models.tables import Document

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = (
    "次のテキストを自然な日本語に翻訳してください。"
    "学術論文の文体を保ち、専門用語はそのままでも構いません。"
    "翻訳結果のみを出力し、説明や前置きは不要です。\n\n"
    "{text}"
)


def translate_text(text: str) -> str:
    """生テキストを日本語に翻訳する。空文字はそのまま返す。"""
    if not text.strip():
        return text
    api_key = get_google_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured")
    client = genai.Client(api_key=api_key)
    resp = client.models.generate_content(
        model=get_gemini_llm_model(),
        contents=_PROMPT_TEMPLATE.format(text=text),
        config=types.GenerateContentConfig(temperature=0.1),
    )
    return (resp.text or "").strip()


def translate_document(db: Session, document_id: int) -> str:
    """document_id のチャンクを翻訳し DB にキャッシュして返す。"""
    doc = db.get(Document, document_id)
    if doc is None:
        raise ValueError(f"document_id={document_id} が見つかりません")

    if doc.translated_text:
        return doc.translated_text

    translated = translate_text(doc.text)
    if not translated:
        raise RuntimeError("翻訳結果が空でした")

    doc.translated_text = translated
    db.commit()
    return translated
