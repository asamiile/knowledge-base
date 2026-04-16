from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# どこから起動しても backend/.env を読む（Compose は ./backend:/app のためコンテナ内でも同じパス）
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import (
    cors_allow_credentials,
    get_cors_allow_origins,
    is_production_environment,
)
from app.api.deps_auth import require_auth
from app.api.routes_analyze import router as analyze_router
from app.api.routes_auth import router as auth_router
from app.api.routes_data import router as data_router
from app.api.routes_imports import router as imports_router
from app.api.routes_knowledge import router as knowledge_router
from app.db import get_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    from app.services.scheduler import start_scheduler, stop_scheduler
    start_scheduler()
    yield
    stop_scheduler()


_prod = is_production_environment()
app = FastAPI(
    title="spira-base API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if _prod else "/docs",
    redoc_url=None if _prod else "/redoc",
    openapi_url=None if _prod else "/openapi.json",
)


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    for path_item in schema.get("paths", {}).values():
        for op in path_item.values():
            if not isinstance(op, dict):
                continue
            ok = op.get("responses", {}).get("200")
            if isinstance(ok, dict) and ok.get("description") == "Successful Response":
                ok["description"] = "Success"
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_allow_origins(),
    allow_credentials=cors_allow_credentials(),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(analyze_router, dependencies=[Depends(require_auth)])
app.include_router(data_router, dependencies=[Depends(require_auth)])
app.include_router(imports_router, dependencies=[Depends(require_auth)])
app.include_router(knowledge_router, dependencies=[Depends(require_auth)])


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "spira-base-api"}


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
