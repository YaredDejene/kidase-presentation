import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Slide } from '../../domain/entities/Slide';
import { ISlideRepository } from '../../domain/interfaces/ISlideRepository';

interface SlideRow {
  id: string;
  presentation_id: string;
  slide_order: number;
  line_id: string | null;
  title_json: string | null;
  blocks_json: string;
  notes: string | null;
  is_disabled: number;
}

export class SlideRepository implements ISlideRepository {
  private mapRowToEntity(row: SlideRow): Slide {
    return {
      id: row.id,
      presentationId: row.presentation_id,
      slideOrder: row.slide_order,
      lineId: row.line_id ?? undefined,
      titleJson: row.title_json ? JSON.parse(row.title_json) : undefined,
      blocksJson: JSON.parse(row.blocks_json),
      notes: row.notes ?? undefined,
      isDisabled: row.is_disabled === 1,
    };
  }

  async getByPresentationId(presentationId: string): Promise<Slide[]> {
    const db = await getDatabase();
    const rows = await db.select<SlideRow[]>(
      'SELECT * FROM slides WHERE presentation_id = ? ORDER BY slide_order',
      [presentationId]
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Slide | null> {
    const db = await getDatabase();
    const rows = await db.select<SlideRow[]>(
      'SELECT * FROM slides WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getByLineId(presentationId: string, lineId: string): Promise<Slide | null> {
    const db = await getDatabase();
    const rows = await db.select<SlideRow[]>(
      'SELECT * FROM slides WHERE presentation_id = ? AND line_id = ?',
      [presentationId, lineId]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getEnabledByPresentationId(presentationId: string): Promise<Slide[]> {
    const db = await getDatabase();
    const rows = await db.select<SlideRow[]>(
      'SELECT * FROM slides WHERE presentation_id = ? AND is_disabled = 0 ORDER BY slide_order',
      [presentationId]
    );
    return rows.map(this.mapRowToEntity);
  }

  async create(slide: Omit<Slide, 'id'>): Promise<Slide> {
    const db = await getDatabase();
    const id = uuidv4();

    await db.execute(
      `INSERT INTO slides
       (id, presentation_id, slide_order, line_id, title_json, blocks_json, notes, is_disabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        slide.presentationId,
        slide.slideOrder,
        slide.lineId ?? null,
        slide.titleJson ? JSON.stringify(slide.titleJson) : null,
        JSON.stringify(slide.blocksJson),
        slide.notes ?? null,
        slide.isDisabled ? 1 : 0,
      ]
    );

    return { ...slide, id };
  }

  async createMany(slides: Omit<Slide, 'id'>[]): Promise<Slide[]> {
    const createdSlides: Slide[] = [];

    for (const slide of slides) {
      const created = await this.create(slide);
      createdSlides.push(created);
    }

    return createdSlides;
  }

  async update(id: string, slide: Partial<Omit<Slide, 'id' | 'presentationId'>>): Promise<Slide> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Slide not found');

    const updated = { ...existing, ...slide };

    await db.execute(
      `UPDATE slides
       SET slide_order = ?, line_id = ?, title_json = ?, blocks_json = ?,
           notes = ?, is_disabled = ?
       WHERE id = ?`,
      [
        updated.slideOrder,
        updated.lineId ?? null,
        updated.titleJson ? JSON.stringify(updated.titleJson) : null,
        JSON.stringify(updated.blocksJson),
        updated.notes ?? null,
        updated.isDisabled ? 1 : 0,
        id,
      ]
    );

    return updated;
  }

  async updateOrder(slides: { id: string; slideOrder: number }[]): Promise<void> {
    const db = await getDatabase();
    for (const slide of slides) {
      await db.execute(
        'UPDATE slides SET slide_order = ? WHERE id = ?',
        [slide.slideOrder, slide.id]
      );
    }
  }

  async toggleDisabled(id: string): Promise<Slide> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Slide not found');

    return this.update(id, { isDisabled: !existing.isDisabled });
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM slides WHERE id = ?', [id]);
  }

  async deleteByPresentationId(presentationId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM slides WHERE presentation_id = ?', [presentationId]);
  }

  async count(presentationId: string): Promise<number> {
    const db = await getDatabase();
    const rows = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM slides WHERE presentation_id = ?',
      [presentationId]
    );
    return rows[0]?.count ?? 0;
  }
}
