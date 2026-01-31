import { Presentation } from '../entities/Presentation';

/**
 * IPresentationRepository Interface
 * Defines the contract for presentation data access
 */

export interface IPresentationRepository {
  getAll(): Promise<Presentation[]>;
  getById(id: string): Promise<Presentation | null>;
  getByName(name: string): Promise<Presentation | null>;
  getActive(): Promise<Presentation | null>;
  setActive(id: string): Promise<void>;
  clearActive(): Promise<void>;
  getByTemplateId(templateId: string): Promise<Presentation[]>;
  create(presentation: Omit<Presentation, 'id' | 'createdAt'>): Promise<Presentation>;
  update(id: string, presentation: Partial<Omit<Presentation, 'id' | 'createdAt'>>): Promise<Presentation>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
