"""外部 HTTP / Atom 取り込みルート向けの例外→HTTP 映射。"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from collections.abc import Iterator
from contextlib import contextmanager

import httpx
from fastapi import HTTPException


@contextmanager
def translate_import_http_errors(
    logger: logging.Logger,
    *,
    source_label: str,
) -> Iterator[None]:
    """`httpx.HTTPError` と Atom/XML のパースエラーを 502 に統一する。"""
    try:
        yield
    except httpx.HTTPError as e:
        logger.warning("%s API request failed: %s", source_label, e)
        raise HTTPException(
            status_code=502,
            detail=f"{source_label} API 取得に失敗しました: {e}",
        ) from e
    except ET.ParseError as e:
        logger.warning("%s Atom/XML parse failed: %s", source_label, e)
        raise HTTPException(
            status_code=502,
            detail=f"{source_label} 応答の解析に失敗しました: {e}",
        ) from e
