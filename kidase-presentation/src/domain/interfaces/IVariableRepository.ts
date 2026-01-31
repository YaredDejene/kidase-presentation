import { Variable } from '../entities/Variable';

/**
 * IVariableRepository Interface
 * Defines the contract for variable data access
 */

export interface IVariableRepository {
  getByPresentationId(presentationId: string): Promise<Variable[]>;
  getById(id: string): Promise<Variable | null>;
  getByName(presentationId: string, name: string): Promise<Variable | null>;
  create(variable: Omit<Variable, 'id'>): Promise<Variable>;
  createMany(variables: Omit<Variable, 'id'>[]): Promise<Variable[]>;
  update(id: string, variable: Partial<Omit<Variable, 'id' | 'presentationId'>>): Promise<Variable>;
  upsert(presentationId: string, name: string, value: string): Promise<Variable>;
  delete(id: string): Promise<void>;
  deleteByPresentationId(presentationId: string): Promise<void>;
  deleteByName(presentationId: string, name: string): Promise<void>;
}
