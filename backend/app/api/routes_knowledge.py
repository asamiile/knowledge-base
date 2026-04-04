"""ナレッジインデックスの参照（UI 用メタ情報）。"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends

from app.db import get_db
from app.models.tables import Document, RawData

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/stats")
def knowledge_stats(db: Session = Depends(get_db)) -> dict[str, int]:
    """ベクトル付きチャンク数と raw_data 行数（質問タブのステータス表示用）。"""
    n_docs = db.scalar(
        select(func.count())
        .select_from(Document)
        .where(Document.embedding.isnot(None))
    )
    n_raw = db.scalar(select(func.count()).select_from(RawData))
    return {
        "document_chunks": int(n_docs or 0),
        "raw_data_rows": int(n_raw or 0),
    }
