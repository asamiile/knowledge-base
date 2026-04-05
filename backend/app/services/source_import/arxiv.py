"""arXiv Atom API から Markdown を生成し data/imports/arxiv/ に保存する。"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote

import httpx

# http は 301 → https となり、環境によってはリダイレクト追従で失敗するため https を既定にする
ARXIV_API = "https://export.arxiv.org/api/query"
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


# https://info.arxiv.org/help/api/user-manual.html#query_details
_ARXIV_FIELD_PREFIX = re.compile(
    r"^(all|ti|au|abs|co|jr|cat|rn|id)\s*:",
    re.IGNORECASE,
)


def _arxiv_api_search_query(user_q: str) -> str:
    """ユーザ入力を arXiv の search_query に渡す。フィールド指定済みなら all: を付けない。"""
    q = user_q.strip()
    if not q:
        return q
    if _ARXIV_FIELD_PREFIX.match(q):
        return q
    return f"all:{q}"


def _arxiv_get(params: dict[str, str | int]) -> str:
    with httpx.Client(timeout=45.0, follow_redirects=True) as client:
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


def _canonical_abs_url(id_url: str) -> str:
    """Atom の entry id（通常は http://arxiv.org/abs/...vN）を https の abs URL に揃える。"""
    u = id_url.strip()
    if not u:
        return u
    u = u.replace("http://arxiv.org/", "https://arxiv.org/")
    if u.startswith("https://arxiv.org/"):
        return u
    return f"https://arxiv.org/abs/{u.lstrip('/')}"


def _entry_to_markdown(entry: _ArxivEntry) -> str:
    stem = _entry_file_stem(entry)
    authors = ", ".join(entry.authors) if entry.authors else "(unknown)"
    url = _canonical_abs_url(entry.id_url)
    return (
        f"# {entry.title}\n\n"
        f"**arXiv:** `{stem}`  \n"
        f"**URL:** {url}  \n"
        f"**Authors:** {authors}\n\n"
        f"## Abstract\n\n{entry.summary}\n"
    )


def fetch_arxiv_entries(
    *,
    arxiv_ids: list[str],
    search_query: str | None,
    max_results: int,
) -> list[_ArxivEntry]:
    """arXiv API からエントリを取得する（保存しない）。"""
    ids = _normalize_arxiv_ids(arxiv_ids)
    seen_urls: set[str] = set()
    all_entries: list[_ArxivEntry] = []

    if ids:
        text = _arxiv_get({"id_list": ",".join(ids)})
        for e in _parse_atom_entries(text):
            if e.id_url not in seen_urls:
                seen_urls.add(e.id_url)
                all_entries.append(e)

    q = (search_query or "").strip()
    if q:
        sq = _arxiv_api_search_query(q)
        text = _arxiv_get(
            {
                "search_query": sq,
                "start": 0,
                "max_results": max_results,
            }
        )
        for e in _parse_atom_entries(text):
            if e.id_url not in seen_urls:
                seen_urls.add(e.id_url)
                all_entries.append(e)

    return all_entries


def entry_import_id(entry: _ArxivEntry) -> str:
    """取り込み API の arxiv_ids に渡せる短い ID。"""
    norm = _normalize_arxiv_ids([entry.id_url])
    if norm:
        return norm[0]
    return _entry_file_stem(entry)


def entry_abs_url(entry: _ArxivEntry) -> str:
    """https の abs URL。"""
    return _canonical_abs_url(entry.id_url)


def write_arxiv_entries_to_data_dir(
    data_dir: Path,
    entries: list[_ArxivEntry],
) -> list[str]:
    """エントリを `imports/arxiv/*.md` に保存。戻り値は DATA_DIR からの相対パス。"""
    data_dir = data_dir.resolve()
    out_dir = data_dir / "imports" / "arxiv"
    out_dir.mkdir(parents=True, exist_ok=True)
    rel_paths: list[str] = []
    for entry in entries:
        stem = _entry_file_stem(entry)
        path = out_dir / f"{stem}.md"
        path.write_text(_entry_to_markdown(entry), encoding="utf-8")
        rel_paths.append(str(path.relative_to(data_dir)))
    return rel_paths


def import_arxiv_to_data_dir(
    data_dir: Path,
    *,
    arxiv_ids: list[str],
    search_query: str | None,
    max_results: int,
) -> list[str]:
    """arXiv から取得し `imports/arxiv/*.md` に保存。戻り値は DATA_DIR からの相対パス。"""
    entries = fetch_arxiv_entries(
        arxiv_ids=arxiv_ids,
        search_query=search_query,
        max_results=max_results,
    )
    return write_arxiv_entries_to_data_dir(data_dir, entries)
