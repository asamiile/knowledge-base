"""質問履歴 API 用スキーマ。"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuestionHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: UUID | None = None
    question: str
    response: dict[str, Any] = Field(
        description="AnalyzeResponse と同型の JSON（answer / key_points / citations）",
    )
    created_at: datetime
