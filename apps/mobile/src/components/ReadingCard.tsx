import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DayReading } from '@/lib/api';
import { T } from '@/i18n';
import { bodyStyle, eyebrowFor, firstVerseText, geezLines, isEthiopic, refFor, uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { fonts, radius, useTheme } from '@/theme';
import { CrossDivider } from '@/components/CrossDivider';

interface Props { reading: DayReading; onPress: () => void }

/** One lectionary reading: eyebrow and verse count, reference in accent, first-verse preview. Misbak shows the chant. */
export function ReadingCard({ reading, onPress }: Props) {
  const { settings } = useSettings();
  const { colors, church } = useTheme();
  const t = T[settings.uiLang];
  const lang = settings.readingLang;
  const ref = refFor(reading, lang);
  const eyebrow = eyebrowFor(reading, settings.uiLang, lang);
  const eyebrowLatin = eyebrow === reading.label.en.toUpperCase();
  const hasText = reading.verses.length > 0;
  const refSize = church ? 20 : 17;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.head}>
        <Text style={[styles.eyebrow, eyebrowLatin ? styles.eyebrowLatin : { fontFamily: fonts.ethiopic }, { color: colors.secondary }]}>{eyebrow}</Text>
        {reading.key !== 'misbak' && hasText && <Text style={[styles.count, { color: colors.secondary }, uiFont(settings.uiLang)]}>{t.verses(reading.verses.length)}</Text>}
        {reading.key === 'misbak' && <View style={styles.audioSlot} />}
      </View>
      {reading.ref ? (
        <Text style={[styles.ref, { color: colors.accent, fontSize: refSize, fontFamily: isEthiopic(lang) ? fonts.ethiopicMedium : fonts.serifSemi, lineHeight: refSize * 1.5 }]}>{ref}</Text>
      ) : (
        <Text style={[styles.ref, { color: colors.muted, fontSize: refSize, lineHeight: refSize * 1.5 }]}>[reference]</Text>
      )}
      {reading.key === 'misbak' && hasText ? (
        <View style={styles.chant}>
          {geezLines(reading).map((line, i) => (
            <Text key={i} style={[styles.chantLine, { color: colors.text, fontFamily: fonts.ethiopicMedium, fontSize: church ? 20 : 17 }]}>{line}</Text>
          ))}
          <CrossDivider />
          <Text style={[styles.translation, { color: colors.secondary }, bodyStyle(lang, 14)]}>{firstVerseText(reading, lang)}</Text>
        </View>
      ) : reading.ref && !hasText ? (
        <Text style={[styles.preview, { color: colors.secondary }, uiFont(settings.uiLang)]}>{t.textMissing}</Text>
      ) : reading.ref ? (
        <Text numberOfLines={1} style={[styles.preview, { color: colors.secondary }, bodyStyle(lang, 14)]}>{firstVerseText(reading, lang)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  eyebrow: { fontSize: 12 },
  eyebrowLatin: { fontSize: 11, letterSpacing: 0.66, fontWeight: '600' },
  count: { fontSize: 12 },
  audioSlot: { width: 28, height: 20 },
  ref: { marginBottom: 4 },
  preview: { fontSize: 14 },
  chant: { alignItems: 'center', paddingTop: 6 },
  chantLine: { textAlign: 'center', lineHeight: 34 },
  translation: { textAlign: 'center' },
});
