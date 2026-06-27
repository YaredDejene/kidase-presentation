import 'dotenv/config';
import { loadConfig } from './config';
import { connectMongo } from './db/mongo';
import { createMongoRepositories, ensureIndexes } from './repositories/mongo';
import { buildApp } from './app';

const cfg = loadConfig();
const { db } = await connectMongo(cfg.mongoUri, cfg.mongoDb);
await ensureIndexes(db);
const repos = createMongoRepositories(db);
const app = await buildApp({
  repos,
  db,
  renderMaxAge: cfg.renderMaxAge,
  rateLimitMax: cfg.rateLimitMax,
});

await app.listen({ port: cfg.port, host: cfg.host });
// eslint-disable-next-line no-console
console.log(`Kidase API listening on http://${cfg.host}:${cfg.port} (db: ${cfg.mongoDb})`);
