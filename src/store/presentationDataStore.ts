import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Presentation } from '../domain/entities/Presentation';
import { Slide, isSecondarySlide } from '../domain/entities/Slide';
import { Template } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';
import { AppSettings, defaultAppSettings } from '../domain/entities/AppSettings';
import { Verse } from '../domain/entities/Verse';

interface PresentationDataState {
  // Primary presentation data
  currentPresentation: Presentation | null;
  currentSlides: Slide[];
  currentTemplate: Template | null;
  currentVariables: Variable[];
  allTemplates: Template[];

  // Secondary presentation data
  secondaryPresentation: Presentation | null;
  secondarySlides: Slide[];
  secondaryTemplate: Template | null;
  secondaryVariables: Variable[];

  // Reference data
  verses: Verse[];

  // App settings
  appSettings: AppSettings;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Setters
  setCurrentPresentation: (presentation: Presentation | null) => void;
  setCurrentSlides: (slides: Slide[]) => void;
  setCurrentTemplate: (template: Template | null) => void;
  setCurrentVariables: (variables: Variable[]) => void;
  setAllTemplates: (templates: Template[]) => void;
  setVerses: (verses: Verse[]) => void;
  setAppSettings: (settings: AppSettings) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Bulk actions
  loadPresentationData: (data: {
    presentation: Presentation;
    slides: Slide[];
    template: Template;
    variables: Variable[];
  }) => void;
  clearPresentationData: () => void;
  loadSecondaryData: (data: {
    presentation: Presentation;
    slides: Slide[];
    template: Template;
    variables: Variable[];
  }) => void;
  clearSecondaryData: () => void;

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
}

export const usePresentationDataStore = create<PresentationDataState>()(
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
    isLoading: false,
    error: null,

    // Setters
    setCurrentPresentation: (presentation) => set({ currentPresentation: presentation }),
    setCurrentSlides: (slides) => set({ currentSlides: slides }),
    setCurrentTemplate: (template) => set({ currentTemplate: template }),
    setCurrentVariables: (variables) => set({ currentVariables: variables }),
    setAllTemplates: (templates) => set({ allTemplates: templates }),
    setVerses: (verses) => set({ verses }),
    setAppSettings: (settings) => set({ appSettings: settings }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    // Bulk actions
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
    }),

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

    // Per-slide resolution
    getTemplateForSlide: (slide) => {
      const { allTemplates, currentTemplate, secondaryTemplate, secondarySlides } = get();
      if (slide.templateOverrideId) {
        return allTemplates.find(t => t.id === slide.templateOverrideId) || currentTemplate;
      }
      return isSecondarySlide(slide, secondarySlides) ? secondaryTemplate : currentTemplate;
    },

    getVariablesForSlide: (slide) => {
      const { currentVariables, secondarySlides, secondaryVariables } = get();
      return isSecondarySlide(slide, secondarySlides) ? secondaryVariables : currentVariables;
    },

    getLanguageMapForSlide: (slide) => {
      const { currentPresentation, secondaryPresentation, secondarySlides } = get();
      const pres = isSecondarySlide(slide, secondarySlides) ? secondaryPresentation : currentPresentation;
      return pres?.languageMap ?? {};
    },

    getLanguageSettingsForSlide: (slide) => {
      const { currentPresentation, secondaryPresentation, secondarySlides } = get();
      const pres = isSecondarySlide(slide, secondarySlides) ? secondaryPresentation : currentPresentation;
      return pres?.languageSettings;
    },
  }))
);
