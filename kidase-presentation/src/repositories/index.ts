import { TemplateRepository } from './sqlite/TemplateRepository';
import { PresentationRepository } from './sqlite/PresentationRepository';
import { SlideRepository } from './sqlite/SlideRepository';
import { VariableRepository } from './sqlite/VariableRepository';
import { AppSettingsRepository } from './sqlite/AppSettingsRepository';

// Export interfaces
export type { ITemplateRepository } from '../domain/interfaces/ITemplateRepository';
export type { IPresentationRepository } from '../domain/interfaces/IPresentationRepository';
export type { ISlideRepository } from '../domain/interfaces/ISlideRepository';
export type { IVariableRepository } from '../domain/interfaces/IVariableRepository';

// Singleton instances
export const templateRepository = new TemplateRepository();
export const presentationRepository = new PresentationRepository();
export const slideRepository = new SlideRepository();
export const variableRepository = new VariableRepository();
export const appSettingsRepository = new AppSettingsRepository();

// Export classes for testing/mocking
export { TemplateRepository, PresentationRepository, SlideRepository, VariableRepository, AppSettingsRepository };
