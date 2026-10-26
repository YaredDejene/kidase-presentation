import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { LANG_NAMES, T, UI_LANGS } from '@/i18n';
import { formatEth, todayIso, toEth } from '@/lib/ethDate';
import { useLanguages } from '@/lib/languages';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = T[settings.uiLang];
  const languages = useLanguages();
  const langName = (code: string | null) => (code ? languages.find(l => l.code === code)?.name ?? LANG_NAMES[code] ?? code : t.off);
  const isEthiopic = (code: string | null) => code === 'am' || code === 'ti';
  const appearance = { system: t.system, light: t.light, dark: t.dark }[settings.appearance];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <Text style={[styles.title, { color: colors.text }, uiFont(settings.uiLang)]}>{t.settings}</Text>
      <SettingsGroup title={t.reading}>
        <SettingsRow first label={t.readingLanguage} sub={t.readingLanguageSub} value={langName(settings.readingLang)} valueEthiopic={isEthiopic(settings.readingLang)} onPress={() => router.push('/settings/reading-language')} />
        <SettingsRow label={t.parallelLanguage} value={langName(settings.parallelLang)} valueEthiopic={isEthiopic(settings.parallelLang)} onPress={() => router.push('/settings/parallel-language')} />
        <SettingsRow label={t.textSize} value={String(settings.textSize)} onPress={() => router.push('/settings/text-size')} />
      </SettingsGroup>
      <SettingsGroup title={t.display}>
        <SettingsRow first label={t.interfaceLanguage} sub={t.interfaceLanguageSub} value={UI_LANGS.find(l => l.key === settings.uiLang)?.label} valueEthiopic={settings.uiLang !== 'en'} onPress={() => router.push('/settings/interface-language')} />
        <SettingsRow label={t.calendarSystem} value={settings.calendar === 'ethiopian' ? t.ethiopian : t.gregorian} onPress={() => router.push('/settings/calendar')} />
        <SettingsRow label={t.geezNumerals} sub={formatEth(toEth(todayIso()), settings.uiLang, true)} subEthiopic switchValue={settings.geezNumerals} onSwitch={v => update({ geezNumerals: v })} />
        <SettingsRow label={t.appearance} value={appearance} onPress={() => router.push('/settings/appearance')} />
        <SettingsRow label={t.churchMode} sub={t.churchModeSub} switchValue={settings.churchMode} onSwitch={v => update({ churchMode: v })} />
      </SettingsGroup>
      <SettingsGroup title={t.reminder}>
        <SettingsRow first label={t.dailyReminder} value={settings.reminder ?? t.off} onPress={() => router.push('/settings/reminder')} />
      </SettingsGroup>
      <SettingsGroup title="">
        <SettingsRow first label={t.about} onPress={() => router.push('/settings/about')} />
      </SettingsGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '700', marginBottom: 16 },
});
