# spira-base — エージェント向け仕様

このファイルが **単一の一次ソース**です。

### ドキュメント編集ポリシー

- **README.md** — ユーザーから明示的に依頼されたときだけ編集する。開発手順は **コマンド中心**とし、方針・設計判断は **本ファイル**に書く（例: Drizzle Studio は「Docker Compose」内の小見出し）。
- **DESIGN.md / `.claude/skills/`** — 変更しない（インポートされたもの）。

### コミットメッセージ

- **コミットの実行** — エージェントは `git commit`（および `git push`）を **実行しない**。変更のステージング・コミット・プッシュは **ユーザーが手動**で行う。
- **Conventional Commits** の prefix を必ずつける。リリースバージョンはコミットメッセージから自動決定される。

| prefix | 用途 | バージョン変化 |
|--------|------|---------------|
| `feat:` | 新機能 | minor（v1.0.0 → v1.1.0） |
| `fix:` | バグ修正 | patch（v1.0.0 → v1.0.1） |
| `feat!:` | 破壊的変更 | major（v1.0.0 → v2.0.0） |
| `chore:` | 雑務・設定変更 | 変化なし |
| `docs:` | ドキュメントのみ | 変化なし |
| `refactor:` | リファクタリング | 変化なし |
| `test:` | テストのみ | 変化なし |

**例:**
```
feat: ストリーミング回答を追加
fix: 引用リンクの表示修正
chore: 依存パッケージを更新
```

### リリース（release-please）

- **Release PR は必ず `main` にマージする。**`dev` にマージしてもタグ・GitHub Release は作られない（`.github/workflows/release.yml` は `main` への `push` のみをトリガーにしている）。手順の詳細は README.md「リリース運用」を参照。

---

## プロジェクト概要

- **目的:** 映像表現の根拠となる「論文（理論）」と「オープンデータ（事実）」を集約・解析し、制作工程で再利用できる構造化データへ変換する制作支援インフラ。
- **設計思想:**
  - **装飾最小:** UI と説明は必要十分に留める。
  - **前処理の自動化:** 取り込み〜正規化を手作業に頼りすぎない構成。
  - **再利用可能な JSON 出力:** API 契約とスキーマを明確にし、機械可読な結果を一級市民として扱う。
  - **ユーザーストーリー起点:** ストーリーに紐づかない装飾・API・画面は追加しない。

### UI 方針（フロントを触るとき）

- **文章ではなく UI デザインで表現する:** 操作の意味・状態は、レイアウト・コンポーネント・余白・アイコンで示す。
- **説明文は少なく:** 画面内のヘルプ段落を増やさない。補足は短い 1 行・placeholder・項目名に留める。
- **視覚で説明する:** 選択肢の違い・状態・件数は、タイポグラフィ・色・コントロールの並びで区別する。

---

## 技術スタック

| 領域 | スタック |
|------|----------|
| フロント | Next.js 16 + TypeScript（App Router）|
| スタイル | Tailwind CSS v4 + shadcn/ui |
| Node（ワークスペース） | **pnpm workspace**（ルートの `pnpm-lock.yaml`） |
| バックエンド | FastAPI + uvicorn |
| データベース | PostgreSQL + pgvector（`ankane/pgvector` イメージ） |
| LLM / Embedding | Google Gemini（`gemini-2.5-flash` / `gemini-embedding-001` 768 次元） |

---

## ディレクトリ構成

