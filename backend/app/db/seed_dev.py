"""
開発・フロントの初期表示・動作確認用データを投入する（冪等）。

  cd backend && python -m app.db.seed_dev

Docker:

  docker compose exec backend python -m app.db.seed_dev

documents / raw_data / saved_search / run_logs を揃える。
再実行すると同じキー（UUID・source など）に上書きマージされ、
[DEV-SEED] プレフィックス付きチャンクは不足分だけ追補される。

本番誤実行防止:
  - ``ENVIRONMENT`` または ``APP_ENV`` が ``production`` / ``prod`` のとき、
    デフォルトではシードを終了（exit 2）します。
  - どうしてもその接続先 DB へ入れる場合のみ ``ALLOW_DEV_SEED=1``（または true/yes/on）
    を設定してください（非推奨）。

ローカルでは ``ENVIRONMENT`` を未設定にするか ``development`` 等にしておけば
そのまま実行できます。
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import SessionLocal, init_db
from app.models.tables import Document, RawData, SavedSearch, SavedSearchRunLog

_DEV_SEED_URL = "https://knowledge-base.local/dev-seed#v1"

_PROD_ENV_NAMES = frozenset({"production", "prod"})


def _production_like_environment() -> bool:
    for key in ("ENVIRONMENT", "APP_ENV"):
        raw = (os.environ.get(key) or "").strip().lower()
        if raw in _PROD_ENV_NAMES:
            return True
    return False


def _explicit_dev_seed_override() -> bool:
    return os.environ.get("ALLOW_DEV_SEED", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _ensure_dev_seed_permitted() -> None:
    if not _production_like_environment():
        return
    if _explicit_dev_seed_override():
        print(
            "seed_dev: 警告: production 相当の ENV ですが ALLOW_DEV_SEED=1 のため続行します。",
            file=sys.stderr,
        )
        return
    print(
        "seed_dev: 中止しました。本番相当環境では開発用シードを実行しません。\n"
        "  ローカル: ENVIRONMENT を未設定にするか development にしてください。\n"
        "  意図的に続行する場合のみ ALLOW_DEV_SEED=1（非推奨）。",
        file=sys.stderr,
    )
    raise SystemExit(2)


def _uuid(key: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"{_DEV_SEED_URL}:{key}")


ID_SAVED_KNOWLEDGE = _uuid("saved-search-knowledge")
ID_SAVED_ARXIV = _uuid("saved-search-arxiv")
ID_LOG_SUCCESS = _uuid("run-log-success")
ID_LOG_FAILURE = _uuid("run-log-failure")
ID_LOG_UNTITLED = _uuid("run-log-untitled")

_DOC_PREFIX = "[DEV-SEED]"
_DOC_SAMPLES: list[str] = [
    f"{_DOC_PREFIX}\n\nローカル資料のダミーチャンク 1。ナレッジ画面・検索の表示確認用です。",
    f"{_DOC_PREFIX}\n\nダミーチャンク 2。ベクトルはチャンクごとに直交する単位ベクトルにしています。",
    f"{_DOC_PREFIX}\n\nダミーチャンク 3。保存検索・実行ログ UI の動作確認に使えます。",
]


def _unit_embedding(dim: int, index: int) -> list[float]:
    v = [0.0] * dim
    v[index % dim] = 1.0
    return v


def _seed_documents(db: Session) -> None:
    dim = 768
    n_existing = db.scalar(
        select(func.count()).select_from(Document).where(Document.text.like(f"{_DOC_PREFIX}%")),
    )
    n_existing = int(n_existing or 0)
    for i in range(n_existing, len(_DOC_SAMPLES)):
        db.add(
            Document(
                text=_DOC_SAMPLES[i],
                embedding=_unit_embedding(dim, i),
            )
        )


def _ensure_raw(db: Session, source: str, content: dict) -> None:
    row = db.scalar(select(RawData).where(RawData.source == source))
    if row is None:
        db.add(RawData(source=source, content=content))
    else:
        row.content = content


def _seed_raw_data(db: Session) -> None:
    _ensure_raw(
        db,
        "dev-seed:sample-metrics",
        {"title": "開発用サンプル指標", "unit": "count", "value": 42},
    )
    _ensure_raw(
        db,
        "dev-seed:sample-list",
        {"dataset": "demo", "rows": ["項目 A", "項目 B", "項目 C"]},
    )


def _upsert_saved_search(db: Session, row_id: uuid.UUID, **fields: object) -> None:
    row = db.get(SavedSearch, row_id)
    if row is None:
        db.add(SavedSearch(id=row_id, **fields))  # type: ignore[arg-type]
        return
    for k, v in fields.items():
        setattr(row, k, v)


def _seed_saved_searches(db: Session) -> None:
    now = datetime.now(timezone.utc)
    _upsert_saved_search(
        db,
        ID_SAVED_KNOWLEDGE,
        name="[開発seed] ローカル資料（定期実行）",
        query="映像表現 論文 検索",
        arxiv_ids=[],
        search_target="knowledge",
        top_k=5,
        interval_minutes=60,
        schedule_enabled=True,
        last_run_at=now,
    )
    _upsert_saved_search(
        db,
        ID_SAVED_ARXIV,
        name="[開発seed] arXiv キーワード",
        query="neural rendering",
        arxiv_ids=["2401.00001"],
        search_target="arxiv",
        top_k=10,
        interval_minutes=1440,
        schedule_enabled=False,
        last_run_at=None,
    )


def _upsert_run_log(db: Session, row_id: uuid.UUID, **fields: object) -> None:
    row = db.get(SavedSearchRunLog, row_id)
    if row is None:
        db.add(SavedSearchRunLog(id=row_id, **fields))  # type: ignore[arg-type]
        return
    for k, v in fields.items():
        setattr(row, k, v)


def _seed_run_logs(db: Session) -> None:
    _upsert_run_log(
        db,
        ID_LOG_SUCCESS,
        saved_search_id=ID_SAVED_KNOWLEDGE,
        title_snapshot="直近の実行（成功・サンプル）",
        status="success",
        error_message=None,
        imported_content="取り込み本文のプレビュー用テキストです。フロントの詳細パネル表示を確認できます。",
        imported_payload={"dev_seed": True, "items": [1, 2, 3]},
    )
    _upsert_run_log(
        db,
        ID_LOG_FAILURE,
        saved_search_id=ID_SAVED_ARXIV,
        title_snapshot="実行失敗サンプル",
        status="failure",
        error_message="開発用の固定エラーメッセージ（外部 API 未取得の想定）",
        imported_content=None,
        imported_payload=None,
    )
    _upsert_run_log(
        db,
        ID_LOG_UNTITLED,
        saved_search_id=ID_SAVED_KNOWLEDGE,
        title_snapshot="",
        status="success",
        error_message=None,
        imported_content=None,
        imported_payload={"note": "title_snapshot が空のとき UI は Untitled 表示の確認用"},
    )


def seed_dev(db: Session) -> None:
    """開発 DB にサンプル行を投入・更新する。"""
    _seed_documents(db)
    _seed_raw_data(db)
    _seed_saved_searches(db)
    _seed_run_logs(db)


def main() -> None:
    _backend_dir = Path(__file__).resolve().parent.parent.parent
    load_dotenv(_backend_dir / ".env")
    _ensure_dev_seed_permitted()
    init_db()
    session = SessionLocal()
    try:
        seed_dev(session)
        session.commit()
        print("seed_dev: OK (documents with [DEV-SEED], raw_data, saved_searches, run_logs)")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
