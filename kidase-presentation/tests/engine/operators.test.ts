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

describe('$between operator', () => {
  const engine = new RuleEngine();

  it('matches when value is within range (numbers)', () => {
    const rule: RuleEntry = {
      id: 'between-num',
      when: { 'vars.count': { $between: [10, 20] } },
      then: { visible: true },
    };
    const ctx = makeContext({ vars: { count: '15' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(true);
  });

  it('matches when value equals lower bound', () => {
    const rule: RuleEntry = {
      id: 'between-lo',
      when: { 'vars.count': { $between: [10, 20] } },
      then: { visible: true },
    };
    const ctx = makeContext({ vars: { count: '10' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(true);
  });

  it('matches when value equals upper bound', () => {
    const rule: RuleEntry = {
      id: 'between-hi',
      when: { 'vars.count': { $between: [10, 20] } },
      then: { visible: true },
    };
    const ctx = makeContext({ vars: { count: '20' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(true);
  });

  it('does not match when value is below range', () => {
    const rule: RuleEntry = {
      id: 'between-below',
      when: { 'vars.count': { $between: [10, 20] } },
      then: { visible: true },
    };
    const ctx = makeContext({ vars: { count: '5' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(false);
  });

  it('does not match when value is above range', () => {
    const rule: RuleEntry = {
      id: 'between-above',
      when: { 'vars.count': { $between: [10, 20] } },
      then: { visible: true },
    };
    const ctx = makeContext({ vars: { count: '25' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(false);
  });

  it('works with date strings', () => {
    const rule: RuleEntry = {
      id: 'between-date',
      when: { 'meta.date': { $between: ['2026-01-01', '2026-12-31'] } },
      then: { visible: true },
    };
    const ctx = makeContext({ meta: { date: '2026-06-15' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(true);
  });
});

describe('$not + $between (opposite of between)', () => {
  const engine = new RuleEngine();

  it('matches when value is outside range', () => {
    const rule: RuleEntry = {
      id: 'not-between',
      when: {
        $not: { 'vars.count': { $between: [10, 20] } },
      },
      then: { visible: true },
    };
    const ctx = makeContext({ vars: { count: '25' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(true);
  });

  it('does not match when value is inside range', () => {
    const rule: RuleEntry = {
      id: 'not-between-inside',
      when: {
        $not: { 'vars.count': { $between: [10, 20] } },
      },
      then: { visible: true },
    };
    const ctx = makeContext({ vars: { count: '15' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(false);
  });

  it('matches when date is outside range', () => {
    const rule: RuleEntry = {
      id: 'not-between-date',
      when: {
        $not: { 'meta.date': { $between: ['2026-03-01', '2026-03-31'] } },
      },
      then: { visible: true },
    };
    const ctx = makeContext({ meta: { date: '2026-04-15' } });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(true);
  });
});

describe('$diff clause', () => {
  const engine = new RuleEngine();

  it('computes day difference and compares with $lte', () => {
    const rule: RuleEntry = {
      id: 'diff-days',
      when: {
        $diff: {
          from: '2026-02-01',
          to: '2026-02-08',
          unit: 'days',
          $lte: 7,
        },
      },
      then: { visible: true },
    };
    expect(engine.evaluateRule(rule, makeContext()).matched).toBe(true);
  });

  it('returns false when difference exceeds threshold', () => {
    const rule: RuleEntry = {
      id: 'diff-too-far',
      when: {
        $diff: {
          from: '2026-01-01',
          to: '2026-03-01',
          unit: 'days',
          $lte: 7,
        },
      },
      then: { visible: true },
    };
    expect(engine.evaluateRule(rule, makeContext()).matched).toBe(false);
  });

  it('computes week difference', () => {
    const rule: RuleEntry = {
      id: 'diff-weeks',
      when: {
        $diff: {
          from: '2026-01-01',
          to: '2026-01-15',
          unit: 'weeks',
          $eq: 2,
        },
      },
      then: { visible: true },
    };
    expect(engine.evaluateRule(rule, makeContext()).matched).toBe(true);
  });

  it('resolves $ref values in diff', () => {
    const rule: RuleEntry = {
      id: 'diff-ref',
      when: {
        $diff: {
          from: '$ref:meta.startDate',
          to: '$ref:meta.now',
          unit: 'days',
          $lte: 10,
        },
      },
      then: { visible: true },
    };
    const ctx = makeContext({
      meta: { startDate: '2026-02-10', now: '2026-02-14' },
    });
    expect(engine.evaluateRule(rule, ctx).matched).toBe(true);
  });
});
