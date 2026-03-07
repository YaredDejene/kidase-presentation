import { create } from 'zustand';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Slide } from '../domain/entities/Slide';
import { getMergedEnabledSlides } from '../domain/slideFiltering';
import { usePresentationDataStore } from './presentationDataStore';
import { useRuleStore } from './ruleStore';

interface PresentationModeState {
  isPresenting: boolean;
  currentSlideIndex: number;

  startPresentation: (startIndex?: number) => void;
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

  startPresentation: (startIndex?: number) => {
    const slides = computeMergedSlides();
    if (slides.length > 0) {
      const index = Math.min(Math.max(startIndex ?? 0, 0), slides.length - 1);
      set({ isPresenting: true, currentSlideIndex: index });
      getCurrentWindow().setFullscreen(true).catch((err) => {
        console.warn('Failed to enter fullscreen:', err);
      });
    }
  },

  stopPresentation: () => {
    set({ isPresenting: false, currentSlideIndex: 0 });
    getCurrentWindow().setFullscreen(false).catch((err) => {
      console.warn('Failed to exit fullscreen:', err);
    });
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
