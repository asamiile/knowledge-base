"""翻訳 API ルート。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.translate import translate_document

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
