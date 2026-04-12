import os


def get_database_url() -> str:
    """Normalize libpq URL to SQLAlchemy + psycopg2 driver URL."""
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql://knowledge:knowledge@db:5432/knowledge",
    )
    if url.startswith("postgresql://") and "+psycopg2" not in url:
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def is_production_environment() -> bool:
    """`ENVIRONMENT` / `APP_ENV` が production 相当か。"""
    for key in ("ENVIRONMENT", "APP_ENV"):
        raw = (os.environ.get(key) or "").strip().lower()
        if raw in ("production", "prod"):
            return True
    return False


def get_cors_allow_origins() -> list[str]:
    """カンマ区切り。未設定時は `['*']`（開発向け）。"""
    raw = (os.environ.get("CORS_ORIGINS") or "").strip()
    if not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


def cors_allow_credentials() -> bool:
    """`allow_origins=['*']` のときは credentials を付けられない（ブラウザ仕様）。"""
    origins = get_cors_allow_origins()
    return "*" not in origins
