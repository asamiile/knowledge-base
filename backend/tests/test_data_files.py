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
