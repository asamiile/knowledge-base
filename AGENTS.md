# spira-base — エージェント向け仕様

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
  - **ユーザーストーリー起点:** ユーザーストーリーに基づいて、**必要な文言・デザイン・機能のみ**を実装する（ストーリーに紐づかない装飾・説明・API・画面は追加しない）。

### UI（エージェントがフロントを触るとき）

- **文章ではなく UI デザインで表現する:** 操作の意味・状態・つながりは、**長文の説明より**レイアウト・情報の階層・コンポーネントの選び方（カード／タブ／リスト、ラベルと入力の対応、バッジ、区切り、アイコン、余白とグリッド）で示す。
- **説明文は少なく:** 画面内のヘルプ調の段落を増やさない。どうしても補足が要るときは **短い 1 行・placeholder・項目名** に留め、画面を「読み物」にしない。
- **視覚で説明する:** 選択肢の違い・必須／任意・件数・モード切替などは、**タイポグラフィ・色の抑揚・コントロールの並び・空／詰まり**で区別し、同じ内容を文章で繰り返さない。

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

各パッケージに `.dockerignore` を置く（フロントの Docker ビルドは **リポジトリルートを context** にし、ルートに `.dockerignore` も置く）。開発用 Dockerfile は **ボリュームマウント + ホットリロード**（フロント: `pnpm run dev`、バックエンド: compose の `command` で `uvicorn --reload`）を前提とする。

**推奨する本番永続化（ファイル）:** アップロード先はこれまでどおり **`DATA_DIR/uploads/`**（コンテナ内は `DATA_DIR=/app/data`）。DB へバイナリ直保存はせず、**Docker の命名ボリュームで `/app/data` を永続化**する。具体的にはルートの **`docker-compose.prod.yml`**（`knowledge_data` → `/app/data`）を参照。再インデックス後のベクトルチャンクは既存どおり **`documents` / `raw_data`** に載る。

---

## バックエンド取り込みパイプラインの拡張計画（リファクタ）

この節は **`backend/`** の責務整理と、**PDF 等の追加**・**別の外部 API 取り込み**を見据えた改修の一次ソースとする（重複ドキュメントは置かず、本節に集約する）。

### backend/ 実装の入り口

| パス（`backend/` 相対） | 概要 |
|------------------------|------|
| `app/main.py` | アプリ起動・ルータ登録 |
| `app/api/routes_data.py` | アップロード・再インデックス |
| `app/api/routes_imports.py` | 外部ソース取り込み（現状 arXiv） |
| `app/services/extract/` | ベクトル索引用ファイル列挙・テキスト抽出（`.md`/`.txt`、将来 PDF 等） |
| `app/services/ingest.py` | `DATA_DIR` → `documents` / `raw_data` |
| `app/services/source_import/` | 外部ソース別の取り込みロジック |

**テスト（リポジトリルートから、Compose 起動済み想定）:** `docker compose exec backend pytest -q`  
**環境変数:** `backend/.env`（テンプレは `backend/.env.example`）。

### 現状（把握用）

| 箇所 | 役割 |
|------|------|
| `app/api/routes_data.py` | `DATA_DIR` へのアップロード保存（`.md`/`.txt`/`.json`/`.pdf`）。PDF は `uploads/extracted/*.md` にも抽出保存。`POST /api/data/reindex` で全ツリー再取り込み |
| `app/services/extract/` | ベクトル用パス列挙と生テキスト抽出（現状 `.md`/`.txt`）。`ingest` がここ経由で列挙 |
| `app/services/ingest.py` | extract で得たテキストをチャンク化して `documents`、`**/*.json` を `raw_data` に保存 |
| `app/api/routes_imports.py` | 現状は arXiv 専用。`app/services/source_import/arxiv.py` が Atom 取得→Markdown 保存 |

### 目標

