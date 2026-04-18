#!/usr/bin/env python3
"""
SQLAlchemy メタデータから ER 図を生成する（eralchemy2 + Graphviz）。

前提:
  - Graphviz の ``dot`` が PATH 上にあること
  - **pygraphviz** 用: macOS は ``brew install graphviz``、Debian/Ubuntu は ``libgraphviz-dev`` も（``generate-db-diagram.sh`` が Homebrew の include/lib を渡す）

リポジトリルートから ``./scripts/generate-db-diagram.sh`` を実行すると、
``backend/.venv`` の作成・修復、``python -m pip install -r requirements-dev.txt``、本スクリプトの実行まで行われる。

出力（リポジトリルートの ``docs/database-er.png`` のみ）
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
_REPO = _BACKEND.parent
_DOCS = _REPO / "docs"

# 以前の生成物を掃除（PNG のみ運用に切り替え）
_STALE = (
    "database-er.dot",
    "database-er.md",
    "database-er.html",
    "database-er.mmd",
    "database-er.svg",
)


def main() -> None:
    if not shutil.which("dot"):
        print(
            "ERROR: Graphviz の `dot` が見つかりません。\n"
            "  macOS: brew install graphviz\n"
            "  Debian/Ubuntu: sudo apt install graphviz\n"
            "その後、PATH を確認してください。",
            file=sys.stderr,
        )
        sys.exit(1)

    if str(_BACKEND) not in sys.path:
        sys.path.insert(0, str(_BACKEND))

    try:
        from eralchemy2 import render_er
    except ImportError:
        print(
            "ERROR: eralchemy2 がインストールされていません。\n"
            "  リポジトリルートで: ./scripts/generate-db-diagram.sh",
            file=sys.stderr,
        )
        sys.exit(1)

    from app.db.base import Base  # noqa: E402
    import app.models  # noqa: E402, F401

    _DOCS.mkdir(parents=True, exist_ok=True)

    for name in _STALE:
        p = _DOCS / name
        if p.is_file():
            p.unlink()

    png = _DOCS / "database-er.png"
    render_er(Base, str(png))
    print(f"Wrote: {png}")


if __name__ == "__main__":
    main()
