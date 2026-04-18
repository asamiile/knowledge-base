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
from app.models.tables import (
    Document,
    QuestionHistory,
    RawData,
    SavedSearch,
    SavedSearchRunLog,
    User,
)

_DEV_SEED_URL = "https://spira-base.local/dev-seed#v1"

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
ID_SAVED_ARXIV_MULTI = _uuid("saved-search-arxiv-multi")
ID_SAVED_ARXIV_RECENT = _uuid("saved-search-arxiv-recent")
ID_SAVED_ARXIV_NEW = _uuid("saved-search-arxiv-new")
ID_LOG_SUCCESS = _uuid("run-log-success")
ID_LOG_FAILURE = _uuid("run-log-failure")
ID_LOG_UNTITLED = _uuid("run-log-untitled")
ID_LOG_ARXIV_WRITTEN = _uuid("run-log-arxiv-written")

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
    seed_source = "dev-seed/sample.md"
    for i in range(n_existing, len(_DOC_SAMPLES)):
        db.add(
            Document(
                text=_DOC_SAMPLES[i],
                embedding=_unit_embedding(dim, i),
                source_path=seed_source,
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


def _resolve_seed_owner_id(db: Session) -> uuid.UUID | None:
    email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    if not email:
        return None
    return db.scalar(select(User.id).where(User.email == email))


def _seed_saved_searches(db: Session, owner_id: uuid.UUID | None) -> None:
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    own = {"user_id": owner_id}
    # 1. knowledge 検索・定期実行オン・最終実行あり（数分前）
    _upsert_saved_search(
        db,
        ID_SAVED_KNOWLEDGE,
        **own,
        name="[開発seed] ローカル資料（定期実行）",
        query="映像表現 論文 検索",
        arxiv_ids=[],
        search_target="knowledge",
        top_k=5,
        interval_minutes=60,
        schedule_enabled=True,
        last_run_at=now - timedelta(minutes=3),
    )
    # 2. arXiv キーワード + ID 混在・定期実行オフ・未実行
    _upsert_saved_search(
        db,
        ID_SAVED_ARXIV,
        **own,
        name="[開発seed] arXiv キーワード",
        query="neural rendering",
        arxiv_ids=["2401.00001"],
        search_target="arxiv",
        top_k=10,
        interval_minutes=1440,
        schedule_enabled=False,
        last_run_at=None,
    )
    # 3. arXiv 複数ID + キーワード・定期実行オン（6時間）・最終実行 3 時間前
    _upsert_saved_search(
        db,
        ID_SAVED_ARXIV_MULTI,
        **own,
        name="[開発seed] arXiv 複数ID＋キーワード（定期オン）",
        query="diffusion model video generation",
        arxiv_ids=["2312.00001", "2312.00002", "2401.12345"],
        search_target="arxiv",
        top_k=5,
        interval_minutes=360,
        schedule_enabled=True,
        last_run_at=now - timedelta(hours=3),
    )
    # 4. arXiv キーワードのみ・定期なし・最終実行 昨日
    _upsert_saved_search(
        db,
        ID_SAVED_ARXIV_RECENT,
        **own,
        name="[開発seed] arXiv 昨日実行済み",
        query="3D gaussian splatting",
        arxiv_ids=[],
        search_target="arxiv",
        top_k=3,
        interval_minutes=0,
        schedule_enabled=False,
        last_run_at=now - timedelta(hours=26),
    )
    # 5. arXiv ID のみ・定期実行オン（15分）・未実行（新規追加直後を想定）
    _upsert_saved_search(
        db,
        ID_SAVED_ARXIV_NEW,
        **own,
        name="[開発seed] 新規追加（未実行）",
        query="",
        arxiv_ids=["2501.00001", "2501.00002"],
        search_target="arxiv",
        top_k=5,
        interval_minutes=15,
        schedule_enabled=True,
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
    # /saved/logs のファイルリンク表示確認用（imported_payload.written あり）
    _upsert_run_log(
        db,
        ID_LOG_ARXIV_WRITTEN,
        saved_search_id=ID_SAVED_ARXIV,
        title_snapshot="[開発seed] arXiv キーワード",
        status="success",
        error_message=None,
        imported_content="imports/arxiv/2501.00001v1.md\nimports/arxiv/2501.00002v1.md",
        imported_payload={
            "written": [
                "imports/arxiv/2501.00001v1.md",
                "imports/arxiv/2501.00002v1.md",
            ]
        },
    )


def _seed_question_history(db: Session, owner_id: uuid.UUID | None) -> None:
    # シード済みの Document を引用として使う（source_path 表示確認）
    doc_rows = db.execute(
        select(Document.id, Document.source_path)
        .where(Document.text.like(f"{_DOC_PREFIX}%"))
        .order_by(Document.id)
        .limit(3)
    ).all()
    citations_with_path = [
        {
            "document_id": row.id,
            "excerpt": f"シード用のダミー引用テキストです（doc #{row.id}）。ソース表示・リンクの動作確認に使います。",
            "source_path": row.source_path,
        }
        for row in doc_rows[:2]
    ]
    citations_no_path = [
        {
            "document_id": row.id,
            "excerpt": f"source_path なしのフォールバック表示確認用（doc #{row.id}）。",
            "source_path": None,
        }
        for row in doc_rows[2:3]
    ]

    samples: list[tuple[str, dict]] = [
        (
            "[DEV-SEED] 質問履歴の表示確認（1）",
            {
                "answer": "seed による固定回答です。質問画面の履歴リストで確認できます。",
                "key_points": ["seed サンプル", "GET /api/knowledge/question-history"],
                "citations": [],
            },
        ),
        (
            "[DEV-SEED] 質問履歴の表示確認（2）",
            {
                "answer": "別のサンプル応答です。",
                "key_points": ["JSONB の response", "citations は空でも可"],
                "citations": [],
            },
        ),
        (
            "[DEV-SEED] ソース表示の確認（source_path あり）",
            {
                "answer": "引用にファイルパスが付いているとき、/file?path=... へのリンクが表示されます。",
                "key_points": [
                    "Citation.source_path が設定されているとリンク表示",
                    "source_path が null のときは doc #id のフォールバック表示",
                ],
                "citations": citations_with_path + citations_no_path,
            },
        ),
    ]
    for q, resp in samples:
        row = db.scalar(
            select(QuestionHistory).where(QuestionHistory.question == q)
        )
        if row is None:
            db.add(QuestionHistory(user_id=owner_id, question=q, response=resp))
        else:
            row.response = resp
            if owner_id is not None:
                row.user_id = owner_id


def _seed_admin_user(db: Session) -> None:
    """ADMIN_EMAIL と ADMIN_PASSWORD があるとき、未登録なら users に1件追加。平文は .env のみ。"""
    email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD") or ""
    if not email or not password:
        return
    from app.core.auth import hash_password

    exists = db.scalar(select(func.count()).select_from(User).where(User.email == email))
    if int(exists or 0) > 0:
        return
    db.add(
        User(
            email=email,
            hashed_password=hash_password(password),
            is_active=True,
        )
    )
    print(
        f"seed_dev: ログイン用ユーザーを作成しました（{email}）。"
        " パスワードは運用でユーザーに安全に伝達してください。",
        file=sys.stderr,
    )


def seed_dev(db: Session) -> None:
    """開発 DB にサンプル行を投入・更新する。"""
    _seed_documents(db)
    _seed_raw_data(db)
    _seed_admin_user(db)
    owner_id = _resolve_seed_owner_id(db)
    _seed_saved_searches(db, owner_id)
    _seed_run_logs(db)
    _seed_question_history(db, owner_id)


def main() -> None:
    _backend_dir = Path(__file__).resolve().parent.parent.parent
    load_dotenv(_backend_dir / ".env")
    _ensure_dev_seed_permitted()
    init_db()
    session = SessionLocal()
    try:
        seed_dev(session)
        session.commit()
        print(
            "seed_dev: OK (documents, raw_data, saved_searches, run_logs, question_history, users?)",
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
