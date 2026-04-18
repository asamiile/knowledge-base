"""ユーザー紐づけ・時刻列の追加（create_all は既存テーブルに列を足さない）。"""

from __future__ import annotations

from sqlalchemy import Connection, text


def _table_exists(conn: Connection, name: str) -> bool:
    return bool(
        conn.execute(
            text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = :t)",
            ),
            {"t": name},
        ).scalar()
    )


def migrate_user_scoping_schema(conn: Connection) -> None:
    has_users = _table_exists(conn, "users")

    if _table_exists(conn, "question_history"):
        if has_users:
            conn.execute(
                text(
                    "ALTER TABLE question_history "
                    "ADD COLUMN IF NOT EXISTS user_id UUID "
                    "REFERENCES users(id) ON DELETE SET NULL",
                ),
            )
        else:
            conn.execute(
                text(
                    "ALTER TABLE question_history "
                    "ADD COLUMN IF NOT EXISTS user_id UUID",
                ),
            )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_question_history_user_id "
                "ON question_history (user_id)",
            ),
        )

    if _table_exists(conn, "saved_search_conditions"):
        if has_users:
            conn.execute(
                text(
                    "ALTER TABLE saved_search_conditions "
                    "ADD COLUMN IF NOT EXISTS user_id UUID "
                    "REFERENCES users(id) ON DELETE SET NULL",
                ),
            )
        else:
            conn.execute(
                text(
                    "ALTER TABLE saved_search_conditions "
                    "ADD COLUMN IF NOT EXISTS user_id UUID",
                ),
            )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_saved_search_conditions_user_id "
                "ON saved_search_conditions (user_id)",
            ),
        )

    if _table_exists(conn, "documents"):
        conn.execute(
            text(
                "ALTER TABLE documents "
                "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ "
                "NOT NULL DEFAULT NOW()",
            ),
        )
        conn.execute(
            text(
                "ALTER TABLE documents "
                "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ "
                "NOT NULL DEFAULT NOW()",
            ),
        )

    if _table_exists(conn, "raw_data"):
        conn.execute(
            text(
                "ALTER TABLE raw_data "
                "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ "
                "NOT NULL DEFAULT NOW()",
            ),
        )
        conn.execute(
            text(
                "ALTER TABLE raw_data "
                "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ "
                "NOT NULL DEFAULT NOW()",
            ),
        )
