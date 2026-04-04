FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY docker-entrypoint.dev.sh /docker-entrypoint.dev.sh
RUN chmod +x /docker-entrypoint.dev.sh

COPY . .

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.dev.sh"]
CMD ["npm", "run", "dev"]
