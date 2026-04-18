"""SavedSearch の定期実行スケジューラ（APScheduler BackgroundScheduler）。

起動: main.py の lifespan から start_scheduler() を呼ぶ。
動作: 1 分ごとに _tick() を実行し、schedule_enabled=true かつ実行タイミングが来た
      SavedSearch を処理して SavedSearchRunLog に結果を記録する。
"""

from __future__ import annotations

import logging
import traceback
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Generator
from uuid import UUID

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import MAX_RUN_LOG_CONTENT_LENGTH, MAX_RUN_LOG_ERROR_LENGTH
from app.db.session import SessionLocal
from app.models.tables import SavedSearch, SavedSearchRunLog

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


@contextmanager
def _get_db() -> Generator[Session, None, None]:
    """スケジューラ専用のDBセッションコンテキストマネージャ。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 実行タイミング判定
# ---------------------------------------------------------------------------

def is_due(row: SavedSearch, now: datetime) -> bool:
    """interval_minutes が経過しているか（last_run_at が None なら即実行）。"""
    if not row.schedule_enabled or row.interval_minutes <= 0:
        return False
    if row.last_run_at is None:
        return True
    last = row.last_run_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    elapsed_minutes = (now - last).total_seconds() / 60
    return elapsed_minutes >= row.interval_minutes


# ---------------------------------------------------------------------------
# ジョブ本体
# ---------------------------------------------------------------------------

def _run_knowledge_job(db: Session, row: SavedSearch) -> tuple[str, dict]:
    """knowledge 検索: RAG + Gemini で回答を生成する。"""
    from app.schemas.analyze import AnalyzeRequest
    from app.services.analyze import run_analyze

    req = AnalyzeRequest(
        question=row.query,
        top_k=row.top_k,
        reindex_sources=False,
        save_question_history=False,
    )
    result = run_analyze(db, req)
    content = result.answer
    payload = result.model_dump(mode="json")
    return content, payload


def _run_arxiv_job(db: Session, row: SavedSearch) -> tuple[str, dict]:
    """arXiv 検索: 論文を取り込み imports/arxiv/*.md に保存し、ベクトル索引を更新する。"""
    from app.core.settings import get_data_dir
    from app.services.embeddings import build_embedding_model
    from app.services.ingest import ingest_data_directory
    from app.services.source_import.arxiv import import_arxiv_to_data_dir

    data_dir = get_data_dir()
    written = import_arxiv_to_data_dir(
        data_dir,
        arxiv_ids=list(row.arxiv_ids or []),
        search_query=(row.query or None),
        max_results=row.top_k,
    )

    if written:
        embed_model = build_embedding_model()
        chunks, raw = ingest_data_directory(db, embed_model, data_dir)
        logger.info("ベクトル索引を更新しました（chunks=%d, raw=%d）", chunks, raw)

    content = "\n".join(written)
    payload: dict = {"written": written}
    return content, payload


# ---------------------------------------------------------------------------
# 1 件の SavedSearch を実行してログを記録する
# ---------------------------------------------------------------------------

def execute_one(saved_search_id: UUID) -> None:
    """単一 SavedSearch を実行し SavedSearchRunLog に記録する。"""
    with _get_db() as db:
        row = db.get(SavedSearch, saved_search_id)
        if row is None or not row.schedule_enabled:
            return

        # 実行前に last_run_at を更新（同じジョブの二重実行を抑止）
        row.last_run_at = datetime.now(timezone.utc)
        db.commit()

        try:
            if row.search_target == "knowledge":
                content, payload = _run_knowledge_job(db, row)
            else:
                content, payload = _run_arxiv_job(db, row)

            log = SavedSearchRunLog(
                saved_search_id=row.id,
                title_snapshot=row.name,
                status="success",
                imported_content=content[:MAX_RUN_LOG_CONTENT_LENGTH] if content else None,
                imported_payload=payload,
            )
            logger.info("SavedSearch '%s' 実行成功", row.name)
        except Exception as exc:
            err = traceback.format_exc()
            logger.warning("SavedSearch '%s' 実行失敗: %s", row.name, exc)
            log = SavedSearchRunLog(
                saved_search_id=row.id,
                title_snapshot=row.name,
                status="failure",
                error_message=err[:MAX_RUN_LOG_ERROR_LENGTH],
            )

        db.add(log)
        db.commit()


# ---------------------------------------------------------------------------
# 毎分呼ばれる tick
# ---------------------------------------------------------------------------

def _tick() -> None:
    """実行タイミングが来た SavedSearch をすべて実行する（毎分呼ばれる）。"""
    with _get_db() as db:
        try:
            now = datetime.now(timezone.utc)
            rows = db.scalars(
                select(SavedSearch).where(SavedSearch.schedule_enabled.is_(True))
            ).all()
            due = [r for r in rows if is_due(r, now)]
        except Exception:
            logger.exception("_tick: SavedSearch 一覧の取得に失敗しました")
            return

    for row in due:
        logger.info("SavedSearch '%s' (%s) をスケジュール実行します", row.name, row.id)
        try:
            execute_one(row.id)
        except Exception:
            logger.exception("SavedSearch %s の実行中に予期しないエラー", row.id)


# ---------------------------------------------------------------------------
# スケジューラの起動・停止
# ---------------------------------------------------------------------------

def start_scheduler() -> None:
    """アプリ起動時に呼ぶ。二重起動は無視する。"""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(_tick, "interval", minutes=1, id="saved_search_tick")
    _scheduler.start()
    logger.info("スケジューラ起動（1 分間隔）")


def stop_scheduler() -> None:
    """アプリ終了時に呼ぶ。"""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("スケジューラ停止")