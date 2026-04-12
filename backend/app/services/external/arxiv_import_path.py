"""`imports/arxiv/*.md` 相対パスから arXiv を取り出す。"""

from __future__ import annotations

import re
from pathlib import PurePosixPath

_ARXIV_IMPORT_PREFIX = "imports/arxiv/"
# 新形式 ID（OpenAlex の DataCite DOI 連携に使う）
_NEW_ARXIV_ID = re.compile(r"^(\d{4}\.\d{4,5})(v\d+)?$", re.IGNORECASE)


def strip_arxiv_version(stem: str) -> str:
    return re.sub(r"v\d+$", "", stem, flags=re.IGNORECASE)


def arxiv_import_stem(rel_path: str) -> str | None:
    norm = rel_path.replace("\\", "/").lstrip("/")
    if not norm.startswith(_ARXIV_IMPORT_PREFIX):
        return None
    suf = PurePosixPath(norm).suffix.lower()
    if suf != ".md":
        return None
    stem = PurePosixPath(norm).stem
    return stem if stem else None


def is_modern_arxiv_stem(stem: str) -> bool:
    return bool(_NEW_ARXIV_ID.match(stem))
