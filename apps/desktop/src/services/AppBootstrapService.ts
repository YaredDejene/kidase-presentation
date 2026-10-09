import { AppSettings } from '@kidase/shared/domain/entities/AppSettings';
import { Template, TemplateDefinition } from '@kidase/shared/domain/entities/Template';
import { Verse } from '@kidase/shared/domain/entities/Verse';
import type { LoadedPresentation, PresentationService } from '@kidase/shared';
import {
  templateRepository,
  appSettingsRepository,
  verseRepository,
  presentationRepository,
} from '../repositories';
import templateSeeds from '@kidase/shared/data/template-seeds.json';

export interface BootstrapResult {
  settings: AppSettings;
  templates: Template[];
  verses: Verse[];
  presentation: LoadedPresentation | null;
}

export class AppBootstrapService {
  private initPromise: Promise<BootstrapResult> | null = null;

  constructor(private readonly presentationService: PresentationService) {}

  /**
   * Initialize the application: load settings, ensure default template,
   * load reference data, and auto-load the primary presentation.
   * Guarded against concurrent calls (e.g. React StrictMode double-effect).
   */
  async initialize(): Promise<BootstrapResult> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<BootstrapResult> {
    const settings = await appSettingsRepository.get();

    // Seed templates: insert if missing, update definition if seed changed
    for (const seed of templateSeeds) {
      const existing = await templateRepository.getByName(seed.name);
      if (!existing) {
        await templateRepository.create({
          name: seed.name,
          maxLangCount: seed.maxLangCount,
          definitionJson: seed.definitionJson as unknown as TemplateDefinition,
        });
      } else {
        // Update definition if the seed has changed
        const seedDef = JSON.stringify(seed.definitionJson);
        const existingDef = JSON.stringify(existing.definitionJson);
        if (seedDef !== existingDef) {
          await templateRepository.update(existing.id, {
            maxLangCount: seed.maxLangCount,
            definitionJson: seed.definitionJson as unknown as TemplateDefinition,
          });
        }
      }
    }

    const templates = await templateRepository.getAll();
    const verses = await verseRepository.getAll();

    // Auto-load primary presentation (fall back to active)
    let presentation: LoadedPresentation | null = null;
    const primary = await presentationRepository.getPrimary();
    const toLoad = primary ?? await presentationRepository.getActive();
    if (toLoad) {
      try {
        presentation = await this.presentationService.loadPresentation(toLoad.id);
      } catch (error) {
        console.error('Failed to load presentation:', error);
      }
    }

    return { settings, templates, verses, presentation };
  }
}
