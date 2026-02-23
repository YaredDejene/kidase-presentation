import { Presentation } from '../domain/entities/Presentation';
import { Slide } from '../domain/entities/Slide';
import { Template, TemplateDefinition } from '../domain/entities/Template';
import templateSeeds from '../data/template-seeds.json';
import { Variable } from '../domain/entities/Variable';
import {
  presentationRepository,
  slideRepository,
  templateRepository,
  variableRepository,
  ruleRepository,
} from '../repositories';
import { createRuleDefinition } from '../domain/entities/RuleDefinition';
import { excelImportService, ImportResult } from './ExcelImportService';

export interface LoadedPresentation {
  presentation: Presentation;
  slides: Slide[];
  template: Template;
  variables: Variable[];
}

export class PresentationService {
  /**
   * Load a complete presentation with all related data
   */
  async loadPresentation(id: string): Promise<LoadedPresentation | null> {
    const presentation = await presentationRepository.getById(id);
    if (!presentation) return null;

    const [slides, template, variables] = await Promise.all([
      slideRepository.getByPresentationId(id),
      templateRepository.getById(presentation.templateId),
      variableRepository.getByPresentationId(id),
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
    const presentation = await presentationRepository.create({
      name,
      type,
      templateId,
      languageMap,
      isPrimary: true,
      isActive: false,
    });

    const template = await templateRepository.getById(templateId);
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
    const result = await excelImportService.importFromFile(file, templateId);
    return this.saveImportResult(result);
  }

  private async saveImportResult(result: ImportResult): Promise<LoadedPresentation> {
    // Create presentation
    const presentation = await presentationRepository.create(result.presentation);

    // Create slides with presentation ID
    const slidesWithId = result.slides.map(s => ({
      ...s,
      presentationId: presentation.id,
    }));
    const slides = await slideRepository.createMany(slidesWithId);

    // Create variables with presentation ID
    const variablesWithId = result.variables.map(v => ({
      ...v,
      presentationId: presentation.id,
    }));
    const variables = await variableRepository.createMany(variablesWithId);

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
        await ruleRepository.create(ruleDef);
      }
    }

    // Get template
    const template = await templateRepository.getById(presentation.templateId);
    if (!template) {
      throw new Error(`Template ${presentation.templateId} not found`);
    }

    return { presentation, slides, template, variables };
  }

  /**
   * Import presentation from an Excel file path (Tauri filesystem).
   * Creates the presentation, slides, variables, and display rules.
   * Does NOT import gitsawe or verse records.
   */
  async importFromPath(
    filePath: string,
    templateId: string,
  ): Promise<LoadedPresentation> {
    const result = await excelImportService.importFromPath(filePath, templateId);
    return this.saveImportResult(result);
  }

  /**
   * Delete a presentation and all related data
   */
  async deletePresentation(id: string): Promise<void> {
    await Promise.all([
      slideRepository.deleteByPresentationId(id),
      variableRepository.deleteByPresentationId(id),
      ruleRepository.deleteByPresentationId(id),
    ]);
    await presentationRepository.delete(id);
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
    const presentation = await presentationRepository.create({
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
    const slides = await slideRepository.createMany(slidesWithNewId);

    // Duplicate variables
    const variablesWithNewId = original.variables.map(v => ({
      presentationId: presentation.id,
      name: v.name,
      value: v.value,
    }));
    const variables = await variableRepository.createMany(variablesWithNewId);

    // Duplicate rules with remapped slideIds
    const originalRules = await ruleRepository.getByPresentationId(id);
    for (const rule of originalRules) {
      let newSlideId = rule.slideId;
      if (rule.slideId) {
        const oldSlideIndex = original.slides.findIndex(s => s.id === rule.slideId);
        if (oldSlideIndex >= 0 && oldSlideIndex < slides.length) {
          newSlideId = slides[oldSlideIndex].id;
        }
      }
      await ruleRepository.create({
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
    const templates = await templateRepository.getAll();

    if (templates.length === 0) {
      const seed = templateSeeds[0];
      return templateRepository.create({
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
    const presentations = await presentationRepository.getAll();
    const usedBy = presentations.filter(p => p.templateId === templateId);
    return { canDelete: usedBy.length === 0, usedByCount: usedBy.length };
  }

  /**
   * List all presentations with their slide counts
   */
  async listPresentationsWithCount(): Promise<{ presentation: Presentation; slideCount: number }[]> {
    const presentations = await presentationRepository.getAll();
    return Promise.all(
      presentations.map(async (presentation) => ({
        presentation,
        slideCount: await slideRepository.count(presentation.id),
      }))
    );
  }

  /**
   * Set a presentation as active
   */
  async setActivePresentation(id: string): Promise<void> {
    await presentationRepository.setActive(id);
  }

  /**
   * Get the currently active presentation
   */
  async getActivePresentation(): Promise<LoadedPresentation | null> {
    const active = await presentationRepository.getActive();
    if (!active) return null;
    return this.loadPresentation(active.id);
  }
}

export const presentationService = new PresentationService();
