import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps_auth import get_effective_user_id
from app.db import get_db
from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services.analyze import run_analyze, run_analyze_stream

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze/stream")
def analyze_stream(
    req: AnalyzeRequest,
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> StreamingResponse:
    return StreamingResponse(
        run_analyze_stream(db, req, user_id=user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(
    req: AnalyzeRequest,
    db: Session = Depends(get_db),
    user_id: UUID | None = Depends(get_effective_user_id),
) -> AnalyzeResponse:
    try:
        return run_analyze(db, req, user_id=user_id)
    except RuntimeError as e:
        msg = str(e)
        if "GOOGLE_API_KEY" in msg:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini API キーが未設定です。`backend/.env` に `GOOGLE_API_KEY=...` を記載し、"
                    "API（uvicorn または `docker compose up`）を再起動してください。"
                ),
            ) from e
        raise HTTPException(status_code=500, detail=msg) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=502,
            detail={"message": "モデル応答が契約と一致しません", "errors": e.errors()},
        ) from e
    except Exception as e:
        logger.exception("POST /api/analyze failed")
        raise HTTPException(
            status_code=502,
            detail=f"{type(e).__name__}: {e}",
        ) from e
