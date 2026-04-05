"""STEP 4 — アップロード・arXiv 取り込み API の単体テスト。"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient


def test_upload_rejects_unknown_extension(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    files = {"file": ("bad.exe", b"x", "application/octet-stream")}
    r = client.post("/api/data/upload", files=files)
    assert r.status_code == 400


def test_upload_writes_under_uploads(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    files = {"file": ("note.md", b"# hello\n", "text/markdown")}
    r = client.post("/api/data/upload", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["path"] == "uploads/note.md"
    assert body["size_bytes"] == len(b"# hello\n")
    assert (tmp_path / "uploads" / "note.md").is_file()


_ATOM_SAMPLE = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.00001v1</id>
    <title>  Sample Paper  </title>
    <summary>Test abstract.</summary>
    <author><name>Alice Example</name></author>
  </entry>
</feed>
"""


def test_preview_arxiv_mocked(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("DATA_DIR", str(Path("/tmp/arxiv-preview-test")))

    def fake_get(*_args: object, **_kwargs: object) -> str:
        return _ATOM_SAMPLE

    with patch(
        "app.services.source_import.arxiv._arxiv_get",
        side_effect=fake_get,
    ):
        r = client.post(
            "/api/data/imports/arxiv/preview",
            json={"arxiv_ids": ["2301.00001"]},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["entries"]) == 1
    e = body["entries"][0]
    assert e["title"] == "Sample Paper"
    assert "2301.00001" in e["arxiv_id"]
    assert e["abs_url"].startswith("https://arxiv.org/abs/")
    assert e["summary"] == "Test abstract."


def test_import_arxiv_by_id_mocked(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    def fake_get(*_args: object, **_kwargs: object) -> str:
        return _ATOM_SAMPLE

    with patch(
        "app.services.source_import.arxiv._arxiv_get",
        side_effect=fake_get,
    ):
        r = client.post(
            "/api/data/imports/arxiv",
            json={"arxiv_ids": ["2301.00001"]},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["entry_count"] == 1
    assert len(body["written"]) == 1
    assert body["written"][0].startswith("imports/arxiv/")
    md = tmp_path / body["written"][0]
    assert md.is_file()
    text = md.read_text(encoding="utf-8")
    assert "Sample Paper" in text
    assert "https://arxiv.org/abs/" in text
    assert "Test abstract." in text
    assert "Full text (from PDF)" not in text


def test_import_arxiv_include_full_text_appends_body(
    client: TestClient, tmp_path: Path, monkeypatch
) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    def fake_atom(*_args: object, **_kwargs: object) -> str:
        return _ATOM_SAMPLE

    with (
        patch(
            "app.services.source_import.arxiv._arxiv_get",
            side_effect=fake_atom,
        ),
        patch(
            "app.services.source_import.arxiv.fetch_arxiv_pdf_bytes",
            return_value=b"%PDF-fake",
        ),
        patch(
            "app.services.source_import.arxiv.extract_plain_text_from_pdf_bytes",
            return_value="Introduction\n\nFull paper body here.",
        ),
    ):
        r = client.post(
            "/api/data/imports/arxiv",
            json={
                "arxiv_ids": ["2301.00001"],
                "include_full_text": True,
            },
        )
    assert r.status_code == 200, r.text
    written = r.json()["written"][0]
    text = (tmp_path / written).read_text(encoding="utf-8")
    assert "Full text (from PDF)" in text
    assert "Full paper body here." in text


def test_import_arxiv_validation_requires_source(client: TestClient) -> None:
    r = client.post("/api/data/imports/arxiv", json={})
    assert r.status_code == 422


def test_reindex_mocked(client: TestClient, clean_documents: None) -> None:
    """embedding / ingest をモックし、応答形状だけ確認する。"""
    with (
        patch(
            "app.api.routes_data.build_embedding_model",
            return_value=MagicMock(),
        ),
        patch(
            "app.api.routes_data.ingest_data_directory",
            return_value=(7, 2),
        ),
    ):
        r = client.post("/api/data/reindex")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["document_chunks"] == 7
    assert body["raw_data_rows"] == 2


def test_knowledge_stats(client: TestClient, clean_documents: None) -> None:
    """空インデックスでも 200 と 0 件が返る。"""
    r = client.get("/api/knowledge/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["document_chunks"] == 0
    assert body["raw_data_rows"] == 0


def test_upload_pdf_writes_extracted_markdown(
    client: TestClient, tmp_path: Path, monkeypatch
) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    def fake_extract(_data: bytes) -> str:
        return "Hello from PDF"

    with patch(
        "app.services.extract.pdf_upload.extract_plain_text_from_pdf_bytes",
        side_effect=fake_extract,
    ):
        r = client.post(
            "/api/data/upload",
            files={"file": ("doc.pdf", b"%PDF-1.4\n", "application/pdf")},
        )
    assert r.status_code == 200, r.text
    md = tmp_path / "uploads" / "extracted" / "doc.md"
    assert md.is_file()
    assert "Hello from PDF" in md.read_text(encoding="utf-8")
    assert "doc.pdf" in md.read_text(encoding="utf-8")


def test_upload_pdf_invalid_returns_400(
    client: TestClient, tmp_path: Path, monkeypatch
) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    r = client.post(
        "/api/data/upload",
        files={"file": ("bad.pdf", b"not a pdf", "application/pdf")},
    )
    assert r.status_code == 400
    assert not (tmp_path / "uploads" / "bad.pdf").is_file()


def test_import_arxiv_http_error(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    def boom(*_a: object, **_k: object) -> None:
        raise httpx.HTTPError("fail")

    with patch("app.services.source_import.arxiv._arxiv_get", side_effect=boom):
        r = client.post(
            "/api/data/imports/arxiv",
            json={"arxiv_ids": ["2301.00001"]},
        )
    assert r.status_code == 502
