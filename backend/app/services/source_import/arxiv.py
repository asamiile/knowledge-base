"""arXiv Atom API から Markdown を生成し data/imports/arxiv/ に保存する。"""

from __future__ import annotations

import logging
import re
import threading
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote

import httpx

# http は 301 → https となり、環境によってはリダイレクト追従で失敗するため https を既定にする
ARXIV_API = "https://export.arxiv.org/api/query"
USER_AGENT = "knowledge-base/0.1 (local-dev; https://arxiv.org/help/api)"
_ATOM = "{http://www.w3.org/2005/Atom}"
_ARXIV_ATOM = "{http://arxiv.org/schemas/atom}"
_MAX_PDF_BYTES = 35 * 1024 * 1024
# 連続 PDF GET の間隔（負荷配慮・秒）
_PDF_FETCH_INTERVAL_SEC = 2.0
# export.arxiv.org Atom API は短時間に集中すると 429 になりやすいため、呼び出し間に空ける
_ARXIV_API_MIN_INTERVAL_SEC = 3.2
_ARXIV_API_MAX_ATTEMPTS = 6

logger = logging.getLogger(__name__)
_arxiv_api_lock = threading.Lock()
_last_arxiv_api_request_monotonic: float = 0.0


@dataclass(frozen=True)
class _ArxivEntry:
    id_url: str
    title: str
    summary: str
    authors: list[str]
    primary_category: str | None
    categories: tuple[str, ...]


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
    """Atom API GET。429 / タイムアウト時は指数バックオフで再試行。全プロセスで呼び出し間隔を空ける。"""
    global _last_arxiv_api_request_monotonic
    last_exc: BaseException | None = None
    with _arxiv_api_lock:
        for attempt in range(_ARXIV_API_MAX_ATTEMPTS):
            gap = _ARXIV_API_MIN_INTERVAL_SEC - (
                time.monotonic() - _last_arxiv_api_request_monotonic
            )
            if gap > 0:
                time.sleep(gap)
            r: httpx.Response | None = None
            try:
                with httpx.Client(
                    timeout=httpx.Timeout(60.0, connect=20.0),
                    follow_redirects=True,
                ) as client:
                    r = client.get(
                        ARXIV_API,
                        params=params,
                        headers={"User-Agent": USER_AGENT},
                    )
            except (httpx.TimeoutException, httpx.RequestError) as e:
                last_exc = e
                _last_arxiv_api_request_monotonic = time.monotonic()
                logger.warning(
                    "arXiv API 接続エラー (%s/%s): %s",
                    attempt + 1,
                    _ARXIV_API_MAX_ATTEMPTS,
                    e,
                )
                time.sleep(min(25.0, 2.5 * (attempt + 1)))
                continue

            _last_arxiv_api_request_monotonic = time.monotonic()
            assert r is not None

            if r.status_code == 429:
                last_exc = httpx.HTTPStatusError(
                    f"429 for {r.request.url!r}",
                    request=r.request,
                    response=r,
                )
                ra = (r.headers.get("Retry-After") or "").strip().split(",")[0]
                try:
                    delay = float(ra)
                except ValueError:
                    delay = min(90.0, 6.0 * (attempt + 1))
                delay = max(_ARXIV_API_MIN_INTERVAL_SEC, delay)
                logger.warning(
                    "arXiv API 429; %.1f 秒待って再試行 (%s/%s)",
                    delay,
                    attempt + 1,
                    _ARXIV_API_MAX_ATTEMPTS,
                )
                time.sleep(delay)
                continue

            if r.status_code in (502, 503):
                last_exc = httpx.HTTPStatusError(
                    f"{r.status_code} for {r.request.url!r}",
                    request=r.request,
                    response=r,
                )
                time.sleep(min(20.0, 3.0 * (attempt + 1)))
                continue

            try:
                r.raise_for_status()
            except httpx.HTTPStatusError as e:
                last_exc = e
                logger.warning("arXiv API HTTP %s: %s", r.status_code, r.text[:200])
                if attempt < _ARXIV_API_MAX_ATTEMPTS - 1:
                    time.sleep(min(15.0, 2.0 * (attempt + 1)))
                    continue
                raise
            return r.text

        if last_exc is not None:
            raise last_exc
        raise RuntimeError("arXiv API: 再試行上限")


