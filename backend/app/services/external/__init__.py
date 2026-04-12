"""外部メタデータ API クライアント（arXiv Atom 主、引用のみ OpenAlex）。"""

from __future__ import annotations

from app.services.external.enrichment import enrichment_for_data_relative_path
from app.services.external.types import PaperEnrichment

__all__ = ["PaperEnrichment", "enrichment_for_data_relative_path"]
