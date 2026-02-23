/**
 * App Store Facade
 *
 * This file re-exports a unified `useAppStore` hook that combines state from
 * the four focused store slices. Existing consumers can continue importing
 * `useAppStore` without changes. New code should import from the specific
 * store slices directly.
 *
 * Slices:
 *   - presentationDataStore  — presentation data, slides, templates, settings
 *   - presentationModeStore  — fullscreen playback state
 *   - ruleStore              — rule evaluation state
 *   - navigationStore        — current view
 *   - slideFiltering (pure)  — expandDynamicSlides, getEnabledSlides, getMergedEnabledSlides
 */

import { usePresentationDataStore } from './presentationDataStore';
import { usePresentationModeStore } from './presentationModeStore';
import { useRuleStore } from './ruleStore';
import { useNavigationStore, type AppView } from './navigationStore';
import {
  expandDynamicSlides,
  getEnabledSlides as getEnabledSlidesFiltering,
} from '../domain/slideFiltering';
import { Slide } from '../domain/entities/Slide';

// Re-export individual stores for direct access
export { usePresentationDataStore } from './presentationDataStore';
export { usePresentationModeStore } from './presentationModeStore';
export { useRuleStore } from './ruleStore';
export { useNavigationStore } from './navigationStore';

/**
 * Unified facade hook — combines all four stores into a single selector.
 * This exists for backward compatibility. Prefer importing from individual stores.
 */
export function useAppStore(): ReturnType<typeof useUnifiedSelector>;
export function useAppStore<T>(selector: (state: ReturnType<typeof useUnifiedSelector>) => T): T;
export function useAppStore<T>(selector?: (state: ReturnType<typeof useUnifiedSelector>) => T) {
  const state = useUnifiedSelector();
  return selector ? selector(state) : state;
}

// Stable computed functions that read from stores at call-time
function stableExpandDynamicSlides(slides: Slide[]) {
  const { verses } = usePresentationDataStore.getState();
  const { ruleContextMeta } = useRuleStore.getState();
  return expandDynamicSlides(slides, verses, ruleContextMeta);
}

function stableGetEnabledSlides() {
  const { currentSlides, verses } = usePresentationDataStore.getState();
  const { ruleFilteredSlideIds, ruleContextMeta } = useRuleStore.getState();
  return getEnabledSlidesFiltering(currentSlides, ruleFilteredSlideIds, verses, ruleContextMeta);
}

function stableGetExpandedSlides() {
  const { currentSlides, verses } = usePresentationDataStore.getState();
  const { ruleContextMeta } = useRuleStore.getState();
  return expandDynamicSlides(currentSlides, verses, ruleContextMeta);
}

/** Build the unified state shape from the four store states */
function buildUnifiedState(
  dataState: ReturnType<typeof usePresentationDataStore.getState>,
  modeState: ReturnType<typeof usePresentationModeStore.getState>,
  ruleState: ReturnType<typeof useRuleStore.getState>,
  navState: ReturnType<typeof useNavigationStore.getState>,
) {
  return {
    // --- presentationDataStore ---
    currentPresentation: dataState.currentPresentation,
    currentSlides: dataState.currentSlides,
    currentTemplate: dataState.currentTemplate,
    currentVariables: dataState.currentVariables,
    allTemplates: dataState.allTemplates,
    secondaryPresentation: dataState.secondaryPresentation,
    secondarySlides: dataState.secondarySlides,
    secondaryTemplate: dataState.secondaryTemplate,
    secondaryVariables: dataState.secondaryVariables,
    verses: dataState.verses,
    appSettings: dataState.appSettings,
    isLoading: dataState.isLoading,
    error: dataState.error,
    setCurrentPresentation: dataState.setCurrentPresentation,
    setCurrentSlides: dataState.setCurrentSlides,
    setCurrentTemplate: dataState.setCurrentTemplate,
    setCurrentVariables: dataState.setCurrentVariables,
    setAllTemplates: dataState.setAllTemplates,
    setVerses: dataState.setVerses,
    setAppSettings: dataState.setAppSettings,
    setLoading: dataState.setLoading,
    setError: dataState.setError,
    loadPresentationData: dataState.loadPresentationData,
    clearPresentationData: () => {
      dataState.clearPresentationData();
      usePresentationModeStore.setState({ isPresenting: false, currentSlideIndex: 0 });
      useRuleStore.setState({
        ruleFilteredSlideIds: null,
        ruleEvaluationDate: null,
        isMehella: false,
        ruleContextMeta: null,
      });
    },
    loadSecondaryData: dataState.loadSecondaryData,
    clearSecondaryData: dataState.clearSecondaryData,
    updateSlide: dataState.updateSlide,
    addSlide: dataState.addSlide,
    removeSlide: dataState.removeSlide,
    reorderSlides: dataState.reorderSlides,
    toggleSlideDisabled: dataState.toggleSlideDisabled,
    setSlideTemplateOverride: dataState.setSlideTemplateOverride,
    getTemplateForSlide: dataState.getTemplateForSlide,
    getVariablesForSlide: dataState.getVariablesForSlide,
    getLanguageMapForSlide: dataState.getLanguageMapForSlide,
    getLanguageSettingsForSlide: dataState.getLanguageSettingsForSlide,

    // --- presentationModeStore ---
    isPresenting: modeState.isPresenting,
    currentSlideIndex: modeState.currentSlideIndex,
    startPresentation: modeState.startPresentation,
    stopPresentation: modeState.stopPresentation,
    nextSlide: modeState.nextSlide,
    previousSlide: modeState.previousSlide,
    goToSlide: modeState.goToSlide,
    getCurrentSlide: modeState.getCurrentSlide,
    getSlideCount: modeState.getSlideCount,
    getEnabledSlideCount: modeState.getEnabledSlideCount,
    getMergedEnabledSlides: modeState.getMergedEnabledSlides,

    // --- ruleStore ---
    ruleFilteredSlideIds: ruleState.ruleFilteredSlideIds,
    ruleEvaluationDate: ruleState.ruleEvaluationDate,
    isMehella: ruleState.isMehella,
    ruleContextMeta: ruleState.ruleContextMeta,
    setRuleFilteredSlideIds: ruleState.setRuleFilteredSlideIds,
    setRuleEvaluationDate: ruleState.setRuleEvaluationDate,
    setIsMehella: ruleState.setIsMehella,
    setRuleContextMeta: ruleState.setRuleContextMeta,

    // --- navigationStore ---
    currentView: navState.currentView,
    setCurrentView: navState.setCurrentView as (view: AppView) => void,

    // --- Pure computed (from slideFiltering.ts) ---
    expandDynamicSlides: stableExpandDynamicSlides,
    getEnabledSlides: stableGetEnabledSlides,
    getExpandedSlides: stableGetExpandedSlides,
  };
}

function useUnifiedSelector() {
  // Read from all four stores (this makes the component subscribe to all of them)
  return buildUnifiedState(
    usePresentationDataStore(),
    usePresentationModeStore(),
    useRuleStore(),
    useNavigationStore(),
  );
}

// Static getState()-style access for non-React code (e.g., PDF export, event handlers)
useAppStore.getState = () => buildUnifiedState(
  usePresentationDataStore.getState(),
  usePresentationModeStore.getState(),
  useRuleStore.getState(),
  useNavigationStore.getState(),
);
