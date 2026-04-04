"""POST /api/analyze の動作確認（Gemini はモック。Postgres + pgvector が必要）。"""

from __future__ import annotations

import json
import re
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import engine
from app.models.tables import Document


def _model_embedding_dimensions() -> int:
    """SQLAlchemy モデル上の vector 次元。"""
    dim = getattr(Document.embedding.type, "dim", None)
    if dim is None:
        return 768
    return int(dim)


def _live_embedding_dimensions() -> int:
    """DB の documents.embedding 列の次元（create_all を古いままにした環境でもテスト可能）。"""
    q = text(
        """
        SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) AS fmt
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
        WHERE c.relname = 'documents'
          AND a.attname = 'embedding'
          AND a.attnum > 0
          AND NOT a.attisdropped
        """
    )
    with engine.connect() as conn:
        fmt = conn.execute(q).scalar()
    m = re.search(r"vector\((\d+)\)", str(fmt or ""))
    if m:
        return int(m.group(1))
    return _model_embedding_dimensions()


class FakeEmbedder:
    """固定ゼロベクトル（次元は実行中の DB 列に合わせる）。"""

    def __init__(self, dim: int) -> None:
        self._dim = dim

    def get_text_embedding(self, text: str) -> list[float]:
        return [0.0] * self._dim

    def get_text_embedding_batch(self, texts: list[str]) -> list[list[float]]:
        return [[0.0] * self._dim for _ in texts]


@pytest.mark.usefixtures("clean_documents")
def test_analyze_smoke_auto_ingest_with_mocked_gemini(
    client: TestClient,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DATA_DIR に .md があり、インデックス空なら自動取り込み → RAG 応答まで通る。"""
    live = _live_embedding_dimensions()
    model_dim = _model_embedding_dimensions()
    if live != model_dim:
        pytest.skip(
            f"DB の documents.embedding は {live} 次元だが、ORM は {model_dim} 次元です。"
            " docker の pgdata を初期化するか列を ALTER して揃えてください。"
        )
    dim = model_dim

    (tmp_path / "note.md").write_text(
        "# スモーク\nこの本文はテスト用です。", encoding="utf-8"
    )

    monkeypatch.setenv("GOOGLE_API_KEY", "fake-key-for-test")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    import app.services.analyze as analyze_mod

    monkeypatch.setattr(
        analyze_mod,
        "build_embedding_model",
        lambda: FakeEmbedder(dim),
    )

    def fake_genai_client(*args: object, **kwargs: object) -> MagicMock:
        mock = MagicMock()

        def generate_content(**kw: object) -> MagicMock:
            from app.db.session import SessionLocal
            from app.models.tables import Document

            session = SessionLocal()
            try:
                first = session.query(Document).order_by(Document.id).first()
                doc_id = first.id if first else 1
            finally:
                session.close()

            payload = {
                "answer": "スモークテスト応答",
                "key_points": ["ポイント1"],
                "citations": [
                    {"document_id": doc_id, "excerpt": "テスト用抜粋"},
                ],
            }
            resp = MagicMock()
            resp.text = json.dumps(payload, ensure_ascii=False)
            return resp

        mock.models.generate_content = generate_content
        return mock

    monkeypatch.setattr(analyze_mod.genai, "Client", fake_genai_client)

    res = client.post(
        "/api/analyze",
        json={"question": "内容は何ですか", "reindex_sources": False, "top_k": 2},
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body.get("answer") == "スモークテスト応答"
    assert body.get("key_points") == ["ポイント1"]
    assert len(body.get("citations", [])) == 1
    assert body["citations"][0]["document_id"] >= 1
