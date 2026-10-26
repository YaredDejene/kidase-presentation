import { describe, expect, it } from 'vitest';
import { addDays, ethMonthLength, formatEth, formatGregorian, formatWeekday, fromEth, toEth } from '../src/lib/ethDate';

describe('ethDate', () => {
  it('converts both ways around the examples in the design prompt', () => {
    expect(toEth('2026-10-23')).toEqual({ year: 2019, month: 2, day: 13 });
    expect(toEth('2027-01-19')).toEqual({ year: 2019, month: 5, day: 11 });
    expect(toEth('2027-04-25')).toEqual({ year: 2019, month: 8, day: 17 });
    expect(fromEth({ year: 2019, month: 13, day: 6 })).toBe('2027-09-11');
    expect(fromEth({ year: 2020, month: 1, day: 1 })).toBe('2027-09-12');
  });

  it('formats dates as the mock shows them', () => {
    expect(formatEth({ year: 2019, month: 2, day: 13 }, 'en')).toBe('ጥቅምት 13, 2019');
    expect(formatEth({ year: 2019, month: 2, day: 13 }, 'en', true)).toBe('ጥቅምት ፲፫, ፳፻፲፱');
    expect(formatEth({ year: 2019, month: 2, day: 13 }, 'ti')).toBe('ጥቅምቲ 13, 2019');
    expect(formatGregorian('2026-10-23', 'en')).toBe('23 Oct 2026');
    expect(formatGregorian('2026-10-25', 'am')).toBe('ኦክቶበር 25, 2026');
    expect(formatWeekday('2026-10-23', 'en')).toBe('Friday');
    expect(formatWeekday('2026-10-25', 'am')).toBe('እሑድ');
  });

  it('steps days across month and year ends without timezone drift', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-10-23', 0)).toBe('2026-10-23');
  });

  it('knows Pagume has six days before a Gregorian leap year', () => {
    expect(ethMonthLength(2019, 13)).toBe(6);
    expect(ethMonthLength(2020, 13)).toBe(5);
    expect(ethMonthLength(2019, 2)).toBe(30);
  });
});
