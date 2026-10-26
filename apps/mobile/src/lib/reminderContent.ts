import { T, type UiLang } from '@/i18n';
import type { DayReadings } from '@/lib/api';
import { formatEth, formatWeekday, toEth } from '@/lib/ethDate';
import { refFor } from '@/lib/text';

export interface ReminderContent { title: string; body: string }

/** "Today's Gospel: Luke 12:26-32" in the UI language, feast name first on feast days; body is the Ethiopian date and weekday. */
export function reminderContent(day: DayReadings | undefined, iso: string, ui: UiLang, readingLang: string): ReminderContent {
  const t = T[ui];
  const gospel = day?.readings.find(r => r.key === 'gospel');
  const ref = gospel ? refFor(gospel, readingLang) : '';
  const lead = day?.day.kind === 'feast' && day.day.title ? `${day.day.title} · ` : '';
  const title = ref ? `${lead}${t.todaysGospel}: ${ref}` : `${lead}${t.todaysGospel}`;
  const body = `${formatEth(toEth(iso), ui)} · ${formatWeekday(iso, ui)}`;
  return { title, body };
}
