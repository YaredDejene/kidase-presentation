import { describe, it, expect } from 'vitest';
import { buildContext } from '../../src/engine/contextBuilder';
import { splitReading } from '../../src/domain/titleSlide';
import type { Gitsawe } from '../../src/domain/entities/Gitsawe';
import type { RuleDefinition } from '../../src/domain/entities/RuleDefinition';

const gitsawe: Gitsawe = {
  id: 'g', lineId: 'ዘወ1', name: '', priority: 1, createdAt: '',
  wengel: 'ሉቃስ ም 24 ቁ 13-33, ማርቆስ ም 1 ቁ 1-9', misbak: 'መዝ ም 1 ቁ 1-2፣ መዝ ም 2 ቁ 3', messageStPaul: 'ሮሜ ም 7 ቁ 1-14', kidaseType: 'ዘእግዝእትነ, ዘሐዋርያት',
};
const rule: RuleDefinition = {
  id: 'r', name: 'r', scope: 'gitsawe', gitsaweId: 'g', isEnabled: true, createdAt: '',
  ruleJson: JSON.stringify({ when: { 'meta.year': { $gte: 2000 } }, then: {}, otherwise: {} }),
};
const meta = (readingChoice?: Record<string, number>) =>
  buildContext({ gitsawes: [gitsawe], gitsaweRules: [rule], overrideDate: new Date('2026-11-08T12:00:00'), readingChoice }).meta as {
    gitsawe: Record<string, string>; readingOptions?: Record<string, string[]>;
  };

describe('reading alternatives', () => {
  it('splits on comma and Ethiopic comma', () => {
    expect(splitReading('ሉቃስ ም 24 ቁ 13-33, ማርቆስ ም 1 ቁ 1-9')).toEqual(['ሉቃስ ም 24 ቁ 13-33', 'ማርቆስ ም 1 ቁ 1-9']);
    expect(splitReading('መዝ ም 1 ቁ 1-2፣ መዝ ም 2 ቁ 3')).toEqual(['መዝ ም 1 ቁ 1-2', 'መዝ ም 2 ቁ 3']);
  });

  it('uses the first alternative by default and lists the options', () => {
    const m = meta();
    expect(m.gitsawe.wengel).toBe('ሉቃስ ም 24 ቁ 13-33');
    expect(m.gitsawe.misbak).toBe('መዝ ም 1 ቁ 1-2');
    expect(m.gitsawe.messageStPaul).toBe('ሮሜ ም 7 ቁ 1-14');
    expect(m.gitsawe.kidaseType).toBe('ዘእግዝእትነ');
    expect(Object.keys(m.readingOptions ?? {})).toEqual(['kidaseType', 'misbak', 'gospel']);
  });

  it('applies the chosen alternative', () => {
    expect(meta({ gospel: 1 }).gitsawe.wengel).toBe('ማርቆስ ም 1 ቁ 1-9');
    expect(meta({ gospel: 5 }).gitsawe.wengel).toBe('ሉቃስ ም 24 ቁ 13-33');
    expect(meta({ kidaseType: 1 }).gitsawe.kidaseType).toBe('ዘሐዋርያት');
  });
});
