"""インデックス済み Document に対するベクトル検索（LLM なし）。"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

from app.models.tables import Document


def run_material_search(
    db: Session,
    embed_model: GoogleGenAIEmbedding,
    query: str,
    top_k: int,
) -> list[tuple[int, str, str | None, float, str | None]]:
    """cosine 距離が小さい順に top_k 件。embedding が無い場合は ValueError。

    Returns: (document_id, text, translated_text, distance, source_path)
    """
    n_docs = db.scalar(
        select(func.count())
        .select_from(Document)
        .where(Document.embedding.isnot(None))
    )
    if not n_docs:
        raise ValueError(
            "NO_DOCUMENTS: インデックスにチャンクがありません。資料を追加しインデックスを更新してください。",
        )

    qvec = embed_model.get_text_embedding(query)
    distance = Document.embedding.cosine_distance(qvec)
    stmt = (
        select(
            Document.id,
            Document.text,
            Document.translated_text,
            Document.source_path,
            distance.label("dist"),
        )
        .where(Document.embedding.isnot(None))
        .order_by(distance)
        .limit(top_k)
    )
    rows = db.execute(stmt).all()
    return [
        (int(rid), str(txt), tt if tt is None else str(tt), float(dist), sp if sp is None else str(sp))
        for rid, txt, tt, sp, dist in rows
    ]
