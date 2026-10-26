import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export default function ReaderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top + 8 }]}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.close}>
        <Text style={{ color: colors.text, fontSize: 22 }}>×</Text>
      </Pressable>
      <Text style={{ color: colors.muted }}>The reader arrives in phase B.</Text>
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, paddingHorizontal: 16 }, close: { width: 44, height: 44, justifyContent: 'center' } });
