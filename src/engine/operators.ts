import { UnknownOperatorError } from './errors';

type CompareValue = string | number | boolean | null;
type CompareFn = (fieldVal: unknown, ruleVal: unknown) => boolean;

export class OperatorRegistry {
  private operators = new Map<string, CompareFn>();

  constructor() {
    this.registerDefaults();
  }

  register(name: string, fn: CompareFn): void {
    this.operators.set(name, fn);
  }

  get(name: string): CompareFn {
    const fn = this.operators.get(name);
    if (!fn) throw new UnknownOperatorError(name);
    return fn;
  }

  has(name: string): boolean {
    return this.operators.has(name);
  }

  private registerDefaults(): void {
    // ── Equality ──
    this.register('$eq', (a, b) => coerce(a) === coerce(b));
    this.register('$ne', (a, b) => coerce(a) !== coerce(b));

    // ── Ordering ──
    this.register('$gt', (a, b) => toNum(a) > toNum(b));
    this.register('$gte', (a, b) => toNum(a) >= toNum(b));
    this.register('$lt', (a, b) => toNum(a) < toNum(b));
    this.register('$lte', (a, b) => toNum(a) <= toNum(b));

    // ── Set membership ──
    this.register('$in', (a, b) => {
      if (!Array.isArray(b)) return false;
      const ca = coerce(a);
      return b.some(item => coerce(item) === ca);
    });

    this.register('$nin', (a, b) => {
      if (!Array.isArray(b)) return true;
      const ca = coerce(a);
      return !b.some(item => coerce(item) === ca);
    });

    // ── Existence ──
    this.register('$exists', (a, b) => {
      const exists = a !== undefined && a !== null;
      return b ? exists : !exists;
    });

    // ── String pattern ──
    this.register('$regex', (a, b) => {
      if (typeof a !== 'string' || typeof b !== 'string') return false;
      try {
        return new RegExp(b).test(a);
      } catch {
        return false;
      }
    });

    this.register('$contains', (a, b) => {
      if (typeof a === 'string' && typeof b === 'string') {
        return a.includes(b);
      }
      if (Array.isArray(a)) {
        return a.some(item => coerce(item) === coerce(b));
      }
      return false;
    });

    this.register('$startsWith', (a, b) => {
      if (typeof a !== 'string' || typeof b !== 'string') return false;
      return a.startsWith(b);
    });

    this.register('$endsWith', (a, b) => {
      if (typeof a !== 'string' || typeof b !== 'string') return false;
      return a.endsWith(b);
    });

    // ── Range (works with numbers and strings like "YYYY-MM-DD") ──
    this.register('$between', (a, b) => {
      if (!Array.isArray(b) || b.length !== 2) return false;
      const lo = b[0];
      const hi = b[1];
      // Use string comparison when all values are strings (e.g. date strings)
      if (typeof a === 'string' && typeof lo === 'string' && typeof hi === 'string') {
        return a >= lo && a <= hi;
      }
      const num = toNum(a);
      return num >= toNum(lo) && num <= toNum(hi);
    });

    // ── Array: all elements present ──
    this.register('$all', (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      return b.every(required =>
        a.some(item => coerce(item) === coerce(required))
      );
    });
  }
}

/** Coerce to a comparable primitive */
function coerce(val: unknown): CompareValue {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val;
  return String(val);
}

/** Coerce to number for ordering */
function toNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  if (typeof val === 'boolean') return val ? 1 : 0;
  return 0;
}
