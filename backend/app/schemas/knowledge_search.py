"""資料インデックス（ベクトル）向け検索 API スキーマ。"""

from pydantic import BaseModel, Field


class MaterialSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=5, ge=1, le=50)


class MaterialSearchHit(BaseModel):
    document_id: int
    text: str
    distance: float
    source_path: str | None = Field(
        default=None,
        description="DATA_DIR 相対の取り込み元ファイルパス（/file へのリンク用）。",
    )


class MaterialSearchResponse(BaseModel):
    hits: list[MaterialSearchHit]
