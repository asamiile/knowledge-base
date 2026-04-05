"""GET/POST /api/knowledge/saved-search-run-logs"""

from uuid import uuid4

from fastapi.testclient import TestClient


def test_saved_run_logs_empty(client: TestClient, clean_run_logs: None) -> None:
    r = client.get("/api/knowledge/saved-search-run-logs")
    assert r.status_code == 200
    assert r.json() == []


def test_saved_run_logs_create_and_get(
    client: TestClient,
    clean_run_logs: None,
) -> None:
    r = client.post(
        "/api/knowledge/saved-search-run-logs",
        json={
            "title_snapshot": "Untitled",
            "status": "success",
            "imported_content": "# Paper A\n\nAbstract here.",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    log_id = body["id"]
    assert body["title_snapshot"] == "Untitled"
    assert body["status"] == "success"
    assert body["imported_content"] == "# Paper A\n\nAbstract here."

    r = client.get(f"/api/knowledge/saved-search-run-logs/{log_id}")
    assert r.status_code == 200
    assert r.json()["imported_content"] == "# Paper A\n\nAbstract here."

    r = client.get("/api/knowledge/saved-search-run-logs")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_saved_run_logs_get_404(
    client: TestClient,
    clean_run_logs: None,
) -> None:
    r = client.get(f"/api/knowledge/saved-search-run-logs/{uuid4()}")
    assert r.status_code == 404
