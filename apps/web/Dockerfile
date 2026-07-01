# Build context = repo root:  docker build -f apps/web/Dockerfile -t kidase-web .
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/desktop/package.json apps/desktop/package.json
RUN pnpm install --filter web...
COPY packages/shared packages/shared
COPY apps/web apps/web
# Same-origin deployment: the web calls relative /api (proxied by the ingress),
# so VITE_API_BASE stays empty. Override at build time if hosting the API elsewhere.
ARG VITE_API_BASE=
ENV VITE_API_BASE=${VITE_API_BASE}
RUN pnpm --filter web build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
