import { AppSettings } from '../domain/entities/AppSettings';
import { Template, createDefaultTemplate } from '../domain/entities/Template';
import { Verse } from '../domain/entities/Verse';
import { LoadedPresentation } from './PresentationService';
import {
  templateRepository,
  appSettingsRepository,
  verseRepository,
  presentationRepository,
} from '../repositories';
import { presentationService } from './PresentationService';

export interface BootstrapResult {
  settings: AppSettings;
  templates: Template[];
  verses: Verse[];
  presentation: LoadedPresentation | null;
}

export class AppBootstrapService {
  /**
   * Initialize the application: load settings, ensure default template,
   * load reference data, and auto-load the primary presentation.
   */
  async initialize(): Promise<BootstrapResult> {
    const settings = await appSettingsRepository.get();

    // Ensure default template exists and is up-to-date
    const loadedTemplates = await templateRepository.getAll();
    const defaultDef = createDefaultTemplate();
    const existingDefault = loadedTemplates.find(t => t.name === 'Default Template');

    if (existingDefault) {
      await templateRepository.update(existingDefault.id, {
        definitionJson: defaultDef,
      });
    } else {
      await templateRepository.create({
        name: 'Default Template',
        maxLangCount: 4,
        definitionJson: defaultDef,
      });
    }

    const templates = await templateRepository.getAll();
    const verses = await verseRepository.getAll();

    // Auto-load primary presentation (fall back to active)
    let presentation: LoadedPresentation | null = null;
    const primary = await presentationRepository.getPrimary();
    const toLoad = primary ?? await presentationRepository.getActive();
    if (toLoad) {
      try {
        presentation = await presentationService.loadPresentation(toLoad.id);
      } catch (error) {
        console.error('Failed to load presentation:', error);
      }
    }

    return { settings, templates, verses, presentation };
  }
}

export const appBootstrapService = new AppBootstrapService();
