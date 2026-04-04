"""POST /api/analyze の入力検証と API キー未設定時の挙動。"""

import pytest
from fastapi.testclient import TestClient


def test_analyze_rejects_empty_question(client: TestClient) -> None:
    response = client.post("/api/analyze", json={"question": ""})
    assert response.status_code == 422


def test_analyze_without_api_key_returns_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    response = client.post(
        "/api/analyze",
        json={"question": "テスト", "reindex_sources": False},
    )
    assert response.status_code == 503
    assert "GOOGLE_API_KEY" in response.json().get("detail", "")


def test_openapi_lists_analyze(client: TestClient) -> None:
    spec = client.get("/openapi.json").json()
    paths = spec.get("paths", {})
    assert "/api/analyze" in paths
    post = paths["/api/analyze"]["post"]
    assert post["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "AnalyzeRequest"
    )
