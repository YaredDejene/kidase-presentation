import type { Gitsawe } from './entities/Gitsawe';
import { formatEthiopianDate } from './formatting';

/** Shown on the title slide; PDF and PPTX exports make it a clickable link. */
export const SITE_URL = 'https://kidase.org';

/** Id of the generated first slide that summarizes the whole kidase. */
export const TITLE_SLIDE_ID = '__title__';

/** Maps Gitsawe record fields to the viewer's info panel. */
export const READING_FIELDS: { key: string; field: keyof Gitsawe; label: string; labelAmh: string; labelTi: string }[] = [
  { key: 'kidaseType', field: 'kidaseType', label: 'Kidase Type', labelAmh: 'የቅዳሴ ዓይነት', labelTi: 'ዓይነት ቅዳሴ' },
  { key: 'pauline', field: 'messageStPaul', label: 'Pauline Epistle', labelAmh: 'መልእክተ ጳውሎስ', labelTi: 'መልእኽቲ ጳውሎስ' },
  { key: 'apostle', field: 'messageApostle', label: 'Apostolic Epistle', labelAmh: 'መልእክተ ሐዋርያት', labelTi: 'መልእኽቲ ሓዋርያት' },
  { key: 'acts', field: 'messageBookOfActs', label: 'Acts of the Apostles', labelAmh: 'ግብረ ሐዋርያት', labelTi: 'ግብሪ ሓዋርያት' },
  { key: 'misbak', field: 'misbak', label: 'Misbak', labelAmh: 'ምስባክ', labelTi: 'ምስባክ' },
  { key: 'gospel', field: 'wengel', label: 'Gospel', labelAmh: 'ወንጌል', labelTi: 'ወንጌል' },
];

/** A reading field can list alternatives, e.g. "ሉቃስ ም 24 ቁ 13-33, ማርቆስ ም 1 ቁ 1-9"; the user picks one. */
export function splitReading(value: string): string[] {
  return value.split(/[,፣]/).map(s => s.trim()).filter(Boolean);
}

/** Chosen alternative per reading key (e.g. { gospel: 1 }); missing keys use the first. */
export type ReadingChoice = Record<string, number>;

const AMH_DAYS = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'];

export interface TitleSlideInfo {
  /** The primary presentation, e.g. ሥርዓተ ቅዳሴ. */
  liturgy: string;
  /** The day's anaphora (gitsawe kidaseType). */
  anaphora: string | null;
  /** ሰንበት, ተውሳክ or ዘወትር. */
  dayType: string | null;
  ethDate: string;
  gregorian: string;
  /** Gitsawe name and additional info, shown as the slide's footer. */
  name: string | null;
  note: string | null;
  /** Short markers such as fasting or mehella. */
  tags: string[];
  /** `slide` is the 0-based position of the reading's slide; PDF and PPTX exports link to it. */
  readings: { key: string; label: string; labelEn: string; value: string; slide?: number }[];
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Everything the title slide shows, from the rule-context meta both apps already build. */
export function buildTitleSlideInfo(meta: Record<string, unknown> | null | undefined, liturgy: string): TitleSlideInfo {
  const g = (meta?.gitsawe ?? {}) as Record<string, unknown>;
  const date = typeof meta?.date === 'string' ? new Date(`${meta.date}T12:00:00`) : new Date();

  const tags: string[] = [];
  if (meta?.isFastingSeason) tags.push('ጾም');
  if (meta?.isMehella) tags.push('ምሕላ');

  return {
    liturgy,
    anaphora: text(g.kidaseType),
    dayType: text(g.gitsaweType),
    ethDate: `${AMH_DAYS[date.getDay()]}፣ ${formatEthiopianDate(date)} ዓ.ም`,
    gregorian: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    name: text(g.name),
    note: text(g.additionalInfo),
    tags,
    readings: READING_FIELDS
      .filter(r => r.key !== 'kidaseType' && text(g[r.field]))
      .map(r => ({ key: r.key, label: r.labelAmh, labelEn: r.label, value: text(g[r.field])! })),
  };
}

/** Fills in each reading's slide position: its dynamic slide names the gitsawe field, e.g. @meta.gitsawe.wengel. */
export function withReadingSlides(info: TitleSlideInfo, slides: { lineId?: string }[]): TitleSlideInfo {
  return {
    ...info,
    readings: info.readings.map(r => {
      const field = READING_FIELDS.find(f => f.key === r.key)?.field;
      const slide = slides.findIndex(s => s.lineId === `@meta.gitsawe.${String(field)}`);
      return slide >= 0 ? { ...r, slide } : r;
    }),
  };
}
