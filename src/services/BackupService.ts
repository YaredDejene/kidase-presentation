/**
 * Backup & Restore Service
 * Creates and restores full snapshots of the app database
 */

import { getDatabase } from '../lib/database';

const BACKUP_VERSION = 1;
const SCHEMA_VERSION = 11;

const TABLES_INSERT_ORDER = [
  'templates', 'presentations', 'slides', 'variables',
  'gitsawes', 'verses', 'rule_definitions', 'app_settings',
];
const TABLES_DELETE_ORDER = [...TABLES_INSERT_ORDER].reverse();

export interface BackupData {
  version: number;
  createdAt: string;
  appVersion: string;
  schemaVersion: number;
  data: Record<string, Record<string, unknown>[]>;
}

class BackupServiceImpl {
  async createBackup(appVersion: string): Promise<BackupData> {
    const db = await getDatabase();
    const data: Record<string, Record<string, unknown>[]> = {};

    for (const table of TABLES_INSERT_ORDER) {
      data[table] = await db.select<Record<string, unknown>[]>(`SELECT * FROM ${table}`);
    }

    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion,
      schemaVersion: SCHEMA_VERSION,
      data,
    };
  }

  async restoreBackup(backup: BackupData): Promise<void> {
    if (!backup.data || typeof backup.data !== 'object') {
      throw new Error('Invalid backup structure');
    }

    if (backup.version > BACKUP_VERSION) {
      throw new Error('INCOMPATIBLE_VERSION');
    }

    const tableKeys = Object.keys(backup.data);
    for (const key of tableKeys) {
      if (!TABLES_INSERT_ORDER.includes(key)) {
        throw new Error(`Unknown table in backup: ${key}`);
      }
    }

    const db = await getDatabase();

    try {
      await db.execute('PRAGMA foreign_keys = OFF');
      await db.execute('BEGIN TRANSACTION');

      for (const table of TABLES_DELETE_ORDER) {
        await db.execute(`DELETE FROM ${table}`);
      }

      for (const table of TABLES_INSERT_ORDER) {
        const rows = backup.data[table];
        if (!rows || rows.length === 0) continue;

        for (const row of rows) {
          const columns = Object.keys(row);
          const placeholders = columns.map(() => '?').join(', ');
          const values = columns.map(col => row[col]);
          await db.execute(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values,
          );
        }
      }

      await db.execute('COMMIT');
    } catch (error) {
      try {
        await db.execute('ROLLBACK');
      } catch {
        // rollback may fail if transaction wasn't started
      }
      throw error;
    } finally {
      await db.execute('PRAGMA foreign_keys = ON');
    }
  }
}

export const backupService = new BackupServiceImpl();
export { BackupServiceImpl as BackupService };
