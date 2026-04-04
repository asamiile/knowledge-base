"""arXiv Atom API から Markdown を生成し data/imports/arxiv/ に保存する。"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote

import httpx

ARXIV_API = "http://export.arxiv.org/api/query"
USER_AGENT = "knowledge-base/0.1 (local-dev; https://arxiv.org/help/api)"
_ATOM = "{http://www.w3.org/2005/Atom}"


@dataclass(frozen=True)
class _ArxivEntry:
    id_url: str
    title: str
    summary: str
    authors: list[str]


def _normalize_arxiv_ids(raw: list[str]) -> list[str]:
    out: list[str] = []
    for line in raw:
        s = line.strip()
        if not s:
            continue
        if "arxiv.org/abs/" in s:
            s = s.split("arxiv.org/abs/", 1)[-1]
        if s.lower().startswith("arxiv:"):
            s = s[6:]
        s = unquote(s.split("?", 1)[0].strip().rstrip("/"))
        if s:
            out.append(s)
    return out


def _arxiv_get(params: dict[str, str | int]) -> str:
    with httpx.Client(timeout=45.0) as client:
        r = client.get(
            ARXIV_API,
            params=params,
            headers={"User-Agent": USER_AGENT},
        )
        r.raise_for_status()
        return r.text


def _parse_atom_entries(xml_text: str) -> list[_ArxivEntry]:
    root = ET.fromstring(xml_text)
    entries: list[_ArxivEntry] = []
    for el in root.findall(f"{_ATOM}entry"):
        id_el = el.find(f"{_ATOM}id")
        title_el = el.find(f"{_ATOM}title")
        summary_el = el.find(f"{_ATOM}summary")
        if id_el is None or id_el.text is None:
            continue
        title = (title_el.text or "").strip().replace("\n", " ")
        summary = (summary_el.text or "").strip() if summary_el is not None else ""
        authors: list[str] = []
        for au in el.findall(f"{_ATOM}author"):
            name_el = au.find(f"{_ATOM}name")
            if name_el is not None and name_el.text:
                authors.append(name_el.text.strip())
        entries.append(
            _ArxivEntry(
                id_url=id_el.text.strip(),
                title=title or "(no title)",
                summary=summary,
                authors=authors,
            )
        )
    return entries


def _entry_file_stem(entry: _ArxivEntry) -> str:
    tail = entry.id_url.rstrip("/").rsplit("/", 1)[-1]
    tail = re.sub(r"[^\w.\-]+", "_", tail)
    return tail or "unknown"


def _entry_to_markdown(entry: _ArxivEntry) -> str:
    stem = _entry_file_stem(entry)
    authors = ", ".join(entry.authors) if entry.authors else "(unknown)"
    return (
        f"# {entry.title}\n\n"
        f"**arXiv:** `{stem}`  \n"
        f"**URL:** {entry.id_url}  \n"
        f"**Authors:** {authors}\n\n"
        f"## Abstract\n\n{entry.summary}\n"
    )


def import_arxiv_to_data_dir(
    data_dir: Path,
    *,
    arxiv_ids: list[str],
    search_query: str | None,
    max_results: int,
) -> list[str]:
    """arXiv から取得し `imports/arxiv/*.md` に保存。戻り値は DATA_DIR からの相対パス。"""
    data_dir = data_dir.resolve()
    out_dir = data_dir / "imports" / "arxiv"
    out_dir.mkdir(parents=True, exist_ok=True)

    ids = _normalize_arxiv_ids(arxiv_ids)
    seen_urls: set[str] = set()
    all_entries: list[_ArxivEntry] = []

    if ids:
        # 公式 API は id_list にカンマ区切り（件数が多い場合は caller 側で分割も可）
        text = _arxiv_get({"id_list": ",".join(ids)})
        for e in _parse_atom_entries(text):
            if e.id_url not in seen_urls:
                seen_urls.add(e.id_url)
                all_entries.append(e)

    q = (search_query or "").strip()
    if q:
        text = _arxiv_get(
            {
                "search_query": f"all:{q}",
                "start": 0,
                "max_results": max_results,
            }
        )
        for e in _parse_atom_entries(text):
            if e.id_url not in seen_urls:
                seen_urls.add(e.id_url)
                all_entries.append(e)

    rel_paths: list[str] = []
    for entry in all_entries:
        stem = _entry_file_stem(entry)
        path = out_dir / f"{stem}.md"
        path.write_text(_entry_to_markdown(entry), encoding="utf-8")
        rel_paths.append(str(path.relative_to(data_dir)))

    return rel_paths
