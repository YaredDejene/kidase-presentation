import {
  ASTNode, ComparisonNode, LogicalNode, DiffNode, NthDayAfterNode,
  ResolvedValue, NormalizedRule,
  RuleEntry, WhenClause, ConditionEntry, FieldCondition,
  ComparisonOperator, DSLValue, DSLExpression, DayOfWeekName,
} from './types';
import { NormalizationError } from './errors';

const LOGICAL_OPERATORS = new Set(['$and', '$or', '$not']);
const COMPARISON_OPERATORS = new Set<string>([
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
  '$in', '$nin', '$exists', '$regex', '$contains',
  '$startsWith', '$endsWith', '$between', '$all',
]);

export class RuleNormalizer {
  /** Convert a DSL RuleEntry into a NormalizedRule with an AST */
  normalize(rule: RuleEntry): NormalizedRule {
    const expressions = this.extractExpressions(rule);
    const ast = this.normalizeWhen(rule.when as WhenClause);

    return {
      id: rule.id,
      ast,
      then: rule.then,
      otherwise: rule.otherwise,
      expressions: Object.keys(expressions).length > 0 ? expressions : undefined,
    };
  }

  private normalizeWhen(when: WhenClause): ASTNode {
    // Check for $diff at top level
    if ('$diff' in when) {
      return this.normalizeDiff(when.$diff as Record<string, unknown>);
    }

    // Check for $nthDayAfter at top level
    if ('$nthDayAfter' in when) {
      return this.normalizeNthDayAfter(when.$nthDayAfter as Record<string, unknown>);
    }

    const entries = Object.entries(when);
    if (entries.length === 0) {
      throw new NormalizationError('Empty when clause');
    }

    const nodes: ASTNode[] = [];

    for (const [key, value] of entries) {
      if (LOGICAL_OPERATORS.has(key)) {
        nodes.push(this.normalizeLogical(key, value as WhenClause[] | WhenClause));
      } else {
        nodes.push(...this.normalizeFieldEntry(key, value as ConditionEntry));
      }
    }

    // If multiple top-level entries, wrap in implicit $and
    return nodes.length === 1 ? nodes[0] : { type: 'logical', operator: '$and', children: nodes };
  }

  private normalizeLogical(operator: string, value: WhenClause[] | WhenClause): LogicalNode {
    if (operator === '$not') {
      const child = this.normalizeWhen(value as WhenClause);
      return { type: 'logical', operator: '$not', children: [child] };
    }

    if (!Array.isArray(value)) {
      throw new NormalizationError(`${operator} requires an array of conditions`);
    }

    const children = value.map(clause => this.normalizeWhen(clause));
    return { type: 'logical', operator: operator as '$and' | '$or', children };
  }

  private normalizeFieldEntry(path: string, condition: ConditionEntry): ComparisonNode[] {
    // Shorthand equality: { "path": "value" } or { "path": 42 }
    if (condition === null || typeof condition !== 'object') {
      return [{
        type: 'comparison',
        path,
        operator: '$eq',
        value: this.toResolvedValue(condition as DSLValue),
      }];
    }

    // Full condition: { "path": { "$op": val, ... } }
    const cond = condition as FieldCondition;
    const nodes: ComparisonNode[] = [];

    for (const [op, val] of Object.entries(cond)) {
      if (!COMPARISON_OPERATORS.has(op)) {
        throw new NormalizationError(`Unknown comparison operator: ${op}`);
      }

      let resolvedVal: ResolvedValue;
      if (Array.isArray(val)) {
        resolvedVal = { kind: 'array', items: val.map(v => this.toResolvedValue(v)) };
      } else {
        resolvedVal = this.toResolvedValue(val as DSLValue);
      }

      nodes.push({
        type: 'comparison',
        path,
        operator: op as ComparisonOperator,
        value: resolvedVal,
      });
    }

    return nodes;
  }

