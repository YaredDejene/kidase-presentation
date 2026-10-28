import { Directory, File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { fetchRange, type DayReadings } from '@/lib/api';
import { addMonths, monthKey, monthRange } from '@/lib/months';

/**
 * Readings cache: one JSON file per Gregorian month under the document directory, mirrored in
 * memory. Today reads from here first; the network only fills gaps or refreshes stale months.
 */
const memory = new Map<string, DayReadings[]>();
const STALE_MS = 24 * 60 * 60 * 1000;

function dir(): Directory {
  const d = new Directory(Paths.document, 'readings');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

const fileFor = (key: string) => new File(dir(), `${key}.json`);

async function readMonth(key: string): Promise<DayReadings[] | null> {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const f = fileFor(key);
    if (!f.exists) return null;
    const days = JSON.parse(await f.text()) as DayReadings[];
    memory.set(key, days);
    return days;
  } catch {
    return null;
  }
}

export async function fetchMonth(key: string): Promise<DayReadings[]> {
  const { from, to } = monthRange(key);
  const days = await fetchRange(from, to);
  memory.set(key, days);
  try {
    const f = fileFor(key);
    if (!f.exists) f.create();
    await f.write(JSON.stringify(days));
  } catch {
    // The in-memory copy still serves this session; disk is best effort.
  }
  return days;
}

/** True when the month file is missing or older than a day. */
export function isMonthStale(key: string): boolean {
  const f = fileFor(key);
  if (!f.exists) return true;
  const modified = f.modificationTime ?? 0;
  return Date.now() - modified > STALE_MS;
}

export async function hasMonth(key: string): Promise<boolean> {
  return (await readMonth(key)) !== null;
}

/** Cache first, then the network; null when neither has the month. */
export async function loadMonth(key: string): Promise<DayReadings[] | null> {
  return (await readMonth(key)) ?? fetchMonth(key).catch(() => null);
}

/** Every cached or fetchable day between two dates, keyed by ISO date. Used by the calendar grid for markers. */
export function useRangeDays(from: string, to: string): Map<string, DayReadings> {
  const [days, setDays] = useState<Map<string, DayReadings>>(new Map());
  useEffect(() => {
    let alive = true;
    const keys: string[] = [];
    for (let k = monthKey(from); k <= monthKey(to); k = addMonths(k, 1)) keys.push(k);
    Promise.all(keys.map(loadMonth)).then(months => {
      if (!alive) return;
      const map = new Map<string, DayReadings>();
      for (const m of months) for (const d of m ?? []) if (d.date.gregorian >= from && d.date.gregorian <= to) map.set(d.date.gregorian, d);
      setDays(map);
    });
    return () => { alive = false; };
  }, [from, to]);
  return days;
}

/** Synchronous lookup for screens opened from Today, which has already loaded the month. */
export function peekDay(iso: string): DayReadings | undefined {
  return memory.get(monthKey(iso))?.find(d => d.date.gregorian === iso);
}

export type DayStatus = 'loading' | 'ready' | 'empty';

export interface DayState {
  day: DayReadings | null;
  status: DayStatus;
  /** The network was tried and failed; what is shown came from the device. */
  offline: boolean;
  reload: () => void;
}

export function useDay(iso: string): DayState {
  const [state, setState] = useState<Omit<DayState, 'reload'>>({ day: null, status: 'loading', offline: false });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(a => a + 1), []);

  useEffect(() => {
    let alive = true;
    const key = monthKey(iso);
    const pick = (days: DayReadings[]) => days.find(d => d.date.gregorian === iso) ?? null;
    (async () => {
      const cached = await readMonth(key);
      if (cached) {
        if (alive) setState({ day: pick(cached), status: 'ready', offline: false });
        if (isMonthStale(key)) {
          try { const fresh = await fetchMonth(key); if (alive) setState({ day: pick(fresh), status: 'ready', offline: false }); }
          catch { if (alive) setState(s => ({ ...s, offline: true })); }
        }
        return;
      }
      if (alive) setState({ day: null, status: 'loading', offline: false });
      try {
        const fresh = await fetchMonth(key);
        if (alive) setState({ day: pick(fresh), status: 'ready', offline: false });
      } catch {
        if (alive) setState({ day: null, status: 'empty', offline: true });
      }
    })();
    return () => { alive = false; };
  }, [iso, attempt]);

  return { ...state, reload };
}
