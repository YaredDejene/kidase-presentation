import { Db } from 'mongodb';
import { COLLECTIONS } from './repositories/mongo';

/** Same envelope as the desktop BackupService (`.kidase` file). */
export interface BackupData {
  version: number;
  createdAt: string;
  appVersion: string;
  schemaVersion: number;
  data: Record<string, Record<string, unknown>[]>;
}

const BACKUP_VERSION = 1;
const SCHEMA_VERSION = 11;

// Backup table name (matches the desktop SQLite tables) -> Mongo collection.
const TABLES: { table: string; collection: string }[] = [
  { table: 'templates', collection: COLLECTIONS.templates },
  { table: 'presentations', collection: COLLECTIONS.presentations },
  { table: 'slides', collection: COLLECTIONS.slides },
  { table: 'variables', collection: COLLECTIONS.variables },
  { table: 'gitsawes', collection: COLLECTIONS.gitsawes },
  { table: 'verses', collection: COLLECTIONS.verses },
  { table: 'rule_definitions', collection: COLLECTIONS.rules },
  { table: 'app_settings', collection: COLLECTIONS.appSettings },
];

/**
 * Dump all collections into the desktop `.kidase` envelope — the same strategy
 * as the desktop createBackup (dump every table). `_id` is emitted as `id`
 * (or `key` for app_settings) so the rows restore via the existing importer.
 */
export async function createBackup(db: Db, appVersion: string): Promise<BackupData> {
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const { table, collection } of TABLES) {
    const docs = await db.collection(collection).find().toArray();
    data[table] = docs.map(doc => {
      const { _id, ...rest } = doc as Record<string, unknown>;
      return table === 'app_settings' ? { key: _id, ...rest } : { id: _id, ...rest };
    });
  }
  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion,
    schemaVersion: SCHEMA_VERSION,
    data,
  };
}
