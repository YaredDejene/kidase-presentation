import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Template } from '../../domain/entities/Template';
import { ITemplateRepository } from '../../domain/interfaces/ITemplateRepository';

interface TemplateRow {
  id: string;
  name: string;
  max_lang_count: number;
  definition_json: string;
  created_at: string;
}

export class TemplateRepository implements ITemplateRepository {
  private mapRowToEntity(row: TemplateRow): Template {
    return {
      id: row.id,
      name: row.name,
      maxLangCount: row.max_lang_count,
      definitionJson: JSON.parse(row.definition_json),
      createdAt: row.created_at,
    };
  }

  async getAll(): Promise<Template[]> {
    const db = await getDatabase();
    const rows = await db.select<TemplateRow[]>(
      'SELECT * FROM templates ORDER BY name'
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Template | null> {
    const db = await getDatabase();
    const rows = await db.select<TemplateRow[]>(
      'SELECT * FROM templates WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getByName(name: string): Promise<Template | null> {
    const db = await getDatabase();
    const rows = await db.select<TemplateRow[]>(
      'SELECT * FROM templates WHERE name = ?',
      [name]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async create(template: Omit<Template, 'id' | 'createdAt'>): Promise<Template> {
    const db = await getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.execute(
      `INSERT INTO templates (id, name, max_lang_count, definition_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        template.name,
        template.maxLangCount,
        JSON.stringify(template.definitionJson),
        createdAt,
      ]
    );

    return { ...template, id, createdAt };
  }

  async update(id: string, template: Partial<Omit<Template, 'id' | 'createdAt'>>): Promise<Template> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Template not found');

    const updated = { ...existing, ...template };

    await db.execute(
      `UPDATE templates
       SET name = ?, max_lang_count = ?, definition_json = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.maxLangCount,
        JSON.stringify(updated.definitionJson),
        id,
      ]
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM templates WHERE id = ?', [id]);
  }

  async exists(id: string): Promise<boolean> {
    const db = await getDatabase();
    const rows = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM templates WHERE id = ?',
      [id]
    );
    return rows[0]?.count > 0;
  }
}
