import { Collection } from 'mongodb';
import type { RuleDefinition, IRuleRepository } from '@kidase/shared';
import { Doc, docToEntity, entityToDoc, stripUndefined, uuidv4 } from './base';

export class MongoRuleRepository implements IRuleRepository {
  constructor(private readonly col: Collection) {}

  async getById(id: string): Promise<RuleDefinition | null> {
    return docToEntity<RuleDefinition>(await this.col.findOne({ _id: id as never }) as Doc | null);
  }

  async getByPresentationId(presentationId: string): Promise<RuleDefinition[]> {
    const docs = await this.col.find({ presentationId }).sort({ createdAt: 1 }).toArray();
    return docs.map(d => docToEntity<RuleDefinition>(d as Doc)!);
  }

  async getByGitsaweId(gitsaweId: string): Promise<RuleDefinition[]> {
    const docs = await this.col.find({ gitsaweId }).sort({ createdAt: 1 }).toArray();
    return docs.map(d => docToEntity<RuleDefinition>(d as Doc)!);
  }

  async getEnabled(): Promise<RuleDefinition[]> {
    const docs = await this.col.find({ isEnabled: true }).sort({ createdAt: 1 }).toArray();
    return docs.map(d => docToEntity<RuleDefinition>(d as Doc)!);
  }

  async create(rule: Omit<RuleDefinition, 'id' | 'createdAt'>): Promise<RuleDefinition> {
    const entity: RuleDefinition = { ...rule, id: uuidv4(), createdAt: new Date().toISOString() };
    await this.col.insertOne(entityToDoc(entity) as never);
    return entity;
  }

  async update(id: string, rule: Partial<Omit<RuleDefinition, 'id' | 'createdAt'>>): Promise<RuleDefinition> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Rule definition not found');
    const updated = { ...existing, ...rule };
    await this.col.updateOne({ _id: id as never }, { $set: stripUndefined({ ...rule }) });
    return updated;
  }

  async toggleEnabled(id: string): Promise<RuleDefinition> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Rule definition not found');
    return this.update(id, { isEnabled: !existing.isEnabled });
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ _id: id as never });
  }

  async deleteByPresentationId(presentationId: string): Promise<void> {
    await this.col.deleteMany({ presentationId });
  }

  async deleteByGitsaweId(gitsaweId: string): Promise<void> {
    await this.col.deleteMany({ gitsaweId });
  }
}
