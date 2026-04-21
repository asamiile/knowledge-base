import google.genai.types as genai_types
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

from app.core.settings import get_google_api_key, get_gemini_embedding_model

# documents.embedding は vector(768)。gemini-embedding-001 は MRL で次元を指定可能。
_EMBEDDING_OUTPUT_DIM = 768
_embed_model: GoogleGenAIEmbedding | None = None


def build_embedding_model() -> GoogleGenAIEmbedding:
    global _embed_model
    if _embed_model is not None:
        return _embed_model
    api_key = get_google_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set")
    embed_cfg = genai_types.EmbedContentConfig(
        output_dimensionality=_EMBEDDING_OUTPUT_DIM,
    )
    _embed_model = GoogleGenAIEmbedding(
        model_name=get_gemini_embedding_model(),
        api_key=api_key,
        embedding_config=embed_cfg,
    )
    return _embed_model