1. **「ファイルを置く」と「索引に載せる」を分離**し、形式が増えても `ingest` のコアは「正規化済みテキストのチャンク化」に寄せる。
2. **外部ソースは `source_import` 配下のモジュール**を増やす形で拡張（ルートは薄く、HTTP エラー映射は共通化）。
3. **設定**（外部 API の URL・キー・タイムアウト）は `app/core/settings` に集約し、テストで差し替え可能にする。

### テキスト化結果の受け渡し: 案 A と案 B（採用）

| 案 | 内容 | 利点 | 欠点 |
|----|------|------|------|
| **A** | 抽出したテキストを **`DATA_DIR` 配下のテキストファイル**（例: `uploads/extracted/*.md`）に書き出し、既存の `ingest` 走査でベクトル化 | 既存 `reindex` フローと整合・デバッグしやすい・段階導入のリスクが低い | 中間ファイルの I/O と掃除ポリシーが要設計 |
| **B** | 抽出結果をメモリまたは一時ストレージの **`IngestItem` リスト**として `ingest` に渡し、グロブ走査に依存しない | I/O が少ない・パイプラインが一箇所に集約されやすい | `ingest_data_directory` の責務変更が大きく、回帰テストの負荷が増えやすい |

**採用（フェーズ 0 の決定）:** **案 A を既定とする。** まず PDF 等は「保存→抽出→抽出済みテキストを `DATA_DIR` 上に置く→既存 `POST /api/data/reindex`」で全体を動かす。パフォーマンスや重複 I/O が問題になった段階で、案 B への寄せを **別フェーズ**で検討する。

### 実施フェーズ（バックエンド）

| 内部フェーズ | 内容 | 完了の目安 |
|--------------|------|------------|
| **0** | 本節のドキュメント化と案 A/B の決定（**この表まで含む**） | 実装着手前に合意 |
| **1** | `routes_imports` のエラー処理共通化、`source_import` のエクスポート整理 | **完了** — `translate_import_http_errors`・`app/services/source_import/__init__.py` 整理 |
| **2** | `extract` 層（拡張子→抽出）を追加し、`.md`/`.txt` は現行ロジックへ委譲。`ingest` の列挙をその層経由に | **完了** — `app/services/extract/vector_sources.py` |
| **3** | アップロードで PDF を許可→抽出→案 A に沿ってテキストを `DATA_DIR` に配置→`reindex` で索引化 | **完了** — `pypdf`・`uploads/extracted/*.md`・フロント `accept` |
| **4** | 2 つ目の外部 importer（プロトコル確定、必要なら小さな実装） | OpenAPI とフロント型の追加が定型的 |
| **5** | （任意）案 B への移行、または `ingest` の再設計 | 運用上の必要性が出たとき |

### PDF・外部 API を増やすときの注意

- **PDF:** テキスト埋め込み PDF とスキャン PDF（OCR）は難度が異なる。**初回スコープはテキスト抽出のみ**とし、OCR は別計画とする。
- **外部 API:** レート制限・利用規約・失敗時のユーザー向けメッセージに加え、本番では **実行証跡**（既存の `saved_search_run_logs` 周りの方針と整合）を意識する。
- **セキュリティ・コスト:** アップロード上限（現状 10 MiB）と再インデックス時の CPU/メモリ・タイムアウトを、バイナリ形式追加時に再確認する。

---

## ナレッジスタジオの UX 強化（開発計画・実装状況）

**目的:** 「資料を追加する」「質問する」の使い勝手を強化し、取り込み後の索引更新・重複把握・質問の振り返りをしやすくする。

### スコープ一覧

