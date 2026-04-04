"""STEP 4 — データ投入・外部ソース向け API スキーマ。"""

from typing import Self

from pydantic import BaseModel, Field, model_validator


class DataUploadResponse(BaseModel):
    """`POST /api/data/upload` の応答。"""

    path: str = Field(description="DATA_DIR からの相対パス")
    filename: str
    size_bytes: int


class ArxivImportRequest(BaseModel):
    """`POST /api/imports/arxiv` のリクエスト。

    後続のオープンデータ API も同様に専用エンドポイントを追加していく想定。
    """

    arxiv_ids: list[str] = Field(
        default_factory=list,
        max_length=40,
        description="arXiv ID または abs URL（例: 2301.00001）を複数指定可",
    )
    search_query: str | None = Field(
        default=None,
        max_length=500,
        description="全文検索クエリ（all:... に相当。ID 指定と併用可）",
    )
    max_results: int = Field(
        default=5,
        ge=1,
        le=20,
        description="search_query 使用時の最大件数",
    )

    @model_validator(mode="after")
    def _needs_source(self) -> Self:
        has_ids = any(x.strip() for x in self.arxiv_ids)
        has_q = bool(self.search_query and self.search_query.strip())
        if not has_ids and not has_q:
            raise ValueError(
                "arxiv_ids に1件以上、または search_query を指定してください。",
            )
        return self


class ArxivImportResponse(BaseModel):
    written: list[str] = Field(description="DATA_DIR からの相対パス（.md）")
    entry_count: int
