import { Collection } from 'mongodb';
import type { Presentation, IPresentationRepository } from '@kidase/shared';
import { Doc, docToEntity, entityToDoc, stripUndefined, uuidv4 } from './base';

export class MongoPresentationRepository implements IPresentationRepository {
  constructor(private readonly col: Collection) {}

  async getAll(): Promise<Presentation[]> {
    const docs = await this.col.find().sort({ createdAt: -1 }).toArray();
    return docs.map(d => docToEntity<Presentation>(d as Doc)!);
  }

  async getById(id: string): Promise<Presentation | null> {
    return docToEntity<Presentation>(await this.col.findOne({ _id: id as never }) as Doc | null);
  }

  async getByName(name: string): Promise<Presentation | null> {
    return docToEntity<Presentation>(await this.col.findOne({ name }) as Doc | null);
  }

  async getActive(): Promise<Presentation | null> {
    return docToEntity<Presentation>(await this.col.findOne({ isActive: true }) as Doc | null);
  }

  async getPrimary(): Promise<Presentation | null> {
    return docToEntity<Presentation>(await this.col.findOne({ isPrimary: true }) as Doc | null);
  }

  async setActive(id: string): Promise<void> {
    await this.col.updateMany({}, { $set: { isActive: false } });
    await this.col.updateOne({ _id: id as never }, { $set: { isActive: true } });
  }

  async clearActive(): Promise<void> {
    await this.col.updateMany({}, { $set: { isActive: false } });
  }

  async getByTemplateId(templateId: string): Promise<Presentation[]> {
    const docs = await this.col.find({ templateId }).sort({ createdAt: -1 }).toArray();
    return docs.map(d => docToEntity<Presentation>(d as Doc)!);
  }

  async create(presentation: Omit<Presentation, 'id' | 'createdAt'>): Promise<Presentation> {
    const entity: Presentation = { ...presentation, id: uuidv4(), createdAt: new Date().toISOString() };
    await this.col.insertOne(entityToDoc(entity) as never);
    return entity;
  }

  async update(id: string, presentation: Partial<Omit<Presentation, 'id' | 'createdAt'>>): Promise<Presentation> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Presentation not found');
    const updated = { ...existing, ...presentation };
    await this.col.updateOne({ _id: id as never }, { $set: stripUndefined({ ...presentation }) });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ _id: id as never });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.col.countDocuments({ _id: id as never }, { limit: 1 })) > 0;
  }
}
