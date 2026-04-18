# 本番リリース前チェックリスト

spira-base を本番に載せる前の作業を整理する。順序は依存関係の目安。

## 1. シークレットと環境変数

| 項目 | 備考 |
|------|------|
| `GOOGLE_API_KEY` | Gemini 利用に必須。リポジトリやイメージに埋め込まない |
| `AUTH_JWT_SECRET` | ログイン利用時は長いランダム文字列。例: `openssl rand -hex 32` |
| `DATABASE_URL` | 本番 Postgres（pgvector）接続文字列。強いパスワード |
| `POSTGRES_PASSWORD` | Compose の DB サービスを本番値に変更（`docker-compose.prod.yml` の既定は開発用） |
| `CORS_ORIGINS` | フロントのオリジンをカンマ区切りで指定（未設定時は `*`。本番では実 URL を推奨） |

## 2. アプリケーション設定

- **`ENVIRONMENT=production`**（または `APP_ENV`）: `seed_dev` の誤実行防止、OpenAPI（`/docs`・`/openapi.json`）の無効化に使う
- **`AUTH_ENABLED` / `NEXT_PUBLIC_AUTH_ENABLED`**: ログインを有効にする場合は API とフロントの両方を揃える
- **`NEXT_PUBLIC_API_URL`**: ブラウザから見た API のベース URL（ユーザーがアクセスするホスト名・HTTPS を含む）

## 3. インフラ・デプロイ

- **HTTPS**: リバースプロキシ（Caddy / nginx / Cloud Load Balancer 等）で TLS 終端
- **DB バックアップ**: Postgres の定期スナップショット・PITR
- **永続ボリューム**: `docker-compose.prod.yml` の `pgdata` と `knowledge_data`（アップロード・インポートデータ）
- **本番スタック起動例**

  ```bash
  export NEXT_PUBLIC_API_URL=https://api.example.com
  export NEXT_PUBLIC_AUTH_ENABLED=true   # ログインを使う場合
  docker compose -f docker-compose.prod.yml up -d --build
  ```

- **フロント**: `frontend/Dockerfile.prod` で `next build` / `next start`。ビルド引数で `NEXT_PUBLIC_*` を渡す
- **DB ER 図**: [eralchemy2](https://github.com/maurerle/eralchemy2) + [Graphviz](https://graphviz.org/)（`dot` が PATH に必要）。リポジトリルートで `./scripts/generate-db-diagram.sh`（venv 作成・pip・生成を含む）→ `docs/database-er.png`（詳細は README）

## 4. セキュリティ・運用

- **Swagger UI**: 本番では `ENVIRONMENT=production` により `/docs` は無効（内部用ならステージングのみ有効化など）
- **CORS**: 本番では `CORS_ORIGINS` にフロントのオリジンを限定
- **監視**: `/health` と DB ヘルスで死活監視
- **ログ**: コンテナログの集約（任意）

## 5. リリース前の確認コマンド

```bash
# バックエンド
cd backend && pytest

# フロント
pnpm --filter frontend lint && pnpm --filter frontend build
```

CI（`.github/workflows/ci.yml`）が緑であること。

## 6. 意図的に未実装のもの（必要なら別タスク）

- httpOnly Cookie によるセッション（現状は Bearer + localStorage）
- レート制限・WAF
- Alembic 等のマイグレーション運用（現状は SQLAlchemy `create_all` 中心）
