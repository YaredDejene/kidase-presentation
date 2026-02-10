import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Presentation } from '../domain/entities/Presentation';
import { Slide } from '../domain/entities/Slide';
import { Template } from '../domain/entities/Template';
import { Variable } from '../domain/entities/Variable';
import { AppSettings, defaultAppSettings } from '../domain/entities/AppSettings';

interface AppState {
  // Current presentation data
  currentPresentation: Presentation | null;
  currentSlides: Slide[];
  currentTemplate: Template | null;
  currentVariables: Variable[];

  // App settings
  appSettings: AppSettings;

  // Presentation mode state
  isPresenting: boolean;
  currentSlideIndex: number;

  // Edit mode state
  isEditing: boolean;
  selectedSlideId: string | null;

  // Rule engine state
  ruleFilteredSlideIds: string[] | null; // null = no filtering, array = only these IDs visible
  ruleEvaluationDate: string | null; // null = use today, ISO string = override date for rule evaluation
  ruleContextMeta: Record<string, unknown> | null; // meta context from last rule evaluation

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions - Setters
  setCurrentPresentation: (presentation: Presentation | null) => void;
  setCurrentSlides: (slides: Slide[]) => void;
  setCurrentTemplate: (template: Template | null) => void;
  setCurrentVariables: (variables: Variable[]) => void;
  setAppSettings: (settings: AppSettings) => void;
  setRuleFilteredSlideIds: (ids: string[] | null) => void;
  setRuleEvaluationDate: (date: string | null) => void;
  setRuleContextMeta: (meta: Record<string, unknown> | null) => void;
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

  // Presentation mode controls
  startPresentation: () => void;
  stopPresentation: () => void;
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (index: number) => void;

  // Edit mode controls
  startEditing: () => void;
  stopEditing: () => void;
  selectSlide: (id: string | null) => void;

  // Slide manipulation
  updateSlide: (id: string, updates: Partial<Slide>) => void;
  addSlide: (slide: Slide) => void;
  removeSlide: (id: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  toggleSlideDisabled: (id: string) => void;

  // Variable manipulation
  updateVariable: (id: string, value: string) => void;
  addVariable: (variable: Variable) => void;
  removeVariable: (id: string) => void;

  // Computed getters
  getEnabledSlides: () => Slide[];
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
    appSettings: defaultAppSettings,
    ruleFilteredSlideIds: null,
    ruleEvaluationDate: null,
    ruleContextMeta: null,
    isPresenting: false,
    currentSlideIndex: 0,
    isEditing: false,
    selectedSlideId: null,
    isLoading: false,
    error: null,

    // Setters
    setCurrentPresentation: (presentation) => set({ currentPresentation: presentation }),
    setCurrentSlides: (slides) => set({ currentSlides: slides }),
    setCurrentTemplate: (template) => set({ currentTemplate: template }),
    setCurrentVariables: (variables) => set({ currentVariables: variables }),
    setAppSettings: (settings) => set({ appSettings: settings }),
    setRuleFilteredSlideIds: (ids) => set({ ruleFilteredSlideIds: ids }),
    setRuleEvaluationDate: (date) => set({ ruleEvaluationDate: date }),
    setRuleContextMeta: (meta) => set({ ruleContextMeta: meta }),
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
      ruleFilteredSlideIds: null,
      ruleEvaluationDate: null,
      ruleContextMeta: null,
      isPresenting: false,
      currentSlideIndex: 0,
      isEditing: false,
      selectedSlideId: null,
    }),

    // Presentation mode controls
    startPresentation: () => {
      const slides = get().getEnabledSlides();
      if (slides.length > 0) {
        set({ isPresenting: true, currentSlideIndex: 0, isEditing: false });
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
      const enabledSlides = get().getEnabledSlides();
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
      const enabledSlides = get().getEnabledSlides();
      if (index >= 0 && index < enabledSlides.length) {
        set({ currentSlideIndex: index });
      }
    },

    // Edit mode controls
    startEditing: () => set({ isEditing: true, isPresenting: false }),
    stopEditing: () => set({ isEditing: false, selectedSlideId: null }),
    selectSlide: (id) => set({ selectedSlideId: id }),

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
      set({ currentSlides: reorderedSlides, selectedSlideId: null });
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

    // Variable manipulation
    updateVariable: (id, value) => {
      const variables = get().currentVariables.map(v =>
        v.id === id ? { ...v, value } : v
      );
      set({ currentVariables: variables });
    },

    addVariable: (variable) => {
      const variables = [...get().currentVariables, variable];
      set({ currentVariables: variables });
    },

    removeVariable: (id) => {
      const variables = get().currentVariables.filter(v => v.id !== id);
      set({ currentVariables: variables });
    },

    // Computed getters
    getEnabledSlides: () => {
      const { currentSlides, ruleFilteredSlideIds, isPresenting } = get();
      let slides = currentSlides.filter(s => !s.isDisabled);
      if (isPresenting && ruleFilteredSlideIds !== null) {
        slides = slides.filter(s => ruleFilteredSlideIds.includes(s.id));
      }
      return slides;
    },

    getCurrentSlide: () => {
      const { currentSlideIndex, isPresenting } = get();
      if (!isPresenting) return null;
      const enabledSlides = get().getEnabledSlides();
      return enabledSlides[currentSlideIndex] || null;
    },

    getSlideCount: () => get().currentSlides.length,

    getEnabledSlideCount: () => get().currentSlides.filter(s => !s.isDisabled).length,
  }))
);

// Selectors for optimized re-renders
export const selectCurrentPresentation = (state: AppState) => state.currentPresentation;
export const selectCurrentSlides = (state: AppState) => state.currentSlides;
export const selectCurrentTemplate = (state: AppState) => state.currentTemplate;
export const selectCurrentVariables = (state: AppState) => state.currentVariables;
export const selectAppSettings = (state: AppState) => state.appSettings;
export const selectRuleFilteredSlideIds = (state: AppState) => state.ruleFilteredSlideIds;
export const selectRuleEvaluationDate = (state: AppState) => state.ruleEvaluationDate;
export const selectRuleContextMeta = (state: AppState) => state.ruleContextMeta;
export const selectIsPresenting = (state: AppState) => state.isPresenting;
export const selectCurrentSlideIndex = (state: AppState) => state.currentSlideIndex;
export const selectIsLoading = (state: AppState) => state.isLoading;
export const selectError = (state: AppState) => state.error;
