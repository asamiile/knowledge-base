from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# どこから起動しても backend/.env を読む（Compose は ./backend:/app のためコンテナ内でも同じパス）
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routes_analyze import router as analyze_router
from app.db import get_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="knowledge-base API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "knowledge-base-api"}


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
