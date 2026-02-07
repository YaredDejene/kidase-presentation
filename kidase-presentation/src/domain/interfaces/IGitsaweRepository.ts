import { Gitsawe } from '../entities/Gitsawe';

export interface IGitsaweRepository {
  getAll(): Promise<Gitsawe[]>;
  getById(id: string): Promise<Gitsawe | null>;
  getByLineId(lineId: string): Promise<Gitsawe | null>;
  getByPriority(priority: number): Promise<Gitsawe[]>;
  getByGitsaweType(gitsaweType: string): Promise<Gitsawe[]>;
  create(gitsawe: Omit<Gitsawe, 'id' | 'createdAt'>): Promise<Gitsawe>;
  createMany(gitsawes: Omit<Gitsawe, 'id' | 'createdAt'>[]): Promise<Gitsawe[]>;
  update(id: string, gitsawe: Partial<Omit<Gitsawe, 'id' | 'createdAt'>>): Promise<Gitsawe>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
