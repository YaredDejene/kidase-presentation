import { describe, expect, it } from 'vitest';
import { ethMonthCells, gregMonthCells, leadingBlanks, monthOf, stepEthMonth, stepGregMonth } from '../src/lib/calendar';
import { holidaysForEthYear, upcomingHolidays } from '../src/lib/holidays';

describe('month grids', () => {
  it('lays out Tikimt 2019 starting on a Sunday and Pagume with six cells', () => {
    const tikimt = ethMonthCells(2019, 2);
    expect(tikimt).toHaveLength(30);
    expect(tikimt[0]).toMatchObject({ iso: '2026-10-11', gDay: 11, weekday: 6 });
    expect(leadingBlanks(tikimt)).toBe(6);
    expect(tikimt[12].iso).toBe('2026-10-23');
    const pagume = ethMonthCells(2019, 13);
    expect(pagume.map(c => c.iso)).toEqual(['2027-09-06', '2027-09-07', '2027-09-08', '2027-09-09', '2027-09-10', '2027-09-11']);
    expect(ethMonthCells(2020, 13)).toHaveLength(5);
  });

  it('lays out a Gregorian month with Ethiopian day numbers alongside', () => {
    const oct = gregMonthCells(2026, 10);
    expect(oct).toHaveLength(31);
    expect(oct[0]).toMatchObject({ iso: '2026-10-01', eth: { year: 2019, month: 1, day: 21 }, weekday: 3 });
  });

  it('steps months in both systems and finds the month of a date', () => {
    expect(stepEthMonth({ year: 2019, month: 13 }, 1)).toEqual({ year: 2020, month: 1 });
    expect(stepEthMonth({ year: 2019, month: 1 }, -1)).toEqual({ year: 2018, month: 13 });
    expect(stepGregMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(monthOf('2026-10-23', 'ethiopian')).toEqual({ year: 2019, month: 2 });
    expect(monthOf('2026-10-23', 'gregorian')).toEqual({ year: 2026, month: 10 });
  });
});

describe('holidays', () => {
  it('matches the backend dates for 2019 and adds the fixed ones', () => {
    const byKey = Object.fromEntries(holidaysForEthYear(2019).map(h => [h.key, h.iso]));
    expect(byKey.timket).toBe('2027-01-19');
    expect(byKey.hosanna).toBe('2027-04-25');
    expect(byKey.quskuam).toBe('2026-11-15');
    expect(byKey.tsomeNebiyat).toBe('2026-11-24');
    expect(byKey.tsige).toBe('2026-10-06');
  });

  it('lists what comes next in date order across the year end', () => {
    const next = upcomingHolidays('2026-10-23', 4);
    expect(next.map(h => [h.key, h.iso, h.kind])).toEqual([
      ['quskuam', '2026-11-15', 'feast'], ['tsomeNebiyat', '2026-11-24', 'fast'], ['gena', '2027-01-07', 'feast'], ['timket', '2027-01-19', 'feast'],
    ]);
    const atYearEnd = upcomingHolidays('2027-09-01', 2);
    expect(atYearEnd[0].iso >= '2027-09-01').toBe(true);
    expect(atYearEnd).toHaveLength(2);
  });
});
