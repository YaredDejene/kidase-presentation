import { describe, expect, it } from 'vitest';
import { addMonths, monthKey, monthRange } from '../src/lib/months';

describe('month cache keys', () => {
  it('keys and ranges by Gregorian month', () => {
    expect(monthKey('2026-10-23')).toBe('2026-10');
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2027-02')).toEqual({ from: '2027-02-01', to: '2027-02-28' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('steps months across year ends', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
    expect(addMonths('2026-10', 12)).toBe('2027-10');
  });
});

