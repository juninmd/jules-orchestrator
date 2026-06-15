FROM node:26-alpine AS build

# Instala pnpm via npm (corepack foi removido das imagens node 25+)
RUN npm install -g pnpm@10.32.1

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:26-alpine AS production

ENV NODE_ENV=production
RUN npm install -g pnpm@10.32.1 && apk add --no-cache git

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
