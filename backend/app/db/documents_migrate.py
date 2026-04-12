"""Incremental schema for documents (SQLAlchemy create_all does not add columns)."""

from __future__ import annotations

from sqlalchemy import Connection, text


def migrate_documents_schema(conn: Connection) -> None:
    exists = conn.execute(
        text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'documents')",
        ),
    ).scalar()
    if not exists:
        return
    conn.execute(
        text(
            "ALTER TABLE documents "
            "ADD COLUMN IF NOT EXISTS source_path VARCHAR(2048)",
        ),
    )
