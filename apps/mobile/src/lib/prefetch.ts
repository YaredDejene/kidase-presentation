import { AppState } from 'react-native';
import { useEffect } from 'react';
import { todayIso } from '@/lib/ethDate';
import { addMonths, monthKey } from '@/lib/months';
import { fetchMonth, hasMonth, isMonthStale } from '@/lib/readings';

const MONTHS_AHEAD = 12;
let prefetched = false;

/** After the first successful load, pull the current and next twelve months so a year works offline. Once per session. */
export async function prefetchYear(): Promise<void> {
  if (prefetched) return;
  prefetched = true;
  const start = monthKey(todayIso());
  for (let i = 0; i <= MONTHS_AHEAD; i++) {
    const key = addMonths(start, i);
    if (await hasMonth(key)) continue;
    try { await fetchMonth(key); } catch { prefetched = false; return; }
  }
}

/** Refresh this month when the app comes to the foreground and the file is older than a day. */
export function useForegroundRefresh(): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      const key = monthKey(todayIso());
      if (isMonthStale(key)) fetchMonth(key).catch(() => undefined);
    });
    return () => sub.remove();
  }, []);
}
