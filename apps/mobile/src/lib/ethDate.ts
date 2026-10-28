import { toEC, toGC, toGeez } from 'kenat';
import type { UiLang } from '@/i18n';

export interface EthDate { year: number; month: number; day: number }

/** Ethiopian month names per UI language; English UI keeps the Ethiopic spelling, as the mock does. */
export const ETH_MONTHS: Record<UiLang, string[]> = {
  en: ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'],
  am: ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'],
  ti: ['መስከረም', 'ጥቅምቲ', 'ሕዳር', 'ታሕሳስ', 'ጥሪ', 'ለካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰነ', 'ሓምለ', 'ነሓሰ', 'ጳጉሜ'],
};

export const ETH_MONTHS_LATIN = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];

export const GREG_MONTHS: Record<UiLang, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  am: ['ጃንዋሪ', 'ፌብሩዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'],
  ti: ['ጃንዋሪ', 'ፌብርዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገስት', 'ሴፕተምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'],
};

/** Weekday names starting on Sunday, matching JavaScript's getDay(). */
export const WEEKDAYS: Record<UiLang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  am: ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'],
  ti: ['ሰንበት', 'ሰኑይ', 'ሰሉስ', 'ረቡዕ', 'ሓሙስ', 'ዓርቢ', 'ቀዳም'],
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD, never shifted by the UTC offset. */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export const todayIso = () => toIso(new Date());

export function addDays(iso: string, n: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

export function toEth(iso: string): EthDate {
  const d = fromIso(iso);
  return toEC(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function fromEth(e: EthDate): string {
  const g = toGC(e.year, e.month, e.day);
  return `${g.year}-${pad(g.month)}-${pad(g.day)}`;
}

/** Pagume has 6 days in the year before a Gregorian leap year, else 5. */
export function ethMonthLength(year: number, month: number): number {
  if (month < 13) return 30;
  return (year + 1) % 4 === 0 ? 6 : 5;
}

export function weekday(iso: string): number {
  return fromIso(iso).getDay();
}

export const num = (n: number, geez: boolean) => (geez ? toGeez(n) : String(n));

/** "ጥቅምት 13, 2019", with Ge'ez numerals when asked. */
export function formatEth(e: EthDate, lang: UiLang, geez = false): string {
  return `${ETH_MONTHS[lang][e.month - 1]} ${num(e.day, geez)}, ${num(e.year, geez)}`;
}

/** "23 Oct 2026" in English, "ኦክቶበር 23, 2026" in Ethiopic UIs. */
export function formatGregorian(iso: string, lang: UiLang): string {
  const d = fromIso(iso);
  const month = GREG_MONTHS[lang][d.getMonth()];
  return lang === 'en' ? `${d.getDate()} ${month.slice(0, 3)} ${d.getFullYear()}` : `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "23 October 2026" long form for the picker footer. */
export function formatGregorianLong(iso: string, lang: UiLang): string {
  const d = fromIso(iso);
  const month = GREG_MONTHS[lang][d.getMonth()];
  return lang === 'en' ? `${d.getDate()} ${month} ${d.getFullYear()}` : `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatWeekday(iso: string, lang: UiLang): string {
  return WEEKDAYS[lang][weekday(iso)];
}