```
spira-base/
├── frontend/
│   ├── app/
│   │   ├── (knowledge)/          # 認証ガード付きルートグループ
│   │   │   ├── ask/              # RAG 質問ページ
│   │   │   ├── add/              # 資料追加ページ
│   │   │   ├── file/             # ファイル詳細ページ
│   │   │   ├── saved/logs/       # 定期実行ログページ
│   │   │   ├── components/       # ページ固有コンポーネント
│   │   │   ├── hooks/            # ページ固有カスタムフック
│   │   │   └── knowledge-studio-context.tsx  # グローバル状態
│   │   └── login/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui プリミティブ
│   │   ├── site-header.tsx
│   │   ├── site-sidebar.tsx
│   │   └── sidebar-periodic-run-logs.tsx
│   └── lib/
│       ├── api/                  # バックエンド API クライアント（1 エンドポイント 1 ファイル）
│       │   ├── api.ts            # fetch ラッパー・apiBase・withAuth
│       │   ├── analyze.ts
│       │   ├── knowledge.ts
│       │   ├── data.ts
│       │   └── ...
│       └── auth/
│           └── token.ts          # JWT 読み書き・有効期限チェック
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI ルーター
│   │   │   ├── routes_analyze.py
│   │   │   ├── routes_auth.py
│   │   │   ├── routes_data.py
│   │   │   ├── routes_imports.py
│   │   │   ├── routes_knowledge.py
│   │   │   └── deps_auth.py      # Bearer JWT 検証依存
│   │   ├── core/
│   │   │   ├── auth.py           # JWT 発行・検証・bcrypt
│   │   │   └── settings.py       # 環境変数アクセサ
│   │   ├── db/
│   │   │   └── seed_dev.py       # 開発用 seed（python -m app.db.seed_dev）
│   │   ├── models/tables.py
│   │   ├── schemas/
│   │   └── services/
│   │       ├── analyze.py        # RAG + Gemini（通常・SSE ストリーム）
│   │       ├── embeddings.py
│   │       ├── ingest.py
│   │       ├── extract/
│   │       ├── external/         # OpenAlex 等の外部メタ取得
│   │       └── source_import/    # arXiv 等の外部ソース取り込み
│   └── tests/
├── docker-compose.yml
├── docker-compose.prod.yml
└── pnpm-workspace.yaml
```

### ディレクトリ境界

- `frontend/` — Next.js のみ。DB スキーマは触らない。API 契約に沿ったクライアント呼び出しのみ。
- `backend/` — FastAPI・DB アクセス・RAG/LLM ロジック。Next のページ構成は触らない。
- API クライアントは `frontend/lib/api/` に置く。1 エンドポイント群 = 1 ファイル。

---

## 環境変数

### フロント（`frontend/.env.local`）

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | バックエンド URL（例: `http://localhost:8001`） |
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` のとき認証フローを有効化 |

### バックエンド（`backend/.env`）

| 変数 | 説明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `GOOGLE_API_KEY` | Gemini API キー（analyze・embedding で必須） |
| `GEMINI_LLM_MODEL` | 既定 `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | 既定 `gemini-embedding-001` |
| `DATA_DIR` | データ格納ディレクトリ（Compose: `/app/data`） |
| `RAG_TOP_K` | ベクトル検索の既定件数（既定 5） |
| `AUTH_ENABLED` | `true` のとき JWT 認証を強制 |
| `AUTH_JWT_SECRET` | JWT 署名鍵（`AUTH_ENABLED=true` のとき必須） |
| `ADMIN_EMAIL` | seed 実行時に作成する管理者メール |
| `ADMIN_PASSWORD` | seed 実行時に作成する管理者パスワード（平文） |

**Git:** `.env`、`.env.local`、`.venv`、`node_modules` は `.gitignore` で除外。

---

## Docker Compose

| サービス | 外部ポート | 備考 |
|----------|-----------|------|
| `frontend` | **3001** | `NEXT_PUBLIC_API_URL=http://localhost:8001` |
| `backend` | **8001** | `DATABASE_URL` を `.env` から読む |
| `db` | 5432 | `image: ankane/pgvector` |

- 開発用 Dockerfile: ボリュームマウント + ホットリロード（フロント `pnpm run dev`、バックエンド `uvicorn --reload`）
- 本番: `docker-compose.prod.yml`（命名ボリューム `knowledge_data` で `/app/data` を永続化）
- コンテナ起動時に `pnpm install --frozen-lockfile` が自動実行される（スタンプファイルで変更検知）

**テスト:** `docker compose exec backend pytest -q`  
**Seed:** `docker compose exec backend python -m app.db.seed_dev`

