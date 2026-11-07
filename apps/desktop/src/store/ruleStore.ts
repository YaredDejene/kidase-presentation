import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ReadingChoice } from '@kidase/shared';

interface RuleState {
  ruleFilteredSlideIds: string[] | null;
  ruleEvaluationDate: string | null;
  isMehella: boolean;
  /** Picked alternative per reading for the current date; empty means the first of each. */
  readingChoice: ReadingChoice;
  ruleContextMeta: Record<string, unknown> | null;

  setRuleFilteredSlideIds: (ids: string[] | null) => void;
  setRuleEvaluationDate: (date: string | null) => void;
  setIsMehella: (value: boolean) => void;
  setReadingChoice: (key: string, index: number) => void;
  setRuleContextMeta: (meta: Record<string, unknown> | null) => void;
}

export const useRuleStore = create<RuleState>()(
  subscribeWithSelector((set) => ({
    ruleFilteredSlideIds: null,
    ruleEvaluationDate: null,
    isMehella: false,
    readingChoice: {},
    ruleContextMeta: null,

    setRuleFilteredSlideIds: (ids) => set({ ruleFilteredSlideIds: ids }),
    // A new date has a different gitsawe, so earlier picks no longer apply.
    setRuleEvaluationDate: (date) => set({ ruleEvaluationDate: date, readingChoice: {} }),
    setIsMehella: (value) => set({ isMehella: value }),
    setReadingChoice: (key, index) => set(s => ({ readingChoice: { ...s.readingChoice, [key]: index } })),
    setRuleContextMeta: (meta) => set({ ruleContextMeta: meta }),
  }))
);
