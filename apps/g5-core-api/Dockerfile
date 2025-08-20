# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20-alpine
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy workspace package manifests for better layer caching
COPY apps/g5-core-api/package.json apps/g5-core-api/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm -F g5-core-api build

FROM node:${NODE_VERSION} AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/g5-core-api ./apps/g5-core-api
WORKDIR /app/apps/g5-core-api
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
