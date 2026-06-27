import { Collection } from 'mongodb';
import type { Template, ITemplateRepository } from '@kidase/shared';
import { Doc, docToEntity, entityToDoc, stripUndefined, uuidv4 } from './base';

export class MongoTemplateRepository implements ITemplateRepository {
  constructor(private readonly col: Collection) {}

  async getAll(): Promise<Template[]> {
    const docs = await this.col.find().sort({ createdAt: 1 }).toArray();
    return docs.map(d => docToEntity<Template>(d as Doc)!);
  }

  async getById(id: string): Promise<Template | null> {
    return docToEntity<Template>(await this.col.findOne({ _id: id as never }) as Doc | null);
  }

  async getByName(name: string): Promise<Template | null> {
    return docToEntity<Template>(await this.col.findOne({ name }) as Doc | null);
  }

  async create(template: Omit<Template, 'id' | 'createdAt'>): Promise<Template> {
    const entity: Template = { ...template, id: uuidv4(), createdAt: new Date().toISOString() };
    await this.col.insertOne(entityToDoc(entity) as never);
    return entity;
  }

  async update(id: string, template: Partial<Omit<Template, 'id' | 'createdAt'>>): Promise<Template> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Template not found');
    const updated = { ...existing, ...template };
    await this.col.updateOne({ _id: id as never }, { $set: stripUndefined({ ...template }) });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ _id: id as never });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.col.countDocuments({ _id: id as never }, { limit: 1 })) > 0;
  }
}
