import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Presentation } from '../domain/entities/Presentation';
import { Slide } from '../domain/entities/Slide';
import { Template } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';
import { AppSettings, defaultAppSettings } from '../domain/entities/AppSettings';
import { Verse } from '../domain/entities/Verse';
import { placeholderService } from '../services/PlaceholderService';

interface AppState {
  // Current (primary) presentation data
  currentPresentation: Presentation | null;
  currentSlides: Slide[];
  currentTemplate: Template | null;
  currentVariables: Variable[];
  allTemplates: Template[];

  // Secondary presentation data (auto-loaded based on gitsawe.kidaseType)
  secondaryPresentation: Presentation | null;
  secondarySlides: Slide[];
  secondaryTemplate: Template | null;
  secondaryVariables: Variable[];

  // Reference data
  verses: Verse[];

  // App settings
  appSettings: AppSettings;

  // Presentation mode state
  isPresenting: boolean;
  currentSlideIndex: number;

  // Rule engine state
  ruleFilteredSlideIds: string[] | null; // null = no filtering, array = only these IDs visible
  ruleEvaluationDate: string | null; // null = use today, ISO string = override date for rule evaluation
  isMehella: boolean; // runtime flag added to rule context meta
  ruleContextMeta: Record<string, unknown> | null; // meta context from last rule evaluation

  // Navigation state
  currentView: 'presentation' | 'editor' | 'kidases' | 'gitsawe' | 'verses' | 'templates' | 'settings';

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions - Setters
  setCurrentPresentation: (presentation: Presentation | null) => void;
  setCurrentSlides: (slides: Slide[]) => void;
  setCurrentTemplate: (template: Template | null) => void;
  setCurrentVariables: (variables: Variable[]) => void;
  setVerses: (verses: Verse[]) => void;
  setAppSettings: (settings: AppSettings) => void;
  setRuleFilteredSlideIds: (ids: string[] | null) => void;
  setRuleEvaluationDate: (date: string | null) => void;
  setIsMehella: (value: boolean) => void;
  setRuleContextMeta: (meta: Record<string, unknown> | null) => void;
  setAllTemplates: (templates: Template[]) => void;
  setCurrentView: (view: 'presentation' | 'editor' | 'kidases' | 'gitsawe' | 'verses' | 'templates' | 'settings') => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Load all presentation data at once
  loadPresentationData: (data: {
    presentation: Presentation;
    slides: Slide[];
    template: Template;
    variables: Variable[];
  }) => void;
  clearPresentationData: () => void;

  // Secondary presentation actions
  loadSecondaryData: (data: {
    presentation: Presentation;
    slides: Slide[];
    template: Template;
    variables: Variable[];
  }) => void;
  clearSecondaryData: () => void;

  // Presentation mode controls
  startPresentation: () => void;
  stopPresentation: () => void;
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (index: number) => void;

