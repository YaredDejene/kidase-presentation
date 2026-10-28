/**
 * Gitsawe reading references are stored in the Amharic convention:
 * "<book> ም <chapter> ቁ <from>[-<to>|-ፍም][ A|B]", where ም is chapter, ቁ is verse,
 * ፍም means "to the end of the chapter" and a trailing A or B marks a Misbak variant.
 * This module turns them into the English form "Luke 12:26-32" for Latin-script readers.
 */

/** Every abbreviation found in the data, including spelling variants, to the English book name. */
const BOOKS: Record<string, string> = {
  'ማቴዎስ': 'Matthew',
  'ማርቆስ': 'Mark',
  'ሉቃስ': 'Luke',
  'ዮሐንስ': 'John',
  'ሐዋ': 'Acts',
  'ሮሜ': 'Romans',
  '1ኛ ቆሮ': '1 Corinthians',
  '2ኛ ቆሮ': '2 Corinthians',
  'ገላትያ': 'Galatians',
  'ገላ': 'Galatians',
  'ኤፌ': 'Ephesians',
  'ፊልጵ': 'Philippians',
  'ቆላስ': 'Colossians',
  '1ኛ ተሰሎ': '1 Thessalonians',
  '1ተሰሎ': '1 Thessalonians',
  '2ኛ ተሰሎ': '2 Thessalonians',
  '1ኛ ጢሞ': '1 Timothy',
  '2ኛ ጢሞ': '2 Timothy',
  'ቲቶ': 'Titus',
  'ፊልሞ': 'Philemon',
  'ፊልሞና': 'Philemon',
  'ዕብ': 'Hebrews',
  'ዕብራ': 'Hebrews',
  'ያዕቆብ': 'James',
  '1ኛ ጴጥ': '1 Peter',
  '1ኛ ጴጥሮስ': '1 Peter',
  '2ኛ ጴጥ': '2 Peter',
  '2ኛ ጴጥሮስ': '2 Peter',
  '1ኛ ዮሐ': '1 John',
  '1ኛ ዮሐንስ': '1 John',
  '2ኛ ዮሐ': '2 John',
  '2ኛ ዮሐንስ': '2 John',
  '3ኛ ዮሐ': '3 John',
  '3ኛ ዮሐንስ': '3 John',
  'ይሁዳ': 'Jude',
  'ራእየ ዮሐንስ': 'Revelation',
  'ራዕየ ዮሐንስ': 'Revelation',
  'ራዕ ዮሐ': 'Revelation',
  'ራዕይ': 'Revelation',
  'መዝ': 'Psalm',
};

export interface ParsedRef {
  /** Amharic abbreviation as written. */
  book: string;
  /** English book name, or null when the abbreviation is unknown. */
  bookEn: string | null;
  /** Chapter as written, e.g. "12" or "91(92)". */
  chapter: string;
  from: string;
  /** Last verse, "end" for ፍም, or null for a single verse. */
  to: string | 'end' | null;
}

/** Parses a reference string; null when it does not follow the convention. */
export function parseRef(raw: string): ParsedRef | null {
  const m = /^(.+?)\s+ም\s+(\S+)\s+ቁ\s+(\d+)(?:-(\d+|ፍም|fm)?)?(?:\s+[AB])?\s*$/u.exec(raw.trim());
  if (!m) return null;
  const [, book, chapter, from, toRaw] = m;
  const to = toRaw === undefined ? null : toRaw === 'ፍም' || toRaw === 'fm' ? 'end' : toRaw;
  return { book: book.trim(), bookEn: BOOKS[book.trim()] ?? null, chapter, from, to };
}

/**
 * English rendering, e.g. "Luke 12:26-32". `lastVerse` resolves ፍም when the verses are known;
 * otherwise the range reads "21-end". Unknown shapes come back unchanged.
 */
export function formatRefEn(raw: string, lastVerse?: string): string {
  const p = parseRef(raw);
  if (!p || !p.bookEn) return raw;
  const to = p.to === 'end' ? (lastVerse ?? 'end') : p.to;
  return `${p.bookEn} ${p.chapter}:${p.from}${to && to !== p.from ? `-${to}` : ''}`;
}
