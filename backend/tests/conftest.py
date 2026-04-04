"""DB 付きテスト用。DATABASE_URL は import より前に確定させる。"""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# CI: localhost の Postgres。ローカルは docker compose の db を 5432 で公開した前提。
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://knowledge:knowledge@127.0.0.1:5432/knowledge",
)

_repo_root = Path(__file__).resolve().parents[2]
# STEP 3: backend/data/（サンプル Markdown・DATA_DIR の既定に合わせる）
os.environ.setdefault("DATA_DIR", str(_repo_root / "backend" / "data"))


@pytest.fixture
def client() -> TestClient:
    """ASGI 直結のテストクライアント。"""
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def clean_documents() -> None:
    """documents / raw_data を空にする（STEP 3 スモーク向け）。"""
    from sqlalchemy import delete

    from app.db.session import SessionLocal
    from app.models.tables import Document, RawData

    session = SessionLocal()
    try:
        session.execute(delete(Document))
        session.execute(delete(RawData))
        session.commit()
    finally:
        session.close()
    yield


@pytest.fixture
def clean_saved_searches() -> None:
    """saved_material_searches を空にする。"""
    from sqlalchemy import delete

    from app.db.session import SessionLocal
    from app.models.tables import SavedSearch

    session = SessionLocal()
    try:
        session.execute(delete(SavedSearch))
        session.commit()
    finally:
        session.close()
    yield