| 項目 | 内容 | 状態 |
|------|------|------|
| 取り込み後フロー | アップロード／arXiv 保存成功後、**自動で `POST /api/data/reindex`** するか、**確認ダイアログ**で実行するか。切替はフロント **localStorage**（`spira-base:autoReindexAfterImport` = `1` / `0`） | **実装済み**（`/add` のチェックボックス・ダイアログ） |
| 複数ファイル・D&D | `<input multiple>`、**ドラッグアンドドロップ**で複数ファイルを受け取り、**既存 `POST /api/data/upload` を逐次呼び出し**（プレビューは一覧・一括確定） | **実装済み** |
| 取り込み済み一覧 | **`GET /api/data/files`** — `DATA_DIR` 配下のファイルを相対パス・サイズ・更新日時で列挙する（`.` で始まるパス除外）。`/add` で一覧表示し重複把握に利用 | **実装済み** |
| 質問履歴 | テーブル **`question_history`**（`question`, `response` JSONB, `created_at`）。**`POST /api/analyze` 成功時に `save_question_history`（既定 `true`）で保存**。**`GET /api/knowledge/question-history`** で一覧。seed に **[DEV-SEED]** 付きサンプル行 | **実装済み** |
| seed | 新機能の表示確認用データは **`python -m app.db.seed_dev`** に追記し、UI で確認できるようにする | **実装済み**（質問履歴サンプル） |

### API 追記（本書の追加分）

- **`GET /api/data/files`** — Query: `limit`（1〜5000、既定 2000）。Response: `{ "files": [ { "path", "size_bytes", "modified_at" } ] }`
- **`GET /api/knowledge/question-history`** — Query: `limit`（1〜100、既定 50）。Response: 配列 `{ "id", "question", "response", "created_at" }`
- **`POST /api/analyze`** — Request に **`save_question_history`**（boolean、既定 `true`）を追加

### 今後の拡張（未着手）

- 増分インデックス（全削除ではない `reindex`）
- 質問履歴の削除・エクスポート
- `GET /api/data/files` の `prefix` フィルタ（例: `imports/arxiv` のみ）
- 学術メタ・引用グラフ・Semantic Scholar 取り込み（下記「学術メタ・引用グラフ・Semantic Scholar 取り込み（計画）」節を参照）

---

## 学術メタ・引用グラフ・Semantic Scholar 取り込み（計画）

本節は、**引用数・引用関係の構造化保存**、**関連図（グラフ）UI**、**arXiv に続く Semantic Scholar 経由の取り込み**について、現時点の方針を一次ソースとしてまとめる。

### 背景・現状

- **arXiv Atom API** で取得しているのは **id / title / summary / authors** に限る。**引用数・参考文献リスト・引用グラフ用のフィールドは含まれない**（`app/services/source_import/arxiv.py` のパースどおり）。
- 取り込み結果は主に **`DATA_DIR/imports/arxiv/*.md`** と、再インデックス後の **`documents` / `raw_data`**。**引用グラフ用の構造化メタは DB にもファイルにも未整備**。

### 目標

