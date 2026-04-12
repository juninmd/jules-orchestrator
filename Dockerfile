FROM node:22-alpine AS build

# Habilitar pnpm nativo do Node.js
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine AS production

ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate && apk add --no-cache git

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
