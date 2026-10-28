import type { DayReading } from '@/lib/api';
import { ETHIOPIC_LANGS, type UiLang } from '@/i18n';
import { fonts } from '@/lib/fonts';

/** Reference in the convention of the language it is read in: Amharic form for Ethiopic scripts, English otherwise. */
export function refFor(reading: DayReading, lang: string): string {
  if (!reading.ref) return '';
  return ETHIOPIC_LANGS.has(lang) ? reading.ref.raw : reading.ref.en;
}

/** Reading label for the header: bilingual in the English UI, Ethiopic only otherwise. */
export function labelFor(reading: DayReading, ui: UiLang): string {
  if (ui === 'am') return reading.label.am;
  if (ui === 'ti') return reading.label.ti;
  return reading.label.en;
}

/** Eyebrow text: Latin labels are uppercased with tracking; Ethiopic never is. */
export function eyebrowFor(reading: DayReading, ui: UiLang, readingLang: string): string {
  if (ui === 'en' && !ETHIOPIC_LANGS.has(readingLang)) return reading.label.en.toUpperCase();
  return labelFor(reading, ui === 'en' ? 'am' : ui);
}

export const isEthiopic = (lang: string) => ETHIOPIC_LANGS.has(lang);

/** The reference narrowed to one verse: "ሉቃስ ም 12 ቁ 26-32" and "27" give "ሉቃስ ም 12 ቁ 27"; "Luke 12:26-32" gives "Luke 12:27". */
export function verseRef(ref: string, n: string): string {
  if (/ቁ\s*\S+/.test(ref)) return ref.replace(/(ቁ\s*)\S+(\s+[AB])?\s*$/u, `$1${n}`);
  if (/:\S+$/.test(ref)) return ref.replace(/:\S+$/, `:${n}`);
  return `${ref} ${n}`;
}

/** Font family and metrics for body text in a language. */
export function bodyStyle(lang: string, size: number, weight: 'regular' | 'medium' = 'regular') {
  if (isEthiopic(lang)) {
    const px = Math.round(size * 1.06);
    return { fontFamily: weight === 'medium' ? fonts.ethiopicMedium : fonts.ethiopic, fontSize: px, lineHeight: Math.round(px * 1.6) };
  }
  return { fontFamily: weight === 'medium' ? fonts.serifSemi : fonts.serif, fontSize: size, lineHeight: Math.round(size * 1.5) };
}

/** UI label font: Ethiopic UI strings take the Ethiopic serif, Latin stays in the platform sans. */
export function uiFont(ui: UiLang) {
  return ui === 'en' ? {} : { fontFamily: fonts.ethiopic };
}

export const firstVerseText = (reading: DayReading, lang: string) => reading.verses[0]?.text[lang] ?? '';

export const geezLines = (reading: DayReading) => (reading.verses[0]?.text.gz ?? '').split('\n').map(l => l.trim()).filter(Boolean);
