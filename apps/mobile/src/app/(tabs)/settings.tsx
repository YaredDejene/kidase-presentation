import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, UI_LANGS } from '@/i18n';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = T[settings.uiLang];
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + 16 }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t.settings}</Text>
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, flex: 1 }}>{t.interfaceLanguage}</Text>
        {UI_LANGS.map(l => (
          <Pressable key={l.key} onPress={() => update({ uiLang: l.key })} style={[styles.chip, { borderColor: colors.border, backgroundColor: settings.uiLang === l.key ? colors.accent : colors.surface }]}>
            <Text style={{ color: settings.uiLang === l.key ? colors.onAccent : colors.text }}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, flex: 1 }}>{t.churchMode}</Text>
        <Switch value={settings.churchMode} onValueChange={v => update({ churchMode: v })} trackColor={{ true: colors.accent }} />
      </View>
      <Text style={{ color: colors.muted }}>The full settings list arrives in phase D.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
});
