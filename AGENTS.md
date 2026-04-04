# knowledge-base — エージェント向け仕様

このファイルが **単一の一次ソース**です。以降の実装は「該当 STEP の節だけを開いて実装する」運用とする。

### ドキュメント編集（エージェント向け）

- **README.md** — ユーザーから **明示的に依頼されたときだけ** 編集する。トラブルシュートや補足を「気軽に」追記しない。説明が要る場合は **会話で答える**か、**本ファイルの該当節**に最小限で書く。

---

## プロジェクト目的と設計思想

- **目的:** 映像表現の根拠となる「論文（理論）」と「オープンデータ（事実）」を集約・解析し、制作工程（Next.js や After Effects 等）で再利用できる構造化データ（JSON 等）へ変換する制作支援インフラとして、エージェントと人が同じ前提で実装できるようにすること。
- **設計思想:**
  - **装飾最小:** UI と説明は必要十分に留める。
  - **前処理の自動化:** 取り込み〜正規化を手作業に頼りすぎない構成を目指す。
  - **再利用可能な JSON 出力:** API 契約とスキーマを明確にし、機械可読な結果を一級市民として扱う。

---

## 技術スタックとモノレポ構成

| 領域 | スタック |
|------|----------|
| フロント | Next.js + TypeScript（App Router 推奨） |
| Node（ワークスペース） | **pnpm workspace**（ルートの `pnpm-lock.yaml`）— `frontend/` と `backend/` の Drizzle 用 Node 依存をまとめる |
| バックエンド | FastAPI + uvicorn |
| データベース | PostgreSQL + pgvector（ローカルは `ankane/pgvector` イメージ） |

### ディレクトリ境界

- `frontend/` — Next.js のみ。バックエンド実装・DB スキーマは **触らない**（API 契約に沿ったクライアント呼び出しのみ）。
- `backend/` — FastAPI・DB アクセス・RAG/LLM ロジック。**Next のページ構成やコンポーネントは触らない**。
- リポジトリ直下 — `docker-compose.yml`、`pnpm-workspace.yaml`、`package.json`（ワークスペースルート）、`AGENTS.md` など共有インフラ・資料。

共有するのは **環境変数名・API の入出力契約** に限定し、相手側の設定ファイルを勝手に書き換えない。

---

## 環境変数ポリシー

- **フロント:** ローカル秘密は `frontend/.env.local`。公開してよい値は `NEXT_PUBLIC_*` のみ。
- **バックエンド:** `backend/.env`（Compose では同ファイルを `.env` としてマウントする想定でよい）。
- **テンプレート:** `frontend/.env.example` / `backend/.env.example` をリポジトリに含め、実値は含めない。
- **Git:** ルートの `.gitignore` で `.env`、`.env.local`、`.venv`、`node_modules` などを必ず除外する。

---

## Docker Compose 仕様

| サービス | ポート | 備考 |
|----------|--------|------|
| `frontend` | 3000 | `NEXT_PUBLIC_API_URL` 等を build/run 時に注入可能にする |
| `backend` | 8000 | `DATABASE_URL` は `.env` から読む。DB 起動待ちは `depends_on` に加え、簡易 wait スクリプトまたは **初回接続リトライ**で吸収する方針でよい |
| `db` | 5432 | `image: ankane/pgvector` |

各パッケージに `.dockerignore` を置く（フロントの Docker ビルドは **リポジトリルートを context** にし、ルートに `.dockerignore` も置く）。開発用 Dockerfile は **ボリュームマウント + ホットリロード**（フロント: `pnpm run dev`、バックエンド: `uvicorn --reload`）を前提とする。

---

## 依存関係のセキュリティ（pnpm / Python）

**方針:** `pnpm add`（または `pnpm install`）/ `pip install` で **新規パッケージを追加する前**に、既知リスクの有無を確認する。追加後もロックファイルベースで監査する。

**高危険度の脆弱性:** 放置せず、更新・代替・例外理由の記録のいずれかで扱う。例外を選ぶ場合は理由を本ファイルまたは PR 説明に残す。

### 新規パッケージを入れる前（双方共通）

- **供給元の確認:** 正しいパッケージ名か（タイポスクワッティング回避）、メンテ状況・星・最近のコミット／リリースを目視。
- **レジストリ情報:** npm ならパッケージページと公開者；PyPI ならプロジェクトリンク・Maintainer を確認。

### pnpm（ルート — `frontend/` と `backend/`）

