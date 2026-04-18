"""環境変数から取得するランタイム設定（import 時点では固定せず、都度 os.environ を参照する）。"""

import os
from pathlib import Path


def get_google_api_key() -> str | None:
    key = os.environ.get("GOOGLE_API_KEY", "").strip()
    return key or None


def get_gemini_llm_model() -> str:
    # gemini-2.0-flash は新規 API 利用者向けに提供終了。既定は 2.5 系の安定版。
    return os.environ.get("GEMINI_LLM_MODEL", "gemini-2.5-flash").strip()


def get_gemini_embedding_model() -> str:
    # text-embedding-004 は 2026-01 に Gemini API で廃止。既定は後継の gemini-embedding-001（768 次元は embedding_config で指定）
    return os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001").strip()


def get_data_dir() -> Path:
    raw = os.environ.get("DATA_DIR", "/app/data").strip()
    return Path(raw).expanduser()


def get_rag_top_k() -> int:
    try:
        k = int(os.environ.get("RAG_TOP_K", "5"))
        return max(1, min(k, 50))
    except ValueError:
        return 5
