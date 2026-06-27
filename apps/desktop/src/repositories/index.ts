import { TemplateRepository } from './sqlite/TemplateRepository';
import { PresentationRepository } from './sqlite/PresentationRepository';
import { SlideRepository } from './sqlite/SlideRepository';
import { VariableRepository } from './sqlite/VariableRepository';
import { AppSettingsRepository } from './sqlite/AppSettingsRepository';
import { RuleRepository } from './sqlite/RuleRepository';
import { GitsaweRepository } from './sqlite/GitsaweRepository';
import { VerseRepository } from './sqlite/VerseRepository';
import type { Repositories } from '@kidase/shared';

// Singleton instances
export const templateRepository = new TemplateRepository();
export const presentationRepository = new PresentationRepository();
export const slideRepository = new SlideRepository();
export const variableRepository = new VariableRepository();
export const appSettingsRepository = new AppSettingsRepository();
export const ruleRepository = new RuleRepository();
export const gitsaweRepository = new GitsaweRepository();
export const verseRepository = new VerseRepository();

/**
 * Repository container wired with the SQLite implementations. Shared services
 * receive this (constructor injection) instead of importing concrete repos.
 */
export const repositories: Repositories = {
  template: templateRepository,
  presentation: presentationRepository,
  slide: slideRepository,
  variable: variableRepository,
  rule: ruleRepository,
  gitsawe: gitsaweRepository,
  verse: verseRepository,
  appSettings: appSettingsRepository,
};
