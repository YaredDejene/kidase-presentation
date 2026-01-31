import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Variable } from '../../domain/entities/Variable';
import { IVariableRepository } from '../../domain/interfaces/IVariableRepository';

interface VariableRow {
  id: string;
  presentation_id: string;
  name: string;
  value: string;
}

export class VariableRepository implements IVariableRepository {
  private mapRowToEntity(row: VariableRow): Variable {
    return {
      id: row.id,
      presentationId: row.presentation_id,
      name: row.name,
      value: row.value,
    };
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
      `INSERT INTO variables (id, presentation_id, name, value)
       VALUES (?, ?, ?, ?)`,
      [id, variable.presentationId, variable.name, variable.value]
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
      `UPDATE variables SET name = ?, value = ? WHERE id = ?`,
      [updated.name, updated.value, id]
    );

    return updated;
  }

  async upsert(presentationId: string, name: string, value: string): Promise<Variable> {
    const existing = await this.getByName(presentationId, name);

    if (existing) {
      return this.update(existing.id, { value });
    } else {
      return this.create({ presentationId, name, value });
    }
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
