import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Presentation } from '../../domain/entities/Presentation';
import { IPresentationRepository } from '../../domain/interfaces/IPresentationRepository';

interface PresentationRow {
  id: string;
  name: string;
  type: string;
  template_id: string;
  language_map: string;
  language_settings: string | null;
  is_primary: number;
  is_active: number;
  created_at: string;
}

export class PresentationRepository implements IPresentationRepository {
  private mapRowToEntity(row: PresentationRow): Presentation {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      templateId: row.template_id,
      languageMap: JSON.parse(row.language_map),
      languageSettings: row.language_settings ? JSON.parse(row.language_settings) : undefined,
      isPrimary: row.is_primary === 1,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    };
  }

  async getAll(): Promise<Presentation[]> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations ORDER BY created_at DESC'
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Presentation | null> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getByName(name: string): Promise<Presentation | null> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations WHERE name = ?',
      [name]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getActive(): Promise<Presentation | null> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations WHERE is_active = 1 LIMIT 1'
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getPrimary(): Promise<Presentation | null> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations WHERE is_primary = 1 LIMIT 1'
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async setActive(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('UPDATE presentations SET is_active = 0');
    await db.execute('UPDATE presentations SET is_active = 1 WHERE id = ?', [id]);
  }

  async clearActive(): Promise<void> {
    const db = await getDatabase();
    await db.execute('UPDATE presentations SET is_active = 0');
  }

  async getByTemplateId(templateId: string): Promise<Presentation[]> {
    const db = await getDatabase();
    const rows = await db.select<PresentationRow[]>(
      'SELECT * FROM presentations WHERE template_id = ? ORDER BY created_at DESC',
      [templateId]
    );
    return rows.map(this.mapRowToEntity);
  }

  async create(presentation: Omit<Presentation, 'id' | 'createdAt'>): Promise<Presentation> {
    const db = await getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.execute(
      `INSERT INTO presentations
       (id, name, type, template_id, language_map, language_settings, is_primary, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        presentation.name,
        presentation.type,
        presentation.templateId,
        JSON.stringify(presentation.languageMap),
        presentation.languageSettings ? JSON.stringify(presentation.languageSettings) : null,
        presentation.isPrimary ? 1 : 0,
        presentation.isActive ? 1 : 0,
        createdAt,
      ]
    );

    return { ...presentation, id, createdAt };
  }

  async update(id: string, presentation: Partial<Omit<Presentation, 'id' | 'createdAt'>>): Promise<Presentation> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Presentation not found');

    const updated = { ...existing, ...presentation };

    await db.execute(
      `UPDATE presentations
       SET name = ?, type = ?, template_id = ?, language_map = ?, language_settings = ?, is_primary = ?, is_active = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.type,
        updated.templateId,
        JSON.stringify(updated.languageMap),
        updated.languageSettings ? JSON.stringify(updated.languageSettings) : null,
        updated.isPrimary ? 1 : 0,
        updated.isActive ? 1 : 0,
        id,
      ]
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM presentations WHERE id = ?', [id]);
  }

  async exists(id: string): Promise<boolean> {
    const db = await getDatabase();
    const rows = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM presentations WHERE id = ?',
      [id]
    );
    return rows[0]?.count > 0;
  }
}
