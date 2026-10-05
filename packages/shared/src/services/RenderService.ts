import { Repositories } from '../domain/interfaces/Repositories';
import { Slide, SlideTitle, SlideBlock, isSecondarySlide } from '../domain/entities/Slide';
import { Template, TemplateDefinition } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';
import {
  Presentation,
  OrderedLanguage,
  getOrderedLanguages,
} from '../domain/entities/Presentation';
import { Gitsawe } from '../domain/entities/Gitsawe';
import { RuleDefinition } from '../domain/entities/RuleDefinition';
import { getMergedEnabledSlides } from '../domain/slideFiltering';
import { placeholderService } from './PlaceholderService';
import { ruleEngine } from '../engine';
import { buildContext, BuildContextArgs } from '../engine/contextBuilder';
import { RuleEntry, RuleContext } from '../engine/types';
import { formatEthiopianDate } from '../domain/formatting';

export interface ResolvedReading {
  key: string;
  label: string;
  labelAmh: string;
  ref?: string;
  value: string;
}

export interface ResolvedSection {
  id: string;
  name: string;
  nameAmh?: string;
  startIndex: number;
  endIndex: number;
}

export interface ResolvedSlide {
  id: string;
  order: number;
  sectionId?: string;
  isSecondary: boolean;
  templateId: string;
  title: SlideTitle | null;
  footer: { title: SlideTitle | null; text: SlideBlock | null } | null;
  block: SlideBlock;
}

export interface RenderedContext {
  gregorian: string;
  ethDate: string;
  ethDateLabel: string;
  feast?: string;
  feastAmh?: string;
  dayOfWeek: string;
  isMehella: boolean;
}

export interface RenderResult {
  presentation: { id: string; name: string; amh?: string; type: string; secondaryName?: string };
  context: RenderedContext;
  readings: ResolvedReading[];
  languages: OrderedLanguage[];
  templates: Record<string, TemplateDefinition>;
  sections: ResolvedSection[];
  slides: ResolvedSlide[];
}

export interface RenderArgs {
  presentationId: string;
  /** YYYY-MM-DD; defaults to today when omitted. */
  date?: string;
  isMehella?: boolean;
}

/** Maps Gitsawe record fields to the viewer's info panel. */
const READING_FIELDS: { key: string; field: keyof Gitsawe; label: string; labelAmh: string }[] = [
  { key: 'kidaseType', field: 'kidaseType', label: 'Kidase Type', labelAmh: '' },
  { key: 'pauline', field: 'messageStPaul', label: 'Pauline Epistle', labelAmh: 'መልእክተ ጳውሎስ' },
  { key: 'apostle', field: 'messageApostle', label: 'Catholic Epistle', labelAmh: 'መልእክተ ሐዋርያት' },
  { key: 'acts', field: 'messageBookOfActs', label: 'Acts of the Apostles', labelAmh: 'ግብረ ሐዋርያት' },
  { key: 'misbak', field: 'misbak', label: 'Misbak', labelAmh: 'ምስባክ' },
  { key: 'gospel', field: 'wengel', label: 'Gospel', labelAmh: 'ወንጌል' },
];

interface LoadedSet {
  presentation: Presentation;
  slides: Slide[];
  template: Template | null;
  variables: Variable[];
}

/**
 * Stateless, repo-injected server-side render pipeline. Ports the desktop
 * orchestration (useRules.evaluateRules + useSecondaryKidase + PresentationPage
 * merge + per-slide resolution) into one pure service. Returns display-ready
 * data only — no rules/variables/engine/gitsawe-raw reach the caller.
 */
export class RenderService {
  constructor(private readonly repos: Repositories) {}

