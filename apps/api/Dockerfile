# Build context = repo root:  docker build -f apps/api/Dockerfile -t kidase-api .
FROM node:22-slim AS runtime
ENV MONGOMS_DISABLE_POSTINSTALL=1 \
    NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001
RUN corepack enable
WORKDIR /app

# Install deps (api + its workspace dep @kidase/shared) using only the manifests
# first, for better layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/desktop/package.json apps/desktop/package.json
RUN pnpm install --filter api...

# App source (shared is consumed as TypeScript source; api runs via tsx).
COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
