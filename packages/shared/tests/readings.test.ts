import { describe, it, expect } from 'vitest';
import { formatRefEn, parseRef } from '../src/domain/bookNames';
import { ReadingsService, dayKind, parseIsoDate, splitVerseNumber } from '../src/services/ReadingsService';
import { fakeRepositories } from './render/fakeRepos';
import type { Gitsawe } from '../src/domain/entities/Gitsawe';
import type { Verse } from '../src/domain/entities/Verse';
import type { RuleDefinition } from '../src/domain/entities/RuleDefinition';
import type { Presentation } from '../src/domain/entities/Presentation';

describe('reference parsing', () => {
  it.each([
    ['ሉቃስ ም 12 ቁ 26-32', undefined, 'Luke 12:26-32'],
    ['2ኛ ቆሮ ም 9 ቁ 1-10', undefined, '2 Corinthians 9:1-10'],
    ['መዝ ም 91(92) ቁ 12-13', undefined, 'Psalm 91(92):12-13'],
    ['መዝ ም 76(77) ቁ 16', undefined, 'Psalm 76(77):16'],
    ['መዝ ም 2 ቁ 12-13 B', undefined, 'Psalm 2:12-13'],
    ['ሉቃስ ም 3 ቁ 21-ፍም', '38', 'Luke 3:21-38'],
    ['ዮሐንስ ም 16 ቁ 17-ፍም', undefined, 'John 16:17-end'],
    ['1ተሰሎ ም 4 ቁ 1-fm', '12', '1 Thessalonians 4:1-12'],
    ['ራዕ ዮሐ ም 1 ቁ 1-8', undefined, 'Revelation 1:1-8'],
    ['something else', undefined, 'something else'],
  ])('formats %s', (raw, last, expected) => {
    expect(formatRefEn(raw, last)).toBe(expected);
  });

  it('keeps the trailing dash typo from crashing', () => {
    expect(parseRef('ሉቃስ ም 11 ቁ 27-')).toMatchObject({ bookEn: 'Luke', chapter: '11', from: '27', to: null });
  });
});

describe('helpers', () => {
  it('splits embedded verse numbers', () => {
    expect(splitVerseNumber('26 እንግዲህ ትንሹን')).toEqual({ n: '26', text: 'እንግዲህ ትንሹን' });
    expect(splitVerseNumber('5-6 ከምዙይ')).toEqual({ n: '5-6', text: 'ከምዙይ' });
    expect(splitVerseNumber('ጻድቅ እንደ ዘንባባ')).toEqual({ n: null, text: 'ጻድቅ እንደ ዘንባባ' });
  });

  it('maps priorities to day kinds', () => {
    expect([0, 1, 2, -1, 3].map(dayKind)).toEqual(['feast', 'sunday', 'supplementary', 'supplementary', 'ordinary']);
  });

  it('validates ISO dates', () => {
    expect(parseIsoDate('2026-10-23')?.getDate()).toBe(23);
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('23/10/2026')).toBeNull();
  });
});

const rule = (id: string, gitsaweId: string, when: unknown): RuleDefinition => ({
  id, name: id, scope: 'gitsawe', gitsaweId, isEnabled: true, createdAt: '',
  ruleJson: JSON.stringify({ when, then: { selected: true }, otherwise: { selected: false } }),
});

const gitsawes: Gitsawe[] = [
  { id: 'g-ord', lineId: 'ዘወ43', name: 'ጥቅምት 13', priority: 3, createdAt: '',
    messageStPaul: '2ኛ ቆሮ ም 9 ቁ 1-10', messageApostle: 'ያዕቆብ ም 1 ቁ 9-17', messageBookOfActs: 'ሐዋ ም 20 ቁ 16-28',
    misbak: 'መዝ ም 91(92) ቁ 12-13', wengel: 'ሉቃስ ም 12 ቁ 26-32', kidaseType: 'ዘዮሐንስ አፈወርቅ', evangelist: 'ሉቃስ' },
  { id: 'g-timket', lineId: 'በዓ4', name: 'ጥምቀት', priority: 0, createdAt: '',
    misbak: 'መዝ ም 76(77) ቁ 16', wengel: 'ሉቃስ ም 3 ቁ 21-ፍም', kidaseType: 'ዘዲዮስቆሮስ' },
  { id: 'g-sun', lineId: 'ሰን7', name: '', additionalInfo: '3ኛ ሰንበት (ወመኑ መሐሪ ዘከማከ)', priority: 1, createdAt: '',
    wengel: 'ማቴዎስ ም 12 ቁ 1-32' },
];

const rules = [
  rule('r-ord', 'g-ord', { 'meta.ethMonthDay': { $eq: '02-13' } }),
  rule('r-timket', 'g-timket', { 'meta.date': { $eq: '$ref:meta.holidays.timket' } }),
  rule('r-sun', 'g-sun', { $and: [{ 'meta.dayOfWeek': { $eq: 'Sun' } }, { 'meta.ethMonthDay': { $eq: '02-15' } }] }),
];

