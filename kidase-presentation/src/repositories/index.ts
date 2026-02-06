import { TemplateRepository } from './sqlite/TemplateRepository';
import { PresentationRepository } from './sqlite/PresentationRepository';
import { SlideRepository } from './sqlite/SlideRepository';
import { VariableRepository } from './sqlite/VariableRepository';
import { AppSettingsRepository } from './sqlite/AppSettingsRepository';
import { RuleRepository } from './sqlite/RuleRepository';

// Export interfaces
export type { ITemplateRepository } from '../domain/interfaces/ITemplateRepository';
export type { IPresentationRepository } from '../domain/interfaces/IPresentationRepository';
export type { ISlideRepository } from '../domain/interfaces/ISlideRepository';
export type { IVariableRepository } from '../domain/interfaces/IVariableRepository';
export type { IRuleRepository } from '../domain/interfaces/IRuleRepository';

// Singleton instances
export const templateRepository = new TemplateRepository();
export const presentationRepository = new PresentationRepository();
export const slideRepository = new SlideRepository();
export const variableRepository = new VariableRepository();
export const appSettingsRepository = new AppSettingsRepository();
export const ruleRepository = new RuleRepository();

// Export classes for testing/mocking
export { TemplateRepository, PresentationRepository, SlideRepository, VariableRepository, AppSettingsRepository, RuleRepository };
