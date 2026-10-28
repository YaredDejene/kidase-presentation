import type { Repositories } from '../domain/interfaces/Repositories';
import type { Gitsawe } from '../domain/entities/Gitsawe';
import type { Verse } from '../domain/entities/Verse';
import type { RuleDefinition } from '../domain/entities/RuleDefinition';
import { LANG_SLOTS, type LangSlot } from '../domain/entities/Presentation';
import { buildContext } from '../engine/contextBuilder';
import { formatRefEn } from '../domain/bookNames';
import { READING_FIELDS } from './RenderService';

/** Short language codes by slot, as the mobile app addresses verse text. */
export const READING_LANG_CODES: Record<LangSlot, string> = {
  Lang1: 'gz', Lang2: 'am', Lang3: 'ti', Lang4: 'en', Lang5: 'om', Lang6: 'rw', Lang7: 'sv', Lang8: 'l8',
};

/** Each language written in its own script, keyed by the lowercase name the presentation map uses. */
const NATIVE_NAMES: Record<string, string> = {
  geez: 'ግዕዝ', amharic: 'አማርኛ', tigrigna: 'ትግርኛ', tigrinya: 'ትግርኛ', english: 'English',
  'afaan oromoo': 'Afaan Oromoo', kinyarwanda: 'Ikinyarwanda', swedish: 'Svenska',
};

export type DayKind = 'feast' | 'sunday' | 'supplementary' | 'ordinary';
export type ReadingKey = 'pauline' | 'apostle' | 'acts' | 'misbak' | 'gospel';

export interface ReadingVerse {
  /** Verse number as printed in the text, or the row order when the text carries none (Psalms). */
  n: string;
  text: Record<string, string>;
}

export interface DayReading {
  key: ReadingKey;
  label: { en: string; am: string; ti: string };
  /** Null when the lectionary row has no reference for this reading. */
  ref: { raw: string; en: string } | null;
  verses: ReadingVerse[];
}

export interface DayReadings {
  date: {
    gregorian: string;
    ethiopian: string;
    ethYear: number;
    ethMonth: number;
    ethDay: number;
    dayOfWeek: string;
    isFastingDay: boolean;
    season: string | null;
  };
  day: {
    kind: DayKind;
    title: string | null;
    subtitle: string | null;
    anaphora: string | null;
    evangelist: string | null;
    lineId: string | null;
  };
  readings: DayReading[];
  /** Feast and fast start dates (YYYY-MM-DD) for the Ethiopian year of the date. */
  holidays: Record<string, string>;
}

export interface ReadingLanguage {
  code: string;
  slot: LangSlot;
  name: string;
}

/** Season starts in Ethiopian-year order; the latest one on or before the date names the season. */
const SEASON_KEYS = ['tsige', 'quskuam', 'gena', 'timket', 'abiyTsome', 'fasika', 'paraclete', 'kiremt', 'filseta'];

const APP_READINGS = READING_FIELDS.filter(r => r.key !== 'kidaseType');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a YYYY-MM-DD string and returns it at local noon, as the render route does. */
export function parseIsoDate(date: string): Date | null {
  if (!ISO_DATE.test(date)) return null;
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date ? null : d;
}

/** Splits a leading verse number ("26 ...", "5-6 ...") from the text. */
export function splitVerseNumber(text: string): { n: string | null; text: string } {
  const m = /^(\d+(?:-\d+)?)\s+/.exec(text);
  return m ? { n: m[1], text: text.slice(m[0].length) } : { n: null, text };
}

/** Priority 0 feasts, 1 Sundays, 2 (and -1) supplementary ተውሳክ days, 3 ordinary ዘወትር days. */
export function dayKind(priority: number): DayKind {
  if (priority === 0) return 'feast';
  if (priority === 1) return 'sunday';
  if (priority < 0 || priority === 2) return 'supplementary';
  return 'ordinary';
}

