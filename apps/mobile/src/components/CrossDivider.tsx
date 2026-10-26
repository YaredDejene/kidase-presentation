import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

/** The one motif: a dotted rule with a small cross, used once per surface between chant and translation. */
export function CrossDivider() {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.line, { borderColor: colors.borderStrong }]} />
      <Text style={[styles.cross, { color: colors.accent }]}>✚</Text>
      <View style={[styles.line, { borderColor: colors.borderStrong }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginVertical: 10, gap: 10 },
  line: { flex: 1, borderTopWidth: 1, borderStyle: 'dotted' },
  cross: { fontSize: 12 },
});
