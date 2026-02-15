import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface RuleState {
  ruleFilteredSlideIds: string[] | null;
  ruleEvaluationDate: string | null;
  isMehella: boolean;
  ruleContextMeta: Record<string, unknown> | null;

  setRuleFilteredSlideIds: (ids: string[] | null) => void;
  setRuleEvaluationDate: (date: string | null) => void;
  setIsMehella: (value: boolean) => void;
  setRuleContextMeta: (meta: Record<string, unknown> | null) => void;
}

export const useRuleStore = create<RuleState>()(
  subscribeWithSelector((set) => ({
    ruleFilteredSlideIds: null,
    ruleEvaluationDate: null,
    isMehella: false,
    ruleContextMeta: null,

    setRuleFilteredSlideIds: (ids) => set({ ruleFilteredSlideIds: ids }),
    setRuleEvaluationDate: (date) => set({ ruleEvaluationDate: date }),
    setIsMehella: (value) => set({ isMehella: value }),
    setRuleContextMeta: (meta) => set({ ruleContextMeta: meta }),
  }))
);