  // Slide manipulation
  updateSlide: (id: string, updates: Partial<Slide>) => void;
  addSlide: (slide: Slide) => void;
  removeSlide: (id: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  toggleSlideDisabled: (id: string) => void;
  setSlideTemplateOverride: (slideId: string, templateId: string | null) => void;

  // Per-slide resolution (handles primary vs secondary)
  getTemplateForSlide: (slide: Slide) => Template | null;
  getVariablesForSlide: (slide: Slide) => Variable[];
  getLanguageMapForSlide: (slide: Slide) => Presentation['languageMap'];
  getLanguageSettingsForSlide: (slide: Slide) => Presentation['languageSettings'];

  // Computed getters
  expandDynamicSlides: (slides: Slide[]) => Slide[];
  getEnabledSlides: () => Slide[];
  getMergedEnabledSlides: () => Slide[];
  getExpandedSlides: () => Slide[];
  getCurrentSlide: () => Slide | null;
  getSlideCount: () => number;
  getEnabledSlideCount: () => number;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentPresentation: null,
    currentSlides: [],
    currentTemplate: null,
    currentVariables: [],
    allTemplates: [],
    secondaryPresentation: null,
    secondarySlides: [],
    secondaryTemplate: null,
    secondaryVariables: [],
    verses: [],
    appSettings: defaultAppSettings,
    ruleFilteredSlideIds: null,
    ruleEvaluationDate: null,
    isMehella: false,
    ruleContextMeta: null,
    isPresenting: false,
    currentSlideIndex: 0,
    currentView: 'presentation',
    isLoading: false,
    error: null,

    // Setters
    setCurrentPresentation: (presentation) => set({ currentPresentation: presentation }),
    setCurrentSlides: (slides) => set({ currentSlides: slides }),
    setCurrentTemplate: (template) => set({ currentTemplate: template }),
    setCurrentVariables: (variables) => set({ currentVariables: variables }),
    setVerses: (verses) => set({ verses }),
    setAppSettings: (settings) => set({ appSettings: settings }),
    setRuleFilteredSlideIds: (ids) => set({ ruleFilteredSlideIds: ids }),
    setRuleEvaluationDate: (date) => set({ ruleEvaluationDate: date }),
    setIsMehella: (value) => set({ isMehella: value }),
    setRuleContextMeta: (meta) => set({ ruleContextMeta: meta }),
    setAllTemplates: (templates) => set({ allTemplates: templates }),
    setCurrentView: (view) => set({ currentView: view }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    // Load all presentation data at once
    loadPresentationData: (data) => set({
      currentPresentation: data.presentation,
      currentSlides: data.slides,
      currentTemplate: data.template,
      currentVariables: data.variables,
      error: null,
    }),

    clearPresentationData: () => set({
      currentPresentation: null,
      currentSlides: [],
      currentTemplate: null,
      currentVariables: [],
      secondaryPresentation: null,
      secondarySlides: [],
      secondaryTemplate: null,
      secondaryVariables: [],
      ruleFilteredSlideIds: null,
      ruleEvaluationDate: null,
      isMehella: false,
      ruleContextMeta: null,
      isPresenting: false,
      currentSlideIndex: 0,
    }),

    // Secondary presentation data
    loadSecondaryData: (data) => set({
      secondaryPresentation: data.presentation,
      secondarySlides: data.slides,
      secondaryTemplate: data.template,
      secondaryVariables: data.variables,
    }),

    clearSecondaryData: () => set({
      secondaryPresentation: null,
      secondarySlides: [],
      secondaryTemplate: null,
      secondaryVariables: [],
    }),

    // Presentation mode controls
    startPresentation: () => {
      const slides = get().getMergedEnabledSlides();
      if (slides.length > 0) {
        set({ isPresenting: true, currentSlideIndex: 0 });
        document.documentElement.requestFullscreen?.().catch(() => {
          // Fullscreen request may fail, but we can still present
        });
      }
    },

    stopPresentation: () => {
      set({ isPresenting: false, currentSlideIndex: 0 });
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    },

    nextSlide: () => {
      const { currentSlideIndex } = get();
      const enabledSlides = get().getMergedEnabledSlides();
      if (currentSlideIndex < enabledSlides.length - 1) {
        set({ currentSlideIndex: currentSlideIndex + 1 });
      }
    },

    previousSlide: () => {
      const { currentSlideIndex } = get();
      if (currentSlideIndex > 0) {
        set({ currentSlideIndex: currentSlideIndex - 1 });
      }
    },

    goToSlide: (index) => {
      const enabledSlides = get().getMergedEnabledSlides();
      if (index >= 0 && index < enabledSlides.length) {
        set({ currentSlideIndex: index });
      }
    },

    // Slide manipulation
    updateSlide: (id, updates) => {
      const slides = get().currentSlides.map(slide =>
        slide.id === id ? { ...slide, ...updates } : slide
      );
      set({ currentSlides: slides });
    },

    addSlide: (slide) => {
      const slides = [...get().currentSlides, slide];
      set({ currentSlides: slides });
    },

    removeSlide: (id) => {
      const slides = get().currentSlides.filter(s => s.id !== id);
      // Reorder remaining slides
      const reorderedSlides = slides.map((slide, index) => ({
        ...slide,
        slideOrder: index + 1,
      }));
      set({ currentSlides: reorderedSlides });
    },

    reorderSlides: (fromIndex, toIndex) => {
      const slides = [...get().currentSlides];
      const [removed] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, removed);

      // Update slide orders
      const reorderedSlides = slides.map((slide, index) => ({
        ...slide,
        slideOrder: index + 1,
      }));

      set({ currentSlides: reorderedSlides });
    },

    toggleSlideDisabled: (id) => {
      const slides = get().currentSlides.map(slide =>
        slide.id === id ? { ...slide, isDisabled: !slide.isDisabled } : slide
      );
      set({ currentSlides: slides });
    },

    setSlideTemplateOverride: (slideId, templateId) => {
      const slides = get().currentSlides.map(slide =>
        slide.id === slideId
          ? { ...slide, templateOverrideId: templateId ?? undefined }
          : slide
      );
      set({ currentSlides: slides });
    },

    getTemplateForSlide: (slide) => {
      const { allTemplates, currentTemplate, secondaryTemplate, secondarySlides } = get();
      if (slide.templateOverrideId) {
        return allTemplates.find(t => t.id === slide.templateOverrideId) || currentTemplate;
      }
      const isSecondary = secondarySlides.some(s => s.id === slide.id)
        || (slide.id.includes('__verse_') && secondarySlides.some(s => slide.id.startsWith(s.id + '__verse_')));
      return isSecondary ? secondaryTemplate : currentTemplate;
    },

    getVariablesForSlide: (slide) => {
      const { currentVariables, secondarySlides, secondaryVariables } = get();
      const isSecondary = secondarySlides.some(s => s.id === slide.id)
        || (slide.id.includes('__verse_') && secondarySlides.some(s => slide.id.startsWith(s.id + '__verse_')));
      return isSecondary ? secondaryVariables : currentVariables;
    },

    getLanguageMapForSlide: (slide) => {
      const { currentPresentation, secondaryPresentation, secondarySlides } = get();
      const isSecondary = secondarySlides.some(s => s.id === slide.id)
        || (slide.id.includes('__verse_') && secondarySlides.some(s => slide.id.startsWith(s.id + '__verse_')));
      const pres = isSecondary ? secondaryPresentation : currentPresentation;
      return pres?.languageMap ?? {};
    },

    getLanguageSettingsForSlide: (slide) => {
      const { currentPresentation, secondaryPresentation, secondarySlides } = get();
      const isSecondary = secondarySlides.some(s => s.id === slide.id)
        || (slide.id.includes('__verse_') && secondarySlides.some(s => slide.id.startsWith(s.id + '__verse_')));
      const pres = isSecondary ? secondaryPresentation : currentPresentation;
      return pres?.languageSettings;
    },

    // Computed getters
    expandDynamicSlides: (slides: Slide[]) => {
      const { verses, ruleContextMeta } = get();
      if (verses.length === 0) return slides;

      const expanded: Slide[] = [];
      for (const slide of slides) {
        if (slide.isDynamic && slide.lineId) {
          // Resolve @meta.X.Y placeholder to get the actual segmentId
          let segmentId = slide.lineId;
          if (segmentId.startsWith('@meta.')) {
            if (!ruleContextMeta) {
              console.warn(`[Dynamic Slide] Cannot resolve "${segmentId}" — rule context meta not available yet`);
            } else {
              const resolved = placeholderService.resolveMetaPlaceholder(segmentId, ruleContextMeta);
              if (resolved === undefined) {
                console.warn(`[Dynamic Slide] Failed to resolve "${segmentId}" from meta context`);
              } else {
                segmentId = resolved;
              }
            }
          }

          const matchingVerses = verses
            .filter(v => v.segmentId === segmentId)
            .sort((a, b) => a.verseOrder - b.verseOrder);

          for (const verse of matchingVerses) {
            expanded.push({
              ...slide,
              id: `${slide.id}__verse_${verse.id}`,
              titleJson: (verse.titleLang1 || verse.titleLang2 || verse.titleLang3 || verse.titleLang4)
                ? {
                    Lang1: verse.titleLang1,
                    Lang2: verse.titleLang2,
                    Lang3: verse.titleLang3,
                    Lang4: verse.titleLang4,
                  }
                : slide.titleJson,
              blocksJson: [{
                Lang1: verse.textLang1,
                Lang2: verse.textLang2,
                Lang3: verse.textLang3,
                Lang4: verse.textLang4,
              }],
            });
          }

          // If no verses matched, keep the original slide as fallback
          if (matchingVerses.length === 0) {
            console.warn(`[Dynamic Slide] No verses found for segmentId="${segmentId}" (lineId="${slide.lineId}")`);
            expanded.push(slide);
          }
        } else {
          expanded.push(slide);
        }
      }
      return expanded;
    },

    getEnabledSlides: () => {
      const { currentSlides, ruleFilteredSlideIds } = get();
      let slides = currentSlides.filter(s => !s.isDisabled);
      if (ruleFilteredSlideIds !== null) {
        slides = slides.filter(s => ruleFilteredSlideIds.includes(s.id));
      }
      return get().expandDynamicSlides(slides);
    },

    getMergedEnabledSlides: () => {
      const state = get();
      const primarySlides = state.getEnabledSlides();

      if (!state.secondaryPresentation || state.secondarySlides.length === 0) {
        return primarySlides;
      }

      let secSlides = state.secondarySlides.filter(s => !s.isDisabled);
      if (state.ruleFilteredSlideIds !== null) {
        secSlides = secSlides.filter(s => state.ruleFilteredSlideIds!.includes(s.id));
      }
      secSlides = state.expandDynamicSlides(secSlides);

      return [...primarySlides, ...secSlides];
    },

    getExpandedSlides: () => {
      const { currentSlides } = get();
      return get().expandDynamicSlides(currentSlides);
    },

    getCurrentSlide: () => {
      const { currentSlideIndex, isPresenting } = get();
      if (!isPresenting) return null;
      const enabledSlides = get().getMergedEnabledSlides();
      return enabledSlides[currentSlideIndex] || null;
    },

    getSlideCount: () => get().currentSlides.length,

    getEnabledSlideCount: () => get().currentSlides.filter(s => !s.isDisabled).length,
  }))
);

