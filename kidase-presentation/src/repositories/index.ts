import { TemplateRepository } from './sqlite/TemplateRepository';
import { PresentationRepository } from './sqlite/PresentationRepository';
import { SlideRepository } from './sqlite/SlideRepository';
import { VariableRepository } from './sqlite/VariableRepository';
import { AppSettingsRepository } from './sqlite/AppSettingsRepository';
import { RuleRepository } from './sqlite/RuleRepository';
import { GitsaweRepository } from './sqlite/GitsaweRepository';
import { VerseRepository } from './sqlite/VerseRepository';

// Export interfaces
export type { ITemplateRepository } from '../domain/interfaces/ITemplateRepository';
export type { IPresentationRepository } from '../domain/interfaces/IPresentationRepository';
export type { ISlideRepository } from '../domain/interfaces/ISlideRepository';
export type { IVariableRepository } from '../domain/interfaces/IVariableRepository';
export type { IRuleRepository } from '../domain/interfaces/IRuleRepository';
export type { IGitsaweRepository } from '../domain/interfaces/IGitsaweRepository';
export type { IVerseRepository } from '../domain/interfaces/IVerseRepository';

// Singleton instances
export const templateRepository = new TemplateRepository();
export const presentationRepository = new PresentationRepository();
export const slideRepository = new SlideRepository();
export const variableRepository = new VariableRepository();
export const appSettingsRepository = new AppSettingsRepository();
export const ruleRepository = new RuleRepository();
export const gitsaweRepository = new GitsaweRepository();
export const verseRepository = new VerseRepository();

// Export classes for testing/mocking
export { TemplateRepository, PresentationRepository, SlideRepository, VariableRepository, AppSettingsRepository, RuleRepository, GitsaweRepository, VerseRepository };
