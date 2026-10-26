import { Stack } from 'expo-router';
import { T } from '@/i18n';
import { fonts } from '@/lib/fonts';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

/** Settings is its own stack inside the tab, so pickers push with a back button and the tab bar stays. */
export default function SettingsLayout() {
  const { settings } = useSettings();
  const { colors, motion } = useTheme();
  const ethiopic = settings.uiLang !== 'en';
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text, fontSize: 17, fontWeight: '600', fontFamily: ethiopic ? fonts.ethiopic : undefined },
        headerBackTitle: T[settings.uiLang].settings,
        headerBackTitleStyle: { fontFamily: ethiopic ? fonts.ethiopic : undefined },
        contentStyle: { backgroundColor: colors.bg },
        animation: motion ? 'default' : 'none',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
