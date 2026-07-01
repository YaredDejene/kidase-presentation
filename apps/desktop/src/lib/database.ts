/**
 * Database Library
 * SQLite database initialization and connection management
 */

import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

/**
 * Get the database connection instance
 * Creates a new connection if one doesn't exist
 * @returns Promise<Database> - The database instance
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:kidase.db');
  }
  return db;
}

/**
 * Close the database connection
 * Sets the database instance to null after closing
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
