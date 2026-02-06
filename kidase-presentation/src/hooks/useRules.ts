import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { ruleRepository } from '../repositories';
import { ruleEngine, RuleEngine } from '../engine';
import type { RuleDefinition } from '../domain/entities/RuleDefinition';
import type { RuleEntry, EvaluationResult } from '../engine/types';

export function useRules() {
  const {
    currentPresentation,
    currentSlides,
    currentVariables,
    appSettings,
    ruleEvaluationDate,
    setRuleFilteredSlideIds,
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
  const evaluateRules = useCallback((): EvaluationResult[] => {
    const enabledRules = rules.filter(r => r.isEnabled);

    // DEBUG: Log all rules loaded for this presentation
    console.group('[RuleEngine] Evaluating rules');
    console.log('Total rules:', rules.length, 'Enabled:', enabledRules.length);
    console.log('Rules:', rules.map(r => ({ id: r.id, name: r.name, slideId: r.slideId, enabled: r.isEnabled })));

    if (enabledRules.length === 0) {
      console.log('No enabled rules — showing all slides');
      console.groupEnd();
      setRuleFilteredSlideIds(null);
      return [];
    }

    // Parse as local date (YYYY-MM-DD → local midnight) to avoid UTC timezone shift
    const overrideDate = ruleEvaluationDate
      ? new Date(ruleEvaluationDate + 'T12:00:00')
      : undefined;

    const context = RuleEngine.buildContext({
      presentation: currentPresentation,
      variables: currentVariables,
      appSettings,
      overrideDate,
    });

    // DEBUG: Log the base context
    console.log('Base context:', JSON.stringify(context, null, 2));

    const results: EvaluationResult[] = [];
    const hiddenSlideIds = new Set<string>();

    for (const ruleDef of enabledRules) {
      try {
        const ruleEntry: RuleEntry = JSON.parse(ruleDef.ruleJson);
        console.group(`Rule: "${ruleDef.name}" (scope=${ruleDef.scope}, slideId=${ruleDef.slideId || 'all'})`);
        console.log('RuleEntry:', JSON.stringify(ruleEntry, null, 2));

        // Evaluate per-slide if scope is slide, otherwise once
        if (ruleDef.scope === 'slide') {
          if (ruleDef.slideId) {
            // Rule is linked to a specific slide
            const targetSlide = currentSlides.find(s => s.id === ruleDef.slideId);
            if (targetSlide) {
              const slideContext = RuleEngine.buildContext({
                presentation: currentPresentation,
                slide: targetSlide,
                variables: currentVariables,
                appSettings,
                overrideDate,
              });
              const result = ruleEngine.evaluateRule(ruleEntry, slideContext);
              results.push(result);

              console.log(`Slide #${targetSlide.slideOrder} (${targetSlide.id}): matched=${result.matched}, visible=${result.outcome.visible}`);

              if (result.outcome.visible === false) {
                hiddenSlideIds.add(targetSlide.id);
              }
            } else {
              console.warn(`Slide ${ruleDef.slideId} not found in current slides`);
            }
          } else {
            // Rule applies to all slides
            for (const slide of currentSlides) {
              const slideContext = RuleEngine.buildContext({
                presentation: currentPresentation,
                slide,
                variables: currentVariables,
                appSettings,
                overrideDate,
              });
              const result = ruleEngine.evaluateRule(ruleEntry, slideContext);
              results.push(result);

              console.log(`Slide #${slide.slideOrder} (${slide.id}): matched=${result.matched}, visible=${result.outcome.visible}`);

              if (result.outcome.visible === false) {
                hiddenSlideIds.add(slide.id);
              }
            }
          }
        } else {
          const result = ruleEngine.evaluateRule(ruleEntry, context);
          results.push(result);
          console.log(`Presentation-level: matched=${result.matched}, outcome=`, result.outcome);
        }
        console.groupEnd();
      } catch (err) {
        console.error(`Failed to evaluate rule ${ruleDef.id}:`, err);
      }
    }

    // Compute filtered slide IDs (slides not hidden by rules)
    console.log('Hidden slide IDs:', [...hiddenSlideIds]);
    if (hiddenSlideIds.size > 0) {
      const visibleIds = currentSlides
        .filter(s => !hiddenSlideIds.has(s.id))
        .map(s => s.id);
      console.log(`Filtering: ${currentSlides.length} total → ${visibleIds.length} visible, ${hiddenSlideIds.size} hidden`);
      setRuleFilteredSlideIds(visibleIds);
    } else {
      console.log('No slides hidden by rules — showing all');
      setRuleFilteredSlideIds(null);
    }
    console.groupEnd();

    return results;
  }, [rules, currentPresentation, currentSlides, currentVariables, appSettings, ruleEvaluationDate, setRuleFilteredSlideIds]);

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
