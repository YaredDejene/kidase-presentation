import { Presentation } from '../domain/entities/Presentation';
import { Slide } from '../domain/entities/Slide';
import { Template, TemplateDefinition } from '../domain/entities/Template';
import templateSeeds from '../data/template-seeds.json';
import { Variable } from '../domain/entities/Variable';
import { Repositories } from '../domain/interfaces/Repositories';
import { createRuleDefinition } from '../domain/entities/RuleDefinition';
import { ExcelImportService, ImportResult } from './ExcelImportService';

export interface LoadedPresentation {
  presentation: Presentation;
  slides: Slide[];
  template: Template;
  variables: Variable[];
}

export interface ImportConflict {
  existingPresentation: Presentation;
  importResult: ImportResult;
}

export type ImportOutcome =
  | { status: 'created'; loaded: LoadedPresentation }
  | { status: 'conflict'; conflict: ImportConflict };

export class PresentationService {
  constructor(
    protected readonly repos: Repositories,
    protected readonly excel: ExcelImportService,
  ) {}

  /**
   * Load a complete presentation with all related data
   */
  async loadPresentation(id: string): Promise<LoadedPresentation | null> {
    const presentation = await this.repos.presentation.getById(id);
    if (!presentation) return null;

    const [slides, template, variables] = await Promise.all([
      this.repos.slide.getByPresentationId(id),
      this.repos.template.getById(presentation.templateId),
      this.repos.variable.getByPresentationId(id),
    ]);

    if (!template) {
      throw new Error(`Template ${presentation.templateId} not found`);
    }

    return { presentation, slides, template, variables };
  }

  /**
   * Create a new empty presentation
   */
  async createPresentation(
    name: string,
    type: string,
    templateId: string,
    languageMap: Presentation['languageMap']
  ): Promise<LoadedPresentation> {
    const presentation = await this.repos.presentation.create({
      name,
      type,
      templateId,
      languageMap,
      isPrimary: true,
      isActive: false,
    });

    const template = await this.repos.template.getById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return {
      presentation,
      slides: [],
      template,
      variables: [],
    };
  }

  /**
   * Import presentation from Excel file
   */
  async importFromExcel(
    file: File,
    templateId: string
  ): Promise<LoadedPresentation> {
    const result = await this.excel.importFromFile(file, templateId);
    return this.saveImportResult(result);
  }

  /**
   * Import presentation from a raw Excel ArrayBuffer (runtime-agnostic).
   * Creates the presentation, slides, variables, and display rules.
   */
  async importFromArrayBuffer(
    buffer: ArrayBuffer,
    templateId: string,
  ): Promise<LoadedPresentation> {
    const result = await this.excel.importFromArrayBuffer(buffer, templateId);
    return this.saveImportResult(result);
  }

  private async saveImportResult(result: ImportResult): Promise<LoadedPresentation> {
    // Create presentation
    const presentation = await this.repos.presentation.create(result.presentation);

    // Create slides with presentation ID
    const slidesWithId = result.slides.map(s => ({
      ...s,
      presentationId: presentation.id,
    }));
    const slides = await this.repos.slide.createMany(slidesWithId);

    // Create variables with presentation ID
    const variablesWithId = result.variables.map(v => ({
      ...v,
      presentationId: presentation.id,
    }));
    const variables = await this.repos.variable.createMany(variablesWithId);

    // Create display rules linked to slides
    if (result.displayRules.length > 0) {
      for (const displayRule of result.displayRules) {
        const slide = slides[displayRule.slideIndex];
        if (!slide) continue;

        const ruleDef = createRuleDefinition(
          displayRule.name,
          'slide',
          displayRule.ruleJson,
          {
            presentationId: presentation.id,
            slideId: slide.id,
            isEnabled: true,
          }
        );
        await this.repos.rule.create(ruleDef);
      }
    }

    // Get template
    const template = await this.repos.template.getById(presentation.templateId);
    if (!template) {
      throw new Error(`Template ${presentation.templateId} not found`);
    }

    return { presentation, slides, template, variables };
  }

  /**
   * Parse an Excel ArrayBuffer and check for name conflicts before saving.
   * Returns 'conflict' if a presentation with the same name exists,
   * otherwise saves and returns 'created'.
   */
  async prepareImportFromArrayBuffer(
    buffer: ArrayBuffer,
    templateId: string,
    onProgress?: (current: number, total: number) => void,
  ): Promise<ImportOutcome> {
    const result = await this.excel.importFromArrayBuffer(buffer, templateId, onProgress);

    const existing = await this.repos.presentation.getByName(result.presentation.name);
    if (existing) {
      return { status: 'conflict', conflict: { existingPresentation: existing, importResult: result } };
    }

    const loaded = await this.saveImportResult(result);
    return { status: 'created', loaded };
  }

