import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { T } from '@/i18n';
import { formatEth, formatGregorian, formatGregorianLong, formatWeekday, toEth, todayIso } from '@/lib/ethDate';
import { useSettings } from '@/store/settings';
import { fonts, radius, useTheme } from '@/theme';

interface Props {
  date: string;
  onStep: (delta: number) => void;
  onPick: () => void;
  onToday: () => void;
  /** Shown as a quiet line under the date when readings come from the device cache. */
  offline?: boolean;
}

/** The date in the chosen calendar system, large, with the other system and weekday beneath. */
export function DateBlock({ date, onStep, onPick, onToday, offline }: Props) {
  const { settings } = useSettings();
  const { colors, church } = useTheme();
  const t = T[settings.uiLang];
  const lang = settings.uiLang;
  const eth = toEth(date);
  const isToday = date === todayIso();
  const primary = settings.calendar === 'ethiopian' ? formatEth(eth, lang, settings.geezNumerals) : formatGregorianLong(date, lang);
  const secondary = settings.calendar === 'ethiopian' ? formatGregorian(date, lang) : formatEth(eth, lang, settings.geezNumerals);
  const primaryIsEthiopic = settings.calendar === 'ethiopian' || lang !== 'en';
  const size = church ? 34 : 30;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous day" hitSlop={12} onPress={() => onStep(-1)} style={styles.chevron}>
          <Ionicons name="chevron-back" size={22} color={colors.secondary} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onPick} style={styles.center}>
          <Text style={[styles.primary, { color: colors.text, fontSize: size, fontFamily: primaryIsEthiopic ? fonts.ethiopic : fonts.serifSemi, lineHeight: size * 1.35 }]}>{primary}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next day" hitSlop={12} onPress={() => onStep(1)} style={styles.chevron}>
          <Ionicons name="chevron-forward" size={22} color={colors.secondary} />
        </Pressable>
      </View>
      <View style={styles.subRow}>
        <Text style={[styles.secondary, { color: colors.secondary, fontFamily: lang === 'en' ? undefined : fonts.ethiopic }]}>
          {formatWeekday(date, lang)} · {secondary}
        </Text>
        {!isToday && (
          <Pressable accessibilityRole="button" onPress={onToday} style={[styles.pill, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
            <Text style={[styles.pillText, { color: colors.accent, fontFamily: lang === 'en' ? undefined : fonts.ethiopic }]}>{t.today}</Text>
          </Pressable>
        )}
      </View>
      {offline && (
        <View style={styles.offlineRow}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.muted} />
          <Text style={[styles.offline, { color: colors.muted, fontFamily: lang === 'en' ? undefined : fonts.ethiopic }]}>{t.showingSaved}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, paddingBottom: 12, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 8 },
  chevron: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  primary: { textAlign: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  secondary: { fontSize: 15 },
  pill: { paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '600' },
  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  offline: { fontSize: 13 },
});
