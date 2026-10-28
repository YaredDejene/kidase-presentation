import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { DayReadings, ReadingLanguage } from '@kidase/shared/services/ReadingsService';

export type { DayReadings, DayReading, ReadingVerse, ReadingLanguage } from '@kidase/shared/services/ReadingsService';

/** Set EXPO_PUBLIC_API_URL for a local API (Android emulator: http://10.0.2.2:3001/api/v1). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://kidase.org/api/v1';

// Identifies app traffic in server logs and CDN analytics. It is not an auth mechanism and must never be treated as one.
const USER_AGENT = `${Constants.expoConfig?.name ?? 'Gitsawe'}/${Constants.expoConfig?.version ?? '0'} (${Device.osName ?? 'unknown'} ${Device.osVersion ?? ''})`;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
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