  /**
   * Replace an existing presentation's data with new import data.
   * Preserves the presentation ID and createdAt.
   */
  async replacePresentation(
    existingId: string,
    importResult: ImportResult
  ): Promise<LoadedPresentation> {
    // Delete old child data
    await Promise.all([
      this.repos.slide.deleteByPresentationId(existingId),
      this.repos.variable.deleteByPresentationId(existingId),
      this.repos.rule.deleteByPresentationId(existingId),
    ]);

    // Update existing presentation metadata
    const updated = await this.repos.presentation.update(existingId, {
      name: importResult.presentation.name,
      type: importResult.presentation.type,
      templateId: importResult.presentation.templateId,
      languageMap: importResult.presentation.languageMap,
      isPrimary: importResult.presentation.isPrimary,
    });

    // Create new slides
    const slidesWithId = importResult.slides.map(s => ({
      ...s,
      presentationId: existingId,
    }));
    const slides = await this.repos.slide.createMany(slidesWithId);

    // Create new variables
    const variablesWithId = importResult.variables.map(v => ({
      ...v,
      presentationId: existingId,
    }));
    const variables = await this.repos.variable.createMany(variablesWithId);

    // Create display rules
    for (const displayRule of importResult.displayRules) {
      const slide = slides[displayRule.slideIndex];
      if (!slide) continue;
      const ruleDef = createRuleDefinition(
        displayRule.name, 'slide', displayRule.ruleJson,
        { presentationId: existingId, slideId: slide.id, isEnabled: true }
      );
      await this.repos.rule.create(ruleDef);
    }

    const template = await this.repos.template.getById(updated.templateId);
    if (!template) throw new Error(`Template ${updated.templateId} not found`);

    return { presentation: updated, slides, template, variables };
  }

  /**
   * Delete a presentation and all related data
   */
  async deletePresentation(id: string): Promise<void> {
    await Promise.all([
      this.repos.slide.deleteByPresentationId(id),
      this.repos.variable.deleteByPresentationId(id),
      this.repos.rule.deleteByPresentationId(id),
    ]);
    await this.repos.presentation.delete(id);
  }

  /**
   * Duplicate a presentation
   */
  async duplicatePresentation(id: string, newName: string): Promise<LoadedPresentation> {
    const original = await this.loadPresentation(id);
    if (!original) {
      throw new Error('Presentation not found');
    }

    // Create new presentation
    const presentation = await this.repos.presentation.create({
      name: newName,
      type: original.presentation.type,
      templateId: original.presentation.templateId,
      languageMap: original.presentation.languageMap,
      isPrimary: original.presentation.isPrimary,
      isActive: false,
    });

    // Duplicate slides
    const slidesWithNewId = original.slides.map(s => ({
      presentationId: presentation.id,
      slideOrder: s.slideOrder,
      lineId: s.lineId,
      titleJson: s.titleJson,
      blocksJson: s.blocksJson,
      notes: s.notes,
      isDisabled: s.isDisabled,
      isDynamic: s.isDynamic,
    }));
    const slides = await this.repos.slide.createMany(slidesWithNewId);

    // Duplicate variables
    const variablesWithNewId = original.variables.map(v => ({
      presentationId: presentation.id,
      name: v.name,
      value: v.value,
    }));
    const variables = await this.repos.variable.createMany(variablesWithNewId);

    // Duplicate rules with remapped slideIds
    const originalRules = await this.repos.rule.getByPresentationId(id);
    for (const rule of originalRules) {
      let newSlideId = rule.slideId;
      if (rule.slideId) {
        const oldSlideIndex = original.slides.findIndex(s => s.id === rule.slideId);
        if (oldSlideIndex >= 0 && oldSlideIndex < slides.length) {
          newSlideId = slides[oldSlideIndex].id;
        }
      }
      await this.repos.rule.create({
        name: rule.name,
        scope: rule.scope,
        presentationId: presentation.id,
        slideId: newSlideId,
        ruleJson: rule.ruleJson,
        isEnabled: rule.isEnabled,
      });
    }

    return {
      presentation,
      slides,
      template: original.template,
      variables,
    };
  }

  /**
   * Ensure a default template exists
   */
  async ensureDefaultTemplate(): Promise<Template> {
    const templates = await this.repos.template.getAll();

    if (templates.length === 0) {
      const seed = templateSeeds[0];
      return this.repos.template.create({
        name: seed.name,
        maxLangCount: seed.maxLangCount,
        definitionJson: seed.definitionJson as TemplateDefinition,
      });
    }

    return templates[0];
  }

  /**
   * Check if a template can be deleted (not referenced by any presentation)
   */
  async canDeleteTemplate(templateId: string): Promise<{ canDelete: boolean; usedByCount: number }> {
    const presentations = await this.repos.presentation.getAll();
    const usedBy = presentations.filter(p => p.templateId === templateId);
    return { canDelete: usedBy.length === 0, usedByCount: usedBy.length };
  }

  /**
   * List all presentations with their slide counts
   */
  async listPresentationsWithCount(): Promise<{ presentation: Presentation; slideCount: number }[]> {
    const presentations = await this.repos.presentation.getAll();
    return Promise.all(
      presentations.map(async (presentation) => ({
        presentation,
        slideCount: await this.repos.slide.count(presentation.id),
      }))
    );
  }

  /**
   * Set a presentation as active
   */
  async setActivePresentation(id: string): Promise<void> {
    await this.repos.presentation.setActive(id);
  }

  /**
   * Get the currently active presentation
   */
  async getActivePresentation(): Promise<LoadedPresentation | null> {
    const active = await this.repos.presentation.getActive();
    if (!active) return null;
    return this.loadPresentation(active.id);
  }
}