  async render(args: RenderArgs): Promise<RenderResult> {
    const primary = await this.loadSet(args.presentationId);
    if (!primary) {
      throw new Error(`Presentation ${args.presentationId} not found`);
    }

    const isMehella = !!args.isMehella;
    const overrideDate = args.date ? new Date(args.date + 'T12:00:00') : undefined;

    // Reference data
    const [allTemplates, allVerses, allGitsawes, enabledRules] = await Promise.all([
      this.repos.template.getAll(),
      this.repos.verse.getAll(),
      this.repos.gitsawe.getAll(),
      this.repos.rule.getEnabled(),
    ]);
    const appSettings = await this.repos.appSettings.get();
    const gitsaweRules = enabledRules.filter(r => r.scope === 'gitsawe');

    // Context + resolved gitsawe
    const baseCtxArgs: Omit<BuildContextArgs, 'slide'> = {
      presentation: primary.presentation,
      variables: primary.variables,
      appSettings,
      gitsawes: allGitsawes,
      gitsaweRules,
      overrideDate,
      extra: { isMehella },
    };
    const context = buildContext(baseCtxArgs);
    const meta = context.meta;

    // Secondary kidase auto-merge (driven by resolved gitsawe.kidaseType)
    const gitsaweMeta = meta.gitsawe as Record<string, unknown> | undefined;
    const kidaseType = gitsaweMeta?.kidaseType as string | undefined;
    let secondary: LoadedSet | null = null;
    if (kidaseType && kidaseType !== primary.presentation.name) {
      const secPres = await this.repos.presentation.getByName(kidaseType);
      if (secPres) {
        secondary = await this.loadSet(secPres.id);
      }
    }

    // Rule evaluation -> hidden slide IDs (primary + secondary)
    const primaryRules = (await this.repos.rule.getByPresentationId(primary.presentation.id))
      .filter(r => r.isEnabled);
    const hiddenIds = new Set<string>();
    this.evaluateRules(primaryRules, primary.slides, baseCtxArgs, hiddenIds);

    if (secondary) {
      const secRules = (await this.repos.rule.getByPresentationId(secondary.presentation.id))
        .filter(r => r.isEnabled);
      const secCtxArgs: Omit<BuildContextArgs, 'slide'> = {
        ...baseCtxArgs,
        presentation: secondary.presentation,
        variables: secondary.variables,
      };
      this.evaluateRules(secRules, secondary.slides, secCtxArgs, hiddenIds);
    }

    const secondarySlides = secondary?.slides ?? [];
    const allSlides = [...primary.slides, ...secondarySlides];
    const ruleFilteredSlideIds = hiddenIds.size > 0
      ? allSlides.filter(s => !hiddenIds.has(s.id)).map(s => s.id)
      : null;

    // Merge + filter + dynamic verse expansion
    const displaySlides = getMergedEnabledSlides(
      primary.slides,
      secondarySlides,
      ruleFilteredSlideIds,
      allVerses,
      meta,
    );

    // Per-slide resolution
    const templates: Record<string, TemplateDefinition> = {};
    const slides: ResolvedSlide[] = displaySlides.map((slide, index) => {
      const isSec = isSecondarySlide(slide, secondarySlides);
      const owner = isSec && secondary ? secondary : primary;
      const variables = owner.variables;

      let template: Template | null;
      if (slide.templateOverrideId) {
        // Desktop falls back to the primary template when the override is missing.
        template = allTemplates.find(t => t.id === slide.templateOverrideId) ?? primary.template;
      } else {
        template = owner.template;
      }
      const templateId = template?.id ?? owner.presentation.templateId;
      if (template && !templates[templateId]) {
        templates[templateId] = template.definitionJson;
      }

      const block = placeholderService.replaceInBlock(slide.blocksJson[0] || {}, variables, meta);
      const title = slide.titleJson
        ? placeholderService.replaceInTitle(slide.titleJson, variables, meta)
        : null;
      const footer = slide.footerJson
        ? {
            title: slide.footerJson.title
              ? placeholderService.replaceInTitle(slide.footerJson.title, variables, meta)
              : null,
            text: slide.footerJson.text
              ? placeholderService.replaceInBlock(slide.footerJson.text, variables, meta)
              : null,
          }
        : null;

      return {
        id: slide.id,
        order: index,
        isSecondary: isSec,
        templateId,
        title,
        footer,
        block,
      };
    });

    return {
      presentation: {
        id: primary.presentation.id,
        name: primary.presentation.name,
        type: primary.presentation.type,
        secondaryName: secondary?.presentation.name,
      },
      context: this.buildRenderedContext(meta, isMehella, gitsaweMeta, overrideDate),
      readings: this.buildReadings(gitsaweMeta),
      languages: getOrderedLanguages(primary.presentation.languageSettings, primary.presentation.languageMap),
      templates,
      sections: [],
      slides,
    };
  }

  private async loadSet(presentationId: string): Promise<LoadedSet | null> {
    const presentation = await this.repos.presentation.getById(presentationId);
    if (!presentation) return null;
    const [slides, template, variables] = await Promise.all([
      this.repos.slide.getByPresentationId(presentationId),
      this.repos.template.getById(presentation.templateId),
      this.repos.variable.getByPresentationId(presentationId),
    ]);
    return { presentation, slides, template, variables };
  }

  private evaluateRules(
    rules: RuleDefinition[],
    slides: Slide[],
    baseCtxArgs: Omit<BuildContextArgs, 'slide'>,
    hiddenIds: Set<string>,
  ): void {
    for (const ruleDef of rules) {
      try {
        const ruleEntry: RuleEntry = JSON.parse(ruleDef.ruleJson);
        if (ruleDef.scope === 'slide') {
          const targets = ruleDef.slideId ? slides.filter(s => s.id === ruleDef.slideId) : slides;
          for (const slide of targets) {
            const ctx: RuleContext = buildContext({ ...baseCtxArgs, slide });
            const result = ruleEngine.evaluateRule(ruleEntry, ctx);
            if (result.outcome.visible === false) hiddenIds.add(slide.id);
          }
        } else {
          const ctx: RuleContext = buildContext(baseCtxArgs);
          ruleEngine.evaluateRule(ruleEntry, ctx);
        }
      } catch {
        // Skip malformed rules (parity with desktop, which logs and continues)
      }
    }
  }

  private buildRenderedContext(
    meta: Record<string, unknown>,
    isMehella: boolean,
    gitsaweMeta: Record<string, unknown> | undefined,
    overrideDate?: Date,
  ): RenderedContext {
    return {
      gregorian: String(meta.date ?? ''),
      ethDate: String(meta.ethDate ?? ''),
      ethDateLabel: formatEthiopianDate(overrideDate ?? new Date()),
      feast: gitsaweMeta?.name as string | undefined,
      feastAmh: gitsaweMeta?.additionalInfo as string | undefined,
      dayOfWeek: String(meta.dayOfWeek ?? ''),
      isMehella,
    };
  }

  private buildReadings(gitsaweMeta: Record<string, unknown> | undefined): ResolvedReading[] {
    if (!gitsaweMeta) return [];
    const readings: ResolvedReading[] = [];
    for (const r of READING_FIELDS) {
      const value = gitsaweMeta[r.field as string];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        readings.push({ key: r.key, label: r.label, labelAmh: r.labelAmh, value: String(value) });
      }
    }
    return readings;
  }
}
