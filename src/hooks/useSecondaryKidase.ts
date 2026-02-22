import { useEffect } from 'react';
import { presentationRepository } from '../repositories';
import { presentationService } from '../services/PresentationService';
import { useAppStore } from '../store/appStore';

/**
 * Loads the secondary kidase based on `ruleContextMeta.gitsawe.kidaseType`.
 * Clears secondary data when no secondary is needed.
 * Re-evaluates rules after loading to include secondary slides.
 */
export function useSecondaryKidase(evaluateRules: () => void) {
  const {
    currentPresentation,
    secondaryPresentation,
    ruleContextMeta,
    loadSecondaryData,
    clearSecondaryData,
  } = useAppStore();

  useEffect(() => {
    const gitsawe = ruleContextMeta?.gitsawe as Record<string, unknown> | undefined;
    const kidaseType = gitsawe?.kidaseType as string | undefined;

    if (!kidaseType || !currentPresentation) {
      clearSecondaryData();
      return;
    }

    // Don't load secondary if it matches the primary
    if (kidaseType === currentPresentation.name) {
      clearSecondaryData();
      return;
    }

    // Don't reload if already loaded
    if (secondaryPresentation?.name === kidaseType) return;

    presentationRepository.getByName(kidaseType).then(async (pres) => {
      if (!pres) {
        clearSecondaryData();
        return;
      }
      const loaded = await presentationService.loadPresentation(pres.id);
      if (loaded) {
        loadSecondaryData(loaded);
        // Re-evaluate rules to include secondary slides
        evaluateRules();
      }
    }).catch((err) => {
      console.error('Failed to load secondary kidase:', err);
      clearSecondaryData();
    });
  }, [ruleContextMeta, currentPresentation, secondaryPresentation, loadSecondaryData, clearSecondaryData, evaluateRules]);
}
