import { HolidayTags, getHolidaysForYear } from 'kenat';
import type { UiLang } from '@/i18n';
import { fromEth, toEth } from '@/lib/ethDate';

export type HolidayKind = 'feast' | 'fast';

export interface Holiday { key: string; iso: string; kind: HolidayKind }

/** Names per UI language and whether the day opens a fast or marks a feast. kenat has the moving ones; the rest are fixed. */
export const HOLIDAY_INFO: Record<string, { en: string; am: string; ti: string; kind: HolidayKind }> = {
  meskel: { en: 'Meskel', am: 'መስቀል', ti: 'መስቀል', kind: 'feast' },
  tsige: { en: 'Season of Flowers begins', am: 'ጽጌ', ti: 'ጽጌ', kind: 'feast' },
  quskuam: { en: 'Kuskuam', am: 'ቁስቋም', ti: 'ቁስቋም', kind: 'feast' },
  tsomeNebiyat: { en: 'Advent fast begins', am: 'ጾመ ነቢያት', ti: 'ጾም ነብያት', kind: 'fast' },
  gena: { en: 'Gena (Christmas)', am: 'ገና', ti: 'ልደት', kind: 'feast' },
  timket: { en: 'Timket (Epiphany)', am: 'ጥምቀት', ti: 'ጥምቀት', kind: 'feast' },
  nineveh: { en: 'Fast of Nineveh', am: 'ጾመ ነነዌ', ti: 'ጾም ነነዌ', kind: 'fast' },
  abiyTsome: { en: 'Great Lent begins', am: 'ዐቢይ ጾም', ti: 'ዓቢይ ጾም', kind: 'fast' },
  debreZeit: { en: 'Debre Zeit', am: 'ደብረ ዘይት', ti: 'ደብረ ዘይቲ', kind: 'feast' },
  hosanna: { en: 'Hosanna (Palm Sunday)', am: 'ሆሳዕና', ti: 'ሆሳእና', kind: 'feast' },
  siklet: { en: 'Siklet (Good Friday)', am: 'ስቅለት', ti: 'ስቅለት', kind: 'feast' },
  fasika: { en: 'Fasika (Easter)', am: 'ፋሲካ', ti: 'ፋሲካ', kind: 'feast' },
  rikbeKahnat: { en: 'Rikbe Kahnat', am: 'ርክበ ካህናት', ti: 'ርክበ ካህናት', kind: 'feast' },
  erget: { en: 'Erget (Ascension)', am: 'ዕርገት', ti: 'ዕርገት', kind: 'feast' },
  paraclete: { en: 'Paraclete (Pentecost)', am: 'ጰራቅሊጦስ', ti: 'ጰራቅሊጦስ', kind: 'feast' },
  tsomeHawaryat: { en: "Apostles' fast begins", am: 'ጾመ ሐዋርያት', ti: 'ጾም ሓዋርያት', kind: 'fast' },
  tsomeDihnet: { en: 'Fast of Salvation begins', am: 'ጾመ ድኅነት', ti: 'ጾም ድሕነት', kind: 'fast' },
  kiremt: { en: 'Kiremt begins', am: 'ክረምት', ti: 'ክረምቲ', kind: 'feast' },
  filseta: { en: 'Filseta fast begins', am: 'ፍልሰታ', ti: 'ፍልሰታ', kind: 'fast' },
};

/** Fixed Ethiopian dates the backend adds on top of kenat, plus the Advent fast start it encodes in the fasting rule. */
const FIXED: Record<string, [number, number]> = { tsige: [1, 26], quskuam: [3, 6], tsomeNebiyat: [3, 15], kiremt: [10, 26], filseta: [12, 1] };

/** Every feast and fast start of an Ethiopian year, sorted by date. Same library and keys as the backend. */
export function holidaysForEthYear(year: number): Holiday[] {
  const out: Holiday[] = [];
  for (const h of getHolidaysForYear(year, { filter: [HolidayTags.CHRISTIAN] })) {
    const info = HOLIDAY_INFO[h.key];
    if (!info) continue;
    out.push({ key: h.key, iso: fromEth({ year: h.ethiopian.year, month: h.ethiopian.month, day: h.ethiopian.day }), kind: info.kind });
  }
  for (const [key, [month, day]] of Object.entries(FIXED)) out.push({ key, iso: fromEth({ year, month, day }), kind: HOLIDAY_INFO[key].kind });
  return out.sort((a, b) => a.iso.localeCompare(b.iso));
}

/** The next `count` feasts and fast starts on or after a date, reaching into the following Ethiopian year. */
export function upcomingHolidays(fromIso: string, count = 12): Holiday[] {
  const y = toEth(fromIso).year;
  return [...holidaysForEthYear(y), ...holidaysForEthYear(y + 1)].filter(h => h.iso >= fromIso).slice(0, count);
}

export const holidayName = (key: string, lang: UiLang) => HOLIDAY_INFO[key]?.[lang] ?? key;
