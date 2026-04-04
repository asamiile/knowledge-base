"""DB 付きテスト用。DATABASE_URL は import より前に確定させる。"""

import os

# CI: localhost の Postgres。ローカルは docker compose の db を 5432 で公開した前提。
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://knowledge:knowledge@127.0.0.1:5432/knowledge",
)
