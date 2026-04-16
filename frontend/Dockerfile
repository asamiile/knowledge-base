# 開発用: compose でリポジトリルート → /workspace、frontend の node_modules / .next は named volume。
# イメージ内のインストールはシード用。実際の依存は compose の command でルートから pnpm install。
FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile

WORKDIR /workspace/frontend

EXPOSE 3000

CMD ["pnpm", "run", "dev"]
