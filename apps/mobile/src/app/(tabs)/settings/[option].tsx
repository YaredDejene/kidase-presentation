import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { T, UI_LANGS, type UiLang } from '@/i18n';
import { fonts } from '@/lib/fonts';
import { useLanguages } from '@/lib/languages';
import { uiFont } from '@/lib/text';
import { useSettings, type Settings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

interface Option { value: string | null; label: string; ethiopic?: boolean }

/** Every list-style setting is one screen fed by this table: title, options and which key it writes. */
function useOptionScreen(option: string, languages: { code: string; name: string }[]) {
  const { settings } = useSettings();
  const t = T[settings.uiLang];
  const langs: Option[] = languages.map(l => ({ value: l.code, label: l.name, ethiopic: l.code === 'am' || l.code === 'ti' }));
  const table: Record<string, { title: string; key: keyof Settings; options: Option[] }> = {
    'reading-language': { title: t.readingLanguage, key: 'readingLang', options: langs },
    'parallel-language': { title: t.parallelLanguage, key: 'parallelLang', options: [{ value: null, label: t.off, ethiopic: settings.uiLang !== 'en' }, ...langs.filter(l => l.value !== settings.readingLang)] },
    'interface-language': { title: t.interfaceLanguage, key: 'uiLang', options: UI_LANGS.map(l => ({ value: l.key, label: l.label, ethiopic: l.key !== 'en' })) },
    calendar: { title: t.calendarSystem, key: 'calendar', options: [{ value: 'ethiopian', label: t.ethiopian, ethiopic: settings.uiLang !== 'en' }, { value: 'gregorian', label: t.gregorian, ethiopic: settings.uiLang !== 'en' }] },
    appearance: { title: t.appearance, key: 'appearance', options: (['system', 'light', 'dark'] as const).map(v => ({ value: v, label: t[v], ethiopic: settings.uiLang !== 'en' })) },
  };
  return table[option];
}

export default function OptionScreen() {
  const { option } = useLocalSearchParams<{ option: string }>();
  const { settings, update } = useSettings();
  const { colors } = useTheme();
  const languages = useLanguages();
  const screen = useOptionScreen(option, languages);
  if (!screen) return null;
  const current = settings[screen.key];

  return (
    <>
      <Stack.Screen options={{ title: screen.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {screen.options.map((o, i) => {
            const active = current === o.value;
            return (
              <Pressable
                key={String(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => update({ [screen.key]: o.value as never, ...(screen.key === 'readingLang' && settings.parallelLang === o.value ? { parallelLang: null } : {}) } as Partial<Settings>)}
                style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && { backgroundColor: colors.elevated }]}
              >
                <Text style={[styles.label, { color: colors.text }, o.ethiopic ? { fontFamily: fonts.ethiopic } : uiFont(settings.uiLang as UiLang)]}>{o.label}</Text>
                {active && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 52 },
  label: { fontSize: 17 },
});
