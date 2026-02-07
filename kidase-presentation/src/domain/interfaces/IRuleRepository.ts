import { RuleDefinition, RuleScope } from '../entities/RuleDefinition';

export interface IRuleRepository {
  getById(id: string): Promise<RuleDefinition | null>;
  getByScope(scope: RuleScope, scopeId?: string): Promise<RuleDefinition[]>;
  getByPresentationId(presentationId: string): Promise<RuleDefinition[]>;
  getBySlideId(slideId: string): Promise<RuleDefinition[]>;
  getByGitsaweId(gitsaweId: string): Promise<RuleDefinition[]>;
  getEnabled(): Promise<RuleDefinition[]>;
  create(rule: Omit<RuleDefinition, 'id' | 'createdAt'>): Promise<RuleDefinition>;
  update(id: string, rule: Partial<Omit<RuleDefinition, 'id' | 'createdAt'>>): Promise<RuleDefinition>;
  toggleEnabled(id: string): Promise<RuleDefinition>;
  delete(id: string): Promise<void>;
  deleteByPresentationId(presentationId: string): Promise<void>;
  deleteBySlideId(slideId: string): Promise<void>;
  deleteByGitsaweId(gitsaweId: string): Promise<void>;
}