- **導入前:** 上記「新規パッケージを入れる前」と同様に npm レジストリ上の供給元を確認（`pnpm view <pkg>` でも可）。
- **導入後:** **ルートの** `pnpm-lock.yaml` をコミットし、ルートで `pnpm audit` を実行。依存の追加はルートで `pnpm add <pkg> --filter frontend`（または `--filter knowledge-base-backend-drizzle`）など。**日常の起動・フロント開発は Docker Compose を前提**とし、コンテナ起動時に `pnpm install` が走る。ホストで直接触る場合のみ、ルートの `package.json`（`pnpm dev:frontend` / `pnpm run db:studio` 等）を参照する。

### Python（`backend/` FastAPI）

- **導入前:** PyPI／GitHub で既知脆弱性・Issue をざっと確認。実行ファイル系・ネットワーク権限を要するパッケージは依存関係も含め注意。
- **導入後:** 版本固定（`requirements.txt` または `uv.lock` 等）を維持し、可能なら **`pip-audit`**（またはチーム標準の同等ツール）で既知 CVE をスキャン。修正不可能な場合は理由と期限を残す。

### 実装フェーズとの対応

- **STEP 1:** 初期スキャフォールド直後、フロント・バックエンドそれぞれで上記の **audit / pip-audit を 1 回**走らせ、ゼロベースの結果を把握する（CI 化は STEP 5 の任意拡張）。

---

## 1 フェーズずつ進める運用

1. 直前の STEP の **完了定義**を満たしてから次へ進む。
2. 変更は **当該 STEP が触ってよいディレクトリ**に閉じる（上記境界を守る）。
3. STEP 完了時は本ファイルの **ステータス**を更新する（下記「現在のステータス」）。

### 現在のステータス

| STEP | 状態 | メモ |
|------|------|------|
| STEP 1 | 完了 | `docker compose up` 疎通済（`/health`・フロント 200）。pnpm audit / pip-audit を適宜。pip-audit クリア（`fastapi==0.135.3` で starlette CVE 対応） |
| STEP 2 | 完了 | SQLAlchemy + pgvector。`documents` / `raw_data`。起動時 `CREATE EXTENSION IF NOT EXISTS vector` と `create_all`（Alembic はスキーマ変更が増えた段階で導入） |
| STEP 3 | 完了 | LlamaIndex + Gemini。`data/` 取り込み、`POST /api/analyze`（構造化 JSON）。`documents.embedding` は Gemini 用 **768 次元** |
| STEP 4 | 進行中 | **shadcn/ui**（base-nova）。3 タブ（質問 / 資料追加 / 定期・検索）。`GET /api/knowledge/stats`。保存クエリは localStorage（真の定期は cron 等から `POST /api/data/imports/arxiv`） |
| STEP 5 | 未着手 | デプロイ・本番ビルド |

**STEP 1 完了定義**

- `docker compose up` でフロント・API・DB が起動する。
- ブラウザでフロントが表示される。
- API でヘルスチェックが通る（例: `GET /health` を STEP 1 で最小実装してよい）。
- **STEP 2 着手条件:** 上記を満たし、本表で STEP 1 を「完了」に更新したこと。

**STEP 2 完了定義**

- `DATABASE_URL` で PostgreSQL（pgvector）に接続できる。
- `documents`（`text`, `embedding: vector(768)` ※Gemini `gemini-embedding-001` の出力次元を 768 に合わせる）と `raw_data`（`source`, `content: jsonb`）が定義され、起動時にテーブルが作成される。
- アプリ起動時に `CREATE EXTENSION IF NOT EXISTS vector` が実行される。
- `GET /health` が DB 疎通を含め成功する。
- **STEP 3 着手条件:** 本表で STEP 2 を「完了」に更新したこと。

**STEP 3 完了定義**

- 環境変数 `GOOGLE_API_KEY` で Gemini 埋め込み・生成を呼び出せる。
- `DATA_DIR`（Compose ではリポジトリ直下 `data/` を `backend` の `/app/data` にマウント）の `.md` / `.txt` をチャンク化し、`documents` にベクトル付きで保存できる。`.json` は `raw_data` に格納できる。
- `POST /api/analyze` が下記「HTTP API 契約」の JSON 形式で応答する。`reindex_sources: true` で `data/` の再取り込み（既存 `documents` / `raw_data` の置換）ができる。
- **STEP 4 着手条件:** 本表で STEP 3 を「完了」に更新したこと。

---

## HTTP API 契約

### `POST /api/analyze`

