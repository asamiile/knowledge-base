"""外部オープンデータ API からの取り込み（arXiv ほか将来拡張）。"""

import logging
import xml.etree.ElementTree as ET

import httpx
from fastapi import APIRouter, HTTPException

from app.core.settings import get_data_dir
from app.schemas.ingest_api import ArxivImportRequest, ArxivImportResponse
from app.services.source_import.arxiv import import_arxiv_to_data_dir

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data/imports", tags=["data"])


@router.post("/arxiv", response_model=ArxivImportResponse)
def import_arxiv(req: ArxivImportRequest) -> ArxivImportResponse:
    try:
        written = import_arxiv_to_data_dir(
            get_data_dir(),
            arxiv_ids=list(req.arxiv_ids),
            search_query=req.search_query,
            max_results=req.max_results,
        )
        return ArxivImportResponse(written=written, entry_count=len(written))
    except httpx.HTTPError as e:
        logger.warning("arXiv API request failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail=f"arXiv API 取得に失敗しました: {e}",
        ) from e
    except ET.ParseError as e:
        logger.warning("arXiv Atom parse failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail=f"arXiv 応答の解析に失敗しました: {e}",
        ) from e
