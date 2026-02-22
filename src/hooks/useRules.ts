import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { ruleRepository, gitsaweRepository } from '../repositories';
import { ruleEngine, buildContext, BuildContextArgs } from '../engine';
import type { RuleDefinition } from '../domain/entities/RuleDefinition';
import type { Slide } from '../domain/entities/Slide';
import type { RuleEntry, RuleContext, EvaluationResult } from '../engine/types';

/** Evaluate a set of rules against slides and collect results + hidden slide IDs */
function evaluateRulesForSlides(
  enabledRules: RuleDefinition[],
  slides: Slide[],
  baseContext: RuleContext,
  buildCtxArgs: Omit<BuildContextArgs, 'slide'>,
): { results: EvaluationResult[]; hiddenSlideIds: Set<string> } {
  const results: EvaluationResult[] = [];
  const hiddenSlideIds = new Set<string>();

  for (const ruleDef of enabledRules) {
    try {
      const ruleEntry: RuleEntry = JSON.parse(ruleDef.ruleJson);

      if (ruleDef.scope === 'slide') {
        const targetSlides = ruleDef.slideId
          ? slides.filter(s => s.id === ruleDef.slideId)
          : slides;

        for (const slide of targetSlides) {
          const slideContext = buildContext({ ...buildCtxArgs, slide });
          const result = ruleEngine.evaluateRule(ruleEntry, slideContext);
          results.push(result);
          if (result.outcome.visible === false) {
            hiddenSlideIds.add(slide.id);
          }
        }
      } else {
        const result = ruleEngine.evaluateRule(ruleEntry, baseContext);
        results.push(result);
      }
    } catch (err) {
      console.error(`Failed to evaluate rule ${ruleDef.id}:`, err);
    }
  }

  return { results, hiddenSlideIds };
}

export function useRules() {
  const {
    currentPresentation,
    currentSlides,
    currentVariables,
    appSettings,
    ruleEvaluationDate,
    isMehella,
    setRuleFilteredSlideIds,
    setRuleContextMeta,
  } = useAppStore();

  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load rules for the current presentation
  const loadRules = useCallback(async () => {
    if (!currentPresentation) {
      setRules([]);
      return;
    }

    setIsLoading(true);
    try {
      const loaded = await ruleRepository.getByPresentationId(currentPresentation.id);
      setRules(loaded);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPresentation]);

  // Reload when presentation changes
  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Create a new rule
  const createRule = useCallback(async (
    rule: Omit<RuleDefinition, 'id' | 'createdAt'>
  ): Promise<RuleDefinition | null> => {
    try {
      const created = await ruleRepository.create(rule);
      setRules(prev => [...prev, created]);
      return created;
    } catch (err) {
      console.error('Failed to create rule:', err);
      return null;
    }
  }, []);

  // Update a rule
  const updateRule = useCallback(async (
    id: string,
    updates: Partial<Omit<RuleDefinition, 'id' | 'createdAt'>>
  ): Promise<boolean> => {
    try {
      const updated = await ruleRepository.update(id, updates);
      setRules(prev => prev.map(r => r.id === id ? updated : r));
      ruleEngine.invalidateRule(id);
      return true;
    } catch (err) {
      console.error('Failed to update rule:', err);
      return false;
    }
  }, []);

  // Delete a rule
  const deleteRule = useCallback(async (id: string): Promise<boolean> => {
    try {
      await ruleRepository.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
      ruleEngine.invalidateRule(id);
      return true;
    } catch (err) {
      console.error('Failed to delete rule:', err);
      return false;
    }
  }, []);

  // Toggle a rule's enabled state
  const toggleRule = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await ruleRepository.toggleEnabled(id);
      setRules(prev => prev.map(r => r.id === id ? updated : r));
      return true;
    } catch (err) {
      console.error('Failed to toggle rule:', err);
      return false;
    }
  }, []);

  // Evaluate all enabled rules and update filtered slide IDs in store
  const evaluateRules = useCallback(async (): Promise<EvaluationResult[]> => {
    // Parse as local date (YYYY-MM-DD → local midnight) to avoid UTC timezone shift
    const overrideDate = ruleEvaluationDate
      ? new Date(ruleEvaluationDate + 'T12:00:00')
      : undefined;

    // Pre-fetch Gitsawe records and their selection rules
    const allGitsawes = await gitsaweRepository.getAll();
    const gitsaweRules = (await ruleRepository.getEnabled()).filter(r => r.scope === 'gitsawe');

    // Shared context-building args
    const baseCtxArgs: Omit<BuildContextArgs, 'slide'> = {
      presentation: currentPresentation,
      variables: currentVariables,
      appSettings,
      gitsawes: allGitsawes,
      gitsaweRules,
      overrideDate,
      extra: { isMehella },
    };

    // Always build context (needed for gitsawe selection and placeholder resolution)
    const context = buildContext(baseCtxArgs);

    // Store meta in app store for placeholder resolution
    setRuleContextMeta(context.meta);

    // If no presentation-level rules, skip slide filtering
    const enabledRules = rules.filter(r => r.isEnabled);
    if (enabledRules.length === 0) {
      setRuleFilteredSlideIds(null);
      return [];
    }

    // Evaluate primary presentation rules
    const primary = evaluateRulesForSlides(enabledRules, currentSlides, context, baseCtxArgs);

    // Evaluate secondary presentation rules (if secondary is loaded)
    const { secondaryPresentation, secondarySlides, secondaryVariables } = useAppStore.getState();
    const allHiddenIds = new Set(primary.hiddenSlideIds);
    const allResults = [...primary.results];

    if (secondaryPresentation && secondarySlides.length > 0) {
      try {
        const secRules = await ruleRepository.getByPresentationId(secondaryPresentation.id);
        const enabledSecRules = secRules.filter(r => r.isEnabled);

        if (enabledSecRules.length > 0) {
          const secCtxArgs: Omit<BuildContextArgs, 'slide'> = {
            presentation: secondaryPresentation,
            variables: secondaryVariables,
            appSettings,
            gitsawes: allGitsawes,
            gitsaweRules,
            overrideDate,
            extra: { isMehella },
          };
          const secContext = buildContext(secCtxArgs);
          const secondary = evaluateRulesForSlides(enabledSecRules, secondarySlides, secContext, secCtxArgs);

          allResults.push(...secondary.results);
          secondary.hiddenSlideIds.forEach(id => allHiddenIds.add(id));
        }
      } catch (err) {
        console.error('Failed to load secondary rules:', err);
      }
    }

    // Compute filtered slide IDs (slides not hidden by rules)
    const allSlides = [...currentSlides, ...secondarySlides];
    if (allHiddenIds.size > 0) {
      const visibleIds = allSlides
        .filter(s => !allHiddenIds.has(s.id))
        .map(s => s.id);
      setRuleFilteredSlideIds(visibleIds);
    } else {
      setRuleFilteredSlideIds(null);
    }

    return allResults;
  }, [rules, currentPresentation, currentSlides, currentVariables, appSettings, ruleEvaluationDate, isMehella, setRuleFilteredSlideIds, setRuleContextMeta]);

  // Validate a rule JSON string
  const validateRule = useCallback((ruleJson: string) => {
    try {
      const parsed = JSON.parse(ruleJson);
      return ruleEngine.validate(parsed);
    } catch {
      return { valid: false, issues: [{ path: '', message: 'Invalid JSON', severity: 'error' as const }] };
    }
  }, []);

  return {
    rules,
    isLoading,
    loadRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    evaluateRules,
    validateRule,
  };
}
