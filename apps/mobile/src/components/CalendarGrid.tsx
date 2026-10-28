import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DayReadings } from '@/lib/api';
import { T } from '@/i18n';
import { leadingBlanks, type Cell } from '@/lib/calendar';
import { num, todayIso } from '@/lib/ethDate';
import { fonts } from '@/lib/fonts';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

interface Props {
  cells: Cell[];
  selected: string;
  /** Dates carrying a feast dot. */
  feasts: Set<string>;
  /** Cached day data, for the fasting tint. */
  days: Map<string, DayReadings>;
  onPick: (iso: string) => void;
}

const HEADERS = {
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  am: ['ሰኞ', 'ማክ', 'ረቡ', 'ሐሙ', 'ዓር', 'ቅዳ', 'እሑ'],
  ti: ['ሰኑ', 'ሰሉ', 'ረቡ', 'ሓሙ', 'ዓር', 'ቀዳ', 'ሰን'],
};

/** Seven-column month grid. Cells: ordinary, Sunday (weight), feast (dot), fast (tint), today (ring), selected (fill). */
export function CalendarGrid({ cells, selected, feasts, days, onPick }: Props) {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const t = T[settings.uiLang];
  const eth = settings.calendar === 'ethiopian';
  const today = todayIso();
  const blanks = leadingBlanks(cells);
  const slots: (Cell | null)[] = [...Array<null>(blanks).fill(null), ...cells];
  while (slots.length % 7) slots.push(null);
  const rows: (Cell | null)[][] = [];
  for (let i = 0; i < slots.length; i += 7) rows.push(slots.slice(i, i + 7));
  const f = uiFont(settings.uiLang);

  return (
    <View>
      <View style={styles.row}>
        {HEADERS[settings.uiLang].map((h, i) => <Text key={i} style={[styles.header, { color: colors.muted }, f]}>{h}</Text>)}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((c, i) => {
            if (!c) return <View key={i} style={styles.cell} />;
            const isSel = c.iso === selected;
            const isToday = c.iso === today;
            const sunday = c.weekday === 6;
            const fast = days.get(c.iso)?.date.isFastingDay ?? false;
            const big = eth ? num(c.eth.day, settings.geezNumerals) : String(c.gDay);
            const small = eth ? String(c.gDay) : String(c.eth.day);
            return (
              <Pressable
                key={c.iso}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                onPress={() => onPick(c.iso)}
                style={[styles.cell, styles.day, fast && { backgroundColor: colors.fastTint }, isToday && { borderWidth: 1.5, borderColor: colors.accent }, isSel && { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.small, { color: isSel ? colors.onAccent : colors.muted }]}>{small}</Text>
                <Text style={[styles.big, { color: isSel ? colors.onAccent : isToday ? colors.accent : colors.text, fontWeight: sunday ? '700' : '400' }, eth && settings.geezNumerals ? { fontFamily: fonts.ethiopic } : null]}>{big}</Text>
                {feasts.has(c.iso) && <View style={[styles.dot, { backgroundColor: isSel ? colors.onAccent : colors.accent }]} />}
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: colors.accent }]} /><Text style={[styles.legendText, { color: colors.secondary }, f]}>{t.feast}</Text>
        <View style={[styles.legendSwatch, { backgroundColor: colors.fastTint, borderColor: colors.border }]} /><Text style={[styles.legendText, { color: colors.secondary }, f]}>{t.fast}</Text>
        <Text style={[styles.legendBold, { color: colors.text }]}>15</Text><Text style={[styles.legendText, { color: colors.secondary }, f]}>{t.sunday}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  header: { flex: 1, textAlign: 'center', fontSize: 11, paddingVertical: 6 },
  cell: { flex: 1, aspectRatio: 1, margin: 2 },
  day: { borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  small: { position: 'absolute', top: 3, right: 5, fontSize: 9 },
  big: { fontSize: 17, marginTop: 4 },
  dot: { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, marginLeft: 10 },
  legendBold: { fontSize: 13, fontWeight: '700', marginLeft: 10 },
  legendText: { fontSize: 12 },
});
