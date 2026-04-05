"""STEP 4 — データ投入・外部ソース向け API スキーマ。"""

from typing import Self

from pydantic import BaseModel, Field, model_validator


class DataUploadResponse(BaseModel):
    """`POST /api/data/upload` の応答。"""

    path: str = Field(description="DATA_DIR からの相対パス")
    filename: str
    size_bytes: int


class DataReindexResponse(BaseModel):
    """`POST /api/data/reindex` の応答（`GET /api/knowledge/stats` と同型のカウンタ）。"""

    document_chunks: int = Field(description="ベクトル付きチャンク数")
    raw_data_rows: int = Field(description="raw_data 行数")


class ArxivImportRequest(BaseModel):
    """`POST /api/data/imports/arxiv` のリクエスト。

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
    include_full_text: bool = Field(
        default=False,
        description=(
            "true のとき各エントリについて arxiv.org/pdf の PDF を取得し、"
            "抽出テキストを .md の「Full text」に追記する。失敗時は Abstract のみ。"
        ),
    )

    @model_validator(mode="after")
    def _needs_source(self) -> Self:
        has_ids = any(x.strip() for x in self.arxiv_ids)
        has_q = bool(self.search_query and self.search_query.strip())
        if not has_ids and not has_q:
            raise ValueError(
                "arXiv ID またはキーワードを指定してください。",
            )
        return self


class ArxivImportResponse(BaseModel):
    written: list[str] = Field(description="DATA_DIR からの相対パス（.md）")
    entry_count: int


class ArxivPreviewEntry(BaseModel):
    """プレビュー用（未保存）。"""

    arxiv_id: str = Field(description="取り込み時に arxiv_ids に渡す値")
    title: str
    summary: str
    authors: list[str]
    abs_url: str


class ArxivPreviewResponse(BaseModel):
    entries: list[ArxivPreviewEntry]
