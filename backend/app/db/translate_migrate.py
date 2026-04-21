"""translated_text カラムを documents テーブルへ追加するインクリメンタルマイグレーション。"""

from __future__ import annotations

from sqlalchemy import Connection, text


def migrate_translate_schema(conn: Connection) -> None:
    exists = conn.execute(
        text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'documents')",
        ),
    ).scalar()
    if not exists:
        return
    conn.execute(
        text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS translated_text TEXT"),
    )
