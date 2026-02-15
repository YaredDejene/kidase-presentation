import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Verse } from '../../domain/entities/Verse';
import { IVerseRepository } from '../../domain/interfaces/IVerseRepository';

interface VerseRow {
  id: string;
  segment_id: string;
  verse_order: number;
  title_lang1: string | null;
  title_lang2: string | null;
  title_lang3: string | null;
  title_lang4: string | null;
  text_lang1: string | null;
  text_lang2: string | null;
  text_lang3: string | null;
  text_lang4: string | null;
  created_at: string;
}

export class VerseRepository implements IVerseRepository {
  private mapRowToEntity(row: VerseRow): Verse {
    return {
      id: row.id,
      segmentId: row.segment_id,
      verseOrder: row.verse_order,
      titleLang1: row.title_lang1 ?? undefined,
      titleLang2: row.title_lang2 ?? undefined,
      titleLang3: row.title_lang3 ?? undefined,
      titleLang4: row.title_lang4 ?? undefined,
      textLang1: row.text_lang1 ?? undefined,
      textLang2: row.text_lang2 ?? undefined,
      textLang3: row.text_lang3 ?? undefined,
      textLang4: row.text_lang4 ?? undefined,
      createdAt: row.created_at,
    };
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
       (id, segment_id, verse_order, title_lang1, title_lang2, title_lang3, title_lang4,
        text_lang1, text_lang2, text_lang3, text_lang4, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        verse.segmentId,
        verse.verseOrder,
        verse.titleLang1 ?? null,
        verse.titleLang2 ?? null,
        verse.titleLang3 ?? null,
        verse.titleLang4 ?? null,
        verse.textLang1 ?? null,
        verse.textLang2 ?? null,
        verse.textLang3 ?? null,
        verse.textLang4 ?? null,
        createdAt,
      ]
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

  async update(id: string, verse: Partial<Omit<Verse, 'id' | 'createdAt'>>): Promise<Verse> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Verse not found');

    const updated = { ...existing, ...verse };

    await db.execute(
      `UPDATE verses
       SET segment_id = ?, verse_order = ?,
           title_lang1 = ?, title_lang2 = ?, title_lang3 = ?, title_lang4 = ?,
           text_lang1 = ?, text_lang2 = ?, text_lang3 = ?, text_lang4 = ?
       WHERE id = ?`,
      [
        updated.segmentId,
        updated.verseOrder,
        updated.titleLang1 ?? null,
        updated.titleLang2 ?? null,
        updated.titleLang3 ?? null,
        updated.titleLang4 ?? null,
        updated.textLang1 ?? null,
        updated.textLang2 ?? null,
        updated.textLang3 ?? null,
        updated.textLang4 ?? null,
        id,
      ]
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
