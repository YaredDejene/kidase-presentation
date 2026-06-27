import { Slide } from '../entities/Slide';

/**
 * ISlideRepository Interface
 * Defines the contract for slide data access
 */

export interface ISlideRepository {
  getByPresentationId(presentationId: string): Promise<Slide[]>;
  getById(id: string): Promise<Slide | null>;
  getByLineId(presentationId: string, lineId: string): Promise<Slide | null>;
  getEnabledByPresentationId(presentationId: string): Promise<Slide[]>;
  create(slide: Omit<Slide, 'id'>): Promise<Slide>;
  createMany(slides: Omit<Slide, 'id'>[]): Promise<Slide[]>;
  update(id: string, slide: Partial<Omit<Slide, 'id' | 'presentationId'>>): Promise<Slide>;
  updateOrder(slides: { id: string; slideOrder: number }[]): Promise<void>;
  toggleDisabled(id: string): Promise<Slide>;
  delete(id: string): Promise<void>;
  deleteByPresentationId(presentationId: string): Promise<void>;
  count(presentationId: string): Promise<number>;
}
