"""ナレッジインデックスの参照（UI 用メタ情報・資料検索）。"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from app.api.deps_auth import get_effective_user_id
from app.db import get_db
from app.models.tables import (
    Document,
    QuestionHistory,
    RawData,
    SavedSearch,
    SavedSearchRunLog,
)
from app.schemas.knowledge_search import (
    MaterialSearchHit,
    MaterialSearchRequest,
    MaterialSearchResponse,
)
from app.schemas.question_history import QuestionHistoryRead
from app.schemas.saved_search import (
    SavedSearchCreate,
    SavedSearchPatch,
    SavedSearchRead,
    normalize_arxiv_id_list,
)
from app.schemas.saved_search_run_log import (
    SavedSearchRunLogCreate,
    SavedSearchRunLogListItem,
    SavedSearchRunLogRead,
)
from app.api.deps import get_embed_model
from app.services.material_search import run_material_search

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


def _get_saved_search_or_404(
    db: Session,
    search_id: UUID,
    *,
    user_id: UUID | None,
) -> SavedSearch:
    row = db.get(SavedSearch, search_id)
    if row is None:
        raise HTTPException(status_code=404, detail="saved search not found")
    if user_id is not None and row.user_id is not None and row.user_id != user_id:
        raise HTTPException(status_code=404, detail="saved search not found")
    if user_id is not None and row.user_id is None:
        raise HTTPException(status_code=404, detail="saved search not found")
    return row


def _validate_saved_row_or_400(*, search_target: str, query: str, arxiv_ids: list[str]) -> None:
    q = (query or "").strip()
    ids = [x for x in arxiv_ids if x]
    if search_target == "knowledge":
        if not q:
            raise HTTPException(
                status_code=400,
                detail="knowledge search requires non-empty query",
            )
        return
    if not ids and not q:
        raise HTTPException(
            status_code=400,
            detail="arxiv search requires non-empty arxiv_ids and/or query",
        )


@router.get("/question-history", response_model=list[QuestionHistoryRead])
def list_question_history(
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
    limit: int = 50,
) -> list[QuestionHistoryRead]:
    """質問と Analyze 応答の履歴（新しい順）。"""
    lim = max(1, min(limit, 100))
    stmt = select(QuestionHistory).order_by(QuestionHistory.created_at.desc()).limit(lim)
    if user_id is not None:
        stmt = stmt.where(QuestionHistory.user_id == user_id)
    rows = db.scalars(stmt).all()
    return [QuestionHistoryRead.model_validate(r) for r in rows]


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
    embed_model=Depends(get_embed_model),
) -> MaterialSearchResponse:
    """インデックス済みチャンクへのベクトル検索（LLM なし）。距離は cosine distance（小さいほど近い）。"""
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
            translated_text=translated if translated is None or len(translated) <= _MAX_HIT_TEXT else translated[:_MAX_HIT_TEXT] + "…",
            distance=dist,
            source_path=spath,
        )
        for rid, text, translated, dist, spath in rows
    ]
    return MaterialSearchResponse(hits=hits)


@router.get("/saved-searches", response_model=list[SavedSearchRead])
def list_saved_searches(
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> list[SavedSearchRead]:
    stmt = select(SavedSearch).order_by(SavedSearch.created_at.asc())
    if user_id is not None:
        stmt = stmt.where(SavedSearch.user_id == user_id)
    rows = db.scalars(stmt).all()
    return [SavedSearchRead.model_validate(r) for r in rows]


@router.post("/saved-searches", response_model=SavedSearchRead)
def create_saved_search(
    req: SavedSearchCreate,
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> SavedSearchRead:
    enabled = req.schedule_enabled and req.interval_minutes > 0
    row = SavedSearch(
        user_id=user_id,
        name=req.name,
        query=req.query,
        arxiv_ids=list(req.arxiv_ids),
        search_target=req.search_target,
        top_k=req.top_k,
        interval_minutes=req.interval_minutes,
        schedule_enabled=enabled,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SavedSearchRead.model_validate(row)


@router.patch("/saved-searches/{search_id}", response_model=SavedSearchRead)
def patch_saved_search(
    search_id: UUID,
    req: SavedSearchPatch,
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> SavedSearchRead:
    row = _get_saved_search_or_404(db, search_id, user_id=user_id)
    data = req.model_dump(exclude_unset=True)
    if "name" in data:
        row.name = data["name"].strip()
    if "query" in data:
        row.query = data["query"] or ""
    if "arxiv_ids" in data and data["arxiv_ids"] is not None:
        row.arxiv_ids = normalize_arxiv_id_list(data["arxiv_ids"])
    if "search_target" in data and data["search_target"] is not None:
        row.search_target = data["search_target"]
    if "top_k" in data:
        row.top_k = data["top_k"]
    if "interval_minutes" in data:
        row.interval_minutes = data["interval_minutes"]
    if "schedule_enabled" in data:
        row.schedule_enabled = data["schedule_enabled"]
    if "last_run_at" in data:
        row.last_run_at = data["last_run_at"]
    if row.search_target == "knowledge":
        row.arxiv_ids = []
    row.arxiv_ids = normalize_arxiv_id_list(row.arxiv_ids)
    _validate_saved_row_or_400(
        search_target=row.search_target,
        query=row.query,
        arxiv_ids=row.arxiv_ids,
    )
    if row.interval_minutes <= 0:
        row.schedule_enabled = False
    db.commit()
    db.refresh(row)
    return SavedSearchRead.model_validate(row)


@router.delete("/saved-searches/{search_id}")
def delete_saved_search(
    search_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> Response:
    row = _get_saved_search_or_404(db, search_id, user_id=user_id)
    db.delete(row)
    db.commit()
    return Response(status_code=204)


@router.get("/saved-search-run-logs", response_model=list[SavedSearchRunLogListItem])
def list_saved_search_run_logs(
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
    limit: int = 200,
) -> list[SavedSearchRunLogListItem]:
    lim = max(1, min(limit, 500))
    stmt = (
        select(SavedSearchRunLog)
        .order_by(SavedSearchRunLog.created_at.desc())
        .limit(lim)
    )
    if user_id is not None:
        owned_ids = db.scalars(
            select(SavedSearch.id).where(SavedSearch.user_id == user_id),
        ).all()
        if not owned_ids:
            return []
        stmt = stmt.where(SavedSearchRunLog.saved_search_id.in_(owned_ids))
    rows = db.scalars(stmt).all()
    return [SavedSearchRunLogListItem.model_validate(r) for r in rows]


@router.get(
    "/saved-search-run-logs/{log_id}",
    response_model=SavedSearchRunLogRead,
)
def get_saved_search_run_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> SavedSearchRunLogRead:
    row = db.get(SavedSearchRunLog, log_id)
    if row is None:
        raise HTTPException(status_code=404, detail="run log not found")
    if user_id is not None:
        if row.saved_search_id is None:
            raise HTTPException(status_code=404, detail="run log not found")
        parent = db.get(SavedSearch, row.saved_search_id)
        if parent is None or parent.user_id != user_id:
            raise HTTPException(status_code=404, detail="run log not found")
    return SavedSearchRunLogRead.model_validate(row)


class SavedSearchRunLogHintTranslationPatch(BaseModel):
    path: str = Field(min_length=1, max_length=1024)
    translated_text: str = Field(min_length=1, max_length=10_000)


@router.patch(
    "/saved-search-run-logs/{log_id}/hint-translation",
    response_model=SavedSearchRunLogRead,
)
def patch_run_log_hint_translation(
    log_id: UUID,
    req: SavedSearchRunLogHintTranslationPatch,
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> SavedSearchRunLogRead:
    """スニペット翻訳結果を translated_hints に保存する（path → 翻訳テキスト）。"""
    row = db.get(SavedSearchRunLog, log_id)
    if row is None:
        raise HTTPException(status_code=404, detail="run log not found")
    if user_id is not None:
        if row.saved_search_id is None:
            raise HTTPException(status_code=404, detail="run log not found")
        parent = db.get(SavedSearch, row.saved_search_id)
        if parent is None or parent.user_id != user_id:
            raise HTTPException(status_code=404, detail="run log not found")
    hints = dict(row.translated_hints or {})
    hints[req.path] = req.translated_text
    row.translated_hints = hints
    db.commit()
    db.refresh(row)
    return SavedSearchRunLogRead.model_validate(row)


@router.post(
    "/saved-search-run-logs",
    response_model=SavedSearchRunLogRead,
    status_code=201,
)
def create_saved_search_run_log(
    req: SavedSearchRunLogCreate,
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> SavedSearchRunLogRead:
    if req.saved_search_id is not None and user_id is not None:
        parent = db.get(SavedSearch, req.saved_search_id)
        if parent is None or parent.user_id != user_id:
            raise HTTPException(status_code=404, detail="saved search not found")
    row = SavedSearchRunLog(
        saved_search_id=req.saved_search_id,
        title_snapshot=req.title_snapshot.strip() or "Untitled",
        status=req.status,
        error_message=req.error_message,
        imported_content=req.imported_content,
        imported_payload=req.imported_payload,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SavedSearchRunLogRead.model_validate(row)
