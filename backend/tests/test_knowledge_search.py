"""POST /api/knowledge/search の形状確認（ingest はモック）。"""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient


def test_material_search_mocked(client: TestClient, clean_documents: None) -> None:
    fake_rows = [
        (1, "hello chunk", 0.12, "imports/arxiv/a.md"),
        (2, "world", 0.34, None),
    ]
    with (
        patch(
            "app.api.deps.build_embedding_model",
            return_value=MagicMock(),
        ),
        patch(
            "app.api.routes_knowledge.run_material_search",
            return_value=fake_rows,
        ),
    ):
        r = client.post(
            "/api/knowledge/search",
            json={"query": "test question", "top_k": 2},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["hits"]) == 2
    assert body["hits"][0]["document_id"] == 1
    assert body["hits"][0]["distance"] == 0.12
    assert "hello" in body["hits"][0]["text"]
    assert body["hits"][0]["source_path"] == "imports/arxiv/a.md"
    assert body["hits"][1]["source_path"] is None


def test_material_search_validation(client: TestClient) -> None:
    with patch("app.api.deps.build_embedding_model", return_value=MagicMock()):
        r = client.post("/api/knowledge/search", json={"query": ""})
    assert r.status_code == 422
