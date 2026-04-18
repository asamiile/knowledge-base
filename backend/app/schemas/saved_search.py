"""保存された資料検索条件の API スキーマ。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

SearchTarget = Literal["knowledge", "arxiv"]


def normalize_arxiv_id_list(raw: list[str]) -> list[str]:
    """arXiv ID リストを正規化（空白除去・空文字除外）。"""
    return [s.strip() for s in raw if isinstance(s, str) and s.strip()]


class SavedSearchRead(BaseModel):
    id: UUID
    name: str
    query: str
    arxiv_ids: list[str] = Field(default_factory=list)
    search_target: SearchTarget = "knowledge"
    top_k: int = Field(ge=1, le=20)
    interval_minutes: int = Field(ge=0)
    schedule_enabled: bool
    last_run_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("arxiv_ids", mode="before")
    @classmethod
    def _coerce_arxiv_ids(cls, v: object) -> list[str]:
        if v is None or not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if str(x).strip()]


class SavedSearchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=512)
    query: str = ""
    arxiv_ids: list[str] = Field(default_factory=list)
    search_target: SearchTarget = "knowledge"
    top_k: int = Field(default=5, ge=1, le=20)
    interval_minutes: int = Field(default=0, ge=0)
    schedule_enabled: bool = False

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @model_validator(mode="after")
    def _validate_norm(self):
        ids = normalize_arxiv_id_list(self.arxiv_ids)
        q = (self.query or "").strip()
        if self.search_target == "knowledge":
            if not q:
                raise ValueError("knowledge search requires non-empty query")
            self.arxiv_ids = []
            self.query = q
        else:
            if not ids and not q:
                raise ValueError("arxiv search requires arxiv_ids and/or query")
            self.arxiv_ids = ids
            self.query = q
        return self


class SavedSearchPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=512)
    query: str | None = None
    arxiv_ids: list[str] | None = None
    search_target: SearchTarget | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)
    interval_minutes: int | None = Field(default=None, ge=0)
    schedule_enabled: bool | None = None
    last_run_at: datetime | None = None
