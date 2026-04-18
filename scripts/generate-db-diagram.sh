#!/usr/bin/env bash
# DB ER 図を docs/ に生成する（eralchemy2 + Graphviz）。
# リポジトリルートから実行。backend/.venv が無い・壊れていれば作成し直し、依存を入れてから描画する。
# 使い方: リポジトリルートで ./scripts/generate-db-diagram.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKEND="$ROOT/backend"
VENV_PY="$BACKEND/.venv/bin/python"
SCRIPT="$BACKEND/scripts/render_db_diagram.py"
PY="${PYTHON:-python3}"

if ! command -v dot >/dev/null 2>&1; then
  echo "ERROR: Graphviz の \`dot\` が PATH にありません。例: brew install graphviz" >&2
  exit 1
fi

if ! command -v "$PY" >/dev/null 2>&1; then
  echo "ERROR: \`$PY\` が見つかりません。PYTHON=/path/to/python3 を指定するか PATH を通してください。" >&2
  exit 1
fi

venv_ok() {
  [[ -x "$VENV_PY" ]] && "$VENV_PY" -c "pass" >/dev/null 2>&1
}

if ! venv_ok; then
  echo "==> backend/.venv を作成（または作り直し）します"
  rm -rf "$BACKEND/.venv"
  (cd "$BACKEND" && "$PY" -m venv .venv)
fi

if ! venv_ok; then
  echo "ERROR: venv の作成に失敗しました: $VENV_PY" >&2
  exit 1
fi

# eralchemy2 → pygraphviz が graphviz/cgraph.h をコンパイルで参照するため、
# Homebrew の graphviz へ include/lib を通す（apt では libgraphviz-dev で /usr に入る想定）
if command -v brew >/dev/null 2>&1; then
  _gv="$(brew --prefix graphviz 2>/dev/null || true)"
  if [[ -n "${_gv}" && -f "${_gv}/include/graphviz/cgraph.h" ]]; then
    export PKG_CONFIG_PATH="${_gv}/lib/pkgconfig${PKG_CONFIG_PATH:+:${PKG_CONFIG_PATH}}"
    export CFLAGS="${CFLAGS:-} -I${_gv}/include"
    export LDFLAGS="${LDFLAGS:-} -L${_gv}/lib"
    echo "==> pygraphviz 用に Graphviz を指す: ${_gv}"
  fi
fi

echo "==> 依存をインストール（requirements-dev.txt）"
"$VENV_PY" -m pip install -q --upgrade pip
"$VENV_PY" -m pip install -q -r "$BACKEND/requirements-dev.txt"

echo "==> ER 図を生成（docs/database-er.png）"
exec "$VENV_PY" "$SCRIPT"
