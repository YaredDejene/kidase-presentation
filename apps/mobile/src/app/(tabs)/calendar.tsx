import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

export default function CalendarScreen() {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + 16 }]}>
      <Text style={[styles.title, { color: colors.text }]}>{T[settings.uiLang].calendar}</Text>
      <Text style={{ color: colors.muted }}>The month grid arrives in phase C.</Text>
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, paddingHorizontal: 16 }, title: { fontSize: 28, fontWeight: '700', marginBottom: 8 } });
