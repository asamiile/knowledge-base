"""API の最小疎通テスト。

`fastapi.testclient.TestClient` は内部的に httpx で ASGI に接続する。
"""

from fastapi.testclient import TestClient


def test_root_returns_200(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body.get("service") == "spira-base-api"


def test_health_returns_200(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
