import { Collection } from 'mongodb';
import type { Verse, IVerseRepository } from '@kidase/shared';
import { Doc, docToEntity, entityToDoc, stripUndefined, uuidv4 } from './base';

export class MongoVerseRepository implements IVerseRepository {
  constructor(private readonly col: Collection) {}

  async getAll(): Promise<Verse[]> {
    const docs = await this.col.find().sort({ segmentId: 1, verseOrder: 1 }).toArray();
    return docs.map(d => docToEntity<Verse>(d as Doc)!);
  }

  async getById(id: string): Promise<Verse | null> {
    return docToEntity<Verse>(await this.col.findOne({ _id: id as never }) as Doc | null);
  }

  async getBySegmentId(segmentId: string): Promise<Verse[]> {
    const docs = await this.col.find({ segmentId }).sort({ verseOrder: 1 }).toArray();
    return docs.map(d => docToEntity<Verse>(d as Doc)!);
  }

  async create(verse: Omit<Verse, 'id' | 'createdAt'>): Promise<Verse> {
    const entity: Verse = { ...verse, id: uuidv4(), createdAt: new Date().toISOString() };
    await this.col.insertOne(entityToDoc(entity) as never);
    return entity;
  }

  async createMany(verses: Omit<Verse, 'id' | 'createdAt'>[]): Promise<Verse[]> {
    if (verses.length === 0) return [];
    const now = new Date().toISOString();
    const entities: Verse[] = verses.map(v => ({ ...v, id: uuidv4(), createdAt: now }));
    await this.col.insertMany(entities.map(e => entityToDoc(e)) as never);
    return entities;
  }

  async update(id: string, verse: Partial<Omit<Verse, 'id' | 'createdAt'>>): Promise<Verse> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Verse not found');
    const updated = { ...existing, ...verse };
    await this.col.updateOne({ _id: id as never }, { $set: stripUndefined({ ...verse }) });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ _id: id as never });
  }

  async count(): Promise<number> {
    return this.col.countDocuments();
  }
}
