"""翻訳 API ルート。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.translate import translate_document, translate_text

router = APIRouter(prefix="/api/translate", tags=["translate"])


class TranslateRequest(BaseModel):
    document_id: int


class TranslateResponse(BaseModel):
    document_id: int
    translated_text: str
    cached: bool


@router.post("", response_model=TranslateResponse)
def translate(req: TranslateRequest, db: Session = Depends(get_db)) -> TranslateResponse:
    from app.models.tables import Document

    doc = db.get(Document, req.document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"document_id={req.document_id} が見つかりません")

    cached = doc.translated_text is not None
    try:
        translated = translate_document(db, req.document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return TranslateResponse(
        document_id=req.document_id,
        translated_text=translated,
        cached=cached,
    )


class TranslateTextRequest(BaseModel):
    text: str


class TranslateTextResponse(BaseModel):
    translated_text: str


@router.post("/text", response_model=TranslateTextResponse)
def translate_text_endpoint(req: TranslateTextRequest) -> TranslateTextResponse:
    """任意テキストを日本語に翻訳する（要約などの生テキスト用）。"""
    if len(req.text) > 10_000:
        raise HTTPException(status_code=400, detail="テキストが長すぎます（10,000文字以内）")
    try:
        translated = translate_text(req.text)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        # Gemini API の一時的な高負荷（503）など外部エラーを503で返す
        raise HTTPException(status_code=503, detail=f"翻訳サービスが一時的に利用できません: {e}") from e
    return TranslateTextResponse(translated_text=translated)
