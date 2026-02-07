import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/database';
import { Gitsawe } from '../../domain/entities/Gitsawe';
import { IGitsaweRepository } from '../../domain/interfaces/IGitsaweRepository';

interface GitsaweRow {
  id: string;
  line_id: string;
  message_st_paul: string | null;
  message_apostle: string | null;
  message_book_of_acts: string | null;
  misbak: string | null;
  wengel: string | null;
  kidase_type: string | null;
  evangelist: string | null;
  message_apostle_evangelist: string | null;
  gitsawe_type: string | null;
  priority: number;
  created_at: string;
}

export class GitsaweRepository implements IGitsaweRepository {
  private mapRowToEntity(row: GitsaweRow): Gitsawe {
    return {
      id: row.id,
      lineId: row.line_id,
      messageStPaul: row.message_st_paul ?? undefined,
      messageApostle: row.message_apostle ?? undefined,
      messageBookOfActs: row.message_book_of_acts ?? undefined,
      misbak: row.misbak ?? undefined,
      wengel: row.wengel ?? undefined,
      kidaseType: row.kidase_type ?? undefined,
      evangelist: row.evangelist ?? undefined,
      messageApostleEvangelist: row.message_apostle_evangelist ?? undefined,
      gitsaweType: row.gitsawe_type ?? undefined,
      priority: row.priority,
      createdAt: row.created_at,
    };
  }

  async getAll(): Promise<Gitsawe[]> {
    const db = await getDatabase();
    const rows = await db.select<GitsaweRow[]>(
      'SELECT * FROM gitsawes ORDER BY priority, line_id',
      []
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Gitsawe | null> {
    const db = await getDatabase();
    const rows = await db.select<GitsaweRow[]>(
      'SELECT * FROM gitsawes WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getByLineId(lineId: string): Promise<Gitsawe | null> {
    const db = await getDatabase();
    const rows = await db.select<GitsaweRow[]>(
      'SELECT * FROM gitsawes WHERE line_id = ?',
      [lineId]
    );
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  async getByPriority(priority: number): Promise<Gitsawe[]> {
    const db = await getDatabase();
    const rows = await db.select<GitsaweRow[]>(
      'SELECT * FROM gitsawes WHERE priority = ? ORDER BY line_id',
      [priority]
    );
    return rows.map(this.mapRowToEntity);
  }

  async getByGitsaweType(gitsaweType: string): Promise<Gitsawe[]> {
    const db = await getDatabase();
    const rows = await db.select<GitsaweRow[]>(
      'SELECT * FROM gitsawes WHERE gitsawe_type = ? ORDER BY priority, line_id',
      [gitsaweType]
    );
    return rows.map(this.mapRowToEntity);
  }

  async create(gitsawe: Omit<Gitsawe, 'id' | 'createdAt'>): Promise<Gitsawe> {
    const db = await getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.execute(
      `INSERT INTO gitsawes
       (id, line_id, message_st_paul, message_apostle, message_book_of_acts,
        misbak, wengel, kidase_type, evangelist, message_apostle_evangelist,
        gitsawe_type, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        gitsawe.lineId,
        gitsawe.messageStPaul ?? null,
        gitsawe.messageApostle ?? null,
        gitsawe.messageBookOfActs ?? null,
        gitsawe.misbak ?? null,
        gitsawe.wengel ?? null,
        gitsawe.kidaseType ?? null,
        gitsawe.evangelist ?? null,
        gitsawe.messageApostleEvangelist ?? null,
        gitsawe.gitsaweType ?? null,
        gitsawe.priority,
        createdAt,
      ]
    );

    return { ...gitsawe, id, createdAt };
  }

  async createMany(gitsawes: Omit<Gitsawe, 'id' | 'createdAt'>[]): Promise<Gitsawe[]> {
    const results: Gitsawe[] = [];
    for (const gitsawe of gitsawes) {
      const created = await this.create(gitsawe);
      results.push(created);
    }
    return results;
  }

  async update(id: string, gitsawe: Partial<Omit<Gitsawe, 'id' | 'createdAt'>>): Promise<Gitsawe> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Gitsawe not found');

    const updated = { ...existing, ...gitsawe };

    await db.execute(
      `UPDATE gitsawes
       SET line_id = ?, message_st_paul = ?, message_apostle = ?, message_book_of_acts = ?,
           misbak = ?, wengel = ?, kidase_type = ?, evangelist = ?,
           message_apostle_evangelist = ?, gitsawe_type = ?, priority = ?
       WHERE id = ?`,
      [
        updated.lineId,
        updated.messageStPaul ?? null,
        updated.messageApostle ?? null,
        updated.messageBookOfActs ?? null,
        updated.misbak ?? null,
        updated.wengel ?? null,
        updated.kidaseType ?? null,
        updated.evangelist ?? null,
        updated.messageApostleEvangelist ?? null,
        updated.gitsaweType ?? null,
        updated.priority,
        id,
      ]
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM gitsawes WHERE id = ?', [id]);
  }

  async count(): Promise<number> {
    const db = await getDatabase();
    const rows = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM gitsawes',
      []
    );
    return rows[0]?.count ?? 0;
  }
}
