# Kidase Presentation API

Public read API for the Kidase web viewer. It serves the presentation catalog and
fully-resolved, display-ready slide data. All business logic (rule engine, gitsawe
selection, calendar/meta, slide filtering, verse expansion, placeholder resolution)
runs server-side via the shared `RenderService` in `packages/shared`; the client
never receives rules, variables, gitsawes, or the engine.

- **Framework:** Fastify (run with `tsx` in dev)
- **Database:** MongoDB (the desktop app keeps SQLite; the abstraction boundary is
  the `I*Repository` interfaces, implemented here for Mongo)
- **Docs / manual testing:** Scalar UI at `/docs`

## Prerequisites

- **Node ≥ 22.13** and **pnpm 9** (run from the monorepo root). The repo pins
  `pnpm@9.15.9`. If your default Node is older, select a newer one first, e.g.
  `nvm use 22.22.3`.
- A reachable **MongoDB** (local, Docker, or Atlas). Not needed to run the tests —
  those use an in-memory MongoDB.

Install dependencies once from the repo root:

```bash
pnpm install
```

## 1. Configure the database connection

Copy the example env file and edit it:

```bash
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env` (loaded automatically by the `dev`/`start`/`seed` scripts):

| Variable         | Default                       | Notes                                                  |
| ---------------- | ----------------------------- | ------------------------------------------------------ |
| `MONGODB_URI`    | `mongodb://localhost:27017`   | Local mongod/Docker, or an Atlas `mongodb+srv://…` URI |
| `MONGODB_DB`     | `kidase`                      | Database name                                          |
| `PORT`           | `3001`                        | HTTP port                                              |
| `HOST`           | `0.0.0.0`                     | Bind address                                           |
| `RENDER_MAX_AGE` | `60`                          | `Cache-Control: max-age` (seconds) for `/render`       |
| `RATE_LIMIT_MAX` | `120`                         | Requests/minute per IP                                 |

`.env` is gitignored; only `.env.example` is committed.

### Need a local MongoDB?

A Docker Compose file is included:

```bash
docker compose -f apps/api/docker-compose.yml up -d   # starts mongo on :27017
# ...
docker compose -f apps/api/docker-compose.yml down     # stop (data persists in a volume)
```

Then keep the default `MONGODB_URI=mongodb://localhost:27017`.

## 2. Run the API

From the repo root:

```bash
pnpm --filter api dev      # watch mode (tsx)
# or
pnpm --filter api start    # one-off run
```

You should see: `Kidase API listening on http://0.0.0.0:3001 (db: kidase)`.

## 3. Browse & test in the browser (Scalar)

- **API reference + test client:** http://localhost:3001/docs
- **OpenAPI spec:** http://localhost:3001/openapi.json
- **Health check:** http://localhost:3001/api/v1/health

In `/docs`, expand an endpoint and click **Send** to call the live API.

## 4. Seed data so there's something to view

A fresh database is empty (`GET /api/v1/presentations` returns `[]`). The `seed`
command populates Mongo from either a desktop backup or an Excel workbook, then
bumps the content version (which busts the render cache).

```bash
# Restore a desktop .kidase backup (the supported desktop -> server content path):
pnpm --filter api seed /absolute/path/to/backup.kidase

# Or import an Excel workbook (seeds the default templates, then imports):
pnpm --filter api seed "$PWD/samples/Kidase Presentation Template.xlsx"
```

> Use an **absolute path** (e.g. `$PWD/...`). The script runs with its working
> directory in `apps/api`, so repo-root-relative paths won't resolve.

After seeding, try the endpoints below in `/docs`.

## Endpoints

| Method & path                                         | Purpose                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `GET /api/v1/health`                                  | Liveness check                                                       |
| `GET /api/v1/presentations`                           | Picker catalog: `{ id, name, type, slideCount, langs, languages }`  |
| `GET /api/v1/presentations/:id`                       | Viewer config meta (languages, template, default config)            |
| `GET /api/v1/presentations/:id/render?date=&mehella=` | Resolved, display-ready slides + readings + context for a date      |

**Render query params:** `date` = `YYYY-MM-DD` (defaults to today); `mehella` =
`1`/`true` for the Mehella variant.

The render response returns **all enabled languages** (the viewer toggles
translations client-side) and **deduped template definitions** in a `templates`
map referenced by `templateId` per slide. Font scaling is computed on the client
from the shared math, so language toggles re-fit instantly without a refetch.

### Efficiency / caching

`/render` is deterministic per `(presentation, date, mehella)` and content changes
only on import/restore, so:

- a monotonic **`contentVersion`** keys the cache and is embedded in the `ETag`;
- responses send `ETag` + `Cache-Control` and honor `If-None-Match` → `304`;
- an in-process LRU caches serialized payloads; responses are compressed
  (`@fastify/compress`) and rate-limited (`@fastify/rate-limit`).

## Tests

```bash
pnpm --filter api test
```

Tests run against an in-memory MongoDB (`mongodb-memory-server`) — no live database
or `.env` required. On first run it downloads a ~66 MB mongod binary (cache it in CI).

## Layout

```
apps/api/
  src/
    server.ts                 # entrypoint: load env, connect Mongo, build app, listen
    app.ts                    # Fastify app: routes, caching, CORS, Swagger + Scalar
    config.ts                 # env -> ApiConfig
    contentVersion.ts         # monotonic content version (cache busting)
    renderCache.ts            # in-process LRU for serialized render payloads
    seed.ts                   # CLI: import a .kidase or .xlsx into Mongo
    db/mongo.ts               # Mongo connection
    repositories/mongo/*      # Mongo implementations of the 8 repository interfaces
    importer/kidaseImporter.ts# .kidase backup -> Mongo collections
  tests/                      # repo, importer, and HTTP integration tests
  .env.example                # copy to .env
  docker-compose.yml          # optional local MongoDB
```
