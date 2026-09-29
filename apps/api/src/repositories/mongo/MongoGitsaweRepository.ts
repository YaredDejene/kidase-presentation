import { Collection } from 'mongodb';
import type { Gitsawe, IGitsaweRepository } from '@kidase/shared';
import { Doc, docToEntity, entityToDoc, stripUndefined, uuidv4 } from './base';

export class MongoGitsaweRepository implements IGitsaweRepository {
  constructor(private readonly col: Collection) {}

  async getAll(): Promise<Gitsawe[]> {
    const docs = await this.col.find().sort({ priority: 1, lineId: 1 }).toArray();
    return docs.map(d => docToEntity<Gitsawe>(d as Doc)!);
  }

  async getById(id: string): Promise<Gitsawe | null> {
    return docToEntity<Gitsawe>(await this.col.findOne({ _id: id as never }) as Doc | null);
  }

  async getByLineId(lineId: string): Promise<Gitsawe | null> {
    return docToEntity<Gitsawe>(await this.col.findOne({ lineId }) as Doc | null);
  }

  async create(gitsawe: Omit<Gitsawe, 'id' | 'createdAt'>): Promise<Gitsawe> {
    const entity: Gitsawe = { ...gitsawe, id: uuidv4(), createdAt: new Date().toISOString() };
    await this.col.insertOne(entityToDoc(entity) as never);
    return entity;
  }

  async createMany(gitsawes: Omit<Gitsawe, 'id' | 'createdAt'>[]): Promise<Gitsawe[]> {
    if (gitsawes.length === 0) return [];
    const now = new Date().toISOString();
    const entities: Gitsawe[] = gitsawes.map(g => ({ ...g, id: uuidv4(), createdAt: now }));
    await this.col.insertMany(entities.map(e => entityToDoc(e)) as never);
    return entities;
  }

  async update(id: string, gitsawe: Partial<Omit<Gitsawe, 'id' | 'createdAt'>>): Promise<Gitsawe> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Gitsawe not found');
    const updated = { ...existing, ...gitsawe };
    await this.col.updateOne({ _id: id as never }, { $set: stripUndefined({ ...gitsawe }) });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ _id: id as never });
  }

  async count(): Promise<number> {
    return this.col.countDocuments();
  }
}
