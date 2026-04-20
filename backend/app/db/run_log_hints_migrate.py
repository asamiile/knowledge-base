"""translated_hints カラムを saved_search_run_logs テーブルへ追加するマイグレーション。"""

from __future__ import annotations

from sqlalchemy import Connection, text


def migrate_run_log_hints_schema(conn: Connection) -> None:
    exists = conn.execute(
        text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'saved_search_run_logs')",
        ),
    ).scalar()
    if not exists:
        return
    conn.execute(
        text(
            "ALTER TABLE saved_search_run_logs "
            "ADD COLUMN IF NOT EXISTS translated_hints JSONB"
        ),
    )
