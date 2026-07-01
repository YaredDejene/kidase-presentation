import { ITemplateRepository } from './ITemplateRepository';
import { IPresentationRepository } from './IPresentationRepository';
import { ISlideRepository } from './ISlideRepository';
import { IVariableRepository } from './IVariableRepository';
import { IRuleRepository } from './IRuleRepository';
import { IGitsaweRepository } from './IGitsaweRepository';
import { IVerseRepository } from './IVerseRepository';
import { IAppSettingsRepository } from './IAppSettingsRepository';

/**
 * Container of all repository interfaces. Services depend on this container
 * (constructor injection) rather than concrete repository implementations,
 * so the desktop app can wire SQLite repos and the backend can wire Mongo
 * repos against the same shared services.
 */
export interface Repositories {
  template: ITemplateRepository;
  presentation: IPresentationRepository;
  slide: ISlideRepository;
  variable: IVariableRepository;
  rule: IRuleRepository;
  gitsawe: IGitsaweRepository;
  verse: IVerseRepository;
  appSettings: IAppSettingsRepository;
}
