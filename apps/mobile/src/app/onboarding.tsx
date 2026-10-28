import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/i18n';
import { fonts } from '@/lib/fonts';
import { useLanguages } from '@/lib/languages';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

/** First launch: one screen. Reading language as a radio list, an optional second language as chips, Continue. */
export default function OnboardingScreen() {
  const { settings, update } = useSettings();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  const languages = useLanguages();
  const isEthiopic = (code: string) => code === 'am' || code === 'ti';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 }]}>
        <View style={styles.brand}>
          <View style={[styles.icon, { backgroundColor: colors.accent }]}><Text style={[styles.iconGlyph, { color: colors.onAccent }]}>ግ</Text></View>
          <Text style={[styles.wordmark, { color: colors.text }]}>ግፃዌ</Text>
          <Text style={[styles.latin, { color: colors.secondary }]}>{Constants.expoConfig?.name ?? 'Gitsawe'}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }, f]}>{t.chooseReadingLanguage}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {languages.map((l, i) => {
            const active = settings.readingLang === l.code;
            return (
              <Pressable key={l.code} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => update({ readingLang: l.code, parallelLang: settings.parallelLang === l.code ? null : settings.parallelLang })}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text style={[styles.rowLabel, { color: colors.text }, isEthiopic(l.code) ? { fontFamily: fonts.ethiopic } : null]}>{l.name}</Text>
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.accent : colors.borderStrong} />
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.question, { color: colors.text }, f]}>{t.alsoSecond}</Text>
        <Text style={[styles.hint, { color: colors.secondary }, f]}>{t.alsoSecondSub}</Text>
        <View style={styles.chips}>
          {[{ code: null as string | null, name: t.off }, ...languages.filter(l => l.code !== settings.readingLang)].map(l => {
            const active = settings.parallelLang === l.code;
            return (
              <Pressable key={String(l.code)} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => update({ parallelLang: l.code })}
                style={[styles.chip, { borderColor: colors.borderStrong, backgroundColor: active ? colors.accent : colors.surface }]}>
                <Text style={[{ color: active ? colors.onAccent : colors.text, fontSize: 15 }, l.code === null ? f : isEthiopic(l.code) ? { fontFamily: fonts.ethiopic } : null]}>{l.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.bg }]}>
        <Pressable accessibilityRole="button" onPress={() => { update({ onboarded: true }); router.replace('/'); }} style={[styles.continue, { backgroundColor: colors.accent }]}>
          <Text style={[{ color: colors.onAccent, fontSize: 17, fontWeight: '700' }, f]}>{t.continueLabel}</Text>
        </Pressable>
        <Text style={[styles.later, { color: colors.secondary }, f]}>{t.changeLater}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  icon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  iconGlyph: { fontFamily: fonts.ethiopicBold, fontSize: 20 },
  wordmark: { fontFamily: fonts.ethiopicBold, fontSize: 20 },
  latin: { fontFamily: fonts.serif, fontSize: 15 },
  title: { fontSize: 26, fontWeight: '700', lineHeight: 34, marginBottom: 16 },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 54 },
  rowLabel: { fontSize: 17 },
  question: { fontSize: 17, fontWeight: '700', marginTop: 28 },
  hint: { fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, height: 42, justifyContent: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, alignItems: 'center', gap: 10 },
  continue: { alignSelf: 'stretch', height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  later: { fontSize: 13 },
});