const verse = (segmentId: string, verseOrder: number, text: Partial<Record<'textLang1' | 'textLang2' | 'textLang3' | 'textLang4', string>>): Verse =>
  ({ id: `${segmentId}#${verseOrder}`, segmentId, verseOrder, createdAt: '', ...text });

const verses: Verse[] = [
  verse('ሉቃስ ም 12 ቁ 26-32', 1, { textLang2: '26 እንግዲህ ትንሹን ነገር', textLang3: '26-27 እንተ ደኣ', textLang4: '26 If ye then be not able' }),
  verse('ሉቃስ ም 12 ቁ 26-32', 2, { textLang2: '27 አበቦች እንዴት', textLang4: '27 Consider the lilies' }),
  verse('መዝ ም 91(92) ቁ 12-13', 1, { textLang1: 'ጻድቅሰ ከመ በቀልት ይፈሪ፤\nወይበዝኅ ከመ ዘግባ ዘሊባኖስ።', textLang2: 'ጻድቅ እንደ ዘንባባ ያፈራል', textLang4: 'The righteous shall flourish' }),
  verse('ሉቃስ ም 3 ቁ 21-ፍም', 1, { textLang2: '21 ሕዝቡም ሁሉ', textLang4: '21 Now when all the people' }),
  verse('ሉቃስ ም 3 ቁ 21-ፍም', 2, { textLang2: '38 የሄኖስ ልጅ', textLang4: '38 Which was the son of Enos' }),
];

const presentations = [{ id: 'p1', name: 'Kidase', isPrimary: true, languageMap: { Lang1: 'Geez', Lang2: 'Amharic', Lang3: 'Tigrigna', Lang4: 'English', Lang7: 'Swedish' } } as unknown as Presentation];

const service = new ReadingsService(fakeRepositories({ gitsawes, rules, verses, presentations }));

describe('ReadingsService', () => {
  it('returns the ordinary day with stripped verse numbers and English references', async () => {
    const day = await service.getDay('2026-10-23');
    expect(day.date).toMatchObject({ gregorian: '2026-10-23', ethiopian: '2019-02-13', ethMonth: 2, ethDay: 13, dayOfWeek: 'Fri', isFastingDay: true, season: 'tsige' });
    expect(day.day).toEqual({ kind: 'ordinary', title: null, subtitle: null, anaphora: 'ዘዮሐንስ አፈወርቅ', evangelist: 'ሉቃስ', lineId: 'ዘወ43' });
    expect(day.readings.map(r => r.key)).toEqual(['pauline', 'apostle', 'acts', 'misbak', 'gospel']);
    const gospel = day.readings[4];
    expect(gospel.label).toEqual({ en: 'Gospel', am: 'ወንጌል', ti: 'ወንጌል' });
    expect(gospel.ref).toEqual({ raw: 'ሉቃስ ም 12 ቁ 26-32', en: 'Luke 12:26-32' });
    expect(gospel.verses[0]).toEqual({ n: '26', text: { am: 'እንግዲህ ትንሹን ነገር', ti: 'እንተ ደኣ', en: 'If ye then be not able' } });
    const misbak = day.readings[3];
    expect(misbak.verses[0].n).toBe('1');
    expect(misbak.verses[0].text.gz).toBe('ጻድቅሰ ከመ በቀልት ይፈሪ፤\nወይበዝኅ ከመ ዘግባ ዘሊባኖስ።');
    // A reference without verse rows stays in the list, with no verses.
    expect(day.readings[0]).toMatchObject({ ref: { en: '2 Corinthians 9:1-10' }, verses: [] });
    expect(day.holidays.timket).toBe('2027-01-19');
  });

  it('names a feast and resolves ፍም from the last verse', async () => {
    const day = await service.getDay('2027-01-19');
    expect(day.day).toMatchObject({ kind: 'feast', title: 'ጥምቀት', anaphora: 'ዘዲዮስቆሮስ' });
    expect(day.readings[4].ref?.en).toBe('Luke 3:21-38');
    expect(day.readings[0].ref).toBeNull();
  });

  it('takes a Sunday title from additionalInfo when the name is blank', async () => {
    const day = await service.getDay('2026-10-25');
    expect(day.day).toMatchObject({ kind: 'sunday', title: '3ኛ ሰንበት (ወመኑ መሐሪ ዘከማከ)', subtitle: null });
    expect(day.date.isFastingDay).toBe(false);
  });

  it('returns every day of a range in order and rejects bad input', async () => {
    const days = await service.getRange('2026-10-23', '2026-10-25');
    expect(days.map(d => d.date.gregorian)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
    await expect(service.getRange('2026-10-25', '2026-10-23')).rejects.toThrow(RangeError);
    await expect(service.getDay('nope')).rejects.toThrow(RangeError);
  });

  it('lists reading languages in their own script, without Ge\'ez', async () => {
    expect(await service.getLanguages()).toEqual([
      { code: 'am', slot: 'Lang2', name: 'አማርኛ' },
      { code: 'ti', slot: 'Lang3', name: 'ትግርኛ' },
      { code: 'en', slot: 'Lang4', name: 'English' },
      { code: 'sv', slot: 'Lang7', name: 'Svenska' },
    ]);
  });
});