**Request（JSON）**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `question` | string | はい | ユーザ質問（1〜8000 文字） |
| `reindex_sources` | boolean | いいえ | `true` のとき `DATA_DIR` を再取り込み（既存の `documents` と `raw_data` を削除してから再構築） |
| `top_k` | int | いいえ | ベクトル検索の件数（1〜20）。省略時は環境変数 `RAG_TOP_K`（既定 5） |

**Response（JSON）**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `answer` | string | 回答本文 |
| `key_points` | string[] | 重要箇条書き |
| `citations` | object[] | `document_id`（int）, `excerpt`（string） |

**ステータスコード**

- `503` — `GOOGLE_API_KEY` 未設定。
- `400` — 検索対象のドキュメントがない（初回は `reindex_sources: true` で `data/` を取り込むか、`data/` に `.md`/`.txt` を配置する）。

**環境変数（STEP 3）**

- `GOOGLE_API_KEY` — 必須（分析API利用時）。
- `GEMINI_LLM_MODEL` — 既定 `gemini-2.5-flash`（2.0 Flash は新規利用向けに終了）。
- `GEMINI_EMBEDDING_MODEL` — 既定 `gemini-embedding-001`（768 次元は `EmbedContentConfig` で指定。`documents.embedding` と一致）。

### `POST /api/data/upload`

multipart の `file` 1 件。拡張子 **`.md` / `.txt` / `.json`** のみ、最大 **10 MiB**。保存先は `DATA_DIR/uploads/`（既存同名は上書き）。

**Response（JSON）:** `path`（DATA_DIR からの相対パス）, `filename`, `size_bytes`

**ステータスコード:** `400`（不正な拡張子・ファイル名）, `413`（サイズ超過）

取り込み（チャンク化・embedding）は **`POST /api/analyze` の `reindex_sources: true`** で実行（既存仕様どおり `data/` ツリー全体を対象）。

### `POST /api/data/imports/arxiv`

arXiv Atom API からメタデータ・要約を取得し、`DATA_DIR/imports/arxiv/*.md` に保存する。オープンデータ連携の第 1 弾；同型のエンドポイントを `app/api/routes_imports.py` / `app/services/source_import/` に追加していく想定。

**Request（JSON）**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `arxiv_ids` | string[] | いいえ | ID または `https://arxiv.org/abs/...` 形式（複数可。`arxiv_ids` と `search_query` のどちらか一方以上） |
| `search_query` | string | いいえ | 全文検索クエリ（内部では `all:...`） |
| `max_results` | int | いいえ | 検索時の最大件数（1〜20、既定 5） |

**Response（JSON）:** `written`（相対パスの配列）, `entry_count`

**ステータスコード:** `422`（入力検証）, `502`（arXiv HTTP / Atom 解析エラー）

### `GET /api/knowledge/stats`

インデックス概要（フロントの質問タブ用）。

**Response（JSON）:** `document_chunks`（embedding 付き `documents` 件数）, `raw_data_rows`

---

## STEP 定義と実装プロンプト（Cursor / エージェント向け）

> **注:** 別途ユーザーが貼った「Cursor へのプロンプト」本文は本リポジトリに無いため、以下は **初期計画書の要件をそのまま実装指示として転記**したもの。フェーズ着手時は該当 STEP のブロックをコピーして使う。

### STEP 1 — モノレポと Docker 基盤

**定義**

- `frontend/` — `create-next-app` 相当（TypeScript、App Router 推奨）。開発用 Dockerfile（ルート context、ボリュームマウント + `pnpm run dev`）。
- `backend/` — FastAPI + uvicorn。開発用 Dockerfile（`--reload`、ソースマウント）。
- リポジトリ直下: `docker-compose.yml`（3 サービス）、各パッケージ用 `.dockerignore`。
- `frontend/.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:8000` 等。
- `backend/.env.example` — `DATABASE_URL=postgresql://...`（ローカル Compose 用のデフォルト）。STEP 2 向け Supabase 用の別名はコメントまたはプレースホルダでよい（実接続は STEP 2）。

**プロンプト（実装用・原文相当）**

