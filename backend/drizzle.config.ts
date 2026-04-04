/**
 * Drizzle Kit（Studio / introspection）はホスト上の Node から実行する。
 *
 * `backend/.env` の DATABASE_URL が Docker 内 API 向けに `...@db:5432` になっている場合、
 * ホストから Drizzle を叩くときは接続できない（`db` はコンテナ内ホスト名のため）。
 * そのときは `...@127.0.0.1:5432`（または localhost）に書き換えた URL を `.env` に置くか、
 * 下記の DATABASE_URL_STUDIO があればこちらを優先する。
 *
 * 前提: docker-compose で db の 5432 がホストに公開されていること。
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
