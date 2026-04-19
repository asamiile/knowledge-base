from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_database_url
from app.db.base import Base
from app.db.documents_migrate import migrate_documents_schema
from app.db.saved_search_migrate import migrate_saved_search_schema
from app.db.translate_migrate import migrate_translate_schema
from app.db.user_scoping_migrate import migrate_user_scoping_schema

engine = create_engine(get_database_url(), pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Enable pgvector and create tables (STEP 2: create_all; Alembic when schema churn grows)."""
    import app.models  # noqa: F401 — register ORM tables

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        migrate_saved_search_schema(conn)
        migrate_documents_schema(conn)
        migrate_user_scoping_schema(conn)
        migrate_translate_schema(conn)
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