```
AGENTS.md の STEP 1 に従い、knowledge-base リポジトリにモノレポと Docker 基盤を実装してください。

- frontend/: Next.js + TypeScript（App Router）、開発用 Dockerfile（ルート volume + pnpm run dev）、.dockerignore、.env.example（NEXT_PUBLIC_API_URL 等）
- backend/: FastAPI + uvicorn、開発用 Dockerfile（--reload、ソースボリューム）、.dockerignore、.env.example（Compose 用 DATABASE_URL。Supabase はプレースホルダのみ）
- ルート: docker-compose.yml で frontend:3000、backend:8000、db:5432（image: ankane/pgvector）。環境変数と depends_on を接続し、DB 待ちは wait またはバックエンドの接続リトライでよい
- .gitignore で .env / .env.local / .venv / node_modules 等を除外
- バックエンドに GET /health のような最小ヘルスエンドポイントを追加してよい
- スキャフォールド直後、リポジトリルートで `pnpm audit`、backend で pip-audit（または同等）を 1 回実行し結果を把握すること（AGENTS.md の依存関係セキュリティに従う）

計画ファイルは編集しないこと。完了したら AGENTS.md の「現在のステータス」で STEP 1 を完了に更新すること。
```

### STEP 2 — データベースとモデル

**定義**

- SQLAlchemy + PostgreSQL + pgvector。
- モデル: `documents` / `raw_data`。
- 起動時に `CREATE EXTENSION IF NOT EXISTS vector`（SQLAlchemy `event` の on_connect、またはマイグレーション：着手時に Alembic か create_all かを決定）。

**プロンプト（実装用・原文相当）**

```
AGENTS.md と STEP 1 の成果物に従い、STEP 2 を実装してください。

- SQLAlchemy で PostgreSQL（pgvector）に接続
- documents / raw_data モデルを定義
- vector 拡張を CREATE EXTENSION IF NOT EXISTS vector で有効化（接続時イベントまたはマイグレーション）
- Alembic 導入か create_all のみかは本節で決め、一貫した方針で進める

frontend/ は変更しない。backend/ と必要なら docker-compose / .env.example のみ。
```

### STEP 3 — RAG と分析 API

**定義**

- LlamaIndex + Gemini（環境変数 `GOOGLE_API_KEY`）。
- `data/` からの取り込み、pgvector への保存・検索クラス。
- `POST /api/analyze` と、構造化 JSON を強制するプロンプト（スキーマ明示）。

**プロンプト（実装用・原文相当）**

```
AGENTS.md と STEP 2 の DB スキーマに従い、STEP 3 を実装してください。

- LlamaIndex + Gemini（GOOGLE_API_KEY）、公式推奨に合わせてモデル名と SDK をピン止め
- data/ 取り込み、pgvector 保存・検索
- POST /api/analyze を実装し、応答は契約どおりの構造化 JSON になるようプロンプトでスキーマを強制

STEP 2 のテーブル設計を破壊的に変える場合は理由と移行方針を残す。
```

### STEP 3 — 動作確認手順（「どこまでできているか」の見分け方）

#### 結論：どこまでやれば良いか（必須・推奨・任意）

| レベル | やること | 完了の判断 | STEP に進んで良いか |
|--------|----------|------------|---------------------|
| **必須** | ホストで `pytest -q` を実行し、**失敗ゼロ**にする | **`N passed`** かつ **`0 failed`**（`skipped` があっても可） | **はい**（STEP 4 に進んでよい最低ライン） |
| **推奨** | 上に加え、DB を 768 次元に揃え **`6 passed`**（スモークなし） | 出力が **`6 passed`** | 自動テストで取り込み〜応答まで**自分の DB で**確認済み |
| **任意** | API を起動し、**実キー**で `curl` により `POST /api/analyze` が **200** | 返却 JSON に `answer` / `key_points` / `citations` | **本物の Gemini 経路**まで見たいときだけ |

**迷ったら:** **必須だけやれば STEP 3 の動作確認は「済んだ」扱いでよい。** 余力があれば **推奨**、実 API を触りたければ **任意**。

#### 明示チェックリスト（コピペ用）

**□ 必須（これだけは実施）**

1. Postgres を起動する: `docker compose up -d db`（ルートディレクトリ）
2. 依存を入れる: `cd backend && pip install -r requirements.txt`
3. テストを実行する: `pytest -q`
4. **`failed` が 1 つも無い**ことを確認する（`5 passed, 1 skipped` でも **必須は達成**）

**□ 推奨（スモークまで通したいとき）**

5. `5 passed, 1 skipped` のとき: ルートで `docker compose down -v` → `docker compose up -d db`（**DB 全消去**・開発用のみ）
6. もう一度 `cd backend && pytest -q` → **`6 passed`** を確認

**□ 任意（Gemini を実際に叩く）**

