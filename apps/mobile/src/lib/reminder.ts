import { isRunningInExpoGo } from 'expo';
import type * as NotificationsApi from 'expo-notifications';
import { Platform } from 'react-native';
import type { UiLang } from '@/i18n';
import { addDays, fromIso, todayIso } from '@/lib/ethDate';
import { monthKey } from '@/lib/months';
import { loadMonth } from '@/lib/readings';
import { reminderContent } from '@/lib/reminderContent';

const DAYS_AHEAD = 7;
const CHANNEL = 'daily';

type Api = typeof NotificationsApi;
let api: Api | null | undefined;

/** Expo Go ships without the notifications native module, so reminders need a development or store build. */
export const reminderSupported = !isRunningInExpoGo();

/** expo-notifications is loaded lazily; where it is unavailable the app simply has no reminders. */
export async function notifications(): Promise<Api | null> {
  if (api !== undefined) return api;
  if (!reminderSupported) return (api = null);
  try {
    api = await import('expo-notifications');
    api.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
  } catch {
    api = null;
  }
  return api;
}

function fireAt(iso: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = fromIso(iso);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Reschedules the next seven days from the cache, or clears everything when the reminder is off.
 * Called on launch, on foreground and when the reminder or language settings change.
 */
export async function syncReminder(time: string | null, ui: UiLang, readingLang: string): Promise<number> {
  const Notifications = await notifications();
  if (!Notifications) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!time) return 0;
  const { status } = await Notifications.getPermissionsAsync();
  const granted = status === 'granted' || (await Notifications.requestPermissionsAsync()).status === 'granted';
  if (!granted) return 0;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Daily readings', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const now = Date.now();
  let scheduled = 0;
  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const iso = addDays(todayIso(), i);
    const at = fireAt(iso, time);
    if (at.getTime() <= now) continue;
    const days = await loadMonth(monthKey(iso));
    const day = days?.find(d => d.date.gregorian === iso);
    const content = reminderContent(day, iso, ui, readingLang);
    await Notifications.scheduleNotificationAsync({
      content: { ...content, data: { date: iso } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
    scheduled += 1;
  }
  return scheduled;
}

/** The date a tapped notification points at, if any. */
export function dateFromResponse(response: NotificationsApi.NotificationResponse | null | undefined): string | null {
  const date = response?.notification.request.content.data?.date;
  return typeof date === 'string' ? date : null;
}
