// ─── DSL Input Types (what users write in JSON) ─────────────────────────

/** Reference to a context value via dotted path, e.g. "$ref:vars.IS_FASTING_SEASON" */
export type RefString = `$ref:${string}`;

/** A value in the DSL – literal, ref, or expression */
export type DSLValue = string | number | boolean | null | RefString | DSLExpression;

/** Comparison operators */
export type ComparisonOperator =
  | '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte'
  | '$in' | '$nin'
  | '$exists' | '$regex' | '$contains'
  | '$startsWith' | '$endsWith'
  | '$between' | '$all';

/** A single field condition: { "path": { "$op": value } } */
export type FieldCondition = {
  [op in ComparisonOperator]?: DSLValue | DSLValue[];
};

/** Shorthand equality: { "path": "literalValue" } or full condition */
export type ConditionEntry = DSLValue | FieldCondition;

/** The `when` clause – object of path→condition, or logical combinator */
export interface WhenClause {
  [pathOrLogical: string]: ConditionEntry | WhenClause[] | WhenClause;
}

/** Logical operators used as keys in WhenClause */
export type LogicalOperator = '$and' | '$or' | '$not';

/** Date diff operator in when clause: { "$diff": { from, to, unit, $op: val } } */
export interface DiffClause {
  $diff: {
    from: DSLValue;
    to: DSLValue;
    unit: 'days' | 'weeks' | 'months' | 'years';
    [op: string]: DSLValue | string;
  };
}

/** Day-of-week name strings */
export type DayOfWeekName = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

/** Nth day-after operator: { "$nthDayAfter": { from, day, nth, $op: val } } */
export interface NthDayAfterClause {
  $nthDayAfter: {
    from: DSLValue;
    day: DayOfWeekName | number;
    nth: number;
    [op: string]: DSLValue | string | number;
  };
}

/** Outcome object – what happens when rule matches or doesn't */
export interface RuleOutcome {
  visible?: boolean;
  style?: Record<string, string>;
  value?: DSLValue | DSLExpression;
  [key: string]: unknown;
}

/** A complete rule entry as stored in the DSL */
export interface RuleEntry {
  id: string;
  when: WhenClause | DiffClause | NthDayAfterClause;
  then: RuleOutcome;
  otherwise?: RuleOutcome;
}

// ─── Expression Types ($expr value computations) ────────────────────────

export type ExpressionOperator =
  | '$concat' | '$add' | '$subtract' | '$multiply' | '$divide'
  | '$toUpper' | '$toLower' | '$trim'
  | '$coalesce' | '$now' | '$cond';

export interface CondExpression {
  $cond: {
    if: WhenClause;
    then: DSLValue | DSLExpression;
    else: DSLValue | DSLExpression;
  };
}

export interface DSLExpression {
  [op: string]: DSLValue | DSLValue[] | CondExpression['$cond'];
}

// ─── AST Node Types (internal, after normalization) ─────────────────────

export type ASTNode =
  | ComparisonNode
  | LogicalNode
  | DiffNode
  | NthDayAfterNode;

export interface ComparisonNode {
  type: 'comparison';
  path: string;
  operator: ComparisonOperator;
  value: ResolvedValue;
}

export interface LogicalNode {
  type: 'logical';
  operator: LogicalOperator;
  children: ASTNode[];
}

export interface DiffNode {
  type: 'diff';
  from: ResolvedValue;
  to: ResolvedValue;
  unit: 'days' | 'weeks' | 'months' | 'years';
  operator: ComparisonOperator;
  value: ResolvedValue;
}

export interface NthDayAfterNode {
  type: 'nthDayAfter';
  from: ResolvedValue;
  dayOfWeek: number;  // 0=Sun, 1=Mon, ..., 6=Sat
  nth: number;
  operator: ComparisonOperator;
  value: ResolvedValue;
}

/** A value that may still need ref resolution */
export type ResolvedValue =
  | { kind: 'literal'; value: string | number | boolean | null }
  | { kind: 'ref'; path: string }
  | { kind: 'array'; items: ResolvedValue[] };

// ─── Normalized Rule (AST form) ─────────────────────────────────────────

export interface NormalizedRule {
  id: string;
  ast: ASTNode;
  then: RuleOutcome;
  otherwise?: RuleOutcome;
  expressions?: Record<string, DSLExpression>;
}

// ─── Context & Result ───────────────────────────────────────────────────

export interface RuleContext {
  presentation: Record<string, unknown>;
  slide: Record<string, unknown>;
  vars: Record<string, string>;
  settings: Record<string, unknown>;
  meta: Record<string, unknown>;
}

export interface EvaluationResult {
  ruleId: string;
  matched: boolean;
  outcome: RuleOutcome;
  computedValues: Record<string, unknown>;
}

// ─── Validation ─────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  path: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
