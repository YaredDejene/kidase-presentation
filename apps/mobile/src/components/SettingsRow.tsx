import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { fonts } from '@/lib/fonts';
import { uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

interface RowProps {
  label: string;
  sub?: string;
  /** Ethiopic sub-label, e.g. the Ge'ez numerals example, takes the Ethiopic face regardless of UI language. */
  subEthiopic?: boolean;
  value?: string;
  valueEthiopic?: boolean;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitch?: (v: boolean) => void;
  first?: boolean;
}

/** One settings row: label and optional sub-label at left, a value with chevron or a switch at right. */
export function SettingsRow({ label, sub, subEthiopic, value, valueEthiopic, onPress, switchValue, onSwitch, first }: RowProps) {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const f = uiFont(settings.uiLang);
  const body = (
    <>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.text }, f]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: colors.secondary }, subEthiopic ? { fontFamily: fonts.ethiopic } : f]}>{sub}</Text> : null}
      </View>
      {onSwitch ? (
        <Switch value={!!switchValue} onValueChange={onSwitch} trackColor={{ true: colors.accent, false: colors.borderStrong }} thumbColor="#ffffff" />
      ) : (
        <>
          {value ? <Text style={[styles.value, { color: colors.secondary }, valueEthiopic ? { fontFamily: fonts.ethiopic } : f]}>{value}</Text> : null}
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </>
      )}
    </>
  );
  const style = [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }];
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && { backgroundColor: colors.elevated }]}>{body}</Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

/** A titled card of rows. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const { settings } = useSettings();
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.secondary }, uiFont(settings.uiLang)]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 20 },
  groupTitle: { fontSize: 13, marginBottom: 6, marginLeft: 4 },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, minHeight: 52 },
  label: { fontSize: 16 },
  sub: { fontSize: 12, marginTop: 2 },
  value: { fontSize: 15 },
});