7. `backend/.env` に `GOOGLE_API_KEY` を設定し、API を起動（`docker compose up -d` 等）
8. 次を実行し **HTTP 200** と JSON フィールドを確認:

```bash
curl -s -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"question":"資料の要点は？","reindex_sources":true,"top_k":5}'
```

---

**1. リポジトリに「実装として含まれている」もの（コードがある＝機能の土台はある）**

| 項目 | 内容 |
|------|------|
| API | `POST /api/analyze`（契約は下記「HTTP API 契約」） |
| 取り込み | `data/` の `.md` / `.txt` → チャンク・埋め込み → `documents`、`.json` → `raw_data` |
| 検索 | pgvector コサイン距離で top-k |
| 生成 | `GOOGLE_API_KEY` 利用時、Gemini で構造化 JSON 応答 |
| 起動時 | `backend/.env` の `load_dotenv`（Docker では `GOOGLE_API_KEY` を compose の空上書きしない構成） |

ここは **テストを回さなくても実装済み**。「動いたか」は別。

**2. あなたの環境で「検証できている」か（これで可否が決まる）**

| 段階 | 何を確認しているか | **できている**と言える条件 | **まだ**のとき |
|------|-------------------|---------------------------|----------------|
| **A-①** | API・DB の土台 | `pytest -q` で **少なくとも 5 件が passed**（失敗ゼロ） | `failed` がある、または pytest 自体が動かない |
| **A-②** | 取り込み〜回答まで（**Gemini はモック**） | 同じく `pytest -q` で **6 passed**（`test_analyze_smoke` まで通る） | **5 passed, 1 skipped** → **A-② は未検証**。理由はほぼ確実に **`documents.embedding` が DB 上まだ 1536 等で、ORM の 768 と不一致** |
| **B** | 実キーで埋め込み・**本物の Gemini** | API 起動後、`curl` 等で **200** ＋ JSON に `answer` / `key_points` / `citations` | **B を実行していない** → **実 API 経路は未確認**（実装はあっても、キー・ネットワーク・`DATA_DIR` の不備はこの段で初めて分かる） |

**`pytest -q` の出力の読み方（早見）**

| 表示 | 意味 |
|------|------|
| `6 passed` | **A-① と A-② の両方**が、この環境では通っている |
| `5 passed, 1 skipped` | **A-① まで OK**。A-② は DB を 768 次元に揃えるまでスキップ |
| `failed` 付き | 表示されたテスト名を直すまで **STEP 3 動作確認として未達** |

#### 具体手順：「自分の環境で締める」ときに何をするか

**やりたいことは二つだけです。**（1）自動テストでスモークまで通す → **6 passed**。（2）実キーで 1 回 API を叩く → **200 + JSON**。

---

**（1）A-② まで通す＝`pytest` を `6 passed` にする**

| いまの状態 | 意味 |
|------------|------|
| `5 passed, 1 skipped` | DB の `documents.embedding` 列が **まだ古い次元（例: 1536）** などで、**ORM の 768 と一致していない**ことが多い。`create_all` は**既存列を書き換えない**ので、開発用 DB は**作り直し**が手っ取り早い。 |

**Docker Compose で `db` を使っている場合（コピペ用）**

1. リポジトリ**ルート**で、ボリュームごと DB を消す（**Postgres のデータは全消去**。開発用のみで実施）。

```bash
docker compose down -v
```

2. DB だけ起動する。

```bash
docker compose up -d db
```

3. `backend/.env` の **`DATABASE_URL` がホストから見えること**を確認する。pytest はホストの Python から繋ぐため、**`...@127.0.0.1:5432/...`** のような形が必要（`...@db:5432` はコンテナ内向けなのでホストの pytest では失敗しやすい）。

4. 新しい空の DB に **768 次元の `documents` テーブル**を作らせる。次のどちらかでよい。

   - `cd backend && pytest -q`（アプリの `init_db` が `create_all` する）  
   - または先に `docker compose up -d backend` などで API を一度起動してから pytest

5. 再度:

```bash
cd backend && pytest -q
```

→ **`6 passed`** なら（1）は完了。

---

**（2）B＝本物の Gemini で通したい（任意）**

1. `backend/.env` に **`GOOGLE_API_KEY=`（実キー）** を書く（行頭 `#` でコメントアウトしない）。

2. API を起動する（例: `docker compose up -d` で backend まで、または `backend` で `uvicorn`）。

