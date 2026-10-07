import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Verse } from '@kidase/shared/domain/entities/Verse';
import { LANG_SLOTS, langColumn, langField } from '@kidase/shared/domain/entities/Presentation';
import { IVerseRepository } from '@kidase/shared/domain/interfaces/IVerseRepository';

interface VerseRow {
  id: string;
  segment_id: string;
  verse_order: number;
  created_at: string;
  [langColumn: string]: string | number | null;
}

// Every title column, then every text column, in slot order.
const LANG_PARTS = (['title', 'text'] as const).flatMap(prefix => LANG_SLOTS.map(slot => ({ prefix, slot })));
const LANG_COLUMNS = LANG_PARTS.map(({ prefix, slot }) => langColumn(prefix, slot));
const langValues = (v: Partial<Verse>) => LANG_PARTS.map(({ prefix, slot }) => v[langField(prefix, slot)] ?? null);

export class VerseRepository implements IVerseRepository {
  private mapRowToEntity(row: VerseRow): Verse {
    const verse: Verse = {
      id: row.id,
      segmentId: row.segment_id,
      verseOrder: row.verse_order,
      createdAt: row.created_at,
    };
    for (const { prefix, slot } of LANG_PARTS) {
      verse[langField(prefix, slot)] = (row[langColumn(prefix, slot)] as string | null) ?? undefined;
    }
    return verse;
  }

  async getAll(): Promise<Verse[]> {
    const db = await getDatabase();
    const rows = await db.select<VerseRow[]>(
      'SELECT * FROM verses ORDER BY segment_id, verse_order',
      []
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Verse | null> {
    const db = await getDatabase();
    const rows = await db.select<VerseRow[]>(
      'SELECT * FROM verses WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getBySegmentId(segmentId: string): Promise<Verse[]> {
    const db = await getDatabase();
    const rows = await db.select<VerseRow[]>(
      'SELECT * FROM verses WHERE segment_id = ? ORDER BY verse_order',
      [segmentId]
    );
    return rows.map(this.mapRowToEntity);
  }

  async create(verse: Omit<Verse, 'id' | 'createdAt'>): Promise<Verse> {
    const db = await getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.execute(
      `INSERT INTO verses
       (id, segment_id, verse_order, ${LANG_COLUMNS.join(', ')}, created_at)
       VALUES (?, ?, ?, ${LANG_COLUMNS.map(() => '?').join(', ')}, ?)`,
      [id, verse.segmentId, verse.verseOrder, ...langValues(verse), createdAt]
    );

    return { ...verse, id, createdAt };
  }

  async createMany(verses: Omit<Verse, 'id' | 'createdAt'>[]): Promise<Verse[]> {
    const results: Verse[] = [];
    for (const verse of verses) {
      const created = await this.create(verse);
      results.push(created);
    }
    return results;
  }

  async upsertMany(verses: Omit<Verse, 'id' | 'createdAt'>[]): Promise<void> {
    const db = await getDatabase();
    const createdAt = new Date().toISOString();
    for (const verse of verses) {
      await db.execute(
        `INSERT INTO verses
         (id, segment_id, verse_order, ${LANG_COLUMNS.join(', ')}, created_at)
         VALUES (?, ?, ?, ${LANG_COLUMNS.map(() => '?').join(', ')}, ?)
         ON CONFLICT(segment_id, verse_order) DO UPDATE SET
         ${LANG_COLUMNS.map(c => `${c} = excluded.${c}`).join(', ')}`,
        [uuidv4(), verse.segmentId, verse.verseOrder, ...langValues(verse), createdAt]
      );
    }
  }

  async update(id: string, verse: Partial<Omit<Verse, 'id' | 'createdAt'>>): Promise<Verse> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Verse not found');

    const updated = { ...existing, ...verse };

    await db.execute(
      `UPDATE verses
       SET segment_id = ?, verse_order = ?, ${LANG_COLUMNS.map(c => `${c} = ?`).join(', ')}
       WHERE id = ?`,
      [updated.segmentId, updated.verseOrder, ...langValues(updated), id]
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM verses WHERE id = ?', [id]);
  }

  async count(): Promise<number> {
    const db = await getDatabase();
    const rows = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM verses',
      []
    );
    return rows[0]?.count ?? 0;
  }
}
