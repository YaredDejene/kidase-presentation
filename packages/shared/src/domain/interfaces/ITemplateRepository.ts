import { Template } from '../entities/Template';

/**
 * ITemplateRepository Interface
 * Defines the contract for template data access
 */

export interface ITemplateRepository {
  getAll(): Promise<Template[]>;
  getById(id: string): Promise<Template | null>;
  getByName(name: string): Promise<Template | null>;
  create(template: Omit<Template, 'id' | 'createdAt'>): Promise<Template>;
  update(id: string, template: Partial<Omit<Template, 'id' | 'createdAt'>>): Promise<Template>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
