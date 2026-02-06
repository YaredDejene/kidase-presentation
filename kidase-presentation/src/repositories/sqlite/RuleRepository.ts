import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { RuleDefinition, RuleScope } from '../../domain/entities/RuleDefinition';
import { IRuleRepository } from '../../domain/interfaces/IRuleRepository';

interface RuleRow {
  id: string;
  name: string;
  scope: string;
  presentation_id: string | null;
  slide_id: string | null;
  rule_json: string;
  is_enabled: number;
  created_at: string;
}

export class RuleRepository implements IRuleRepository {
  private mapRowToEntity(row: RuleRow): RuleDefinition {
    return {
      id: row.id,
      name: row.name,
      scope: row.scope as RuleScope,
      presentationId: row.presentation_id ?? undefined,
      slideId: row.slide_id ?? undefined,
      ruleJson: row.rule_json,
      isEnabled: row.is_enabled === 1,
      createdAt: row.created_at,
    };
  }

  async getById(id: string): Promise<RuleDefinition | null> {
    const db = await getDatabase();
    const rows = await db.select<RuleRow[]>(
      'SELECT * FROM rule_definitions WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getByScope(scope: RuleScope, scopeId?: string): Promise<RuleDefinition[]> {
    const db = await getDatabase();

    if (scope === 'presentation' && scopeId) {
      const rows = await db.select<RuleRow[]>(
        'SELECT * FROM rule_definitions WHERE scope = ? AND presentation_id = ? ORDER BY created_at',
        [scope, scopeId]
      );
      return rows.map(r => this.mapRowToEntity(r));
    }

    if (scope === 'slide' && scopeId) {
      const rows = await db.select<RuleRow[]>(
        'SELECT * FROM rule_definitions WHERE scope = ? AND slide_id = ? ORDER BY created_at',
        [scope, scopeId]
      );
      return rows.map(r => this.mapRowToEntity(r));
    }

    const rows = await db.select<RuleRow[]>(
      'SELECT * FROM rule_definitions WHERE scope = ? ORDER BY created_at',
      [scope]
    );
    return rows.map(r => this.mapRowToEntity(r));
  }

  async getByPresentationId(presentationId: string): Promise<RuleDefinition[]> {
    const db = await getDatabase();
    const rows = await db.select<RuleRow[]>(
      'SELECT * FROM rule_definitions WHERE presentation_id = ? ORDER BY created_at',
      [presentationId]
    );
    return rows.map(r => this.mapRowToEntity(r));
  }

  async getBySlideId(slideId: string): Promise<RuleDefinition[]> {
    const db = await getDatabase();
    const rows = await db.select<RuleRow[]>(
      'SELECT * FROM rule_definitions WHERE slide_id = ? ORDER BY created_at',
      [slideId]
    );
    return rows.map(r => this.mapRowToEntity(r));
  }

  async getEnabled(): Promise<RuleDefinition[]> {
    const db = await getDatabase();
    const rows = await db.select<RuleRow[]>(
      'SELECT * FROM rule_definitions WHERE is_enabled = 1 ORDER BY created_at',
      []
    );
    return rows.map(r => this.mapRowToEntity(r));
  }

  async create(rule: Omit<RuleDefinition, 'id' | 'createdAt'>): Promise<RuleDefinition> {
    const db = await getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.execute(
      `INSERT INTO rule_definitions
       (id, name, scope, presentation_id, slide_id, rule_json, is_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rule.name,
        rule.scope,
        rule.presentationId ?? null,
        rule.slideId ?? null,
        rule.ruleJson,
        rule.isEnabled ? 1 : 0,
        createdAt,
      ]
    );

    return { ...rule, id, createdAt };
  }

  async update(id: string, rule: Partial<Omit<RuleDefinition, 'id' | 'createdAt'>>): Promise<RuleDefinition> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Rule definition not found');

    const updated = { ...existing, ...rule };

    await db.execute(
      `UPDATE rule_definitions
       SET name = ?, scope = ?, presentation_id = ?, slide_id = ?,
           rule_json = ?, is_enabled = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.scope,
        updated.presentationId ?? null,
        updated.slideId ?? null,
        updated.ruleJson,
        updated.isEnabled ? 1 : 0,
        id,
      ]
    );

    return updated;
  }

  async toggleEnabled(id: string): Promise<RuleDefinition> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Rule definition not found');
    return this.update(id, { isEnabled: !existing.isEnabled });
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM rule_definitions WHERE id = ?', [id]);
  }

  async deleteByPresentationId(presentationId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM rule_definitions WHERE presentation_id = ?', [presentationId]);
  }

  async deleteBySlideId(slideId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM rule_definitions WHERE slide_id = ?', [slideId]);
  }
}
