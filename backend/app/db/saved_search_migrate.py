"""旧 saved_material_searches → saved_search_conditions と search_target 列の移行。"""

from __future__ import annotations

from sqlalchemy import Connection, text


def migrate_saved_search_schema(conn: Connection) -> None:
    has_old = conn.execute(
        text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'saved_material_searches')",
        ),
    ).scalar()
    has_new = conn.execute(
        text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'saved_search_conditions')",
        ),
    ).scalar()
    if has_old and not has_new:
        conn.execute(
            text("ALTER TABLE saved_material_searches RENAME TO saved_search_conditions"),
        )
    if conn.execute(
        text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'saved_search_conditions')",
        ),
    ).scalar():
        conn.execute(
            text(
                "ALTER TABLE saved_search_conditions "
                "ADD COLUMN IF NOT EXISTS search_target VARCHAR(32) "
                "NOT NULL DEFAULT 'knowledge'",
            ),
        )
        conn.execute(
            text(
                "ALTER TABLE saved_search_conditions "
                "ADD COLUMN IF NOT EXISTS arxiv_ids JSONB "
                "NOT NULL DEFAULT '[]'::jsonb",
            ),
        )
