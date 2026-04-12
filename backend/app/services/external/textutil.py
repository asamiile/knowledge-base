"""外部メタ表示用の短いテキスト整形。"""

from __future__ import annotations

_SUMMARY_MAX_LEN = 1200


def truncate_summary(text: str, max_len: int = _SUMMARY_MAX_LEN) -> str:
    t = text.strip()
    if len(t) <= max_len:
        return t
    return t[: max_len - 1].rstrip() + "…"
