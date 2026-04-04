# knowledge-base フロントエンド

Next.js（App Router）+ Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/)（base-nova）。

## ディレクトリ構成（`create-next-app` 由来のルート配置）

`src/` は使わず、[プロジェクトルートに `app/` を置く構成](https://nextjs.org/docs/app/getting-started/project-structure)です。

| パス | 役割 |
|------|------|
| `app/` | `layout.tsx`・`page.tsx`・`globals.css`・ルート別ページ |
| `components/` | 共有 UI・`knowledge-studio/`・shadcn `ui/` |
| `lib/` | API クライアント・ユーティリティ |
| `hooks/` | `use-mobile` など |
| `public/` | 静的ファイル |

インポートエイリアスは `tsconfig.json` の `@/*` → リポジトリ直下です。

## 開発

```bash
npm install
npm run dev
```

## ブロック・その他

- 左サイドバー: [Sidebar 07](https://ui.shadcn.com/blocks/sidebar) 相当
- 右メイン: [Dashboard 01](https://ui.shadcn.com/blocks) のシェル（`SidebarInset` + `SiteHeader`）
- `/dashboard` → `/` にリダイレクト
- API: `NEXT_PUBLIC_API_URL`（未設定時 `http://localhost:8000`）

## Docker

`docker-compose.yml` の frontend は次のボリュームを使います。

| マウント | 用途 |
|----------|------|
| `./frontend` | ソース（ホストと同期） |
| `frontend_node_modules` | 依存（`npm ci` の結果） |
| `frontend_next` | Next のビルドキャッシュ（ホストの `.next` と干渉しない） |

**Dockerfile では `RUN npm ci` はしない。** 起動は compose の `command` が `package-lock.json` の更新を見て `npm ci` し、その後 `npm run dev`。`dev` は **webpack** モード（`package.json`）。

### トラブル時

1. イメージの作り直し: `docker compose build --no-cache frontend` のあと `up`
2. `.next` が怪しい: `docker volume rm <project>_frontend_next`（名前は `docker volume ls` で確認）後に `up`
3. 依存が怪しい: 同様に `frontend_node_modules` ボリュームを削除して `up`
