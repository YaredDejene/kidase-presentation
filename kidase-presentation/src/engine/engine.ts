import {
  RuleEntry, RuleContext, EvaluationResult, ValidationResult,
  NormalizedRule, WhenClause,
} from './types';
import { OperatorRegistry } from './operators';
import { RefResolver } from './resolver';
import { RuleNormalizer } from './normalizer';
import { RuleValidator } from './validator';
import { RuleEvaluator } from './evaluator';
import { ExpressionEvaluator } from './expressions';
import { ASTCache } from './cache';
import type { Presentation } from '../domain/entities/Presentation';
import type { Slide } from '../domain/entities/Slide';
import type { Variable } from '../domain/entities/Variable';
import type { AppSettings } from '../domain/entities/AppSettings';

export class RuleEngine {
  private operators: OperatorRegistry;
  private resolver: RefResolver;
  private normalizer: RuleNormalizer;
  private validator: RuleValidator;
  private evaluator: RuleEvaluator;
  private exprEvaluator: ExpressionEvaluator;
  private cache: ASTCache;

  constructor(cacheSize = 256, cacheTtlMs = 5 * 60 * 1000) {
    this.operators = new OperatorRegistry();
    this.resolver = new RefResolver();
    this.normalizer = new RuleNormalizer();
    this.validator = new RuleValidator();
    this.exprEvaluator = new ExpressionEvaluator(this.resolver);
    this.evaluator = new RuleEvaluator(this.operators, this.resolver, this.exprEvaluator);
    this.cache = new ASTCache(cacheSize, cacheTtlMs);

    // Wire up $cond support: ExpressionEvaluator needs to call back into the
    // normalizer + evaluator for condition evaluation.
    this.exprEvaluator.setCondEvaluator((when: WhenClause, ctx: RuleContext) => {
      const ast = this.normalizer.normalize({
        id: '__cond__',
        when,
        then: {},
      });
      return this.evaluator.evaluate(ast, ctx).matched;
    });
  }

  // ── Public API ────────────────────────────────────────────────────────

  /** Validate a rule DSL object before use */
  validate(rule: unknown): ValidationResult {
    return this.validator.validate(rule);
  }

  /** Normalize a rule into an AST (uses cache) */
  normalize(rule: RuleEntry): NormalizedRule {
    const cached = this.cache.get(rule.id);
    if (cached) return cached;

    const normalized = this.normalizer.normalize(rule);
    this.cache.set(rule.id, normalized);
    return normalized;
  }

  /** Evaluate a single rule against a context */
  evaluateRule(rule: RuleEntry, context: RuleContext): EvaluationResult {
    const normalized = this.normalize(rule);
    return this.evaluator.evaluate(normalized, context);
  }

  /** Evaluate multiple rules, return all results */
  evaluateAll(rules: RuleEntry[], context: RuleContext): EvaluationResult[] {
    return rules.map(rule => this.evaluateRule(rule, context));
  }

  /** Evaluate rules and return only matched results */
  evaluateMatched(rules: RuleEntry[], context: RuleContext): EvaluationResult[] {
    return this.evaluateAll(rules, context).filter(r => r.matched);
  }

  /** Invalidate cached AST for a rule */
  invalidateRule(ruleId: string): void {
    this.cache.invalidate(ruleId);
  }

  /** Clear all cached ASTs */
  clearCache(): void {
    this.cache.clear();
  }

  /** Register a custom operator */
  registerOperator(name: string, fn: (fieldVal: unknown, ruleVal: unknown) => boolean): void {
    this.operators.register(name, fn);
  }

  /** Access to resolver for direct path lookups */
  resolvePath(path: string, context: RuleContext): unknown {
    return this.resolver.resolve(path, context);
  }

  // ── Static Context Builder ────────────────────────────────────────────

  static buildContext(args: {
    presentation?: Presentation | null;
    slide?: Slide | null;
    variables?: Variable[];
    appSettings?: AppSettings | null;
    extra?: Record<string, unknown>;
  }): RuleContext {
    const vars: Record<string, string> = {};
    if (args.variables) {
      for (const v of args.variables) {
        // Store by clean name (without braces) and raw name
        vars[v.name] = v.value;
        const clean = v.name.replace(/^\{\{|\}\}$/g, '');
        if (clean !== v.name) {
          vars[clean] = v.value;
        }
      }
    }

    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return {
      presentation: args.presentation ? toRecord(args.presentation) : {},
      slide: args.slide ? toRecord(args.slide) : {},
      vars,
      settings: args.appSettings ? toRecord(args.appSettings) : {},
      meta: {
        now: now.toISOString(),
        dayOfWeek: dayNames[now.getDay()],
        ...args.extra,
      },
    };
  }
}

/** Shallow-convert a typed entity to Record<string, unknown> */
function toRecord(obj: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value;
  }
  return result;
}
