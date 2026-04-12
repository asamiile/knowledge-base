from pydantic import BaseModel, Field


class Citation(BaseModel):
    """回答の根拠となったドキュメント断片。"""

    document_id: int = Field(description="documents テーブルの主キー")
    excerpt: str = Field(
        max_length=2000,
        description="引用した本文の抜粋（数百文字以内推奨）",
    )


class AnalyzeRequest(BaseModel):
    question: str = Field(min_length=1, max_length=8000)
    reindex_sources: bool = Field(
        default=False,
        description="true のとき DATA_DIR を再取り込み（documents / raw_data を置き換え）",
    )
    top_k: int | None = Field(
        default=None,
        ge=1,
        le=20,
        description="ベクトル検索の件数。省略時は環境変数 RAG_TOP_K",
    )
    save_question_history: bool = Field(
        default=True,
        description="true のとき成功応答を question_history に保存する",
    )


class AnalyzeResponse(BaseModel):
    answer: str = Field(description="質問に対する日本語または入力言語での要約回答")
    key_points: list[str] = Field(
        description="箇条書きの重要ポイント（短い文のリスト）",
    )
    citations: list[Citation] = Field(
        description="コンテキストに用いた documents の引用",
    )
