"""`imports/arxiv/*.md` の YAML フロントマター（arXiv カテゴリ）を読む。"""

from __future__ import annotations

from pathlib import Path

from app.services.source_import.arxiv import fetch_primary_categories_for_stems


def parse_arxiv_frontmatter(md_text: str) -> tuple[str | None, list[str]]:
    """`arxiv_primary_category` と `arxiv_categories` を返す。無ければ (None, [])。"""
    if not md_text.startswith("---\n"):
        return None, []
    end = md_text.find("\n---\n", 4)
    if end == -1:
        return None, []
    block = md_text[4:end]
    primary: str | None = None
    categories: list[str] = []
    lines = block.splitlines()
    i = 0
    while i < len(lines):
        raw = lines[i]
        line = raw.strip()
        if line.startswith("arxiv_primary_category:"):
            val = raw.split(":", 1)[1].strip()
            if val.startswith('"') and val.endswith('"') and len(val) >= 2:
                val = val[1:-1].replace('\\"', '"')
            primary = val or None
        elif line == "arxiv_categories:":
            i += 1
            while i < len(lines):
                item_line = lines[i]
                stripped = item_line.strip()
                if not stripped.startswith("- "):
                    break
                item = stripped[2:].strip()
                if item.startswith('"') and item.endswith('"') and len(item) >= 2:
                    item = item[1:-1].replace('\\"', '"')
                if item:
                    categories.append(item)
                i += 1
            continue
        i += 1
    return primary, categories


def aggregate_arxiv_primary_category_counts(
    data_dir: Path,
) -> tuple[list[tuple[str, int]], int, int]:
    """(sorted (category, count) 降順, uncategorized 件数, arxiv .md 総数)。

    YAML に主カテゴリが無い .md は、ファイル名の arXiv ID で Atom API から取得する。
    """
    arxiv_dir = (data_dir / "imports" / "arxiv").resolve()
    if not arxiv_dir.is_dir():
        return [], 0, 0
    counts: dict[str, int] = {}
    total = 0
    uncategorized = 0
    pending_paths: list[Path] = []
    for path in sorted(arxiv_dir.glob("*.md")):
        if not path.is_file():
            continue
        total += 1
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            uncategorized += 1
            continue
        primary, _ = parse_arxiv_frontmatter(text)
        if primary:
            counts[primary] = counts.get(primary, 0) + 1
        else:
            pending_paths.append(path)

    if pending_paths:
        stems = [p.stem for p in pending_paths if p.stem]
        remote = fetch_primary_categories_for_stems(stems)
        for path in pending_paths:
            cat = remote.get(path.stem)
            if cat:
                counts[cat] = counts.get(cat, 0) + 1
            else:
                uncategorized += 1

    items = sorted(counts.items(), key=lambda x: (-x[1], x[0]))
    return items, uncategorized, total
