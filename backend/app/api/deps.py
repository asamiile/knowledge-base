"""FastAPI 共通依存性。"""

from fastapi import HTTPException
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

from app.services.embeddings import build_embedding_model


def get_embed_model() -> GoogleGenAIEmbedding:
    """埋め込みモデルを返す FastAPI 依存性。API キー未設定時は 503 を返す。"""
    try:
        return build_embedding_model()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
