FROM node:20-alpine AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/gadmin/package.json apps/gadmin/package.json
RUN corepack enable && pnpm --version && pnpm install --frozen-lockfile --filter ./apps/gadmin...
COPY . .
RUN mkdir -p apps/gadmin/public
RUN pnpm -C apps/gadmin build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3005
WORKDIR /app/apps/gadmin
COPY --from=build /app/apps/gadmin/.next ./.next
COPY --from=build /app/apps/gadmin/public ./public
COPY --from=build /app/apps/gadmin/package.json ./package.json
COPY --from=build /app/apps/gadmin/next.config.mjs ./next.config.mjs
# Copiar el lockfile raíz para que pnpm install funcione en producción
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && pnpm install --prod --frozen-lockfile
EXPOSE 3005
CMD ["npm", "run", "start", "--", "-p", "3005", "-H", "0.0.0.0"]