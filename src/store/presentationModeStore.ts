import { create } from 'zustand';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Slide } from '../domain/entities/Slide';
import { getMergedEnabledSlides } from '../domain/slideFiltering';
import { usePresentationDataStore } from './presentationDataStore';
import { useRuleStore } from './ruleStore';
import { monitorService } from '../services/MonitorService';
import { audienceWindowService } from '../services/AudienceWindowService';

interface PresentationModeState {
  isPresenting: boolean;
  isPresenterMode: boolean; // true = dual-monitor (presenter + audience), false = single-window fullscreen
  currentSlideIndex: number;

  startPresentation: (startIndex?: number) => Promise<void> | void;
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
  isPresenterMode: false,
  currentSlideIndex: 0,

  startPresentation: async (startIndex?: number) => {
    const slides = computeMergedSlides();
    if (slides.length === 0) return;

    const index = Math.min(Math.max(startIndex ?? 0, 0), slides.length - 1);

    // Check setting: should we use presenter view?
    const { appSettings } = usePresentationDataStore.getState();
    const usePresenterView = appSettings.presentationDisplay === 'presenterView';

    if (usePresenterView) {
      // Check for external monitors
      const externalMonitor = await monitorService.getExternalMonitor();

      if (externalMonitor) {
        // Dual-monitor: audience window on external, presenter view (fullscreen) on main
        try {
          await audienceWindowService.openAudienceWindow(externalMonitor);
          set({ isPresenting: true, isPresenterMode: true, currentSlideIndex: index });
          // Main window goes fullscreen too for presenter view
          getCurrentWindow().setFullscreen(true).catch((e) => {
            console.warn('Failed to enter fullscreen for presenter:', e);
          });
          // Send initial slide index to audience
          await audienceWindowService.emitSlideChange(index);
        } catch (err) {
          console.error('Failed to open audience window, falling back to single-window:', err);
          set({ isPresenting: true, isPresenterMode: false, currentSlideIndex: index });
          getCurrentWindow().setFullscreen(true).catch((e) => {
            console.warn('Failed to enter fullscreen:', e);
          });
        }
      } else {
        // No external monitor — fall back to single-window fullscreen
        set({ isPresenting: true, isPresenterMode: false, currentSlideIndex: index });
        getCurrentWindow().setFullscreen(true).catch((err) => {
          console.warn('Failed to enter fullscreen:', err);
        });
      }
    } else {
      // 'currentWindow' mode: single-window fullscreen (original behavior)
      set({ isPresenting: true, isPresenterMode: false, currentSlideIndex: index });
      getCurrentWindow().setFullscreen(true).catch((err) => {
        console.warn('Failed to enter fullscreen:', err);
      });
    }
  },

  stopPresentation: () => {
    const { isPresenterMode } = get();
    set({ isPresenting: false, isPresenterMode: false, currentSlideIndex: 0 });

    // Always exit fullscreen on main window
    getCurrentWindow().setFullscreen(false).catch((err) => {
      console.warn('Failed to exit fullscreen:', err);
    });

    if (isPresenterMode) {
      // Close audience window
      audienceWindowService.emitPresentationStop().catch(() => {});
      audienceWindowService.closeAudienceWindow().catch(() => {});
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
