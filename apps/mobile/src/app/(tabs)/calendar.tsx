import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarGrid } from '@/components/CalendarGrid';
import { DatePickerSheet } from '@/components/DatePickerSheet';
import { Upcoming } from '@/components/Upcoming';
import { T } from '@/i18n';
import { ethMonthCells, gregMonthCells, monthOf, stepEthMonth, stepGregMonth, type MonthRef } from '@/lib/calendar';
import { ETH_MONTHS, GREG_MONTHS, ethMonthLength, formatGregorian, num, todayIso } from '@/lib/ethDate';
import { fonts } from '@/lib/fonts';
import { holidaysForEthYear, upcomingHolidays } from '@/lib/holidays';
import { useRangeDays } from '@/lib/readings';
import { uiFont } from '@/lib/text';
import { useSelectedDate } from '@/store/date';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

export default function CalendarScreen() {
  const { settings } = useSettings();
  const { date, setDate } = useSelectedDate();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  const eth = settings.calendar === 'ethiopian';
  const [month, setMonth] = useState<MonthRef>(() => monthOf(date, settings.calendar));
  const [picker, setPicker] = useState(false);

  // Each time the tab is shown it opens on the month of the date Today is showing.
  useFocusEffect(useCallback(() => { setMonth(monthOf(date, settings.calendar)); }, [date, settings.calendar]));

  const cells = useMemo(() => (eth ? ethMonthCells(month.year, month.month) : gregMonthCells(month.year, month.month)), [eth, month]);
  const first = cells[0].iso;
  const last = cells[cells.length - 1].iso;
  const days = useRangeDays(first, last);
  const feasts = useMemo(() => {
    const years = new Set([cells[0].eth.year, cells[cells.length - 1].eth.year]);
    const set = new Set<string>();
    for (const y of years) for (const h of holidaysForEthYear(y)) if (h.kind === 'feast') set.add(h.iso);
    for (const d of days.values()) if (d.day.kind === 'feast') set.add(d.date.gregorian);
    return set;
  }, [cells, days]);
  const upcoming = useMemo(() => upcomingHolidays(todayIso(), 10), []);

  const step = (delta: number) => setMonth(m => (eth ? stepEthMonth(m, delta) : stepGregMonth(m, delta)));
  const pick = (iso: string) => { setDate(iso); router.navigate('/'); };

  const title = eth ? `${ETH_MONTHS[settings.uiLang][month.month - 1]} ${num(month.year, settings.geezNumerals)}` : `${GREG_MONTHS[settings.uiLang][month.month - 1]} ${month.year}`;
  const sub = eth
    ? `${formatGregorian(first, settings.uiLang)} – ${formatGregorian(last, settings.uiLang)}`
    : `${ETH_MONTHS[settings.uiLang][cells[0].eth.month - 1]} – ${ETH_MONTHS[settings.uiLang][cells[cells.length - 1].eth.month - 1]} ${num(cells[cells.length - 1].eth.year, settings.geezNumerals)}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
        <View style={styles.head}>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => step(-1)} style={styles.chevron}><Ionicons name="chevron-back" size={22} color={colors.secondary} /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.text }, eth || settings.uiLang !== 'en' ? { fontFamily: fonts.ethiopicMedium } : { fontWeight: '700' }]}>{title}</Text>
            <Text style={[styles.sub, { color: colors.secondary }, eth && settings.uiLang === 'en' ? null : { fontFamily: fonts.ethiopic }]}>{sub}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => step(1)} style={styles.chevron}><Ionicons name="chevron-forward" size={22} color={colors.secondary} /></Pressable>
        </View>
        <CalendarGrid cells={cells} selected={date} feasts={feasts} days={days} onPick={pick} />
        {eth && month.month === 13 && (
          <View style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.noteText, { color: colors.secondary }, f]}>{t.pagumeNote(ethMonthLength(month.year, 13))}</Text>
          </View>
        )}
        <Upcoming items={upcoming} onPick={pick} />
      </ScrollView>
      <DatePickerSheet
        visible={picker}
        date={date}
        onClose={() => setPicker(false)}
        onDone={iso => { setPicker(false); setMonth(monthOf(iso, settings.calendar)); setDate(iso); }}
        onOpenCalendar={iso => { setPicker(false); setMonth(monthOf(iso, settings.calendar)); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  chevron: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 22 },
  sub: { fontSize: 12, marginTop: 2 },
  note: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, marginTop: 12 },
  noteText: { fontSize: 13, lineHeight: 19 },
});
