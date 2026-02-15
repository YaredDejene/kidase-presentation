export type RuleScope = 'presentation' | 'slide' | 'gitsawe' | 'global';

export interface RuleDefinition {
  id: string;
  name: string;
  scope: RuleScope;
  presentationId?: string;
  slideId?: string;
  gitsaweId?: string;
  ruleJson: string; // JSON-serialized RuleEntry
  isEnabled: boolean;
  createdAt: string;
}

export function createRuleDefinition(
  name: string,
  scope: RuleScope,
  ruleJson: string,
  options?: {
    presentationId?: string;
    slideId?: string;
    gitsaweId?: string;
    isEnabled?: boolean;
  },
): Omit<RuleDefinition, 'id' | 'createdAt'> {
  return {
    name,
    scope,
    presentationId: options?.presentationId,
    slideId: options?.slideId,
    gitsaweId: options?.gitsaweId,
    ruleJson,
    isEnabled: options?.isEnabled ?? true,
  };
}
