from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Document(Base):
    """論文などのテキスト断片と埋め込みベクトル。"""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # gemini-embedding-001 等、EmbedContentConfig(output_dimensionality=768) と一致
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(768),
        nullable=True,
    )


class RawData(Base):
    """オープンデータ等の生データ（JSONB）。"""

    __tablename__ = "raw_data"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(1024), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)


class SavedSearch(Base):
    """ローカル資料ベクトル検索の保存条件（単一テナント・認可なし）。"""

    __tablename__ = "saved_material_searches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    top_k: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    schedule_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    last_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