### Drizzle Studio と SQLAlchemy（開発時）

- **ORM は SQLAlchemy のまま**とする。[Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) は開発時の **DB 閲覧**と、`drizzle-kit pull`（pnpm ワークスペース `spira-base-backend-drizzle`）による **`drizzle/schema.ts` のイントロスペクション**だけに使う。**スキーマ変更・マイグレーションの正は SQLAlchemy 側**（`app/models/tables.py`、`app/db/*_migrate.py`、`init_db` 経路など）。
- Compose の **`drizzle-studio` サービス**は `profiles: [drizzle]` のため、**既定の `docker compose up` には含まれない**。Studio 起動および `db:pull` の **具体的なコマンドは README.md（開発環境構築）**に置く。

### DB スキーマ変更時のルール

`app/models/tables.py` または `app/db/*_migrate.py` を変更したときは、必ず以下を実行して ER 図を更新する。

```bash
./scripts/generate-db-diagram.sh
```

生成された図（`docs/` 配下）をコミットに含める。初回のみ `brew install graphviz` が必要（README.md 参照）。

---

## 実装状況

| STEP | 状態 |
|------|------|
| STEP 1 モノレポ・Docker 基盤 | 完了 |
| STEP 2 DB・SQLAlchemy + pgvector | 完了 |
| STEP 3 RAG + Gemini（`POST /api/analyze`） | 完了 |
| STEP 4 フロント UI | 完了（下記参照） |
| STEP 5 本番デプロイ | 未着手 |

### STEP 4 実装済み機能

| 機能 | 内容 |
|------|------|
| 5 画面 | 質問する・資料を追加・資料の検索・定期実行・実行ログ |
| ファイルアップロード | 複数ファイル・D&D・プレビュー確認（`.md` / `.txt` / `.json` / `.pdf`） |
| arXiv 取り込み | ID 指定・キーワード検索・本文 PDF 抽出オプション・プレビュー確認 |
| RAG 質問（SSE） | `POST /api/analyze/stream` でトークンをストリーミング表示、Markdown レンダリング |
| 質問履歴 | 古い順に表示、引用ファイルへのリンク付き |
| ベクトル検索 | `POST /api/knowledge/search` |
| 定期実行 | APScheduler + CRUD（名前・クエリ・間隔の編集含む） |
| 実行ログ | 条件ごとの履歴一覧・詳細・取り込みファイルへのリンク |
| 認証 | JWT ログイン・セッション切れ自動リダイレクト |
| ダッシュボード | ファイル数・チャンク数・分類統計 |

---

## HTTP API 契約

### 認証

すべての保護ルートは `Authorization: Bearer <token>` ヘッダーが必要（`AUTH_ENABLED=true` のとき）。

#### `POST /api/auth/login`

**Request:** `{ "email": string, "password": string }`  
**Response:** `{ "access_token": string, "token_type": "bearer" }`  
**ステータス:** `401`（認証失敗）、`503`（`AUTH_ENABLED` 無効）

#### 認可（`AUTH_ENABLED=true` のとき）

- 質問履歴・保存検索・実行ログの **一覧・取得・更新・削除** は、JWT のユーザーに紐づく行に限定される（他ユーザーの ID を指定しても `404`）。
- 新規作成（質問履歴の自動保存、保存検索の `POST` など）では、サーバーが `user_id` を付与する（クライアントがリクエストに `user_id` を含める必要はない）。
- `AUTH_ENABLED=false` のときは従来どおり、これらのリソースはテナント全体で共有される。
- DB 上 `user_id` が NULL の旧行は、認証オン時の API からは一覧にも出ず、単体取得・更新も `404` となる。

---

### `POST /api/analyze`

**Request（JSON）**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `question` | string | ユーザ質問（1〜8000 文字） |
| `reindex_sources` | boolean | `true` のとき DATA_DIR を再取り込み |
| `top_k` | int | ベクトル検索件数（1〜50、省略時 `RAG_TOP_K`） |
| `save_question_history` | boolean | 既定 `true`。成功時に `question_history` へ保存（`AUTH_ENABLED=true` のときは JWT ユーザーを `user_id` に紐づける） |

