import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Wheel } from '@/components/Wheel';
import { T } from '@/i18n';
import { ETH_MONTHS, GREG_MONTHS, ethMonthLength, formatEth, formatGregorianLong, formatWeekday, fromEth, fromIso, num, toEth, toIso, todayIso } from '@/lib/ethDate';
import { fonts } from '@/lib/fonts';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

interface Props {
  visible: boolean;
  date: string;
  onClose: () => void;
  onDone: (iso: string) => void;
  onOpenCalendar: (iso: string) => void;
}

const YEARS = 12;

/** Month, day and year wheels in the chosen calendar system; the other system's date updates beneath. */
export function DatePickerSheet({ visible, date, onClose, onDone, onOpenCalendar }: Props) {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  const eth = settings.calendar === 'ethiopian';
  const geez = settings.geezNumerals;
  const [iso, setIso] = useState(date);
  useEffect(() => { if (visible) setIso(date); }, [visible, date]);

  const e = toEth(iso);
  const g = fromIso(iso);
  const year = eth ? e.year : g.getFullYear();
  const month = eth ? e.month : g.getMonth() + 1;
  const day = eth ? e.day : g.getDate();
  const baseYear = (eth ? toEth(todayIso()).year : fromIso(todayIso()).getFullYear()) - YEARS / 2;
  const years = Array.from({ length: YEARS + 1 }, (_, i) => baseYear + i);
  const months = eth ? ETH_MONTHS[settings.uiLang] : GREG_MONTHS[settings.uiLang];
  const daysIn = eth ? ethMonthLength(year, month) : new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysIn }, (_, i) => num(i + 1, eth && geez));

  const set = (y: number, m: number, d: number) => {
    const max = eth ? ethMonthLength(y, m) : new Date(y, m, 0).getDate();
    const dd = Math.min(d, max);
    setIso(eth ? fromEth({ year: y, month: m, day: dd }) : toIso(new Date(y, m - 1, dd, 12)));
  };

  const other = eth ? formatGregorianLong(iso, settings.uiLang) : formatEth(e, settings.uiLang, geez);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
          <View style={styles.bar}>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}><Text style={[styles.barText, { color: colors.secondary }, f]}>{t.cancel}</Text></Pressable>
            <Text style={[styles.barTitle, { color: colors.text }, f]}>{t.chooseDate}</Text>
            <Pressable accessibilityRole="button" onPress={() => onDone(iso)} hitSlop={8}><Text style={[styles.barText, { color: colors.accent, fontWeight: '700' }, f]}>{t.done}</Text></Pressable>
          </View>
          <View style={styles.wheels}>
            <Wheel flex={1.6} items={months} index={month - 1} onChange={i => set(year, i + 1, day)} fontFamily={eth || settings.uiLang !== 'en' ? fonts.ethiopic : undefined} />
            <Wheel items={days} index={day - 1} onChange={i => set(year, month, i + 1)} fontFamily={eth && geez ? fonts.ethiopic : undefined} />
            <Wheel items={years.map(y => num(y, eth && geez))} index={Math.max(0, years.indexOf(year))} onChange={i => set(years[i], month, day)} fontFamily={eth && geez ? fonts.ethiopic : undefined} />
          </View>
          <Text style={[styles.other, { color: colors.secondary }, eth && settings.uiLang === 'en' ? null : { fontFamily: fonts.ethiopic }]}>{formatWeekday(iso, settings.uiLang)} · {other}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setIso(todayIso())} style={[styles.today, { borderColor: colors.borderStrong }]}>
              <Text style={[{ color: colors.text, fontSize: 16, fontWeight: '600' }, f]}>{t.today}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onOpenCalendar(iso)} style={styles.openCal}>
              <Text style={[{ color: colors.accent, fontSize: 16, fontWeight: '600' }, f]}>{t.openCalendar}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 28, paddingTop: 8 },
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  barText: { fontSize: 16 },
  barTitle: { fontSize: 17, fontWeight: '700' },
  wheels: { flexDirection: 'row', gap: 8, marginTop: 6 },
  other: { textAlign: 'center', fontSize: 15, marginTop: 10, marginBottom: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  today: { paddingHorizontal: 24, height: 44, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  openCal: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 8 },
});
