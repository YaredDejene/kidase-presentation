import type { DayReadings, ReadingLanguage } from '@kidase/shared/services/ReadingsService';

export type { DayReadings, DayReading, ReadingVerse, ReadingLanguage } from '@kidase/shared/services/ReadingsService';

/** Set EXPO_PUBLIC_API_URL for a local API (Android emulator: http://10.0.2.2:3001/api/v1). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://kidase.org/api/v1';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchRange(from: string, to: string): Promise<DayReadings[]> {
  const body = await getJson<{ days: DayReadings[] }>(`/readings?from=${from}&to=${to}`);
  return body.days;
}

export async function fetchLanguages(): Promise<ReadingLanguage[]> {
  const body = await getJson<{ languages: ReadingLanguage[] }>('/languages');
  return body.languages;
}
