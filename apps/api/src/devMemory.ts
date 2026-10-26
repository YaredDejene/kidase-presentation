import { readFile } from 'node:fs/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { createMongoRepositories, ensureIndexes } from './repositories/mongo';
import { importKidaseBackup, KidaseBackup } from './importer/kidaseImporter';
import { bumpContentVersion } from './contentVersion';
import { buildApp } from './app';

/**
 * Serves the API from an in-memory MongoDB seeded with a desktop backup, for app development
 * without a database:  pnpm --filter api dev:memory /path/to/backup.kidase
 */
const file = process.argv[2];
if (!file) {
  console.error('Usage: pnpm --filter api dev:memory <backup.kidase>');
  process.exit(1);
}
const backup = JSON.parse(await readFile(file, 'utf8')) as KidaseBackup;
const mongod = await MongoMemoryServer.create();
const client = new MongoClient(mongod.getUri());
await client.connect();
const db = client.db('kidase');
await ensureIndexes(db);
const counts = await importKidaseBackup(db, backup);
await bumpContentVersion(db);
const app = await buildApp({ repos: createMongoRepositories(db), db });
app.addHook('onResponse', async (req, reply) => console.log(reply.statusCode, req.method, req.url));
const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
console.log(`Kidase API (in-memory) listening on http://0.0.0.0:${port}`, counts);
