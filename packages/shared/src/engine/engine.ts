import {
  RuleEntry,
  RuleContext,
  EvaluationResult,
  ValidationResult,
  NormalizedRule,
  WhenClause,
} from "./types";
import { OperatorRegistry } from "./operators";
import { RefResolver } from "./resolver";
import { RuleNormalizer } from "./normalizer";
import { RuleValidator } from "./validator";
import { RuleEvaluator } from "./evaluator";
import { ExpressionEvaluator } from "./expressions";
import { ASTCache } from "./cache";

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
    this.evaluator = new RuleEvaluator(
      this.operators,
      this.resolver,
      this.exprEvaluator,
    );
    this.cache = new ASTCache(cacheSize, cacheTtlMs);

    // Wire up $cond support: ExpressionEvaluator needs to call back into the
    // normalizer + evaluator for condition evaluation.
    this.exprEvaluator.setCondEvaluator(
      (when: WhenClause, ctx: RuleContext) => {
        const ast = this.normalizer.normalize({
          id: "__cond__",
          when,
          then: {},
        });
        return this.evaluator.evaluate(ast, ctx).matched;
      },
    );
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
    return rules.map((rule) => this.evaluateRule(rule, context));
  }

  /** Evaluate rules and return only matched results */
  evaluateMatched(
    rules: RuleEntry[],
    context: RuleContext,
  ): EvaluationResult[] {
    return this.evaluateAll(rules, context).filter((r) => r.matched);
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
  registerOperator(
    name: string,
    fn: (fieldVal: unknown, ruleVal: unknown) => boolean,
  ): void {
    this.operators.register(name, fn);
  }

  /** Access to resolver for direct path lookups */
  resolvePath(path: string, context: RuleContext): unknown {
    return this.resolver.resolve(path, context);
  }

}
