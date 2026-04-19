"""DATA_DIR から documents / raw_data へ取り込む。"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from llama_index.core import Document as LIDocument
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from sqlalchemy.orm import Session

from app.models.tables import Document, RawData
from app.services.extract import (
    collect_vector_source_paths,
    extract_text_for_vector_ingest,
)
from app.services.translate import translate_text

logger = logging.getLogger(__name__)


def _collect_json_files(data_dir: Path) -> list[Path]:
    return sorted(p for p in data_dir.glob("**/*.json") if p.is_file())


def has_vector_source_files(data_dir: Path) -> bool:
    """ベクトル索引の元になる .md / .txt が 1 件以上あるか。"""
    p = data_dir.resolve()
    if not p.is_dir():
        return False
    return bool(collect_vector_source_paths(p))


def has_any_source_files(data_dir: Path) -> bool:
    """取り込み対象（テキストまたは JSON）が 1 件以上あるか。"""
    p = data_dir.resolve()
    if not p.is_dir():
        return False
    return bool(collect_vector_source_paths(p) or _collect_json_files(p))


def ingest_data_directory(
    db: Session,
    embed_model: GoogleGenAIEmbedding,
    data_dir: Path,
) -> tuple[int, int]:
    """再取り込み: 既存の Document / RawData を削除してから作成する。

    Returns:
        (投入したチャンク数, raw_data 行数)
    """
    data_dir = data_dir.resolve()
    if not data_dir.is_dir():
        return 0, 0

    db.query(Document).delete()
    db.query(RawData).delete()
    db.flush()

    splitter = SentenceSplitter(chunk_size=1024, chunk_overlap=128)
    doc_chunks = 0

    for path in collect_vector_source_paths(data_dir):
        text = extract_text_for_vector_ingest(path)
        if not text.strip():
            continue
        rel = path.relative_to(data_dir).as_posix()
        header = f"[source:{rel}]\n"
        nodes = splitter.get_nodes_from_documents(
            [LIDocument(text=header + text)]
        )
        texts = [n.get_content(metadata_mode="none") for n in nodes]
        if not texts:
            continue
        embeddings = embed_model.get_text_embedding_batch(texts)
        for t, vec in zip(texts, embeddings, strict=True):
            try:
                translated = translate_text(t)
            except Exception as e:
                logger.warning("翻訳スキップ (source=%s): %s", rel, e)
                translated = None
            row = Document(text=t, embedding=vec, source_path=rel, translated_text=translated or None)
            db.add(row)
            doc_chunks += 1

    raw_rows = 0
    for path in _collect_json_files(data_dir):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if not isinstance(payload, dict):
            payload = {"value": payload}
        db.add(
            RawData(
                source=str(path.relative_to(data_dir)),
                content=payload,
            )
        )
        raw_rows += 1

    db.commit()
    return doc_chunks, raw_rows
