# spira-base

映像制作向けの知識ベース基盤。

## 開発環境構築

### 必要なツール

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)


### URL一覧

| サービス | URL | ポート |
| -------- | --- | ----- |
| フロント（Next.js） | http://localhost:3001 | 3001 |
| API（FastAPI） | http://localhost:8001 | 8001 |
| API ドキュメント（Swagger UI） | http://localhost:8001/docs | 8001 |
| PostgreSQL（pgvector） | localhost:5432 | 5432 |
| Drizzle Studio（`--profile drizzle`） | [local.drizzle.studio](https://local.drizzle.studio) | 4983 |

### ローカル起動

```bash
docker compose up

#バックグラウンドで起動
# ログ: docker compose logs -f
docker compose up -d

# 初回やDockerfileを変えたあと
docker compose up --build
```



### Gemini APIの設定

1. [Google AI Studio](https://aistudio.google.com/apikey) でキーを発行する。
2. `backend/.env` にキーを設定する
3. `GEMINI_LLM_MODEL` `GEMINI_EMBEDDING_MODEL` を設定する

- テストコマンド例

```bash
curl -s -X POST http://localhost:8001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"question":"サンプル資料の要点は？","reindex_sources":true}'
```

### Seedの投入

```bash
docker compose exec backend python -m app.db.seed_dev
```

### pytestの実行

```bash
docker compose up -d --build
docker compose exec backend pytest -q
```

### DB ER 図の生成

- **初回のみ**以下を実行する

```bash
brew install graphviz
```

- ER図の生成

```bash
./scripts/generate-db-diagram.sh
```


### Drizzle Studio

```bash
# Studio コンテナ起動
docker compose --profile drizzle up -d drizzle-studio

# SQLAlchemy 側でテーブル定義を変えたときに実行
docker compose --profile drizzle run --rm drizzle-studio \
  sh -c "corepack enable && corepack prepare pnpm@9.15.9 --activate && cd /workspace && pnpm install --frozen-lockfile && pnpm --filter spira-base-backend-drizzle run db:pull"
```

### Agent Skills

- インストールコマンドの例

```bash
npx skills add vercel-labs/agent-skills -y --agent claude-code cursor
```

## リリース運用

リリースは [release-please](https://github.com/googleapis/release-please) で自動化されています。コミットメッセージの prefix でバージョンが自動的に決まります。

| prefix | 例 | バージョン変化 |
|--------|----|---------------|
| `fix:` | `fix: 引用リンクの表示修正` | v1.0.0 → v1.0.1 |
| `feat:` | `feat: ストリーミング回答を追加` | v1.0.0 → v1.1.0 |
| `feat!:` | `feat!: API レスポンス形式を変更` | v1.0.0 → v2.0.0 |

### リリースの流れ

```
作業ブランチ → PR → dev → PR → main
                                 ↓
                         Release PR が自動作成
                                 ↓
                    Release PR を main にマージ
                                 ↓
                     タグ + GitHub Release が自動作成
```

1. `dev → main` にマージされると、GitHub Actions が **Release PR** を自動作成する
2. Release PR には CHANGELOG とバージョン更新が含まれる
3. **Release PR のマージ先は `main` のみ**とする。マージすると **タグ（例: v1.1.0）と GitHub Release** が自動作成される

---

## 本番デプロイ

- 手順・チェックリスト: [docs/PRODUCTION.md](docs/PRODUCTION.md)

### ユーザー追加

本番データベース（Neon 等）にログインユーザーを追加する：

```bash
docker compose exec \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" \
  backend python -m app.db.add_user メールアドレス パスワード
```

- パスワード生成例: `openssl rand -base64 16`

## Author

[Asami.K](https://asami.tokyo/)

### Support 

-  One-time support
<a href="https://www.buymeacoffee.com/asamiile" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
