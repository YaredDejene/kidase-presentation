import Slider from '@react-native-community/slider';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LANG_NAMES, T } from '@/i18n';
import { uiFont } from '@/lib/text';
import { useLanguages } from '@/lib/languages';
import { useSettings } from '@/store/settings';
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN, fonts, radius, useTheme } from '@/theme';

interface Props { visible: boolean; onClose: () => void }

/** Reader "Aa" sheet: text size slider, reading language chips, parallel language chips, Done. */
export function TextOptions({ visible, onClose }: Props) {
  const { settings, update } = useSettings();
  const { colors } = useTheme();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  const languages = useLanguages();

  const chip = (label: string, active: boolean, onPress: () => void, ethiopic: boolean) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      style={[styles.chip, { borderColor: colors.borderStrong, backgroundColor: active ? colors.accent : colors.surface }]}>
      <Text style={[{ color: active ? colors.onAccent : colors.text, fontSize: 15 }, ethiopic ? { fontFamily: fonts.ethiopic } : null]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: colors.secondary }, f]}>{t.textSize}</Text>
            <Text style={[styles.label, { color: colors.secondary }]}>{settings.textSize} pt</Text>
          </View>
          <View style={[styles.sliderRow, { backgroundColor: colors.elevated }]}>
            <Text style={{ color: colors.text, fontSize: 13 }}>A</Text>
            <Slider style={{ flex: 1 }} minimumValue={TEXT_SIZE_MIN} maximumValue={TEXT_SIZE_MAX} step={1} value={settings.textSize}
              onValueChange={v => update({ textSize: Math.round(v) })} minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.borderStrong} thumbTintColor={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 22 }}>A</Text>
          </View>
          <Text style={[styles.label, { color: colors.secondary }, f]}>{t.readingLanguage}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {languages.map(l => chip(l.name, settings.readingLang === l.code, () => update({ readingLang: l.code, parallelLang: settings.parallelLang === l.code ? null : settings.parallelLang }), l.code === 'am' || l.code === 'ti'))}
          </ScrollView>
          <Text style={[styles.label, { color: colors.secondary }, f]}>{t.parallelLanguage}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {chip(t.off, settings.parallelLang === null, () => update({ parallelLang: null }), settings.uiLang !== 'en')}
            {languages.filter(l => l.code !== settings.readingLang).map(l => chip(l.name ?? LANG_NAMES[l.code], settings.parallelLang === l.code, () => update({ parallelLang: l.code }), l.code === 'am' || l.code === 'ti'))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={[styles.done, { backgroundColor: colors.accent }]}>
            <Text style={[{ color: colors.onAccent, fontSize: 17, fontWeight: '600' }, f]}>{t.done}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 28, paddingTop: 8, gap: 10 },
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.card },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, height: 40, justifyContent: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  done: { marginTop: 8, height: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
