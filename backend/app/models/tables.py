from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Document(Base):
    """論文などのテキスト断片と埋め込みベクトル。"""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(1536),
        nullable=True,
    )


class RawData(Base):
    """オープンデータ等の生データ（JSONB）。"""

    __tablename__ = "raw_data"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(1024), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
