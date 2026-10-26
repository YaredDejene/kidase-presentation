import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { T } from '@/i18n';
import { useSettings } from '@/store/settings';
import { fonts, useTheme } from '@/theme';

export default function TabsLayout() {
  const { settings } = useSettings();
  const t = T[settings.uiLang];
  const { colors } = useTheme();
  const ethiopic = settings.uiLang !== 'en';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: ethiopic ? { fontFamily: fonts.ethiopic, fontSize: 11 } : { fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.today, tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={String(color)} size={size} /> }} />
      <Tabs.Screen name="calendar" options={{ title: t.calendar, tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={String(color)} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: t.settings, tabBarIcon: ({ color, size }) => <Ionicons name="options-outline" color={String(color)} size={size} /> }} />
    </Tabs>
  );
}