function toVerses(rows: Verse[]): ReadingVerse[] {
  return rows.map(row => {
    const text: Record<string, string> = {};
    let n: string | null = null;
    for (const slot of LANG_SLOTS) {
      const value = (row as unknown as Record<string, unknown>)[`text${slot}`];
      if (typeof value !== 'string' || value.trim() === '') continue;
      const split = splitVerseNumber(value);
      text[READING_LANG_CODES[slot]] = split.text;
      if (slot === 'Lang2' && split.n) n = split.n;
      else if (!n && split.n) n = split.n;
    }
    return { n: n ?? String(row.verseOrder), text };
  });
}

/**
 * Read-only view of the lectionary for one date: the matched Gitsawe row, its five readings
 * with verse text in every language, and the calendar facts around it. Reuses the rule
 * engine context the render pipeline builds, so selection stays identical to the viewer.
 */
export class ReadingsService {
  constructor(private readonly repos: Repositories) {}

  async getDay(date: string): Promise<DayReadings> {
    const [day] = await this.getRange(date, date);
    return day;
  }

  async getRange(from: string, to: string): Promise<DayReadings[]> {
    const start = parseIsoDate(from);
    const end = parseIsoDate(to);
    if (!start || !end || end < start) throw new RangeError('Invalid date range');
    const [gitsawes, rules] = await Promise.all([this.repos.gitsawe.getAll(), this.repos.rule.getEnabled()]);
    const gitsaweRules = rules.filter(r => r.scope === 'gitsawe');
    const days: DayReadings[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(await this.buildDay(new Date(d), gitsawes, gitsaweRules));
    }
    return days;
  }

  /** Languages that have verse text, by the primary presentation's language map; Ge'ez excluded. */
  async getLanguages(): Promise<ReadingLanguage[]> {
    const primary = (await this.repos.presentation.getPrimary()) ?? (await this.repos.presentation.getAll())[0];
    const map = primary?.languageMap ?? {};
    return LANG_SLOTS.filter(slot => slot !== 'Lang1' && map[slot]).map(slot => {
      const name = map[slot]!;
      return { code: READING_LANG_CODES[slot], slot, name: NATIVE_NAMES[name.toLowerCase()] ?? name };
    });
  }

  private async buildDay(date: Date, gitsawes: Gitsawe[], gitsaweRules: RuleDefinition[]): Promise<DayReadings> {
    const meta = buildContext({ gitsawes, gitsaweRules, overrideDate: date }).meta as Record<string, unknown>;
    const g = meta.gitsawe as Partial<Gitsawe> | undefined;
    const holidays = (meta.holidays as Record<string, string>) ?? {};
    const gregorian = meta.date as string;

    const readings: DayReading[] = [];
    for (const r of APP_READINGS) {
      const raw = g?.[r.field] ? String(g[r.field]).trim() : '';
      const rows = raw ? await this.repos.verse.getBySegmentId(raw) : [];
      const verses = toVerses([...rows].sort((a, b) => a.verseOrder - b.verseOrder));
      readings.push({
        key: r.key as ReadingKey,
        label: { en: r.label, am: r.labelAmh, ti: r.labelTi },
        ref: raw ? { raw, en: formatRefEn(raw, verses[verses.length - 1]?.n) } : null,
        verses,
      });
    }

    const kind = g ? dayKind(Number(g.priority ?? 3)) : 'ordinary';
    const name = g?.name?.trim() || null;
    const info = g?.additionalInfo?.trim() || null;
    const title = kind === 'ordinary' ? null : (name ?? info);
    const subtitle = kind !== 'ordinary' && name && info ? info : null;

    let season: string | null = 'yohannes';
    for (const key of SEASON_KEYS) {
      if (holidays[key] && holidays[key] <= gregorian) season = key;
    }

    return {
      date: {
        gregorian,
        ethiopian: meta.ethDate as string,
        ethYear: meta.ethYear as number,
        ethMonth: meta.ethMonth as number,
        ethDay: meta.ethDay as number,
        dayOfWeek: meta.dayOfWeek as string,
        isFastingDay: Boolean(meta.isFastingSeason),
        season,
      },
      day: {
        kind,
        title,
        subtitle,
        anaphora: g?.kidaseType?.trim() || null,
        evangelist: g?.evangelist?.trim() || null,
        lineId: g?.lineId ?? null,
      },
      readings,
      holidays,
    };
  }
}
