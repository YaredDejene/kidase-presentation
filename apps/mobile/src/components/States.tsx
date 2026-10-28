import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { T } from '@/i18n';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

/** Date block and five cards as grey bars, shown for the first load only. */
export function Skeleton() {
  const { colors } = useTheme();
  const bar = (w: number | `${number}%`, h = 12) => <View style={{ width: w, height: h, borderRadius: 6, backgroundColor: colors.skeleton, marginBottom: 8 }} />;
  return (
    <View accessibilityLabel="Loading" style={{ paddingTop: 16 }}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>{bar(180, 28)}{bar(120)}</View>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {bar(90, 10)}{bar(150, 16)}{bar('80%')}
        </View>
      ))}
    </View>
  );
}

/** Nothing saved and no network: calm, with one retry. */
export function EmptyState({ onRetry }: { onRetry: () => void }) {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  return (
    <View style={styles.empty}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.secondary} />
      <Text style={[styles.title, { color: colors.text }, f]}>{t.notSavedTitle}</Text>
      <Text style={[styles.sub, { color: colors.secondary }, f]}>{t.notSavedSub}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.retry, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
        <Text style={[{ color: colors.text, fontSize: 16, fontWeight: '600' }, f]}>{t.tryAgain}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 12 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 160, gap: 10 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  sub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retry: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 10, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
});
