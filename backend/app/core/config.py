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
