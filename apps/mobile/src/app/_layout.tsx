import { NotoSerifEthiopic_400Regular, NotoSerifEthiopic_500Medium, NotoSerifEthiopic_700Bold } from '@expo-google-fonts/noto-serif-ethiopic';
import { SourceSerif4_400Regular, SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useForegroundRefresh } from '@/lib/prefetch';
import { dateFromResponse, notifications, syncReminder } from '@/lib/reminder';
import { SelectedDateProvider, useSelectedDate } from '@/store/date';
import { SettingsProvider, useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Routes() {
  const { settings, ready } = useSettings();
  const { setDate } = useSelectedDate();
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    NotoSerifEthiopic_400Regular, NotoSerifEthiopic_500Medium, NotoSerifEthiopic_700Bold,
    SourceSerif4_400Regular, SourceSerif4_600SemiBold,
  });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  useForegroundRefresh();

  // Keep the next week of reminders scheduled: on launch, on foreground, and when the settings they depend on change.
  const { reminder, uiLang, readingLang } = settings;
  useEffect(() => {
    if (!ready) return;
    const sync = () => syncReminder(reminder, uiLang, readingLang).catch(() => undefined);
    sync();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') sync(); });
    return () => sub.remove();
  }, [ready, reminder, uiLang, readingLang]);

  // A tapped reminder opens Today at its date.
  useEffect(() => {
    const open = (date: string | null) => { if (date) { setDate(date); router.navigate('/'); } };
    let sub: { remove: () => void } | undefined;
    notifications().then(api => {
      if (!api) return;
      api.getLastNotificationResponseAsync().then(r => open(dateFromResponse(r))).catch(() => undefined);
      sub = api.addNotificationResponseReceivedListener(r => open(dateFromResponse(r)));
    });
    return () => sub?.remove();
  }, [setDate]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg }, animation: theme.motion ? 'default' : 'none' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        <Stack.Screen name="reader" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}

/** Deep links into the reader or settings get the tabs beneath them, so Close and Back always have somewhere to go. */
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <SettingsProvider>
      <SelectedDateProvider>
        <Routes />
      </SelectedDateProvider>
    </SettingsProvider>
  );
}
