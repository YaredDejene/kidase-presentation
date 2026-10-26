import { Pressable, StyleSheet, Text, View } from 'react-native';
import { T } from '@/i18n';
import { formatGregorian, fromIso, toEth, todayIso, ETH_MONTHS, num } from '@/lib/ethDate';
import { fonts } from '@/lib/fonts';
import { holidayName, type Holiday } from '@/lib/holidays';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

interface Props { items: Holiday[]; onPick: (iso: string) => void }

const daysBetween = (a: string, b: string) => Math.round((fromIso(b).getTime() - fromIso(a).getTime()) / 86_400_000);

/** Next feasts and fast starts: marker, bilingual name, both dates, and a relative label. */
export function Upcoming({ items, onPick }: Props) {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  const today = todayIso();
  const lang = settings.uiLang;

  return (
    <View>
      <Text style={[styles.title, { color: colors.text }, f]}>{t.upcoming}</Text>
      <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {items.map((h, i) => {
          const e = toEth(h.iso);
          const d = daysBetween(today, h.iso);
          const rel = d === 0 ? t.todayLabel : d === 1 ? t.tomorrow : t.inDays(d);
          return (
            <Pressable key={h.key + h.iso} accessibilityRole="button" onPress={() => onPick(h.iso)} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={[styles.marker, h.kind === 'feast' ? { backgroundColor: colors.accent } : { borderWidth: 1.5, borderColor: colors.muted }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }, lang === 'en' ? null : { fontFamily: fonts.ethiopicMedium }]}>{holidayName(h.key, lang)}</Text>
                <Text style={[styles.sub, { color: colors.secondary }, { fontFamily: fonts.ethiopic }]}>{ETH_MONTHS[lang][e.month - 1]} {num(e.day, settings.geezNumerals)} · {formatGregorian(h.iso, lang)}</Text>
              </View>
              <Text style={[styles.rel, { color: colors.secondary }, f]}>{rel}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  list: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 56, paddingVertical: 8 },
  marker: { width: 8, height: 8, borderRadius: 4 },
  name: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 1 },
  rel: { fontSize: 12 },
});
