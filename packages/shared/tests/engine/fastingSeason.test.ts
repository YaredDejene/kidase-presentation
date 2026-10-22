import { describe, it, expect } from 'vitest';
import { buildContext } from '../../src/engine/contextBuilder';

// Ethiopian year 2018 (Sept 2025 to Sept 2026): gena 2026-01-07, timket 01-19,
// nineveh 02-02, abiyTsome 02-16, fasika 04-12, paraclete 05-31.
const fasting = (iso: string) =>
  buildContext({ overrideDate: new Date(`${iso}T12:00:00`) }).meta.isFastingSeason;

describe('meta.isFastingSeason', () => {
  it('flags Wednesday and Friday, but not during Easter to Pentecost', () => {
    expect(fasting('2025-10-01')).toBe(true);  // Wed
    expect(fasting('2025-10-03')).toBe(true);  // Fri
    expect(fasting('2025-10-02')).toBe(false); // Thu
    expect(fasting('2026-04-15')).toBe(false); // Wed after Fasika
    expect(fasting('2026-05-29')).toBe(false); // Fri before Paraclete
  });

  it('flags the Advent fast (Hidar 15 to Tahsas 29) except Gena', () => {
    expect(fasting('2025-11-24')).toBe(true);  // Hidar 15, Mon
    expect(fasting('2026-01-06')).toBe(true);  // Tahsas 28, Tue
    expect(fasting('2026-01-07')).toBe(false); // Gena, Wed
    expect(fasting('2025-11-20')).toBe(false); // Hidar 11, Thu
  });

  it('flags Gahad (day before Timket) and the Nineveh fast', () => {
    expect(fasting('2026-01-18')).toBe(true);  // Sun before Timket
    expect(fasting('2026-01-19')).toBe(false); // Timket, Mon
    expect(fasting('2029-01-19')).toBe(false); // Timket 2021 EC, Fri
    expect(fasting('2026-02-02')).toBe(true);  // Nineveh day 1, Mon
    expect(fasting('2026-02-04')).toBe(true);  // day 3, Wed
    expect(fasting('2026-02-05')).toBe(false); // Thu after
  });

  it('flags Great Lent up to but excluding Fasika', () => {
    expect(fasting('2026-02-16')).toBe(true);  // Abiy Tsome, Mon
    expect(fasting('2026-04-11')).toBe(true);  // Sat before Fasika
    expect(fasting('2026-04-12')).toBe(false); // Fasika, Sun
  });

  it('flags the Apostles fast (after Paraclete until Hamle 5) and Filseta', () => {
    expect(fasting('2026-05-31')).toBe(false); // Paraclete, Sun
    expect(fasting('2026-06-01')).toBe(true);  // Mon after
    expect(fasting('2026-07-12')).toBe(true);  // Hamle 5, Sun
    expect(fasting('2026-07-13')).toBe(false); // Hamle 6, Mon
    expect(fasting('2026-08-07')).toBe(true);  // Nehase 1, Fri
    expect(fasting('2026-08-20')).toBe(true);  // Nehase 14, Thu
    expect(fasting('2026-08-24')).toBe(false); // Nehase 18, Mon
  });

  it('is usable from a display rule', () => {
    const ctx = buildContext({ overrideDate: new Date('2026-02-16T12:00:00') });
    expect(ctx.meta.isFastingSeason).toBe(true);
  });
});
