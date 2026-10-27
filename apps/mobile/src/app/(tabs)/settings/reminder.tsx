import { Stack } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Wheel } from '@/components/Wheel';
import { T } from '@/i18n';
import { todayIso } from '@/lib/ethDate';
import { useDay } from '@/lib/readings';
import { reminderContent } from '@/lib/reminderContent';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

const DEFAULT_TIME = '06:00';
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

/** Daily reminder: off by default; when on, an hour and minute wheel, default 6:00. Scheduling lives in lib/reminder. */
export default function ReminderScreen() {
  const { settings, update } = useSettings();
  const { colors } = useTheme();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  const on = settings.reminder !== null;
  const [h, m] = (settings.reminder ?? DEFAULT_TIME).split(':');
  const minuteIndex = Math.max(0, MINUTES.indexOf(m));
  const today = todayIso();
  const { day } = useDay(today);
  const preview = reminderContent(day ?? undefined, today, settings.uiLang, settings.readingLang);

  return (
    <>
      <Stack.Screen options={{ title: t.dailyReminder }} />
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }, f]}>{t.dailyReminder}</Text>
            <Switch value={on} onValueChange={v => update({ reminder: v ? DEFAULT_TIME : null })} trackColor={{ true: colors.accent, false: colors.borderStrong }} thumbColor="#ffffff" />
          </View>
          {on && (
            <View style={[styles.wheels, { borderTopColor: colors.border }]}>
              <Wheel items={HOURS} index={Number(h)} onChange={i => update({ reminder: `${HOURS[i]}:${MINUTES[minuteIndex]}` })} />
              <Text style={[styles.colon, { color: colors.text }]}>:</Text>
              <Wheel items={MINUTES} index={minuteIndex} onChange={i => update({ reminder: `${h}:${MINUTES[i]}` })} />
            </View>
          )}
        </View>
        <Text style={[styles.note, { color: colors.secondary }, f]}>{preview.title} · {preview.body}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 52 },
  label: { fontSize: 16 },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 60 },
  colon: { fontSize: 22, fontWeight: '600', marginHorizontal: 6 },
  note: { fontSize: 13, textAlign: 'center' },
});
