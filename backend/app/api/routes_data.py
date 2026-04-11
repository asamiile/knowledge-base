"""DATA_DIR へのファイルアップロード・再取り込み。"""

from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.settings import get_data_dir
from app.db import get_db
from app.schemas.ingest_api import (
    DataFileInfo,
    DataFilesResponse,
    DataReindexResponse,
    DataUploadResponse,
    FileEnrichmentResponse,
)
from app.services.data_dir_listing import list_data_dir_files
from app.services.external import enrichment_for_data_relative_path
from app.services.embeddings import build_embedding_model
from app.services.extract.pdf_upload import write_pdf_extracted_markdown
from app.services.ingest import ingest_data_directory

router = APIRouter(prefix="/api/data", tags=["data"])


def _safe_relative_data_path(path: str) -> str:
    raw = (path or "").strip().replace("\\", "/").lstrip("/")
    if not raw or ".." in raw.split("/"):
        raise HTTPException(status_code=400, detail="不正な path です。")
    return raw


@router.get("/files/enrichment", response_model=FileEnrichmentResponse)
def file_enrichment(path: str) -> FileEnrichmentResponse:
    """arXiv Atom を主に、引用数のみ OpenAlex で表示用メタを組み立てる。"""
    rel = _safe_relative_data_path(path)
    enr = enrichment_for_data_relative_path(rel)
    return FileEnrichmentResponse(
        path=rel,
        display_name=enr.display_name,
        arxiv_id=enr.arxiv_id,
        citation_count=enr.citation_count,
        summary=enr.summary,
        tldr=enr.tldr,
        sources=enr.sources,
    )


@router.get("/files/lookup", response_model=DataFileInfo)
def lookup_data_file(path: str) -> DataFileInfo:
    """`DATA_DIR` から相対パスで 1 ファイルのメタを返す（一覧の件数上限に依存しない）。"""
    rel = _safe_relative_data_path(path)
    data_dir = get_data_dir().resolve()
    target = (data_dir / rel).resolve()
    try:
        rel_resolved = target.relative_to(data_dir)
    except ValueError:
        raise HTTPException(status_code=400, detail="不正な path です。") from None
    if any(part.startswith(".") for part in rel_resolved.parts):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません。")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="ファイルが見つかりません。")
    st = target.stat()
    mtime = datetime.fromtimestamp(st.st_mtime, tz=UTC)
    posix = str(rel_resolved).replace("\\", "/")
    return DataFileInfo(path=posix, size_bytes=st.st_size, modified_at=mtime)


@router.get("/files", response_model=DataFilesResponse)
def list_data_dir_files_endpoint(limit: int = 2000) -> DataFilesResponse:
    """`DATA_DIR` 配下のファイル一覧（`.` で始まるパス成分は除外）。"""
    lim = max(1, min(limit, 5000))
    data_dir = get_data_dir().resolve()
    rows = list_data_dir_files(data_dir, limit=lim)
    return DataFilesResponse(
        files=[DataFileInfo(path=p, size_bytes=s, modified_at=m) for p, s, m in rows],
    )


_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
_ALLOWED = {".md", ".txt", ".json", ".pdf"}


def _safe_upload_name(name: str) -> str:
    base = Path(name).name
    if not base or base in {".", ".."}:
        raise HTTPException(status_code=400, detail="不正なファイル名です。")
    suf = Path(base).suffix.lower()
    if suf not in _ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=f"拡張子は {', '.join(sorted(_ALLOWED))} のみ対応しています。",
        )
    return base


@router.post("/reindex", response_model=DataReindexResponse)
def reindex_data_dir(db: Session = Depends(get_db)) -> DataReindexResponse:
    """`DATA_DIR` ツリーを再取り込み（`documents` / `raw_data` を置換）。LLM は呼ばない。"""
    try:
        embed_model = build_embedding_model()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    data_dir = get_data_dir().resolve()
    doc_chunks, raw_rows = ingest_data_directory(db, embed_model, data_dir)
    return DataReindexResponse(
        document_chunks=doc_chunks,
        raw_data_rows=raw_rows,
    )


@router.post("/upload", response_model=DataUploadResponse)
async def upload_source(file: UploadFile = File(...)) -> DataUploadResponse:
    """アップロードしたファイルを `data/uploads/` に保存（取り込みは `POST /api/data/reindex` 等）。

    PDF の場合は案 A に従い、抽出テキストを `uploads/extracted/{stem}.md` にも書き出す。
    """
    filename = _safe_upload_name(file.filename or "")
    raw = await file.read()
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"ファイルサイズは {_MAX_UPLOAD_BYTES // (1024 * 1024)} MiB 以下にしてください。",
        )

    data_dir = get_data_dir().resolve()
    dest_dir = data_dir / "uploads"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    dest.write_bytes(raw)
    if Path(filename).suffix.lower() == ".pdf":
        try:
            write_pdf_extracted_markdown(
                data_dir, upload_filename=filename, pdf_bytes=raw
            )
        except ValueError as e:
            dest.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=str(e)) from e

    rel = dest.relative_to(data_dir)
    return DataUploadResponse(
        path=str(rel).replace("\\", "/"),
        filename=filename,
        size_bytes=len(raw),
    )