  private normalizeDiff(diff: Record<string, unknown>): DiffNode {
    const from = diff.from as DSLValue;
    const to = diff.to as DSLValue;
    const unit = diff.unit as DiffNode['unit'];

    if (!from || !to || !unit) {
      throw new NormalizationError('$diff requires from, to, and unit');
    }

    // Find the comparison operator (the key that's not from/to/unit)
    let operator: ComparisonOperator | undefined;
    let value: DSLValue | undefined;

    for (const [key, val] of Object.entries(diff)) {
      if (key !== 'from' && key !== 'to' && key !== 'unit') {
        if (COMPARISON_OPERATORS.has(key)) {
          operator = key as ComparisonOperator;
          value = val as DSLValue;
        }
      }
    }

    if (!operator || value === undefined) {
      throw new NormalizationError('$diff requires a comparison operator (e.g. $lte: 7)');
    }

    return {
      type: 'diff',
      from: this.toResolvedValue(from),
      to: this.toResolvedValue(to),
      unit,
      operator,
      value: this.toResolvedValue(value),
    };
  }

  private normalizeNthDayAfter(clause: Record<string, unknown>): NthDayAfterNode {
    const from = clause.from as DSLValue;
    const day = clause.day as DayOfWeekName | number;
    const nth = clause.nth as number;

    if (!from) {
      throw new NormalizationError('$nthDayAfter requires a "from" value');
    }
    if (day === undefined || day === null) {
      throw new NormalizationError('$nthDayAfter requires a "day" value');
    }
    if (!nth || nth < 1) {
      throw new NormalizationError('$nthDayAfter requires "nth" as a positive integer');
    }

    const dayOfWeek = typeof day === 'number' ? day : parseDayOfWeek(day);

    // Find the comparison operator (key that's not from/day/nth)
    let operator: ComparisonOperator | undefined;
    let value: DSLValue | undefined;

    for (const [key, val] of Object.entries(clause)) {
      if (key !== 'from' && key !== 'day' && key !== 'nth') {
        if (COMPARISON_OPERATORS.has(key)) {
          operator = key as ComparisonOperator;
          value = val as DSLValue;
        }
      }
    }

    if (!operator || value === undefined) {
      throw new NormalizationError('$nthDayAfter requires a comparison operator (e.g. $eq: "2026-04-12")');
    }

    let resolvedVal: ResolvedValue;
    if (Array.isArray(value)) {
      resolvedVal = { kind: 'array', items: (value as DSLValue[]).map(v => this.toResolvedValue(v)) };
    } else {
      resolvedVal = this.toResolvedValue(value);
    }

    return {
      type: 'nthDayAfter',
      from: this.toResolvedValue(from),
      dayOfWeek,
      nth,
      operator,
      value: resolvedVal,
    };
  }

  toResolvedValue(val: DSLValue): ResolvedValue {
    if (val === null || val === undefined) {
      return { kind: 'literal', value: null };
    }
    if (typeof val === 'string' && val.startsWith('$ref:')) {
      return { kind: 'ref', path: val.slice(5) };
    }
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return { kind: 'literal', value: val };
    }
    // If it's an object, treat as literal null (expressions handled separately)
    return { kind: 'literal', value: null };
  }

  private extractExpressions(rule: RuleEntry): Record<string, DSLExpression> {
    const expressions: Record<string, DSLExpression> = {};
    this.findExpressionsInOutcome(rule.then, expressions, 'then');
    if (rule.otherwise) {
      this.findExpressionsInOutcome(rule.otherwise, expressions, 'otherwise');
    }
    return expressions;
  }

  private findExpressionsInOutcome(
    outcome: Record<string, unknown>,
    into: Record<string, DSLExpression>,
    prefix: string
  ): void {
    for (const [key, val] of Object.entries(outcome)) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>;
        const hasExprOp = Object.keys(obj).some(k => k.startsWith('$'));
        if (hasExprOp) {
          into[`${prefix}.${key}`] = obj as DSLExpression;
        }
      }
    }
  }
}

const DAY_NAME_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function parseDayOfWeek(name: DayOfWeekName): number {
  const val = DAY_NAME_MAP[name];
  if (val === undefined) {
    throw new NormalizationError(`Invalid day name: "${name}". Use Sun, Mon, Tue, Wed, Thu, Fri, or Sat`);
  }
  return val;
}
