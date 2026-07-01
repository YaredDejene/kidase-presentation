import {
  WhenClause, FieldCondition,
  ValidationResult, ValidationIssue,
} from './types';

const COMPARISON_OPERATORS = new Set([
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
  '$in', '$nin', '$exists', '$regex', '$contains',
  '$startsWith', '$endsWith', '$between', '$all',
]);

const LOGICAL_OPERATORS = new Set(['$and', '$or', '$not']);

const EXPRESSION_OPERATORS = new Set([
  '$concat', '$add', '$subtract', '$multiply', '$divide',
  '$toUpper', '$toLower', '$trim', '$coalesce', '$now', '$cond',
]);

export class RuleValidator {
  validate(rule: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!rule || typeof rule !== 'object') {
      issues.push({ path: '', message: 'Rule must be a non-null object', severity: 'error' });
      return { valid: false, issues };
    }

    const r = rule as Record<string, unknown>;

    // Required fields
    if (typeof r.id !== 'string' || r.id.length === 0) {
      issues.push({ path: 'id', message: 'Rule must have a non-empty string id', severity: 'error' });
    }

    if (!r.when || typeof r.when !== 'object') {
      issues.push({ path: 'when', message: 'Rule must have a "when" clause object', severity: 'error' });
    } else {
      this.validateWhen(r.when as WhenClause, 'when', issues);
    }

    if (!r.then || typeof r.then !== 'object') {
      issues.push({ path: 'then', message: 'Rule must have a "then" outcome object', severity: 'error' });
    }

    if (r.otherwise !== undefined && (typeof r.otherwise !== 'object' || r.otherwise === null)) {
      issues.push({ path: 'otherwise', message: '"otherwise" must be an object if provided', severity: 'error' });
    }

