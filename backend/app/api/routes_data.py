"""DATA_DIR へのファイルアップロード。"""

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.settings import get_data_dir
from app.schemas.ingest_api import DataUploadResponse

router = APIRouter(prefix="/api/data", tags=["data"])

_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
_ALLOWED = {".md", ".txt", ".json"}


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


@router.post("/upload", response_model=DataUploadResponse)
async def upload_source(file: UploadFile = File(...)) -> DataUploadResponse:
    """アップロードしたファイルを `data/uploads/` に保存（取り込みは `reindex_sources: true`）。"""
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
    rel = dest.relative_to(data_dir)
    return DataUploadResponse(
        path=str(rel).replace("\\", "/"),
        filename=filename,
        size_bytes=len(raw),
    )
