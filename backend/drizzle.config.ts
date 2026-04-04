/**
 * Drizzle Kit（Studio / introspection）
 *
 * - ホスト: `...@127.0.0.1:5432` を `DATABASE_URL` または `DATABASE_URL_STUDIO` に（`db` は名前解決できない）。
 * - Docker: `docker compose --profile drizzle` の `drizzle-studio` サービスが `DATABASE_URL_STUDIO=@db:5432` を注入する。
 *
 * `backend/.env` の DATABASE_URL が `...@db:5432` のままでも、上記の環境変数で上書きできる。
 */
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL_STUDIO ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL または DATABASE_URL_STUDIO を backend/.env に設定してください（ホストからは 127.0.0.1:5432 向け）。",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
  },
});
