"""include_full_text カラムを saved_searches テーブルへ追加するマイグレーション。"""

from __future__ import annotations

from sqlalchemy import Connection, text


def migrate_saved_search_full_text_schema(conn: Connection) -> None:
    exists = conn.execute(
        text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'saved_searches')",
        ),
    ).scalar()
    if not exists:
        return
    conn.execute(
        text(
            "ALTER TABLE saved_searches "
            "ADD COLUMN IF NOT EXISTS include_full_text BOOLEAN NOT NULL DEFAULT FALSE"
        ),
    )
