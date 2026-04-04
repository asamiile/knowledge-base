"""保存された資料検索条件の API スキーマ。"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SavedSearchRead(BaseModel):
    id: UUID
    name: str
    query: str
    top_k: int = Field(ge=1, le=20)
    interval_minutes: int = Field(ge=0)
    schedule_enabled: bool
    last_run_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SavedSearchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=512)
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    interval_minutes: int = Field(default=0, ge=0)
    schedule_enabled: bool = False


class SavedSearchPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=512)
    query: str | None = Field(default=None, min_length=1)
    top_k: int | None = Field(default=None, ge=1, le=20)
    interval_minutes: int | None = Field(default=None, ge=0)
    schedule_enabled: bool | None = None
    last_run_at: datetime | None = None
