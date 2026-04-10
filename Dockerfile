FROM node:22-alpine AS build

# Habilitar pnpm nativo do Node.js
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Instalar Git (necessário para clonar repos na rotina de análise)
RUN apk add --no-cache git

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Na imagem final vai só o necessário, código compilado (.js)
COPY --from=build /app/dist ./dist
# E copia a source porque usamos "tsx src/index.ts" ou mudamos pro script principal
# Opa: O nosso script 'start' usa 'tsx src/index.ts'. Para produção, devemos rodar via 'node dist/index.js'
# Então já deixo o CMD correto sem precisar de src/
CMD ["node", "dist/index.js"]
