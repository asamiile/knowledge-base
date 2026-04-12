"""`app.services.external.enrichment` — arXiv 主・OpenAlex は引用のみ。"""

from __future__ import annotations

from unittest.mock import patch

from app.services.external import enrichment_for_data_relative_path


def test_enrichment_non_arxiv_uses_basename() -> None:
    e = enrichment_for_data_relative_path("uploads/memo.md")
    assert e.display_name == "memo"
    assert e.arxiv_id is None
    assert e.citation_count is None
    assert e.summary is None
    assert e.tldr is None
    assert e.sources == []
    assert e.arxiv_primary_category is None
    assert e.arxiv_categories == ()


@patch("app.services.external.enrichment.fetch_work_for_arxiv_base")
@patch("app.services.external.enrichment.fetch_arxiv_paper_meta")
def test_enrichment_uses_arxiv_for_title_summary_openalex_for_citations(
    mock_atom: object,
    mock_oa: object,
) -> None:
    mock_atom.return_value = (
        "From ArXiv Title",
        "From ArXiv abstract.",
        "cs.LG",
        ("cs.LG", "stat.ML"),
    )
    mock_oa.return_value = {"cited_by_count": 7}

    e = enrichment_for_data_relative_path("imports/arxiv/1709.06342v4.md")
    assert e.display_name == "From ArXiv Title"
    assert e.summary == "From ArXiv abstract."
    assert e.citation_count == 7
    assert e.tldr is None
    assert e.sources == ["arxiv", "openalex"]
    assert e.arxiv_primary_category == "cs.LG"
    assert e.arxiv_categories == ("cs.LG", "stat.ML")


@patch("app.services.external.enrichment.fetch_work_for_arxiv_base")
@patch("app.services.external.enrichment.fetch_arxiv_paper_meta")
def test_enrichment_arxiv_only_when_openalex_missing(
    mock_atom: object,
    mock_oa: object,
) -> None:
    mock_atom.return_value = (
        "Atom Title",
        "Atom abstract here.",
        "eess.IV",
        ("eess.IV",),
    )
    mock_oa.return_value = None

    e = enrichment_for_data_relative_path("imports/arxiv/9999.99999v1.md")
    assert e.display_name == "Atom Title"
    assert e.summary and "Atom abstract" in e.summary
    assert e.citation_count is None
    assert e.sources == ["arxiv"]
    assert e.arxiv_primary_category == "eess.IV"


@patch("app.services.external.enrichment.fetch_work_for_arxiv_base")
@patch("app.services.external.enrichment.fetch_arxiv_paper_meta")
def test_enrichment_atom_unavailable_no_arxiv_source(
    mock_atom: object,
    mock_oa: object,
) -> None:
    """429等で Atom が取れないときは 500 にせず stem 表示・sources に arxiv を付けない。"""
    mock_atom.return_value = (None, None, None, ())
    mock_oa.return_value = None

    e = enrichment_for_data_relative_path("imports/arxiv/1709.06342v4.md")
    assert e.display_name == "1709.06342v4"
    assert e.summary is None
    assert e.sources == []
    assert e.arxiv_primary_category is None
    assert e.arxiv_categories == ()
