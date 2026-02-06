import {
  ASTNode, ComparisonNode, LogicalNode, DiffNode,
  NormalizedRule, RuleContext, EvaluationResult, RuleOutcome,
} from './types';
import { EvaluationError } from './errors';
import { OperatorRegistry } from './operators';
import { RefResolver } from './resolver';
import { ExpressionEvaluator } from './expressions';

export class RuleEvaluator {
  constructor(
    private operators: OperatorRegistry,
    private resolver: RefResolver,
    private exprEvaluator: ExpressionEvaluator,
  ) {}

  evaluate(rule: NormalizedRule, context: RuleContext): EvaluationResult {
    try {
      const matched = this.evalNode(rule.ast, context);
      const outcome = matched ? rule.then : (rule.otherwise ?? {});

      // Compute any expression values in the outcome
      const computedValues: Record<string, unknown> = {};
      if (rule.expressions) {
        const exprSet = matched
          ? Object.entries(rule.expressions).filter(([k]) => k.startsWith('then.'))
          : Object.entries(rule.expressions).filter(([k]) => k.startsWith('otherwise.'));

        for (const [key, expr] of exprSet) {
          const cleanKey = key.replace(/^(then|otherwise)\./, '');
          computedValues[cleanKey] = this.exprEvaluator.evaluate(expr, context);
        }
      }

      return { ruleId: rule.id, matched, outcome, computedValues };
    } catch (err) {
      if (err instanceof EvaluationError) throw err;
      throw new EvaluationError(
        `Error evaluating rule ${rule.id}: ${err instanceof Error ? err.message : String(err)}`,
        rule.id,
      );
    }
  }

  private evalNode(node: ASTNode, context: RuleContext): boolean {
    switch (node.type) {
      case 'comparison':
        return this.evalComparison(node, context);
      case 'logical':
        return this.evalLogical(node, context);
      case 'diff':
        return this.evalDiff(node, context);
    }
  }

  private evalComparison(node: ComparisonNode, context: RuleContext): boolean {
    const fieldVal = this.resolver.resolve(node.path, context);
    const ruleVal = this.resolver.resolveValue(node.value, context);
    const compareFn = this.operators.get(node.operator);
    return compareFn(fieldVal, ruleVal);
  }

  private evalLogical(node: LogicalNode, context: RuleContext): boolean {
    switch (node.operator) {
      case '$and':
        // Short-circuit: stop at first false
        return node.children.every(child => this.evalNode(child, context));
      case '$or':
        // Short-circuit: stop at first true
        return node.children.some(child => this.evalNode(child, context));
      case '$not':
        return !this.evalNode(node.children[0], context);
    }
  }

  private evalDiff(node: DiffNode, context: RuleContext): boolean {
    const fromRaw = this.resolver.resolveValue(node.from, context);
    const toRaw = this.resolver.resolveValue(node.to, context);

    const fromDate = toDate(fromRaw);
    const toDate_ = toDate(toRaw);

    if (!fromDate || !toDate_) return false;

    const diffValue = calcDiff(fromDate, toDate_, node.unit);
    const ruleVal = this.resolver.resolveValue(node.value, context);
    const compareFn = this.operators.get(node.operator);

    return compareFn(diffValue, ruleVal);
  }
}

function toDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'number') return new Date(val);
  return null;
}

function calcDiff(from: Date, to: Date, unit: 'days' | 'weeks' | 'months' | 'years'): number {
  const msPerDay = 86_400_000;
  const diffMs = to.getTime() - from.getTime();

  switch (unit) {
    case 'days':
      return Math.floor(diffMs / msPerDay);
    case 'weeks':
      return Math.floor(diffMs / (msPerDay * 7));
    case 'months': {
      const months = (to.getFullYear() - from.getFullYear()) * 12
        + (to.getMonth() - from.getMonth());
      return months;
    }
    case 'years':
      return to.getFullYear() - from.getFullYear();
  }
}

/** Convenience: evaluate a batch of rules, returning only matched results */
export function evaluateRules(
  rules: NormalizedRule[],
  context: RuleContext,
  evaluator: RuleEvaluator,
): EvaluationResult[] {
  return rules.map(rule => evaluator.evaluate(rule, context));
}

/** Merge multiple outcome objects (later outcomes override earlier) */
export function mergeOutcomes(outcomes: RuleOutcome[]): RuleOutcome {
  const merged: RuleOutcome = {};
  for (const o of outcomes) {
    Object.assign(merged, o);
  }
  return merged;
}
