"""GET/POST/PATCH/DELETE /api/knowledge/saved-searches"""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient


def test_saved_searches_crud(
    client: TestClient,
    clean_saved_searches: None,
) -> None:
    r = client.get("/api/knowledge/saved-searches")
    assert r.status_code == 200
    assert r.json() == []

    r = client.post(
        "/api/knowledge/saved-searches",
        json={
            "name": "テスト1",
            "query": "hello world",
            "top_k": 5,
            "interval_minutes": 15,
            "schedule_enabled": True,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "テスト1"
    assert body["query"] == "hello world"
    assert body["arxiv_ids"] == []
    assert body["search_target"] == "knowledge"
    assert body["top_k"] == 5
    assert body["interval_minutes"] == 15
    assert body["schedule_enabled"] is True
    sid = body["id"]

    r = client.get("/api/knowledge/saved-searches")
    assert r.status_code == 200
    assert len(r.json()) == 1

    ts = datetime.now(timezone.utc).isoformat()
    r = client.patch(
        f"/api/knowledge/saved-searches/{sid}",
        json={"last_run_at": ts, "schedule_enabled": False},
    )
    assert r.status_code == 200, r.text
    patched = r.json()
    assert patched["schedule_enabled"] is False
    assert patched["last_run_at"] is not None

    r = client.delete(f"/api/knowledge/saved-searches/{sid}")
    assert r.status_code == 204

    r = client.get("/api/knowledge/saved-searches")
    assert r.json() == []


def test_saved_search_patch_404(client: TestClient, clean_saved_searches: None) -> None:
    fake = uuid4()
    r = client.patch(
        f"/api/knowledge/saved-searches/{fake}",
        json={"name": "x"},
    )
    assert r.status_code == 404


def test_saved_search_interval_zero_disables_schedule(
    client: TestClient,
    clean_saved_searches: None,
) -> None:
    r = client.post(
        "/api/knowledge/saved-searches",
        json={
            "name": "a",
            "query": "q",
            "top_k": 3,
            "interval_minutes": 0,
            "schedule_enabled": True,
        },
    )
    assert r.status_code == 200
    assert r.json()["schedule_enabled"] is False


def test_saved_search_create_arxiv_target(
    client: TestClient,
    clean_saved_searches: None,
) -> None:
    r = client.post(
        "/api/knowledge/saved-searches",
        json={
            "name": "arxiv q",
            "query": "diffusion",
            "search_target": "arxiv",
            "top_k": 10,
            "interval_minutes": 0,
            "schedule_enabled": False,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["search_target"] == "arxiv"
    assert r.json()["arxiv_ids"] == []
    assert r.json()["top_k"] == 10


def test_saved_search_create_arxiv_ids_only(
    client: TestClient,
    clean_saved_searches: None,
) -> None:
    r = client.post(
        "/api/knowledge/saved-searches",
        json={
            "name": "ids only",
            "query": "",
            "arxiv_ids": ["2301.00001", "2302.00001"],
            "search_target": "arxiv",
            "top_k": 5,
            "interval_minutes": 0,
            "schedule_enabled": False,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["query"] == ""
    assert body["arxiv_ids"] == ["2301.00001", "2302.00001"]


def test_saved_search_create_arxiv_requires_input(
    client: TestClient,
    clean_saved_searches: None,
) -> None:
    r = client.post(
        "/api/knowledge/saved-searches",
        json={
            "name": "empty arxiv",
            "query": "",
            "arxiv_ids": [],
            "search_target": "arxiv",
        },
    )
    assert r.status_code == 422
