"""外部オープンデータ API からの取り込み（arXiv ほか将来拡張）。"""

import logging

from fastapi import APIRouter

from app.core.settings import get_data_dir
from app.schemas.ingest_api import (
    ArxivImportRequest,
    ArxivImportResponse,
    ArxivPreviewEntry,
    ArxivPreviewResponse,
)
from app.services.source_import import (
    entry_abs_url,
    entry_import_id,
    fetch_arxiv_entries,
    import_arxiv_to_data_dir,
    translate_import_http_errors,
)

logger = logging.getLogger(__name__)
_ARXIV = "arXiv"

router = APIRouter(prefix="/api/data/imports", tags=["data"])


@router.post("/arxiv/preview", response_model=ArxivPreviewResponse)
def preview_arxiv(req: ArxivImportRequest) -> ArxivPreviewResponse:
    """取得結果の一覧のみ返す（ディスクには保存しない）。"""
    with translate_import_http_errors(logger, source_label=_ARXIV):
        entries = fetch_arxiv_entries(
            arxiv_ids=list(req.arxiv_ids),
            search_query=req.search_query,
            max_results=req.max_results,
        )
        rows = [
            ArxivPreviewEntry(
                arxiv_id=entry_import_id(e),
                title=e.title,
                summary=e.summary,
                authors=e.authors,
                abs_url=entry_abs_url(e),
            )
            for e in entries
        ]
        return ArxivPreviewResponse(entries=rows)


@router.post("/arxiv", response_model=ArxivImportResponse)
def import_arxiv(req: ArxivImportRequest) -> ArxivImportResponse:
    with translate_import_http_errors(logger, source_label=_ARXIV):
        written = import_arxiv_to_data_dir(
            get_data_dir(),
            arxiv_ids=list(req.arxiv_ids),
            search_query=req.search_query,
            max_results=req.max_results,
        )
        return ArxivImportResponse(written=written, entry_count=len(written))
