import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { ruleRepository, gitsaweRepository } from '../repositories';
import { ruleEngine, buildContext } from '../engine';
import type { RuleDefinition } from '../domain/entities/RuleDefinition';
import type { RuleEntry, EvaluationResult } from '../engine/types';

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
  const [loading, setLoading] = useState(false);

  // Load rules for the current presentation
  const loadRules = useCallback(async () => {
    if (!currentPresentation) {
      setRules([]);
      return;
    }

    setLoading(true);
    try {
      const loaded = await ruleRepository.getByPresentationId(currentPresentation.id);
      setRules(loaded);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
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

    // Always build context (needed for gitsawe selection and placeholder resolution)
    const context = buildContext({
      presentation: currentPresentation,
      variables: currentVariables,
      appSettings,
      gitsawes: allGitsawes,
      gitsaweRules,
      overrideDate,
      extra: { isMehella },
    });

    // Store meta in app store for placeholder resolution
    setRuleContextMeta(context.meta);

    // If no presentation-level rules, skip slide filtering
    const enabledRules = rules.filter(r => r.isEnabled);
    if (enabledRules.length === 0) {
      setRuleFilteredSlideIds(null);
      return [];
    }

    const results: EvaluationResult[] = [];
    const hiddenSlideIds = new Set<string>();

    for (const ruleDef of enabledRules) {
      try {
        const ruleEntry: RuleEntry = JSON.parse(ruleDef.ruleJson);

        // Evaluate per-slide if scope is slide, otherwise once
        if (ruleDef.scope === 'slide') {
          if (ruleDef.slideId) {
            // Rule is linked to a specific slide
            const targetSlide = currentSlides.find(s => s.id === ruleDef.slideId);
            if (targetSlide) {
              const slideContext = buildContext({
                presentation: currentPresentation,
                slide: targetSlide,
                variables: currentVariables,
                appSettings,
                gitsawes: allGitsawes,
                gitsaweRules,
                overrideDate,
                extra: { isMehella },
              });
              const result = ruleEngine.evaluateRule(ruleEntry, slideContext);
              results.push(result);

              if (result.outcome.visible === false) {
                hiddenSlideIds.add(targetSlide.id);
              }
            }
          } else {
            // Rule applies to all slides
            for (const slide of currentSlides) {
              const slideContext = buildContext({
                presentation: currentPresentation,
                slide,
                variables: currentVariables,
                appSettings,
                gitsawes: allGitsawes,
                gitsaweRules,
                overrideDate,
                extra: { isMehella },
              });
              const result = ruleEngine.evaluateRule(ruleEntry, slideContext);
              results.push(result);

              if (result.outcome.visible === false) {
                hiddenSlideIds.add(slide.id);
              }
            }
          }
        } else {
          const result = ruleEngine.evaluateRule(ruleEntry, context);
          results.push(result);
        }
      } catch (err) {
        console.error(`Failed to evaluate rule ${ruleDef.id}:`, err);
      }
    }

    // Evaluate secondary presentation rules (if secondary is loaded)
    const { secondaryPresentation, secondarySlides, secondaryVariables } = useAppStore.getState();
    if (secondaryPresentation && secondarySlides.length > 0) {
      try {
        const secRules = await ruleRepository.getByPresentationId(secondaryPresentation.id);
        const enabledSecRules = secRules.filter(r => r.isEnabled);

        for (const ruleDef of enabledSecRules) {
          try {
            const ruleEntry: RuleEntry = JSON.parse(ruleDef.ruleJson);

            if (ruleDef.scope === 'slide') {
              if (ruleDef.slideId) {
                const targetSlide = secondarySlides.find(s => s.id === ruleDef.slideId);
                if (targetSlide) {
                  const slideContext = buildContext({
                    presentation: secondaryPresentation,
                    slide: targetSlide,
                    variables: secondaryVariables,
                    appSettings,
                    gitsawes: allGitsawes,
                    gitsaweRules,
                    overrideDate,
                    extra: { isMehella },
                  });
                  const result = ruleEngine.evaluateRule(ruleEntry, slideContext);
                  results.push(result);
                  if (result.outcome.visible === false) {
                    hiddenSlideIds.add(targetSlide.id);
                  }
                }
              } else {
                for (const slide of secondarySlides) {
                  const slideContext = buildContext({
                    presentation: secondaryPresentation,
                    slide,
                    variables: secondaryVariables,
                    appSettings,
                    gitsawes: allGitsawes,
                    gitsaweRules,
                    overrideDate,
                    extra: { isMehella },
                  });
                  const result = ruleEngine.evaluateRule(ruleEntry, slideContext);
                  results.push(result);
                  if (result.outcome.visible === false) {
                    hiddenSlideIds.add(slide.id);
                  }
                }
              }
            } else {
              const secContext = buildContext({
                presentation: secondaryPresentation,
                variables: secondaryVariables,
                appSettings,
                gitsawes: allGitsawes,
                gitsaweRules,
                overrideDate,
                extra: { isMehella },
              });
              const result = ruleEngine.evaluateRule(ruleEntry, secContext);
              results.push(result);
            }
          } catch (err) {
            console.error(`Failed to evaluate secondary rule ${ruleDef.id}:`, err);
          }
        }
      } catch (err) {
        console.error('Failed to load secondary rules:', err);
      }
    }

    // Compute filtered slide IDs (slides not hidden by rules)
    const allSlides = [...currentSlides, ...secondarySlides];
    if (hiddenSlideIds.size > 0) {
      const visibleIds = allSlides
        .filter(s => !hiddenSlideIds.has(s.id))
        .map(s => s.id);
      setRuleFilteredSlideIds(visibleIds);
    } else {
      setRuleFilteredSlideIds(null);
    }

    return results;
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
    loading,
    loadRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    evaluateRules,
    validateRule,
  };
}