def fetch_arxiv_pdf_bytes(
    arxiv_id: str,
    *,
    max_bytes: int = _MAX_PDF_BYTES,
) -> bytes:
    """`https://arxiv.org/pdf/{id}.pdf` を取得する。"""
    aid = arxiv_id.strip()
    if not aid:
        raise ValueError("arXiv ID が空です。")
    url = f"https://arxiv.org/pdf/{aid}.pdf"
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        with client.stream(
            "GET",
            url,
            headers={"User-Agent": USER_AGENT},
        ) as r:
            r.raise_for_status()
            chunks: list[bytes] = []
            total = 0
            for chunk in r.iter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError(
                        f"PDF が大きすぎます（{max_bytes // (1024 * 1024)} MiB 上限）。",
                    )
                chunks.append(chunk)
    return b"".join(chunks)


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
        pc_el = el.find(f"{_ARXIV_ATOM}primary_category")
        primary = (
            (pc_el.get("term") or "").strip() or None if pc_el is not None else None
        )
        terms: list[str] = []
        for cat in el.findall(f"{_ATOM}category"):
            t = (cat.get("term") or "").strip()
            if t and t not in terms:
                terms.append(t)
        if primary:
            terms = [primary] + [x for x in terms if x != primary]
        elif terms:
            primary = terms[0]
        categories = tuple(terms)
        entries.append(
            _ArxivEntry(
                id_url=id_el.text.strip(),
                title=title or "(no title)",
                summary=summary,
                authors=authors,
                primary_category=primary,
                categories=categories,
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


def _yaml_scalar(value: str) -> str:
    if re.search(r'[:#"\n]', value):
        esc = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{esc}"'
    return value


def _arxiv_categories_frontmatter(entry: _ArxivEntry) -> str:
    if not entry.categories and not entry.primary_category:
        return ""
    lines = ["---"]
    if entry.primary_category:
        lines.append(
            f"arxiv_primary_category: {_yaml_scalar(entry.primary_category)}",
        )
    if entry.categories:
        lines.append("arxiv_categories:")
        for c in entry.categories:
            lines.append(f"  - {_yaml_scalar(c)}")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def _entry_to_markdown(
    entry: _ArxivEntry,
    *,
    full_text: str | None = None,
    full_text_error: str | None = None,
) -> str:
    stem = _entry_file_stem(entry)
    authors = ", ".join(entry.authors) if entry.authors else "(unknown)"
    url = _canonical_abs_url(entry.id_url)
    fm = _arxiv_categories_frontmatter(entry)
    body = (
        f"{fm}"
        f"# {entry.title}\n\n"
        f"**arXiv:** `{stem}`  \n"
        f"**URL:** {url}  \n"
        f"**Authors:** {authors}\n\n"
        f"## Abstract\n\n{entry.summary}\n"
    )
    if full_text and full_text.strip():
        body += f"\n## Full text (from PDF)\n\n{full_text.strip()}\n"
    elif full_text_error:
        err = full_text_error.replace("\n", " ").strip()[:800]
        body += (
            "\n## Full text (from PDF)\n\n"
            f"*（PDF の取得・抽出に失敗しました: {err}。"
            " Abstract のみが索引の主な内容になります。）*\n"
        )
    return body


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
        try:
            text = _arxiv_get({"id_list": ",".join(ids)})
        except httpx.HTTPError:
            raise
        except Exception as e:
            logger.warning("arXiv id_list 取得に失敗: %s", e)
            text = ""
        if text:
            for e in _parse_atom_entries(text):
                if e.id_url not in seen_urls:
                    seen_urls.add(e.id_url)
                    all_entries.append(e)

    q = (search_query or "").strip()
    if q:
        sq = _arxiv_api_search_query(q)
        try:
            text = _arxiv_get(
                {
                    "search_query": sq,
                    "start": 0,
                    "max_results": max_results,
                }
            )
        except httpx.HTTPError:
            raise
        except Exception as e:
            logger.warning("arXiv search_query 取得に失敗: %s", e)
            text = ""
        if text:
            for e in _parse_atom_entries(text):
                if e.id_url not in seen_urls:
                    seen_urls.add(e.id_url)
                    all_entries.append(e)

    return all_entries


# id_list 1 リクエストあたりの件数（長すぎると 429・タイムアウトしやすい）
_ARXIV_ID_LIST_BATCH = 12


def fetch_primary_categories_for_stems(stems: list[str]) -> dict[str, str | None]:
    """ファイル名 stem（例 `1709.06342v4`）→ Atom の主カテゴリ。失敗時はキーなしまたは None。"""
    out: dict[str, str | None] = {}
    unique = list(dict.fromkeys(s.strip() for s in stems if s.strip()))
    if not unique:
        return out
    for i in range(0, len(unique), _ARXIV_ID_LIST_BATCH):
        batch = unique[i : i + _ARXIV_ID_LIST_BATCH]
        try:
            entries = fetch_arxiv_entries(
                arxiv_ids=batch,
                search_query=None,
                max_results=max(len(batch), 1),
            )
        except Exception as e:
            logger.warning("arXiv batch category fetch failed: %s", e)
            continue
        for e in entries:
            stem = _entry_file_stem(e)
            out[stem] = e.primary_category
    return out


def entry_import_id(entry: _ArxivEntry) -> str:
    """取り込み API の arxiv_ids に渡す短い ID。"""
    norm = _normalize_arxiv_ids([entry.id_url])
    if norm:
        return norm[0]
    return _entry_file_stem(entry)


def entry_abs_url(entry: _ArxivEntry) -> str:
    """https の abs URL。"""
    return _canonical_abs_url(entry.id_url)


def _resolve_full_text_for_entry(
    entry: _ArxivEntry,
    *,
    include_full_text: bool,
) -> tuple[str | None, str | None]:
    """(full_text, error_message) — どちらか一方のみ non-None。"""
    if not include_full_text:
        return None, None
    aid = entry_import_id(entry)
    try:
        from app.services.extract.pdf_text import extract_plain_text_from_pdf_bytes
    except ModuleNotFoundError:
        return (
            None,
            "pypdf が未インストールです。pip install -r requirements.txt "
            "または Docker イメージの再ビルドが必要です。",
        )
    try:
        raw = fetch_arxiv_pdf_bytes(aid)
        text = extract_plain_text_from_pdf_bytes(raw)
        if text.strip():
            return text.strip(), None
        return (
            None,
            "PDF からテキストを抽出できませんでした（画像中心の PDF の可能性）。",
        )
    except httpx.HTTPError as e:
        logger.warning("arXiv PDF fetch failed for %s: %s", aid, e)
        return None, f"PDF 取得エラー: {e}"
    except ValueError as e:
        logger.warning("arXiv PDF extract failed for %s: %s", aid, e)
        return None, str(e)
    except Exception as e:  # pragma: no cover
        logger.exception("arXiv PDF unexpected error for %s", aid)
        return None, str(e)


def write_arxiv_entries_to_data_dir(
    data_dir: Path,
    entries: list[_ArxivEntry],
    *,
    include_full_text: bool = False,
) -> list[str]:
    """エントリを `imports/arxiv/*.md` に保存。戻り値は DATA_DIR からの相対パス。"""
    data_dir = data_dir.resolve()
    out_dir = data_dir / "imports" / "arxiv"
    out_dir.mkdir(parents=True, exist_ok=True)
    rel_paths: list[str] = []
    for i, entry in enumerate(entries):
        if include_full_text and i > 0:
            time.sleep(_PDF_FETCH_INTERVAL_SEC)
        ftext, ferr = _resolve_full_text_for_entry(
            entry,
            include_full_text=include_full_text,
        )
        stem = _entry_file_stem(entry)
        path = out_dir / f"{stem}.md"
        path.write_text(
            _entry_to_markdown(
                entry,
                full_text=ftext,
                full_text_error=ferr,
            ),
            encoding="utf-8",
        )
        rel_paths.append(str(path.relative_to(data_dir)))
    return rel_paths


def import_arxiv_to_data_dir(
    data_dir: Path,
    *,
    arxiv_ids: list[str],
    search_query: str | None,
    max_results: int,
    include_full_text: bool = False,
) -> list[str]:
    """arXiv から取得し `imports/arxiv/*.md` に保存。戻り値は DATA_DIR からの相対パス。"""
    entries = fetch_arxiv_entries(
        arxiv_ids=arxiv_ids,
        search_query=search_query,
        max_results=max_results,
    )
    return write_arxiv_entries_to_data_dir(
        data_dir,
        entries,
        include_full_text=include_full_text,
    )