    return { valid: issues.filter(i => i.severity === 'error').length === 0, issues };
  }

  private validateWhen(when: WhenClause, path: string, issues: ValidationIssue[]): void {
    if (Array.isArray(when)) {
      issues.push({ path, message: 'When clause must be an object, not an array', severity: 'error' });
      return;
    }

    // Check for $diff
    if ('$diff' in when) {
      this.validateDiff(when.$diff as Record<string, unknown>, `${path}.$diff`, issues);
      return;
    }

    // Check for $nthDayAfter
    if ('$nthDayAfter' in when) {
      this.validateNthDayAfter(when.$nthDayAfter as Record<string, unknown>, `${path}.$nthDayAfter`, issues);
      return;
    }

    const entries = Object.entries(when);
    if (entries.length === 0) {
      issues.push({ path, message: 'When clause cannot be empty', severity: 'error' });
      return;
    }

    for (const [key, value] of entries) {
      if (LOGICAL_OPERATORS.has(key)) {
        this.validateLogical(key, value, `${path}.${key}`, issues);
      } else if (key.startsWith('$')) {
        if (!COMPARISON_OPERATORS.has(key) && !LOGICAL_OPERATORS.has(key)) {
          issues.push({ path: `${path}.${key}`, message: `Unknown operator: ${key}`, severity: 'error' });
        }
      } else {
        // Field condition
        this.validateCondition(value, `${path}.${key}`, issues);
      }
    }
  }

  private validateLogical(op: string, value: unknown, path: string, issues: ValidationIssue[]): void {
    if (op === '$not') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        issues.push({ path, message: '$not requires an object condition', severity: 'error' });
        return;
      }
      this.validateWhen(value as WhenClause, path, issues);
      return;
    }

    // $and, $or
    if (!Array.isArray(value)) {
      issues.push({ path, message: `${op} requires an array of conditions`, severity: 'error' });
      return;
    }

    if (value.length === 0) {
      issues.push({ path, message: `${op} should not be empty`, severity: 'warning' });
    }

    value.forEach((clause, i) => {
      if (!clause || typeof clause !== 'object') {
        issues.push({ path: `${path}[${i}]`, message: 'Each condition must be an object', severity: 'error' });
      } else {
        this.validateWhen(clause as WhenClause, `${path}[${i}]`, issues);
      }
    });
  }

  private validateCondition(condition: unknown, path: string, issues: ValidationIssue[]): void {
    // Shorthand literal is always valid
    if (condition === null || typeof condition !== 'object') return;

    if (Array.isArray(condition)) {
      issues.push({ path, message: 'Field condition cannot be an array; use an operator object', severity: 'error' });
      return;
    }

    const cond = condition as FieldCondition;
    for (const [op, val] of Object.entries(cond)) {
      if (!COMPARISON_OPERATORS.has(op)) {
        issues.push({ path: `${path}.${op}`, message: `Unknown comparison operator: ${op}`, severity: 'error' });
        continue;
      }

      // Validate operator-specific value shapes
      if ((op === '$in' || op === '$nin' || op === '$all') && !Array.isArray(val)) {
        issues.push({ path: `${path}.${op}`, message: `${op} requires an array value`, severity: 'error' });
      }
      if (op === '$between') {
        if (!Array.isArray(val) || val.length !== 2) {
          issues.push({ path: `${path}.${op}`, message: '$between requires an array of exactly [min, max]', severity: 'error' });
        }
      }
      if (op === '$regex' && typeof val !== 'string') {
        issues.push({ path: `${path}.${op}`, message: '$regex requires a string pattern', severity: 'error' });
      }
      if (op === '$exists' && typeof val !== 'boolean') {
        issues.push({ path: `${path}.${op}`, message: '$exists requires a boolean value', severity: 'warning' });
      }
    }
  }

  private validateDiff(diff: Record<string, unknown>, path: string, issues: ValidationIssue[]): void {
    if (!diff.from) {
      issues.push({ path: `${path}.from`, message: '$diff requires a "from" value', severity: 'error' });
    }
    if (!diff.to) {
      issues.push({ path: `${path}.to`, message: '$diff requires a "to" value', severity: 'error' });
    }
    const validUnits = new Set(['days', 'weeks', 'months', 'years']);
    if (!diff.unit || !validUnits.has(diff.unit as string)) {
      issues.push({ path: `${path}.unit`, message: '$diff requires unit: days|weeks|months|years', severity: 'error' });
    }

    // Must have at least one comparison operator
    const hasOp = Object.keys(diff).some(k => COMPARISON_OPERATORS.has(k));
    if (!hasOp) {
      issues.push({ path, message: '$diff must contain a comparison operator (e.g. $lte: 7)', severity: 'error' });
    }
  }

  private validateNthDayAfter(clause: Record<string, unknown>, path: string, issues: ValidationIssue[]): void {
    if (!clause.from) {
      issues.push({ path: `${path}.from`, message: '$nthDayAfter requires a "from" value', severity: 'error' });
    }

    const validDays = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const day = clause.day;
    if (day === undefined || day === null) {
      issues.push({ path: `${path}.day`, message: '$nthDayAfter requires a "day" value (Sun-Sat or 0-6)', severity: 'error' });
    } else if (typeof day === 'string' && !validDays.has(day)) {
      issues.push({ path: `${path}.day`, message: `Invalid day name: "${day}". Use Sun, Mon, Tue, Wed, Thu, Fri, or Sat`, severity: 'error' });
    } else if (typeof day === 'number' && (day < 0 || day > 6 || !Number.isInteger(day))) {
      issues.push({ path: `${path}.day`, message: 'Numeric day must be an integer 0 (Sun) through 6 (Sat)', severity: 'error' });
    }

    const nth = clause.nth;
    if (nth === undefined || nth === null) {
      issues.push({ path: `${path}.nth`, message: '$nthDayAfter requires an "nth" value (positive integer)', severity: 'error' });
    } else if (typeof nth !== 'number' || nth < 1 || !Number.isInteger(nth)) {
      issues.push({ path: `${path}.nth`, message: '"nth" must be a positive integer (1, 2, 3, ...)', severity: 'error' });
    }

    // Must have at least one comparison operator
    const hasOp = Object.keys(clause).some(k => COMPARISON_OPERATORS.has(k));
    if (!hasOp) {
      issues.push({ path, message: '$nthDayAfter must contain a comparison operator (e.g. $eq: "2026-04-12")', severity: 'error' });
    }
  }

  /** Validate an expression object (used in outcomes) */
  validateExpression(expr: unknown, path: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!expr || typeof expr !== 'object') {
      issues.push({ path, message: 'Expression must be an object', severity: 'error' });
      return issues;
    }

    const keys = Object.keys(expr as Record<string, unknown>);
    const exprOps = keys.filter(k => k.startsWith('$'));

    if (exprOps.length === 0) {
      issues.push({ path, message: 'Expression must contain at least one $ operator', severity: 'error' });
    }

    for (const op of exprOps) {
      if (!EXPRESSION_OPERATORS.has(op) && !COMPARISON_OPERATORS.has(op)) {
        issues.push({ path: `${path}.${op}`, message: `Unknown expression operator: ${op}`, severity: 'error' });
      }
    }

    return issues;
  }
}
