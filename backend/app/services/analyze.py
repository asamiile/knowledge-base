"""質問に対する RAG + Gemini 構造化出力。"""

from __future__ import annotations

from google import genai
from google.genai import types
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.settings import (
    get_data_dir,
    get_gemini_llm_model,
    get_google_api_key,
    get_rag_top_k,
)
from app.models.tables import Document, QuestionHistory
from app.schemas.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    Citation,
    _AnalyzeResponseRaw,
)
from app.services.embeddings import build_embedding_model
from app.services.ingest import (
    has_any_source_files,
    has_vector_source_files,
    ingest_data_directory,
)


def run_analyze(db: Session, req: AnalyzeRequest) -> AnalyzeResponse:
    api_key = get_google_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    embed_model = build_embedding_model()
    data_dir = get_data_dir()

    if req.reindex_sources:
        ingest_data_directory(db, embed_model, data_dir)

    n_docs = db.scalar(
        select(func.count())
        .select_from(Document)
        .where(Document.embedding.isnot(None))
    )
    # 初回などインデックスが空で、DATA_DIR に .md/.txt があるなら自動取り込み（reindex フラグ不要）
    if not n_docs and has_vector_source_files(data_dir):
        ingest_data_directory(db, embed_model, data_dir)
        n_docs = db.scalar(
            select(func.count())
            .select_from(Document)
            .where(Document.embedding.isnot(None))
        )

    if not n_docs:
        if has_any_source_files(data_dir) and not has_vector_source_files(data_dir):
            raise ValueError(
                "NO_TEXT_SOURCES: ベクトル検索には DATA_DIR に .md または .txt が必要です（JSON のみでは documents は作りません）。"
            )
        raise ValueError(
            "NO_DOCUMENTS: DATA_DIR（Compose では /app/data）に .md/.txt を置くか、"
            f"明示的に reindex_sources: true を指定してください。参照ディレクトリ: {data_dir}"
        )

    k = req.top_k or get_rag_top_k()
    qvec = embed_model.get_text_embedding(req.question)
    distance = Document.embedding.cosine_distance(qvec)
    stmt = (
        select(Document.id, Document.text, distance.label("dist"))
        .where(Document.embedding.isnot(None))
        .order_by(distance)
        .limit(k)
    )
    rows = db.execute(stmt).all()

    context_parts: list[str] = []
    for rid, text, _dist in rows:
        context_parts.append(f"[document_id={rid}]\n{text}\n")
    context = "\n---\n".join(context_parts)

    prompt = f"""あなたは知識ベースの分析アシスタントです。次のコンテキストのみを根拠に回答してください。
コンテキストにない内容は推測せず、「提供された資料には記載がありません」と述べてください。
引用するときは citations に、対応する document_id と短い excerpt を必ず含めてください。

コンテキスト:
{context}

ユーザーの質問:
{req.question}
"""

    client = genai.Client(api_key=api_key)
    resp = client.models.generate_content(
        model=get_gemini_llm_model(),
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_AnalyzeResponseRaw,
            temperature=0.2,
        ),
    )
    text = resp.text
    if not text:
        raise RuntimeError("モデルから空の応答が返りました")
    raw = _AnalyzeResponseRaw.model_validate_json(text)

    # document_id → source_path を一括ルックアップ
    cited_ids = [c.document_id for c in raw.citations]
    path_map: dict[int, str | None] = {}
    if cited_ids:
        path_map = dict(
            db.execute(
                select(Document.id, Document.source_path).where(
                    Document.id.in_(cited_ids)
                )
            ).all()
        )

    result = AnalyzeResponse(
        answer=raw.answer,
        key_points=raw.key_points,
        citations=[
            Citation(
                document_id=c.document_id,
                excerpt=c.excerpt,
                source_path=path_map.get(c.document_id),
            )
            for c in raw.citations
        ],
    )

    if req.save_question_history:
        db.add(
            QuestionHistory(
                question=req.question.strip()[:8000],
                response=result.model_dump(mode="json"),
            )
        )
        db.commit()
    return result
