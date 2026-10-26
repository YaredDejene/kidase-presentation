import Slider from '@react-native-community/slider';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '@/i18n';
import { bodyStyle, refFor, uiFont } from '@/lib/text';
import { peekDay } from '@/lib/readings';
import { useSelectedDate } from '@/store/date';
import { useSettings } from '@/store/settings';
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN, radius, useTheme } from '@/theme';

/** Text size with a live preview: the first Gospel verse of the shown day in the reading language. */
export default function TextSizeScreen() {
  const { settings, update } = useSettings();
  const { date } = useSelectedDate();
  const { colors, bodySize } = useTheme();
  const t = T[settings.uiLang];
  const lang = settings.readingLang;
  const gospel = peekDay(date)?.readings.find(r => r.key === 'gospel');
  const sample = gospel?.verses[0]?.text[lang] ?? (lang === 'am' ? 'እንግዲህ ትንሹን ነገር ስንኳ የማትችሉ ከሆናችሁ፥ ስለ ምን በሌላ ትጨነቃላችሁ?' : 'If ye then be not able to do that thing which is least, why take ye thought for the rest?');
  const ref = gospel ? refFor(gospel, lang) : lang === 'am' ? 'ሉቃስ ም 12 ቁ 26' : 'Luke 12:26';

  return (
    <>
      <Stack.Screen options={{ title: t.textSize }} />
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[{ color: colors.text }, bodyStyle(lang, bodySize)]}>{sample}</Text>
          <Text style={[styles.ref, { color: colors.secondary }, bodyStyle(lang, 12)]}>{ref}</Text>
        </View>
        <View style={[styles.sliderRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 13 }}>A</Text>
          <Slider style={{ flex: 1 }} minimumValue={TEXT_SIZE_MIN} maximumValue={TEXT_SIZE_MAX} step={1} value={settings.textSize}
            onValueChange={v => update({ textSize: Math.round(v) })} minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.borderStrong} thumbTintColor={colors.accent} />
          <Text style={{ color: colors.text, fontSize: 22 }}>A</Text>
        </View>
        <Text style={[styles.note, { color: colors.secondary }, uiFont(settings.uiLang)]}>{t.followsSystemText}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 18 },
  ref: { marginTop: 10 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth },
  note: { fontSize: 13, textAlign: 'center' },
});
