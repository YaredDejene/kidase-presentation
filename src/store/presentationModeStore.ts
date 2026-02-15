import { create } from 'zustand';
import { Slide } from '../domain/entities/Slide';
import { getMergedEnabledSlides } from '../domain/slideFiltering';
import { usePresentationDataStore } from './presentationDataStore';
import { useRuleStore } from './ruleStore';

interface PresentationModeState {
  isPresenting: boolean;
  currentSlideIndex: number;

  startPresentation: () => void;
  stopPresentation: () => void;
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (index: number) => void;

  // Computed
  getMergedEnabledSlides: () => Slide[];
  getCurrentSlide: () => Slide | null;
  getSlideCount: () => number;
  getEnabledSlideCount: () => number;
}

/** Helper to get the current merged enabled slides from the other stores */
function computeMergedSlides(): Slide[] {
  const dataState = usePresentationDataStore.getState();
  const ruleState = useRuleStore.getState();
  return getMergedEnabledSlides(
    dataState.currentSlides,
    dataState.secondarySlides,
    ruleState.ruleFilteredSlideIds,
    dataState.verses,
    ruleState.ruleContextMeta,
  );
}

export const usePresentationModeStore = create<PresentationModeState>()((set, get) => ({
  isPresenting: false,
  currentSlideIndex: 0,

  startPresentation: () => {
    const slides = computeMergedSlides();
    if (slides.length > 0) {
      set({ isPresenting: true, currentSlideIndex: 0 });
      document.documentElement.requestFullscreen?.().catch(() => {});
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
    const slides = computeMergedSlides();
    if (currentSlideIndex < slides.length - 1) {
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
    const slides = computeMergedSlides();
    if (index >= 0 && index < slides.length) {
      set({ currentSlideIndex: index });
    }
  },

  getMergedEnabledSlides: () => computeMergedSlides(),

  getCurrentSlide: () => {
    const { currentSlideIndex, isPresenting } = get();
    if (!isPresenting) return null;
    const slides = computeMergedSlides();
    return slides[currentSlideIndex] || null;
  },

  getSlideCount: () => usePresentationDataStore.getState().currentSlides.length,

  getEnabledSlideCount: () =>
    usePresentationDataStore.getState().currentSlides.filter(s => !s.isDisabled).length,
}));
