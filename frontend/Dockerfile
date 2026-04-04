# 開発用: compose で ./frontend → /app、node_modules / .next は named volume。
# イメージ内の RUN npm ci は行わない（ボリュームで上書きされるため）。
# 依存の npm ci は compose の command で実行。
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
