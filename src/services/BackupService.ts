/**
 * Backup & Restore Service
 * Creates and restores full snapshots of the app database
 */

import { getDatabase, closeDatabase } from '../lib/database';

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

type ProgressCallback = (current: number, total: number) => void;

class BackupServiceImpl {
  async createBackup(appVersion: string, onProgress?: ProgressCallback): Promise<BackupData> {
    const db = await getDatabase();
    const data: Record<string, Record<string, unknown>[]> = {};

    const total = TABLES_INSERT_ORDER.length;
    for (let i = 0; i < total; i++) {
      const table = TABLES_INSERT_ORDER[i];
      data[table] = await db.select<Record<string, unknown>[]>(`SELECT * FROM ${table}`);
      onProgress?.(i + 1, total);
    }

    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion,
      schemaVersion: SCHEMA_VERSION,
      data,
    };
  }

  async restoreBackup(backup: BackupData, onProgress?: ProgressCallback): Promise<void> {
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

    // Count total rows for progress
    let totalRows = TABLES_DELETE_ORDER.length; // deletes
    for (const table of TABLES_INSERT_ORDER) {
      totalRows += backup.data[table]?.length ?? 0;
    }
    let processed = 0;

    // Close existing connection so no other code holds a lock
    await closeDatabase();

    // Open a fresh connection for restore
    const db = await getDatabase();

    await db.execute('PRAGMA journal_mode = WAL');
    await db.execute('PRAGMA foreign_keys = OFF');

    try {
      await db.execute('BEGIN EXCLUSIVE');

      for (const table of TABLES_DELETE_ORDER) {
        await db.execute(`DELETE FROM ${table}`);
        processed++;
        onProgress?.(processed, totalRows);
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
          processed++;
          onProgress?.(processed, totalRows);
        }
      }

      await db.execute('COMMIT');
    } catch (error) {
      try {
        await db.execute('ROLLBACK');
      } catch (rollbackErr) {
        console.warn('Rollback failed:', rollbackErr);
      }
      throw error;
    } finally {
      await db.execute('PRAGMA foreign_keys = ON');
    }
  }
}

export const backupService = new BackupServiceImpl();
export { BackupServiceImpl as BackupService };