3. **`data/`** に `.md` または `.txt` がある（未配置なら `data/sample.md` をそのまま使える）。Compose の backend は通常 **`./data` → `/app/data`**。ホストだけで uvicorn する場合は `backend/.env` の **`DATA_DIR`** を、リポジトリ直下の `data/` の**絶対パス**などに合わせる。

4. ターミナルで:

```bash
curl -s -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"question":"資料の要点は？","reindex_sources":true,"top_k":5}'
```

5. HTTP **200** で、返却 JSON に **`answer` / `key_points` / `citations`** があれば（2）は完了。  
   **503** → キーが読めていない（`.env` の場所・API 再起動を確認）。**400** → `DATA_DIR` または `data/` 内のテキストを確認。

---

**注意:** `docker compose down -v` は**名前付きボリュームに入っている DB を消す**操作です。共有の本番データには使わないこと。

**3. 実行コマンド**

**A（自動・Gemini 不要）**

1. PostgreSQL 起動（例: `docker compose up -d db`）。
2. `backend/.env` に `DATABASE_URL`（ホストからなら `127.0.0.1:5432`）。
3. `cd backend && pip install -r requirements.txt && pytest -q`

**B（実 API・任意）**

1. `backend/.env` に `GOOGLE_API_KEY=...`。
2. `data/` に `.md` / `.txt` を配置。Compose 以外で動かす場合は `DATA_DIR` がその `data/` を指すこと。
3. API 起動後、例（初回は取り込みを確実にするなら `reindex_sources: true`）:

```bash
curl -s -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"question":"資料の要点は？","reindex_sources":true,"top_k":5}'
```

- **200** かつ上記 JSON フィールドがあれば **B 達成**。
- **503** → `GOOGLE_API_KEY` 未読込（`.env`・再起動を確認）。
- **400** → `data/` にテキストが無い、または `DATA_DIR` がズレている。

**4. 目安の要約** — 上記の **「結論：どこまでやれば良いか」** の表と **チェックリスト** を参照。

### STEP 4 — フロント UI

**定義**

- アップロード、質問、結果表示。
- JSON ダウンロード、数値の簡易テーブル（shadcn/ui またはプレーン Tailwind）。
- 外部取り込み（**arXiv** ほか）：バックエンドは `app/services/source_import/` と `POST /api/data/imports/*` で段階的に拡張。フロントは必要に応じてフォームを追加。

**プロンプト（実装用・原文相当）**

```
AGENTS.md と POST /api/analyze の契約に従い、STEP 4 を Next.js で実装してください。

- ファイルアップロード、質問入力、結果の表示
- 結果 JSON のダウンロード
- 数値は簡易テーブル表示（shadcn/ui または Tailwind のみ）

backend/ の契約を変える場合は AGENTS.md の API 節を更新し、互換性に注意する。
```

### STEP 5 — 本番・デプロイ

**定義**

- `PORT` 環境変数対応。
- バックエンド本番用の軽量 Dockerfile。
- `frontend/lib/apiClient.ts`（または既存のクライアント層）で API URL を環境に応じて切り替え。
- `.github/workflows/deploy.yml` の Cloud Run 向け雛形。
- 依存監査の CI 化は任意。

**プロンプト（実装用・原文相当）**

```
AGENTS.md に従い、STEP 5 を実装してください。

- バックエンドを PORT 環境変数に対応させ、本番用の最適化 Dockerfile を用意
- フロントは apiClient 等で API ベース URL を本番/開発で切り替え
- .github/workflows/deploy.yml に Cloud Run デプロイの雛形を追加（秘密値は GitHub Secrets 想定でプレースホルダ）
- 任意: pnpm audit / pip-audit を CI に組み込む

完了後、AGENTS.md のステータス表を更新する。
```

---

## 依存関係の注意（STEP 間）

- STEP 3 は STEP 2 の DB スキーマに依存する。
- STEP 4 は `/api/analyze` の契約に依存する。

---

## STEP 1 時点で固定しなくてよい決定事項

- **DB マイグレーション:** STEP 2 で Alembic か `create_all` かを決める。
- **Gemini モデル名・SDK:** STEP 3 で LlamaIndex の公式推奨に合わせてピン止めする。

---

## 推奨作業順（参照）

```mermaid
flowchart LR
  A[AGENTS.md] --> B[STEP1 スキャフォールド]
  B --> C[Compose 起動確認]
  C --> D[STEP2 DB]
  D --> E[STEP3 RAG]
  E --> F[STEP4 UI]
  F --> G[STEP5 デプロイ]
```
