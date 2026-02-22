import { RuleEngine } from './engine';

// Core classes
export { RuleEngine } from './engine';
export { buildContext } from './contextBuilder';
export type { BuildContextArgs } from './contextBuilder';

// Types
export type {
  RefString, DSLValue, ComparisonOperator, FieldCondition, ConditionEntry,
  WhenClause, LogicalOperator, DiffClause, RuleOutcome, RuleEntry,
  ExpressionOperator, CondExpression, DSLExpression,
  ASTNode, ComparisonNode, LogicalNode, DiffNode, ResolvedValue,
  NormalizedRule,
  RuleContext, EvaluationResult,
  ValidationSeverity, ValidationIssue, ValidationResult,
} from './types';

// Singleton instance
export const ruleEngine = new RuleEngine();
