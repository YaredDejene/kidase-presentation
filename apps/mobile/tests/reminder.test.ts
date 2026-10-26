import { describe, expect, it } from 'vitest';
import { reminderContent } from '../src/lib/reminderContent';
import type { DayReadings } from '../src/lib/api';

const day = (kind: DayReadings['day']['kind'], title: string | null): DayReadings => ({
  date: { gregorian: '2026-10-23', ethiopian: '2019-02-13', ethYear: 2019, ethMonth: 2, ethDay: 13, dayOfWeek: 'Fri', isFastingDay: true, season: 'tsige' },
  day: { kind, title, subtitle: null, anaphora: null, evangelist: null, lineId: 'x' },
  readings: [{ key: 'gospel', label: { en: 'Gospel', am: 'ወንጌል', ti: 'ወንጌል' }, ref: { raw: 'ሉቃስ ም 12 ቁ 26-32', en: 'Luke 12:26-32' }, verses: [] }],
  holidays: {},
});

describe('reminder content', () => {
  it('names the Gospel in the UI language and the reading convention', () => {
    expect(reminderContent(day('ordinary', null), '2026-10-23', 'en', 'en')).toEqual({ title: "Today's Gospel: Luke 12:26-32", body: 'ጥቅምት 13, 2019 · Friday' });
    expect(reminderContent(day('ordinary', null), '2026-10-23', 'am', 'am')).toEqual({ title: 'የዛሬ ወንጌል: ሉቃስ ም 12 ቁ 26-32', body: 'ጥቅምት 13, 2019 · ዓርብ' });
  });

  it('leads with the feast name on feast days and copes without data', () => {
    expect(reminderContent(day('feast', 'ጥምቀት'), '2026-10-23', 'en', 'en').title).toBe("ጥምቀት · Today's Gospel: Luke 12:26-32");
    expect(reminderContent(undefined, '2026-10-23', 'en', 'en').title).toBe("Today's Gospel");
  });
});