**Response（JSON）**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `answer` | string | 回答本文（Markdown） |
| `key_points` | string[] | 重要箇条書き |
| `citations` | object[] | `document_id`（int）, `excerpt`（string）, `source_path`（string \| null） |

**ステータス:** `503`（`GOOGLE_API_KEY` 未設定）、`400`（ドキュメントなし）

---

### `POST /api/analyze/stream`

同一リクエスト本文。`text/event-stream` で SSE を返す。

**SSE イベント**

| type | ペイロード | 説明 |
|------|-----------|------|
| `token` | `{ "type": "token", "content": string }` | 回答テキストの断片 |
| `done` | `{ "type": "done", "key_points": string[], "citations": Citation[] }` | 完了。`citations` に `source_path` を含む |
| `error` | `{ "type": "error", "message": string }` | エラー |

**実装:** Phase 1 で回答テキストをストリーミング、Phase 2 で `key_points` + `citations` を構造化出力で取得し `done` イベントを送信。  
履歴保存の `user_id` 付与は `POST /api/analyze` と同様（`save_question_history` が `true` のとき）。

---

### `POST /api/data/upload`

multipart `file`。拡張子 `.md` / `.txt` / `.json` / `.pdf`、最大 10 MiB。  
保存先: `DATA_DIR/uploads/`。PDF は同時に `uploads/extracted/{stem}.md` へ抽出。  
**Response:** `{ "path", "filename", "size_bytes" }`

### `POST /api/data/reindex`

`DATA_DIR` を再取り込み。既存の `documents` / `raw_data` を置き換える。  
**Response:** `{ "document_chunks", "raw_data_rows" }`

### `GET /api/data/files`

`DATA_DIR` 再帰走査（`.` 始まりのパスを除外）。  
**Query:** `limit`（1〜5000、既定 2000）  
**Response:** `{ "files": [{ "path", "size_bytes", "modified_at" }] }`

### `GET /api/data/files/enrichment`

`path`（DATA_DIR 相対）から表示用メタを返す（arXiv Atom でタイトル・要約、OpenAlex で引用数）。  
**Response:** `{ "display_name", "arxiv_id", "citation_count", "summary", "tldr", "sources", "arxiv_categories" }`

### `GET /api/data/files/lookup`

`path` に対応するローカルファイル情報を返す。  
**Response:** `{ "path", "size_bytes", "modified_at" }`

### `POST /api/data/imports/arxiv`

arXiv Atom API からメタ取得 → `DATA_DIR/imports/arxiv/*.md` に保存。連続取得時は約 2 秒間隔。

**Request:** `{ "arxiv_ids": string[], "search_query": string, "max_results": int, "include_full_text": boolean }`  
**Response:** `{ "written": string[], "entry_count": int, "match_hints": [{ "path", "arxiv_id", "matched_in": string[], "snippet" }] }` — `match_hints` はタイトル・要約内のキーワード周辺抜粋（定期実行ログの `imported_payload` と同型）。

### `POST /api/data/imports/arxiv/preview`

取り込み前のプレビュー取得（保存しない）。  
**Response:** `{ "entries": [{ "arxiv_id", "title", "summary", "authors", "published" }] }`

### `GET /api/knowledge/stats`

**Response:** `{ "document_chunks", "raw_data_rows" }`

### `GET /api/knowledge/question-history`

保存済み質問・分析結果（新しい順）。  
**Query:** `limit`（1〜100、既定 50）  
**Response:** `[{ "id", "user_id"（UUID \| null）, "question", "response": AnalyzeResponse, "created_at" }]`（`AUTH_ENABLED=true` のときは当該ユーザーの行のみ）

### `POST /api/knowledge/search`

ベクトル検索（LLM なし）。  
**Request:** `{ "query": string, "top_k": int }`  
**Response:** `{ "hits": [{ "document_id", "text", "distance", "source_path" }] }`

