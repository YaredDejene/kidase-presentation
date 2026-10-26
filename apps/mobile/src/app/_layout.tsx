import { NotoSerifEthiopic_400Regular, NotoSerifEthiopic_500Medium, NotoSerifEthiopic_700Bold } from '@expo-google-fonts/noto-serif-ethiopic';
import { SourceSerif4_400Regular, SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SelectedDateProvider } from '@/store/date';
import { SettingsProvider, useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Routes() {
  const { ready } = useSettings();
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    NotoSerifEthiopic_400Regular, NotoSerifEthiopic_500Medium, NotoSerifEthiopic_700Bold,
    SourceSerif4_400Regular, SourceSerif4_600SemiBold,
  });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg }, animation: theme.motion ? 'default' : 'none' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reader" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <SelectedDateProvider>
        <Routes />
      </SelectedDateProvider>
    </SettingsProvider>
  );
}
