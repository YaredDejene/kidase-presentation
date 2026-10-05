import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Variable } from '@kidase/shared/domain/entities/Variable';
import { LANG_SLOTS, langColumn, langField } from '@kidase/shared/domain/entities/Presentation';
import { IVariableRepository } from '@kidase/shared/domain/interfaces/IVariableRepository';

interface VariableRow {
  id: string;
  presentation_id: string;
  name: string;
  value: string;
  [langColumn: string]: string;
}

const VALUE_COLUMNS = LANG_SLOTS.map(slot => langColumn('value', slot));
const langValues = (v: Partial<Variable>) => LANG_SLOTS.map(slot => v[langField('value', slot)] || '');

export class VariableRepository implements IVariableRepository {
  private mapRowToEntity(row: VariableRow): Variable {
    const variable: Variable = {
      id: row.id,
      presentationId: row.presentation_id,
      name: row.name,
      value: row.value,
    };
    for (const slot of LANG_SLOTS) {
      variable[langField('value', slot)] = row[langColumn('value', slot)] || undefined;
    }
    return variable;
  }

  async getByPresentationId(presentationId: string): Promise<Variable[]> {
    const db = await getDatabase();
    const rows = await db.select<VariableRow[]>(
      'SELECT * FROM variables WHERE presentation_id = ? ORDER BY name',
      [presentationId]
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Variable | null> {
    const db = await getDatabase();
    const rows = await db.select<VariableRow[]>(
      'SELECT * FROM variables WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getByName(presentationId: string, name: string): Promise<Variable | null> {
    const db = await getDatabase();
    const rows = await db.select<VariableRow[]>(
      'SELECT * FROM variables WHERE presentation_id = ? AND name = ?',
      [presentationId, name]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async create(variable: Omit<Variable, 'id'>): Promise<Variable> {
    const db = await getDatabase();
    const id = uuidv4();

    await db.execute(
      `INSERT INTO variables (id, presentation_id, name, value, ${VALUE_COLUMNS.join(', ')})
       VALUES (?, ?, ?, ?, ${VALUE_COLUMNS.map(() => '?').join(', ')})`,
      [id, variable.presentationId, variable.name, variable.value, ...langValues(variable)]
    );

    return { ...variable, id };
  }

  async createMany(variables: Omit<Variable, 'id'>[]): Promise<Variable[]> {
    const createdVariables: Variable[] = [];

    for (const variable of variables) {
      const created = await this.create(variable);
      createdVariables.push(created);
    }

    return createdVariables;
  }

  async update(id: string, variable: Partial<Omit<Variable, 'id' | 'presentationId'>>): Promise<Variable> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Variable not found');

    const updated = { ...existing, ...variable };

    await db.execute(
      `UPDATE variables SET name = ?, value = ?, ${VALUE_COLUMNS.map(c => `${c} = ?`).join(', ')} WHERE id = ?`,
      [updated.name, updated.value, ...langValues(updated), id]
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM variables WHERE id = ?', [id]);
  }

  async deleteByPresentationId(presentationId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM variables WHERE presentation_id = ?', [presentationId]);
  }

  async deleteByName(presentationId: string, name: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      'DELETE FROM variables WHERE presentation_id = ? AND name = ?',
      [presentationId, name]
    );
  }
}
