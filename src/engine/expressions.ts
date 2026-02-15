import { DSLExpression, DSLValue, RuleContext, WhenClause } from './types';
import { EvaluationError } from './errors';
import { RefResolver } from './resolver';

export class ExpressionEvaluator {
  constructor(
    private resolver: RefResolver,
    private condEvaluator?: (when: WhenClause, context: RuleContext) => boolean,
  ) {}

  /** Set the condition evaluator (avoids circular dep at construction time) */
  setCondEvaluator(fn: (when: WhenClause, context: RuleContext) => boolean): void {
    this.condEvaluator = fn;
  }

  evaluate(expr: DSLExpression, context: RuleContext): unknown {
    const ops = Object.keys(expr).filter(k => k.startsWith('$'));
    if (ops.length === 0) return null;

    const op = ops[0];
    const arg = expr[op];

    switch (op) {
      case '$concat':
        return this.evalConcat(arg, context);
      case '$add':
        return this.evalMath(arg, context, (a, b) => a + b);
      case '$subtract':
        return this.evalMath(arg, context, (a, b) => a - b);
      case '$multiply':
        return this.evalMath(arg, context, (a, b) => a * b);
      case '$divide':
        return this.evalMath(arg, context, (a, b) => b === 0 ? 0 : a / b);
      case '$toUpper':
        return String(this.resolveArg(arg as DSLValue, context)).toUpperCase();
      case '$toLower':
        return String(this.resolveArg(arg as DSLValue, context)).toLowerCase();
      case '$trim':
        return String(this.resolveArg(arg as DSLValue, context)).trim();
      case '$coalesce':
        return this.evalCoalesce(arg, context);
      case '$now':
        return new Date().toISOString();
      case '$cond':
        return this.evalCond(arg as Record<string, unknown>, context);
      default:
        throw new EvaluationError(`Unknown expression operator: ${op}`);
    }
  }

  private evalConcat(arg: unknown, context: RuleContext): string {
    if (!Array.isArray(arg)) return '';
    return arg.map(v => String(this.resolveArg(v as DSLValue, context) ?? '')).join('');
  }

  private evalMath(
    arg: unknown,
    context: RuleContext,
    fn: (a: number, b: number) => number,
  ): number {
    if (!Array.isArray(arg) || arg.length < 2) return 0;
    const values = arg.map(v => toNumber(this.resolveArg(v as DSLValue, context)));
    return values.reduce(fn);
  }

  private evalCoalesce(arg: unknown, context: RuleContext): unknown {
    if (!Array.isArray(arg)) return null;
    for (const v of arg) {
      const resolved = this.resolveArg(v as DSLValue, context);
      if (resolved !== null && resolved !== undefined) return resolved;
    }
    return null;
  }

  private evalCond(arg: Record<string, unknown>, context: RuleContext): unknown {
    if (!this.condEvaluator) {
      throw new EvaluationError('$cond evaluation requires a condition evaluator');
    }

    const condition = arg.if as WhenClause;
    const thenVal = arg.then as DSLValue | DSLExpression;
    const elseVal = arg.else as DSLValue | DSLExpression;

    const matched = this.condEvaluator(condition, context);
    const branch = matched ? thenVal : elseVal;

    if (branch !== null && typeof branch === 'object' && !Array.isArray(branch)) {
      const hasOps = Object.keys(branch as Record<string, unknown>).some(k => k.startsWith('$'));
      if (hasOps) return this.evaluate(branch as DSLExpression, context);
    }

    return this.resolveArg(branch as DSLValue, context);
  }

  private resolveArg(val: DSLValue, context: RuleContext): unknown {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string' && val.startsWith('$ref:')) {
      return this.resolver.resolve(val.slice(5), context);
    }
    return val;
  }
}

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
