"""DATA_DIR 配下のファイル一覧（取り込み済み確認用）。"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path


def list_data_dir_files(data_dir: Path, *, limit: int) -> list[tuple[str, int, datetime]]:
    """相対パス（POSIX）、サイズ、更新日時（UTC）のタプル列。辞書順で最大 limit 件。"""
    root = data_dir.resolve()
    if not root.is_dir() or limit < 1:
        return []
    rows: list[tuple[str, int, datetime]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        try:
            rel = path.relative_to(root)
        except ValueError:
            continue
        if any(part.startswith(".") for part in rel.parts):
            continue
        st = path.stat()
        mtime = datetime.fromtimestamp(st.st_mtime, tz=UTC)
        posix = str(rel).replace("\\", "/")
        rows.append((posix, st.st_size, mtime))
        if len(rows) >= limit:
            break
    return rows
