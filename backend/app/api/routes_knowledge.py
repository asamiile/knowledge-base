"""ナレッジインデックスの参照（UI 用メタ情報・資料検索）。"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, Response

from app.db import get_db
from app.models.tables import Document, RawData, SavedSearch
from app.schemas.knowledge_search import (
    MaterialSearchHit,
    MaterialSearchRequest,
    MaterialSearchResponse,
)
from app.schemas.saved_search import (
    SavedSearchCreate,
    SavedSearchPatch,
    SavedSearchRead,
)
from app.services.embeddings import build_embedding_model
from app.services.material_search import run_material_search

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


_MAX_HIT_TEXT = 12000


@router.post("/search", response_model=MaterialSearchResponse)
def knowledge_material_search(
    req: MaterialSearchRequest,
    db: Session = Depends(get_db),
) -> MaterialSearchResponse:
    """インデックス済みチャンクへのベクトル検索（LLM なし）。距離は cosine distance（小さいほど近い）。"""
    try:
        embed_model = build_embedding_model()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    try:
        rows = run_material_search(
            db,
            embed_model,
            req.query.strip(),
            req.top_k,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    hits = [
        MaterialSearchHit(
            document_id=rid,
            text=text if len(text) <= _MAX_HIT_TEXT else text[:_MAX_HIT_TEXT] + "…",
            distance=dist,
        )
        for rid, text, dist in rows
    ]
    return MaterialSearchResponse(hits=hits)


def _saved_row_to_read(row: SavedSearch) -> SavedSearchRead:
    return SavedSearchRead.model_validate(row)


@router.get("/saved-searches", response_model=list[SavedSearchRead])
def list_saved_searches(db: Session = Depends(get_db)) -> list[SavedSearchRead]:
    rows = db.scalars(
        select(SavedSearch).order_by(SavedSearch.created_at.asc()),
    ).all()
    return [_saved_row_to_read(r) for r in rows]


@router.post("/saved-searches", response_model=SavedSearchRead)
def create_saved_search(
    req: SavedSearchCreate,
    db: Session = Depends(get_db),
) -> SavedSearchRead:
    enabled = req.schedule_enabled and req.interval_minutes > 0
    row = SavedSearch(
        name=req.name.strip(),
        query=req.query,
        top_k=req.top_k,
        interval_minutes=req.interval_minutes,
        schedule_enabled=enabled,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _saved_row_to_read(row)


@router.patch("/saved-searches/{search_id}", response_model=SavedSearchRead)
def patch_saved_search(
    search_id: UUID,
    req: SavedSearchPatch,
    db: Session = Depends(get_db),
) -> SavedSearchRead:
    row = db.get(SavedSearch, search_id)
    if row is None:
        raise HTTPException(status_code=404, detail="saved search not found")
    data = req.model_dump(exclude_unset=True)
    if "name" in data:
        row.name = data["name"].strip()
    if "query" in data:
        row.query = data["query"]
    if "top_k" in data:
        row.top_k = data["top_k"]
    if "interval_minutes" in data:
        row.interval_minutes = data["interval_minutes"]
    if "schedule_enabled" in data:
        row.schedule_enabled = data["schedule_enabled"]
    if "last_run_at" in data:
        row.last_run_at = data["last_run_at"]
    if row.interval_minutes <= 0:
        row.schedule_enabled = False
    db.commit()
    db.refresh(row)
    return _saved_row_to_read(row)


@router.delete("/saved-searches/{search_id}")
def delete_saved_search(
    search_id: UUID,
    db: Session = Depends(get_db),
) -> Response:
    row = db.get(SavedSearch, search_id)
    if row is None:
        raise HTTPException(status_code=404, detail="saved search not found")
    db.delete(row)
    db.commit()
    return Response(status_code=204)
