import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services.analyze import run_analyze

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, db: Session = Depends(get_db)) -> AnalyzeResponse:
    try:
        return run_analyze(db, req)
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
