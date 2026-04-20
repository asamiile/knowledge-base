"""定期実行ログ API スキーマ（サーバー側ジョブが行を追加する想定）。"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


RunLogStatus = Literal["success", "failure"]


class SavedSearchRunLogListItem(BaseModel):
    id: UUID
    saved_search_id: UUID | None
    title_snapshot: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SavedSearchRunLogRead(BaseModel):
    id: UUID
    saved_search_id: UUID | None
    title_snapshot: str
    status: str
    error_message: str | None
    imported_content: str | None
    imported_payload: dict[str, Any] | None = None
    translated_hints: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SavedSearchRunLogCreate(BaseModel):
    saved_search_id: UUID | None = None
    title_snapshot: str = Field(default="Untitled", max_length=512)
    status: RunLogStatus
    error_message: str | None = Field(default=None, max_length=16_000)
    imported_content: str | None = Field(default=None, max_length=512_000)
    imported_payload: dict[str, Any] | None = None
