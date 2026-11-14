# ---- build: install everything, bundle the client
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY shared shared
COPY client client
RUN npm run build

# ---- runtime: server deps only + built client
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 CLIENT_DIST=/app/client/dist
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --no-audit --no-fund --workspace=server --workspace=shared
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY --from=build /app/client/dist client/dist
EXPOSE 3000
USER node
CMD ["node", "--import", "tsx", "server/src/index.ts"]
