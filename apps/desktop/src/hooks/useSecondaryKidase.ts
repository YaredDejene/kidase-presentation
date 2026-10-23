import { useEffect } from 'react';
import { isStandaloneService } from '@kidase/shared';
import { presentationRepository } from '../repositories';
import { presentationService } from '../services';
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

    // A standalone service (Kidan) renders on its own, without an anaphora.
    if (!kidaseType || !currentPresentation || isStandaloneService(currentPresentation.type)) {
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
