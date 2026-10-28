import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { LANG_NAMES } from '@/i18n';
import { fetchLanguages, type ReadingLanguage } from '@/lib/api';

const KEY = 'languages.v1';
const FALLBACK: ReadingLanguage[] = (['am', 'ti', 'en', 'om', 'rw', 'sv'] as const).map((code, i) => ({ code, slot: `Lang${i + 2}` as ReadingLanguage['slot'], name: LANG_NAMES[code] }));

let cached: ReadingLanguage[] | null = null;

/** The server-driven reading language list, remembered on the device; the built-in six until it has loaded. */
export function useLanguages(): ReadingLanguage[] {
  const [list, setList] = useState<ReadingLanguage[]>(cached ?? FALLBACK);
  useEffect(() => {
    let alive = true;
    if (cached) return;
    AsyncStorage.getItem(KEY).then(raw => { if (raw && alive && !cached) { cached = JSON.parse(raw); setList(cached!); } }).catch(() => undefined);
    fetchLanguages().then(langs => {
      if (!langs.length) return;
      cached = langs;
      AsyncStorage.setItem(KEY, JSON.stringify(langs)).catch(() => undefined);
      if (alive) setList(langs);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return list;
}
