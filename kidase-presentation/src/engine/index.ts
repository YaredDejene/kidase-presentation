import { RuleEngine } from './engine';

// Core classes
export { RuleEngine } from './engine';
export { OperatorRegistry } from './operators';
export { RefResolver } from './resolver';
export { RuleNormalizer } from './normalizer';
export { RuleValidator } from './validator';
export { RuleEvaluator } from './evaluator';
export { ExpressionEvaluator } from './expressions';
export { ASTCache } from './cache';

// Error classes
export {
  RuleEngineError,
  ValidationError,
  NormalizationError,
  ResolutionError,
  EvaluationError,
  UnknownOperatorError,
} from './errors';

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
