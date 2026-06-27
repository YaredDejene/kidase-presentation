import { Collection } from 'mongodb';
import type { Slide, ISlideRepository } from '@kidase/shared';
import { Doc, docToEntity, entityToDoc, stripUndefined, uuidv4 } from './base';

export class MongoSlideRepository implements ISlideRepository {
  constructor(private readonly col: Collection) {}

  async getByPresentationId(presentationId: string): Promise<Slide[]> {
    const docs = await this.col.find({ presentationId }).sort({ slideOrder: 1 }).toArray();
    return docs.map(d => docToEntity<Slide>(d as Doc)!);
  }

  async getById(id: string): Promise<Slide | null> {
    return docToEntity<Slide>(await this.col.findOne({ _id: id as never }) as Doc | null);
  }

  async getByLineId(presentationId: string, lineId: string): Promise<Slide | null> {
    return docToEntity<Slide>(await this.col.findOne({ presentationId, lineId }) as Doc | null);
  }

  async getEnabledByPresentationId(presentationId: string): Promise<Slide[]> {
    const docs = await this.col.find({ presentationId, isDisabled: false }).sort({ slideOrder: 1 }).toArray();
    return docs.map(d => docToEntity<Slide>(d as Doc)!);
  }

  async create(slide: Omit<Slide, 'id'>): Promise<Slide> {
    const entity: Slide = { ...slide, id: uuidv4() };
    await this.col.insertOne(entityToDoc(entity) as never);
    return entity;
  }

  async createMany(slides: Omit<Slide, 'id'>[]): Promise<Slide[]> {
    if (slides.length === 0) return [];
    const entities: Slide[] = slides.map(s => ({ ...s, id: uuidv4() }));
    await this.col.insertMany(entities.map(e => entityToDoc(e)) as never);
    return entities;
  }

  async update(id: string, slide: Partial<Omit<Slide, 'id' | 'presentationId'>>): Promise<Slide> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Slide not found');
    const updated = { ...existing, ...slide };
    await this.col.updateOne({ _id: id as never }, { $set: stripUndefined({ ...slide }) });
    return updated;
  }

  async updateOrder(slides: { id: string; slideOrder: number }[]): Promise<void> {
    for (const s of slides) {
      await this.col.updateOne({ _id: s.id as never }, { $set: { slideOrder: s.slideOrder } });
    }
  }

  async toggleDisabled(id: string): Promise<Slide> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Slide not found');
    return this.update(id, { isDisabled: !existing.isDisabled });
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ _id: id as never });
  }

  async deleteByPresentationId(presentationId: string): Promise<void> {
    await this.col.deleteMany({ presentationId });
  }

  async count(presentationId: string): Promise<number> {
    return this.col.countDocuments({ presentationId });
  }
}
