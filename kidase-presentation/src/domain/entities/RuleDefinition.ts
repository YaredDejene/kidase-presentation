export type RuleScope = 'presentation' | 'slide' | 'global';

export interface RuleDefinition {
  id: string;
  name: string;
  scope: RuleScope;
  presentationId?: string;
  slideId?: string;
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
    isEnabled?: boolean;
  },
): Omit<RuleDefinition, 'id' | 'createdAt'> {
  return {
    name,
    scope,
    presentationId: options?.presentationId,
    slideId: options?.slideId,
    ruleJson,
    isEnabled: options?.isEnabled ?? true,
  };
}
