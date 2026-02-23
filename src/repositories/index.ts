import { TemplateRepository } from './sqlite/TemplateRepository';
import { PresentationRepository } from './sqlite/PresentationRepository';
import { SlideRepository } from './sqlite/SlideRepository';
import { VariableRepository } from './sqlite/VariableRepository';
import { AppSettingsRepository } from './sqlite/AppSettingsRepository';
import { RuleRepository } from './sqlite/RuleRepository';
import { GitsaweRepository } from './sqlite/GitsaweRepository';
import { VerseRepository } from './sqlite/VerseRepository';

// Singleton instances
export const templateRepository = new TemplateRepository();
export const presentationRepository = new PresentationRepository();
export const slideRepository = new SlideRepository();
export const variableRepository = new VariableRepository();
export const appSettingsRepository = new AppSettingsRepository();
export const ruleRepository = new RuleRepository();
export const gitsaweRepository = new GitsaweRepository();
export const verseRepository = new VerseRepository();