- **引用数**および**引用関係（エッジ）**を構造化して保存し、取り込み済み論文を中心に **関連図** を表示できるようにする。
- **arXiv の次の取り込み経路**として **[Semantic Scholar Academic Graph API](https://www.semanticscholar.org/product/api)** を追加する（プレビュー・ディスク保存・既存 `POST /api/data/reindex` パイプラインとの整合）。

### 外部ソースの役割分担

| ソース | 役割 |
|--------|------|
| **arXiv** | プレプリントの本文・既存プレビュー／import／PDF 抽出フローの主軸。 |
| **OpenAlex** | **引用・被引用・Work 間のつながり**などグラフ・メタ補完（[OpenAlex Developers](https://developers.openalex.org/)）。**arXiv ID / DOI** 等で Work を突き合わせる。 |
| **Semantic Scholar** | **論文データの取得・検索の拡張**（Academic Graph）。API には引用関連データも含まれるため、**エッジの正は OpenAlex に一本化するか、S2 取得結果をキャッシュするか**を実装前に決め、二重メタを避ける。 |

**補足:** 引用グラフの正を OpenAlex に置く場合でも、**本文インデックス用テキスト**は従来どおり arXiv（または将来 S2 からの要約・PDF リンク等）で足す、という**ハイブリッド**でよい。

### 保存設計（案）

- **ファイル例:** `DATA_DIR/imports/meta/{canonical_key}.json` — 論文メタ、引用数、参照先 ID リスト、取得元 API 名、`fetched_at` 等。
- **DB 例（必要に応じて）:** ノード属性テーブル、`paper_citation_edges(from_work_key, to_work_key, source, fetched_at)` など。
- **ID の対応:** OpenAlex Work ID、DOI、arXiv ID、Semantic Scholar Corpus ID のいずれかをキーにし、**正規化ルール**をドキュメント化する。

### 実装順序（方針）

- **Semantic Scholar 取り込み**と **OpenAlex を使った関連図**は **技術的に疎結合**（どちらが先でも、他方をブロックしない）。
- **関連図のみ先行**する場合、**既存の arXiv 取り込み分の ID から OpenAlex を引く**だけで MVP が可能。
- **取り込みソース拡張を先行**する場合、S2 import を先に実装し、グラフは後から同じ `DATA_DIR` 上の論文に対して載せる。
- 優先順位はプロダクト判断でよいが、**エッジ取得元（OpenAlex vs S2）を早めに一本化または役割分担**しておくと実装が収束しやすい。

### フロント（グラフ描画）

- **第一候補:** [React Flow](https://reactflow.dev/)（`@xyflow/react`）— ノード／エッジ・ズーム・選択などインタラクティブな引用図向き。既存 Next.js / shadcn 構成と相性がよい。
- **代替（大規模グラフ）:** Sigma.js + Graphology など、ノード数が非常に多い場合の検討用。

### 運用・ライセンス

- **OpenAlex:** API キー・利用制限・料金は [Authentication & Pricing](https://developers.openalex.org/) に準ずる。
- **Semantic Scholar:** [API 概要](https://www.semanticscholar.org/product/api) のレート制限・利用規約・API キー（推奨）を確認し、**リトライ・キャッシュ・ユーザ向けエラー**を既存 `source_import` の HTTP エラー扱いと整合する。

### 本書の追記タイミング

- S2 import の **ルート・スキーマ・保存パス**が決まったら、**HTTP API 契約と本書の表を更新する**。
- OpenAlex 連携を **バックエンドのみ／フロントまで**入れたら、**エンドポイント一覧**と本書の「状態」を更新する。

---

## 依存関係のセキュリティ（pnpm / Python）

**方針:** `pnpm add`（または `pnpm install`）/ `pip install` で **新規パッケージを追加する前**に、既知リスクの有無を確認する。追加後もロックファイルベースで監査する。

**高危険度の脆弱性:** 放置せず、更新・代替・例外理由の記録のいずれかで扱う。例外を選ぶ場合は理由を本ファイルまたは PR 説明に残す。

### 新規パッケージを入れる前（双方共通）

- **供給元の確認:** 正しいパッケージ名か（タイポスクワッティング回避）、メンテ状況・星・最近のコミット／リリースを目視。
- **レジストリ情報:** npm ならパッケージページと公開者；PyPI ならプロジェクトリンク・Maintainer を確認。

### pnpm（ルート — `frontend/` と `backend/`）

- **導入前:** 上記「新規パッケージを入れる前」と同様に npm レジストリ上の供給元を確認（`pnpm view <pkg>` でも可）。
- **導入後:** **ルートの** `pnpm-lock.yaml` をコミットし、ルートで `pnpm audit` を実行。依存の追加はルートで `pnpm add <pkg> --filter frontend`（または `--filter spira-base-backend-drizzle`）など。**日常の起動・フロント開発は Docker Compose を前提**とし、コンテナ起動時に `pnpm install` が走る。ホストで直接触る場合のみ、ルートの `package.json`（`pnpm dev:frontend` / `pnpm run db:studio` 等）を参照する。

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
| STEP 4 | 完了 | **shadcn/ui**（base-nova）。5 画面（質問する / 資料を追加 / 資料の検索 / 定期実行 / **実行ログ** `/saved/logs`）。`saved_search_conditions` CRUD、`saved_search_run_logs` の参照用 API（一覧・詳細・ジョブ向け `POST`）。APScheduler によるサーバー側定期実行実装済み。pytest 61 passed |
| STEP 5 | 未着手 | デプロイ・本番ビルド |

### 定期実行・取り込み（予定仕様）

- **自動取り込みまで行う場合:** 何が DB・ストレージに入ったかの **証跡がほぼ必須**（監査・再現・説明のため）。フロントは **`/saved/logs`** で `saved_search_run_logs` を一覧・本文表示する。
- **通知:** 本番の定期実行では、**成功・失敗を Discord 等へ通知**する予定（サーバー常駐ジョブとセット）。
- **API（ジョブが行を足す）:** `GET /api/knowledge/saved-search-run-logs`、`GET /api/knowledge/saved-search-run-logs/{id}`、`POST /api/knowledge/saved-search-run-logs`（`title_snapshot`・`status`・`imported_content`・`error_message` 等）。認可は現状なし（単一テナント前提）。

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
- `DATA_DIR`（既定は **`backend/data/`**。Compose では `./backend/data` を `/app/data` にマウント）の `.md` / `.txt` をチャンク化し、`documents` にベクトル付きで保存できる。`.json` は `raw_data` に格納できる。
- `POST /api/analyze` が下記「HTTP API 契約」の JSON 形式で応答する。`reindex_sources: true` で `DATA_DIR` の再取り込み（既存 `documents` / `raw_data` の置換）ができる。
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
| `save_question_history` | boolean | いいえ | 既定 `true`。`true` のとき成功応答を **`question_history`** に保存 |

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

multipart の `file` 1 件。拡張子 **`.md` / `.txt` / `.json` / `.pdf`**、最大 **10 MiB**。保存先は `DATA_DIR/uploads/`（既存同名は上書き）。**PDF** は同時に **`DATA_DIR/uploads/extracted/{元ファイルstem}.md`** に抽出テキストを書き出し、再インデックス時に **`.md` として**ベクトル化の対象になる（案 A）。画像のみの PDF 等で抽出できない場合はプレースホルダ文言のみの `.md` になる。

**Response（JSON）:** `path`（DATA_DIR からの相対パス）, `filename`, `size_bytes`

**ステータスコード:** `400`（不正な拡張子・ファイル名）, `413`（サイズ超過）

取り込み（チャンク化・embedding）は **`POST /api/data/reindex`**（LLM なし）または **`POST /api/analyze` の `reindex_sources: true`** で実行（いずれも `DATA_DIR` ツリー全体を対象）。

### `POST /api/data/reindex`

本文なし。`DATA_DIR` を再取り込みし、既存の `documents` / `raw_data` を置き換える。

**Response（JSON）:** `document_chunks`, `raw_data_rows`（`GET /api/knowledge/stats` と同名）

**ステータスコード:** `503`（`GOOGLE_API_KEY` 未設定など embedding 初期化失敗）

### `GET /api/data/files`

`DATA_DIR` を再帰的に走査し、**ファイルのみ**を列挙する（ディレクトリは含めない）。パス成分が **`.` で始まる**ものは除外（例: `.gitkeep`）。開発用。

**Query:** `limit`（int、1〜5000、既定 2000）— 件数上限（パス辞書順で先頭から）。

**Response（JSON）:** `{ "files": [ { "path": string, "size_bytes": int, "modified_at": string (ISO8601) } ] }`

### `GET /api/data/files/enrichment`

資料詳細 UI 用。**`path`**（DATA_DIR 相対パス）から表示用メタを返す。実装は **`app/services/external/`**（**arXiv Atom** をタイトル・要約の正、引用数のみ **OpenAlex**）。 Query: `path`（必須）。Response: `FileEnrichmentResponse`（`display_name`, `arxiv_id`, `citation_count`, `summary`, `tldr`, `sources`）。

### `POST /api/data/imports/arxiv`

arXiv Atom API からメタデータ・要約を取得し（**API キー不要**）、`DATA_DIR/imports/arxiv/*.md` に保存する。`include_full_text: true` のときは **`https://arxiv.org/pdf/{id}.pdf`** から本文を抽出し、同一 `.md` に「Full text (from PDF)」として追記する（**失敗時は Abstract のみ**・エラー注記を `.md` に残す）。連続取得時はサーバ負荷のため **約 2 秒間隔**を空ける。オープンデータ連携の第 1 弾；同型のエンドポイントを `app/api/routes_imports.py` / `app/services/source_import/` に追加していく想定。

**Request（JSON）**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `arxiv_ids` | string[] | いいえ | ID または `https://arxiv.org/abs/...` 形式（複数可。`arxiv_ids` と `search_query` のどちらか一方以上） |
| `search_query` | string | いいえ | 全文検索クエリ（内部では `all:...`） |
| `max_results` | int | いいえ | 検索時の最大件数（1〜20、既定 5） |
| `include_full_text` | boolean | いいえ | 既定 `false`。`true` で PDF 本文を `.md` に追記（`pypdf` 抽出） |

**Response（JSON）:** `written`（相対パスの配列）, `entry_count`

**ステータスコード:** `422`（入力検証）, `502`（arXiv HTTP / Atom 解析エラー）

### `GET /api/knowledge/stats`

インデックス概要（フロントの質問タブ用）。

**Response（JSON）:** `document_chunks`（embedding 付き `documents` 件数）, `raw_data_rows`

### `GET /api/knowledge/question-history`

保存済みの質問・分析結果（**新しい順**）。

**Query:** `limit`（int、1〜100、既定 50）

**Response（JSON）:** 配列。各要素: `id`（int）, `question`（string）, `response`（object — `AnalyzeResponse` と同型）, `created_at`（ISO8601）

### `POST /api/knowledge/search`

インデックス済み `documents` への **ベクトル検索のみ**（LLM なし）。`analyze` と同様に Gemini embedding でクエリを埋め込み、cosine distance 昇順で `top_k` 件返す。

**Request（JSON）:** `query`（1〜4000 文字）, `top_k`（1〜20、既定 5）

**Response（JSON）:** `hits`: `{ document_id, text, distance }[]`（`distance` は小さいほど類似。`text` は長文は切り詰めあり）

**ステータスコード:** `400`（チャンク 0 件など）, `503`（`GOOGLE_API_KEY` 未設定）

### `GET /api/knowledge/saved-searches`

保存済みローカル検索条件の一覧（作成日昇順）。

**Response（JSON）:** 要素 `{ id, name, query, search_target, top_k, interval_minutes, schedule_enabled, last_run_at, created_at, updated_at }[]`（`search_target`: `knowledge` | `arxiv`）

### `POST /api/knowledge/saved-searches`

**Request（JSON）:** `name`, `query`（必須）, `search_target`（`knowledge` | `arxiv`、既定 `knowledge`）, `top_k`（1〜20）, `interval_minutes`（≥0）, `schedule_enabled`。間隔 0 のとき `schedule_enabled` は false として保存。

### `PATCH /api/knowledge/saved-searches/{id}`

部分更新。`name`, `query`, `search_target`, `top_k`, `interval_minutes`, `schedule_enabled`, `last_run_at`（ISO 8601 または null）を指定可能。

### `DELETE /api/knowledge/saved-searches/{id}`

**ステータスコード:** `204`（成功）, `404`（該当なし）

---

## STEP 定義と実装プロンプト（Cursor / エージェント向け）

> **注:** 別途ユーザーが貼った「Cursor へのプロンプト」本文は本リポジトリに無いため、以下は **初期計画書の要件をそのまま実装指示として転記**したもの。フェーズ着手時は該当 STEP のブロックをコピーして使う。

### STEP 1 — モノレポと Docker 基盤

**定義**

- `frontend/` — `create-next-app` 相当（TypeScript、App Router 推奨）。開発用 Dockerfile（ルート context、ボリュームマウント + `pnpm run dev`）。
- `backend/` — FastAPI + uvicorn。開発用 Dockerfile（`--reload`、ソースマウント）。
- リポジトリ直下: `docker-compose.yml`（3 サービス）、各パッケージ用 `.dockerignore`。
- `frontend/.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:8001` 等。
- `backend/.env.example` — `DATABASE_URL=postgresql://...`（ローカル Compose 用のデフォルト）。STEP 2 向け Supabase 用の別名はコメントまたはプレースホルダでよい（実接続は STEP 2）。

**プロンプト（実装用・原文相当）**

```
AGENTS.md の STEP 1 に従い、spira-base リポジトリにモノレポと Docker 基盤を実装してください。

- frontend/: Next.js + TypeScript（App Router）、開発用 Dockerfile（ルート volume + pnpm run dev）、.dockerignore、.env.example（NEXT_PUBLIC_API_URL 等）
- backend/: FastAPI + uvicorn、開発用 Dockerfile（--reload、ソースボリューム）、.dockerignore、.env.example（Compose 用 DATABASE_URL。Supabase はプレースホルダのみ）
- ルート: docker-compose.yml で frontend:3001、backend:8001、db:5432（image: ankane/pgvector）。環境変数と depends_on を接続し、DB 待ちは wait またはバックエンドの接続リトライでよい
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
curl -s -X POST http://localhost:8001/api/analyze \
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

#### 具体手順：「自分の環境で締める」ときに何を列するか

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

3. **`backend/data/`** に `.md` または `.txt` がある（未配置なら `backend/data/sample.md` をそのまま使える）。Compose の backend は **`./backend/data` → `/app/data`**。ホストだけで uvicorn する場合は `backend/.env` の **`DATA_DIR`** を **`backend/data`** の絶対パス、または `backend` で作業中なら `./data` に合わせる。

4. ターミナルで:

```bash
curl -s -X POST http://localhost:8001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"question":"資料の要点は？","reindex_sources":true,"top_k":5}'
```

5. HTTP **200** で、返却 JSON に **`answer` / `key_points` / `citations`** があれば（2）は完了。  
   **503** → キーが読めていない（`.env` の場所・API 再起動を確認）。**400** → `DATA_DIR`（`backend/data/`）内のテキストを確認。

---

**注意:** `docker compose down -v` は**名前付きボリュームに入っている DB を消す**操作です。共有の本番データには使わないこと。

**3. 実行コマンド**

**A（自動・Gemini 不要）**

1. PostgreSQL 起動（例: `docker compose up -d db`）。
2. `backend/.env` に `DATABASE_URL`（ホストからなら `127.0.0.1:5432`）。
3. `cd backend && pip install -r requirements.txt && pytest -q`

**B（実 API・任意）**

1. `backend/.env` に `GOOGLE_API_KEY=...`。
2. `backend/data/` に `.md` / `.txt` を配置。Compose 以外で動かす場合は `DATA_DIR` がそのディレクトリを指すこと（例: `DATA_DIR=./data`）。
3. API 起動後、例（初回は取り込みを確実にするなら `reindex_sources: true`）:

```bash
curl -s -X POST http://localhost:8001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"question":"資料の要点は？","reindex_sources":true,"top_k":5}'
```

- **200** かつ上記 JSON フィールドがあれば **B 達成**。
- **503** → `GOOGLE_API_KEY` 未読込（`.env`・再起動を確認）。
- **400** → `backend/data/` にテキストが無い、または `DATA_DIR` がズレている。

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