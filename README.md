# knowledge-base

映像制作向けの知識ベース基盤（詳細は [AGENTS.md](AGENTS.md)）。

## 開発環境構築

### 必要なツール

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### ローカル起動

```bash
docker compose up --build
```

| サービス | URL | ポート |
| -------- | --- | ----- |
| フロント（Next.js） | http://localhost:3000 | 3000 |
| API（FastAPI） | http://localhost:8000 | 8000 |
| API ドキュメント（Swagger UI） | http://localhost:8000/docs | 8000 |
| PostgreSQL（pgvector） | localhost:5432 | 5432 |

#### API の疎通確認

- `GET http://localhost:8000/health`

### Drizzle Studio

ORM は **SQLAlchemy のまま**にし、[Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) は開発時の **DB 閲覧**と、`drizzle-kit pull` による **イントロスペクション**（`drizzle/schema.ts` の更新）だけに使う。マイグレーションの正は引き続き SQLAlchemy 側。

- PostgreSQL を起動する

```bash
docker compose up -d db
```

- 初回のみ、`backend` で以下を実行する

```bash
cd backend
pnpm install
```

- `backend/.env` にStudio用URLを記述する

設定例:

```env
DATABASE_URL_STUDIO=postgresql://knowledge:knowledge@127.0.0.1:5432/knowledge
```

- Drizzle Studioを起動する

```bash
cd backend
DATABASE_URL_STUDIO=postgresql://knowledge:knowledge@127.0.0.1:5432/knowledge pnpm run db:studio
```

- 起動後、ブラウザで **https://local.drizzle.studio** を開く

- SQLAlchemy 側でテーブル定義を変えたあと、Drizzle のスキーマファイルを DB に合わせて取り直す

```bash
cd backend
DATABASE_URL_STUDIO=postgresql://knowledge:knowledge@127.0.0.1:5432/knowledge pnpm run db:pull
```

#### トラブルシューティング

- ポートが既に使われている場合は、占有しているNodeプロセスを終了する。

```bash
lsof -i :4983
kill <PID>
```

- 別ポートで Studio を起動する例:

```bash
cd backend
DATABASE_URL_STUDIO=postgresql://knowledge:knowledge@127.0.0.1:5432/knowledge pnpm exec drizzle-kit studio --port 4984
```
