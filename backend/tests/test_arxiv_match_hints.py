"""arXiv 取り込み時の match_hints（マッチ周辺抜粋）。"""

from __future__ import annotations

from app.services.source_import.arxiv import (
    _ArxivEntry,
    build_arxiv_match_hints,
)


def _entry(
    *,
    title: str,
    summary: str,
    id_url: str = "http://arxiv.org/abs/2301.00001v1",
) -> _ArxivEntry:
    return _ArxivEntry(
        id_url=id_url,
        title=title,
        summary=summary,
        authors=["A"],
        primary_category="cs.CV",
        categories=("cs.CV",),
    )


def test_build_hints_phrase_in_title() -> None:
    e = _entry(
        title="Deep Learning for Computer Vision",
        summary="We propose a method.",
    )
    hints = build_arxiv_match_hints(
        [e],
        ["imports/arxiv/2301.00001v1.md"],
        "computer vision",
    )
    assert len(hints) == 1
    assert hints[0]["path"] == "imports/arxiv/2301.00001v1.md"
    assert "computer" in hints[0]["snippet"].lower()
    assert "title" in hints[0]["matched_in"]


def test_build_hints_token_in_abstract_only() -> None:
    e = _entry(
        title="Unrelated title",
        summary="This paragraph discusses computer vision benchmarks at length.",
    )
    hints = build_arxiv_match_hints(
        [e],
        ["imports/arxiv/x.md"],
        "computer vision",
    )
    assert len(hints) == 1
    assert "abstract" in hints[0]["matched_in"]
    assert "computer" in hints[0]["snippet"].lower()


def test_build_hints_no_query_uses_summary_prefix() -> None:
    e = _entry(title="T", summary="Only abstract here for fallback.")
    hints = build_arxiv_match_hints([e], ["imports/arxiv/a.md"], None)
    assert hints[0]["matched_in"] == []
    assert "abstract" in hints[0]["snippet"].lower() or "Only" in hints[0]["snippet"]


def test_build_hints_no_match_uses_summary_fallback() -> None:
    e = _entry(title="X", summary="Y Z no match words here.")
    hints = build_arxiv_match_hints([e], ["imports/arxiv/z.md"], "quantumgravityxyz")
    assert hints[0]["matched_in"] == []
    assert "Y" in hints[0]["snippet"] or "no match" in hints[0]["snippet"]
