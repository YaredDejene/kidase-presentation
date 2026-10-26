import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { T } from '@/i18n';
import { fonts } from '@/lib/fonts';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

/** One screen: the wordmark, what the app is, the lectionary credit and a link to kidase.org. No account, no analytics. */
export default function AboutScreen() {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  const name = Constants.expoConfig?.name ?? 'Gitsawe';
  const version = Constants.expoConfig?.version ?? '';

  return (
    <>
      <Stack.Screen options={{ title: t.about }} />
      <View style={styles.content}>
        <View style={styles.mark}>
          <View style={[styles.icon, { backgroundColor: colors.accent }]}><Text style={[styles.iconGlyph, { color: colors.onAccent }]}>ግ</Text></View>
          <Text style={[styles.wordmark, { color: colors.text }]}>ግፃዌ</Text>
          <Text style={[styles.latin, { color: colors.secondary }]}>{name} {version}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.body, { color: colors.text }, f]}>{t.aboutBody}</Text>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://kidase.org').catch(() => undefined)}>
            <Text style={[styles.link, { color: colors.accent }]}>{t.aboutLink}</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  mark: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  icon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconGlyph: { fontFamily: fonts.ethiopicBold, fontSize: 30 },
  wordmark: { fontFamily: fonts.ethiopicBold, fontSize: 34, marginTop: 6 },
  latin: { fontFamily: fonts.serif, fontSize: 15 },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 12 },
  body: { fontSize: 15, lineHeight: 23 },
  link: { fontSize: 16, fontWeight: '600' },
});
