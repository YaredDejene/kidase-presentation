import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../../src/engine/engine';
import { RuleEntry, RuleContext } from '../../src/engine/types';

function makeContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    presentation: {},
    slide: {},
    vars: {},
    settings: {},
    meta: {},
    ...overrides,
  };
}

let ruleCounter = 0;
function makeRule(nthDayAfter: Record<string, unknown>): RuleEntry {
  return {
    id: `test-nth-${++ruleCounter}`,
    when: { $nthDayAfter: nthDayAfter } as any,
    then: { visible: true },
    otherwise: { visible: false },
  };
}

describe('$nthDayAfter', () => {
  const engine = new RuleEngine();

  // ── Basic: 1st Sunday after 2026-04-05 (Sunday) = 2026-04-12 ──

  it('computes the 1st Sunday after a Sunday reference date', () => {
    const rule = makeRule({
      from: '2026-04-05',  // Sunday
      day: 'Sun',
      nth: 1,
      $eq: '2026-04-12',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  it('computes the 2nd Sunday after a reference date', () => {
    const rule = makeRule({
      from: '2026-04-05',
      day: 'Sun',
      nth: 2,
      $eq: '2026-04-19',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  it('computes the 7th Sunday after a reference date', () => {
    const rule = makeRule({
      from: '2026-04-05',
      day: 'Sun',
      nth: 7,
      $eq: '2026-05-24',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  // ── Different day of week ──

  it('computes the 1st Monday after a reference date', () => {
    const rule = makeRule({
      from: '2026-04-05',  // Sunday
      day: 'Mon',
      nth: 1,
      $eq: '2026-04-06',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  it('computes the 1st Saturday after a Sunday', () => {
    const rule = makeRule({
      from: '2026-04-05',  // Sunday
      day: 'Sat',
      nth: 1,
      $eq: '2026-04-11',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  it('computes the 1st Friday after a Friday reference date (skips the reference day)', () => {
    const rule = makeRule({
      from: '2026-04-10',  // Friday
      day: 'Fri',
      nth: 1,
      $eq: '2026-04-17',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  // ── Numeric day values ──

  it('accepts numeric day (0=Sun)', () => {
    const rule = makeRule({
      from: '2026-04-05',
      day: 0,  // Sunday
      nth: 1,
      $eq: '2026-04-12',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  it('accepts numeric day (3=Wed)', () => {
    const rule = makeRule({
      from: '2026-04-05',  // Sunday
      day: 3,  // Wednesday
      nth: 1,
      $eq: '2026-04-08',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  // ── Non-eq comparison operators ──

  it('works with $lte operator', () => {
    // 1st Sunday after 2026-04-05 = 2026-04-12
    const rule = makeRule({
      from: '2026-04-05',
      day: 'Sun',
      nth: 1,
      $lte: '2026-04-15',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  it('works with $gte operator', () => {
    // 1st Sunday after 2026-04-05 = 2026-04-12
    const rule = makeRule({
      from: '2026-04-05',
      day: 'Sun',
      nth: 1,
      $gte: '2026-04-10',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  it('works with $between operator', () => {
    // 1st Sunday after 2026-04-05 = 2026-04-12
    const rule = makeRule({
      from: '2026-04-05',
      day: 'Sun',
      nth: 1,
      $between: ['2026-04-10', '2026-04-15'],
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });

  it('returns false when $between range does not include computed date', () => {
    // 1st Sunday after 2026-04-05 = 2026-04-12
    const rule = makeRule({
      from: '2026-04-05',
      day: 'Sun',
      nth: 1,
      $between: ['2026-04-01', '2026-04-11'],
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(false);
  });

  // ── With $ref values ──

  it('resolves $ref for the from date', () => {
    const rule = makeRule({
      from: '$ref:meta.holidays.EASTER',
      day: 'Sun',
      nth: 1,
      $eq: '2026-04-12',
    });
    const ctx = makeContext({
      meta: { holidays: { EASTER: '2026-04-05' } },
    });
    const result = engine.evaluateRule(rule, ctx);
    expect(result.matched).toBe(true);
  });

  it('resolves $ref for the comparison value', () => {
    const rule = makeRule({
      from: '2026-04-05',
      day: 'Sun',
      nth: 1,
      $eq: '$ref:meta.date',
    });
    const ctx = makeContext({
      meta: { date: '2026-04-12' },
    });
    const result = engine.evaluateRule(rule, ctx);
    expect(result.matched).toBe(true);
  });

  // ── Returns otherwise when not matched ──

  it('returns otherwise outcome when not matched', () => {
    const rule = makeRule({
      from: '2026-04-05',
      day: 'Sun',
      nth: 1,
      $eq: '2026-04-13',  // Wrong date
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(false);
    expect(result.outcome).toEqual({ visible: false });
  });

  // ── Edge: invalid from date ──

  it('returns false for invalid from date', () => {
    const rule = makeRule({
      from: 'not-a-date',
      day: 'Sun',
      nth: 1,
      $eq: '2026-04-12',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(false);
  });

  // ── Year boundary ──

  it('handles year boundary (December to January)', () => {
    const rule = makeRule({
      from: '2026-12-28',  // Monday
      day: 'Sun',
      nth: 1,
      $eq: '2027-01-03',
    });
    const result = engine.evaluateRule(rule, makeContext());
    expect(result.matched).toBe(true);
  });
});

describe('$nthDayAfter validation', () => {
  const engine = new RuleEngine();

  it('validates a correct $nthDayAfter rule', () => {
    const result = engine.validate({
      id: 'valid',
      when: {
        $nthDayAfter: {
          from: '2026-04-05',
          day: 'Sun',
          nth: 1,
          $eq: '2026-04-12',
        },
      },
      then: { visible: true },
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects missing from', () => {
    const result = engine.validate({
      id: 'bad',
      when: {
        $nthDayAfter: { day: 'Sun', nth: 1, $eq: '2026-04-12' },
      },
      then: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('"from"'))).toBe(true);
  });

  it('rejects missing day', () => {
    const result = engine.validate({
      id: 'bad',
      when: {
        $nthDayAfter: { from: '2026-04-05', nth: 1, $eq: '2026-04-12' },
      },
      then: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('"day"'))).toBe(true);
  });

  it('rejects invalid day name', () => {
    const result = engine.validate({
      id: 'bad',
      when: {
        $nthDayAfter: { from: '2026-04-05', day: 'Sunday', nth: 1, $eq: 'x' },
      },
      then: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('Invalid day name'))).toBe(true);
  });

  it('rejects invalid numeric day', () => {
    const result = engine.validate({
      id: 'bad',
      when: {
        $nthDayAfter: { from: '2026-04-05', day: 7, nth: 1, $eq: 'x' },
      },
      then: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('integer 0'))).toBe(true);
  });

  it('rejects missing nth', () => {
    const result = engine.validate({
      id: 'bad',
      when: {
        $nthDayAfter: { from: '2026-04-05', day: 'Sun', $eq: '2026-04-12' },
      },
      then: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('"nth"'))).toBe(true);
  });

  it('rejects nth = 0', () => {
    const result = engine.validate({
      id: 'bad',
      when: {
        $nthDayAfter: { from: '2026-04-05', day: 'Sun', nth: 0, $eq: 'x' },
      },
      then: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('positive integer'))).toBe(true);
  });

  it('rejects negative nth', () => {
    const result = engine.validate({
      id: 'bad',
      when: {
        $nthDayAfter: { from: '2026-04-05', day: 'Sun', nth: -1, $eq: 'x' },
      },
      then: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('positive integer'))).toBe(true);
  });

  it('rejects missing comparison operator', () => {
    const result = engine.validate({
      id: 'bad',
      when: {
        $nthDayAfter: { from: '2026-04-05', day: 'Sun', nth: 1 },
      },
      then: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('comparison operator'))).toBe(true);
  });
});
