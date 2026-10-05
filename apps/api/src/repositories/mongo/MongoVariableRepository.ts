import { Collection } from 'mongodb';
import type { Variable, IVariableRepository } from '@kidase/shared';
import { Doc, docToEntity, entityToDoc, stripUndefined, uuidv4 } from './base';

export class MongoVariableRepository implements IVariableRepository {
  constructor(private readonly col: Collection) {}

  async getByPresentationId(presentationId: string): Promise<Variable[]> {
    const docs = await this.col.find({ presentationId }).sort({ name: 1 }).toArray();
    return docs.map(d => docToEntity<Variable>(d as Doc)!);
  }

  async getById(id: string): Promise<Variable | null> {
    return docToEntity<Variable>(await this.col.findOne({ _id: id as never }) as Doc | null);
  }

  async getByName(presentationId: string, name: string): Promise<Variable | null> {
    return docToEntity<Variable>(await this.col.findOne({ presentationId, name }) as Doc | null);
  }

  async create(variable: Omit<Variable, 'id'>): Promise<Variable> {
    const entity: Variable = { ...variable, id: uuidv4() };
    await this.col.insertOne(entityToDoc(entity) as never);
    return entity;
  }

  async createMany(variables: Omit<Variable, 'id'>[]): Promise<Variable[]> {
    if (variables.length === 0) return [];
    const entities: Variable[] = variables.map(v => ({ ...v, id: uuidv4() }));
    await this.col.insertMany(entities.map(e => entityToDoc(e)) as never);
    return entities;
  }

  async update(id: string, variable: Partial<Omit<Variable, 'id' | 'presentationId'>>): Promise<Variable> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Variable not found');
    const updated = { ...existing, ...variable };
    await this.col.updateOne({ _id: id as never }, { $set: stripUndefined({ ...variable }) });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ _id: id as never });
  }

  async deleteByPresentationId(presentationId: string): Promise<void> {
    await this.col.deleteMany({ presentationId });
  }

  async deleteByName(presentationId: string, name: string): Promise<void> {
    await this.col.deleteOne({ presentationId, name });
  }
}