### `GET /api/knowledge/saved-searches`

**Response:** `[{ "id", "user_id"（UUID \| null）, "name", "query", "arxiv_ids", "search_target", "top_k", "interval_minutes", "schedule_enabled", "last_run_at", "created_at", "updated_at" }]`（`AUTH_ENABLED=true` のときは当該ユーザーの行のみ）

### `POST /api/knowledge/saved-searches`

**Request:** `{ "name", "query"（必須）, "search_target"（`knowledge` | `arxiv`）, "top_k", "interval_minutes", "schedule_enabled" }`

### `PATCH /api/knowledge/saved-searches/{id}`

部分更新。`name`, `query`, `search_target`, `top_k`, `interval_minutes`, `schedule_enabled`, `last_run_at` を指定可能。`AUTH_ENABLED=true` のとき、他ユーザーの保存検索は `404`。

### `DELETE /api/knowledge/saved-searches/{id}`

**ステータス:** `204`（成功）、`404`（該当なし、または他ユーザーの行）

### `GET /api/knowledge/saved-search-run-logs`

**Response:** `[{ "id", "saved_search_id", "title_snapshot", "status", "created_at" }]`（`AUTH_ENABLED=true` のとき、紐づく保存検索が自分のものに限る。保存検索が 0 件なら空配列）

### `GET /api/knowledge/saved-search-run-logs/{id}`

**Response:** `{ "id", "saved_search_id", "title_snapshot", "status", "imported_content", "imported_payload", "error_message", "created_at" }`。arXiv 定期実行成功時、`imported_payload` に `written`（相対パス配列）に加え `match_hints`（各パスごとの `snippet`・`matched_in`: `title` / `abstract`）が含まれる場合がある。`AUTH_ENABLED=true` のとき、親の保存検索が自分のものでなければ `404`。`saved_search_id` が NULL の行も `404`。

### `POST /api/knowledge/saved-search-run-logs`

ジョブからの結果書き込み用。  
**Request:** `{ "saved_search_id", "title_snapshot", "status", "imported_content", "imported_payload", "error_message" }`  
`AUTH_ENABLED=true` かつ `saved_search_id` を指定する場合、当該保存検索が JWT ユーザーのものでなければ `404`。

---

## バックエンド拡張メモ

### ファイル取り込みパイプライン

- **案 A（採用）:** 抽出テキストを `DATA_DIR` 配下に `.md` として書き出し → 既存の `POST /api/data/reindex` でベクトル化。
- 外部ソースは `backend/app/services/source_import/` にモジュールを追加し、ルートは `routes_imports.py` に登録する。
- 設定（外部 API の URL・キー・タイムアウト）は `app/core/settings` に集約する。

### 今後の計画

| 項目 | 内容 |
|------|------|
| 増分インデックス | 全削除しない `reindex` |
| 質問履歴の削除・エクスポート | 未着手 |
| Semantic Scholar 取り込み | S2 import → `source_import` に追加 |
| 引用グラフ UI | OpenAlex エッジ + React Flow（`@xyflow/react`） |
| STEP 5 本番デプロイ | Cloud Run 向け `.github/workflows/deploy.yml` |

**外部ソースの役割分担:**

| ソース | 役割 |
|--------|------|
| arXiv | 本文・プレビュー・PDF 抽出の主軸 |
| OpenAlex | 引用数・引用エッジ（arXiv ID / DOI で突き合わせ） |
| Semantic Scholar | 論文データ取得・検索の拡張（エッジ正は OpenAlex に一本化推奨） |

---

## 依存関係セキュリティ

- 新規パッケージ追加前: 正しいパッケージ名・メンテ状況・供給元を確認。
- **pnpm:** `pnpm audit`（ルートで実行）。`pnpm add <pkg> --filter frontend` で追加。
- **Python:** `pip-audit` で既知 CVE をスキャン。`requirements.txt` でバージョン固定。
- 高危険度の脆弱性は放置せず、更新・代替・例外理由の記録のいずれかで対処する。
