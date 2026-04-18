"""質問に対する RAG + Gemini 構造化出力。"""

from __future__ import annotations

import json as _json
import logging
from typing import Generator

from google import genai
from google.genai import types
from sqlalchemy import func, select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.constants import MAX_QUESTION_LENGTH
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
    _AnalyzeMetadata,
    _AnalyzeResponseRaw,
)
from app.services.embeddings import build_embedding_model
from app.services.ingest import (
    has_any_source_files,
    has_vector_source_files,
    ingest_data_directory,
)


def _fetch_source_path_map(db: Session, cited_ids: list[int]) -> dict[int, str | None]:
    """document_id → source_path のマップを一括取得する。"""
    if not cited_ids:
        return {}
    return dict(
        db.execute(
            select(Document.id, Document.source_path).where(Document.id.in_(cited_ids))
        ).all()
    )


def _ensure_documents_indexed(
    db: Session,
    embed_model,
    data_dir,
    *,
    reindex: bool = False,
) -> None:
    """ドキュメントがインデックス済みであることを保証する。空なら自動取り込みし、それでも 0 なら ValueError。"""
    if reindex:
        ingest_data_directory(db, embed_model, data_dir)

    n_docs = int(
        db.scalar(
            select(func.count()).select_from(Document).where(Document.embedding.isnot(None))
        ) or 0
    )
    if not n_docs and has_vector_source_files(data_dir):
        ingest_data_directory(db, embed_model, data_dir)
        n_docs = int(
            db.scalar(
                select(func.count()).select_from(Document).where(Document.embedding.isnot(None))
            ) or 0
        )

    if not n_docs:
        if has_any_source_files(data_dir) and not has_vector_source_files(data_dir):
            raise ValueError(
                "NO_TEXT_SOURCES: ベクトル検索には DATA_DIR に .md または .txt が必要です"
                "（JSON のみでは documents は作りません）。"
            )
        raise ValueError(
            "NO_DOCUMENTS: DATA_DIR（Compose では /app/data）に .md/.txt を置くか、"
            f"明示的に reindex_sources: true を指定してください。参照ディレクトリ: {data_dir}"
        )


def run_analyze(db: Session, req: AnalyzeRequest) -> AnalyzeResponse:
    api_key = get_google_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    embed_model = build_embedding_model()
    data_dir = get_data_dir()
    _ensure_documents_indexed(db, embed_model, data_dir, reindex=req.reindex_sources)

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

    path_map = _fetch_source_path_map(db, [c.document_id for c in raw.citations])
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
                question=req.question.strip()[:MAX_QUESTION_LENGTH],
                response=result.model_dump(mode="json"),
            )
        )
        db.commit()
    return result


def run_analyze_stream(
    db: Session, req: AnalyzeRequest
) -> Generator[str, None, None]:
    """SSE イベントを yield する同期ジェネレーター。

    Phase 1: answer のみ plain text でストリーミング
    Phase 2: key_points + citations を構造化出力で取得し done イベントで送信
    """

    def _sse(payload: dict) -> str:
        return f"data: {_json.dumps(payload, ensure_ascii=False)}\n\n"

    try:
        api_key = get_google_api_key()
        if not api_key:
            yield _sse({"type": "error", "message": "GOOGLE_API_KEY is not configured"})
            return

        embed_model = build_embedding_model()
        data_dir = get_data_dir()
        try:
            _ensure_documents_indexed(db, embed_model, data_dir, reindex=req.reindex_sources)
        except ValueError as e:
            yield _sse({"type": "error", "message": str(e)})
            return

        # ── RAG 検索 ──────────────────────────────────────────────────────────
        k = req.top_k or get_rag_top_k()
        qvec = embed_model.get_text_embedding(req.question)
        distance = Document.embedding.cosine_distance(qvec)
        rows = db.execute(
            select(Document.id, Document.text, distance.label("dist"))
            .where(Document.embedding.isnot(None))
            .order_by(distance)
            .limit(k)
        ).all()
        context = "\n---\n".join(
            f"[document_id={rid}]\n{text}\n" for rid, text, _ in rows
        )

        client = genai.Client(api_key=api_key)

        # ── Phase 1: answer をストリーミング ──────────────────────────────────
        answer_prompt = (
            "あなたは知識ベースの分析アシスタントです。"
            "次のコンテキストのみを根拠に質問に日本語で回答してください。\n"
            "コンテキストにない内容は推測せず「提供された資料には記載がありません」と述べてください。\n"
            "回答のテキストのみを出力してください。\n\n"
            f"コンテキスト:\n{context}\n\n"
            f"質問: {req.question}"
        )

        answer_parts: list[str] = []
        for chunk in client.models.generate_content_stream(
            model=get_gemini_llm_model(),
            contents=answer_prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        ):
            if chunk.text:
                answer_parts.append(chunk.text)
                yield _sse({"type": "token", "content": chunk.text})

        answer = "".join(answer_parts)

        # ── Phase 2: key_points + citations を構造化出力で取得 ─────────────────
        meta_prompt = (
            f"次の質問への回答と参照コンテキストをもとに以下を抽出してください。\n"
            f"- key_points: 回答の重要ポイント（簡潔な日本語の箇条書き）\n"
            f"- citations: 回答の根拠となったコンテキストの document_id と抜粋\n\n"
            f"質問: {req.question}\n"
            f"回答: {answer}\n\n"
            f"コンテキスト:\n{context}"
        )
        meta_resp = client.models.generate_content(
            model=get_gemini_llm_model(),
            contents=meta_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_AnalyzeMetadata,
                temperature=0.2,
            ),
        )
        meta_text = meta_resp.text or ""
        if not meta_text:
            yield _sse({"type": "done", "key_points": [], "citations": []})
            return

        raw_meta = _AnalyzeMetadata.model_validate_json(meta_text)

        path_map = _fetch_source_path_map(db, [c.document_id for c in raw_meta.citations])
        citations = [
            Citation(
                document_id=c.document_id,
                excerpt=c.excerpt,
                source_path=path_map.get(c.document_id),
            )
            for c in raw_meta.citations
        ]

        yield _sse({
            "type": "done",
            "key_points": raw_meta.key_points,
            "citations": [c.model_dump() for c in citations],
        })

        # ── question_history に保存 ────────────────────────────────────────────
        if req.save_question_history:
            result = AnalyzeResponse(
                answer=answer,
                key_points=raw_meta.key_points,
                citations=citations,
            )
            db.add(
                QuestionHistory(
                    question=req.question.strip()[:MAX_QUESTION_LENGTH],
                    response=result.model_dump(mode="json"),
                )
            )
            db.commit()

    except Exception as e:
        logger.exception("run_analyze_stream failed")
        yield _sse({"type": "error", "message": f"{type(e).__name__}: {e}"})
