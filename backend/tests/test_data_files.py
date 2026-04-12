"""GET /api/data/files のテスト。"""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient


def test_list_data_files_respects_data_dir(
    client: TestClient, tmp_path: Path, monkeypatch,
) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    (tmp_path / "note.md").write_text("hello", encoding="utf-8")
    sub = tmp_path / "imports" / "arxiv"
    sub.mkdir(parents=True)
    (sub / "x.md").write_text("y", encoding="utf-8")
    (tmp_path / ".hidden").write_text("no", encoding="utf-8")

    r = client.get("/api/data/files")
    assert r.status_code == 200, r.text
    paths = {f["path"] for f in r.json()["files"]}
    assert "note.md" in paths
    assert "imports/arxiv/x.md" in paths
    assert ".hidden" not in paths


def test_lookup_data_file(
    client: TestClient, tmp_path: Path, monkeypatch,
) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    sub = tmp_path / "imports" / "arxiv"
    sub.mkdir(parents=True)
    (sub / "1709.06342v4.md").write_text("x", encoding="utf-8")

    r = client.get(
        "/api/data/files/lookup",
        params={"path": "imports/arxiv/1709.06342v4.md"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["path"] == "imports/arxiv/1709.06342v4.md"
    assert body["size_bytes"] == len("x".encode("utf-8"))

    r404 = client.get("/api/data/files/lookup", params={"path": "missing.md"})
    assert r404.status_code == 404
