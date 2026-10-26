import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import type { DayReading } from '@/lib/api';
import type { VerseSelection } from '@/components/VerseActions';
import { T } from '@/i18n';
import { bodyStyle, geezLines, isEthiopic, labelFor, refFor, uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { fonts, radius, useTheme } from '@/theme';

interface Props {
  reading: DayReading;
  next?: DayReading;
  width: number;
  onNext: () => void;
  onLongPressVerse: (s: VerseSelection) => void;
  onProgress?: (fraction: number) => void;
}

/** One reading: header, verse rows (single or parallel), Misbak chant layout, and the Next or End footer. */
export function ReaderPage({ reading, next, width, onNext, onLongPressVerse, onProgress }: Props) {
  const { settings } = useSettings();
  const { colors, bodySize } = useTheme();
  const t = T[settings.uiLang];
  const lang = settings.readingLang;
  const par = settings.parallelLang && settings.parallelLang !== lang ? settings.parallelLang : null;
  const ref = refFor(reading, lang);
  const parRef = par ? refFor(reading, par) : null;
  const hasText = reading.verses.length > 0;
  const primary = bodyStyle(lang, bodySize);
  const secondary = par ? bodyStyle(par, bodySize - 2) : null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onProgress) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = contentSize.height - layoutMeasurement.height;
    onProgress(max <= 0 ? 1 : Math.min(1, Math.max(0, contentOffset.y / max)));
  };

  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.content} onScroll={onScroll} scrollEventThrottle={64}>
      {reading.key === 'misbak' ? (
        <View style={styles.center}>
          <Text style={[styles.refCentered, { color: colors.accent, fontFamily: isEthiopic(lang) ? fonts.ethiopicMedium : fonts.serifSemi }]}>{ref}</Text>
          {parRef && parRef !== ref && <Text style={[styles.sub, { color: colors.secondary }]}>{parRef}</Text>}
          {hasText ? (
            <>
              <Text style={[styles.eyebrow, { color: colors.secondary }, settings.uiLang === 'en' ? styles.eyebrowLatin : { fontFamily: fonts.ethiopic }]}>{settings.uiLang === 'en' ? "GE'EZ" : 'ግዕዝ'}</Text>
              {geezLines(reading).map((line, i) => (
                <Text key={i} style={[styles.chantLine, { color: colors.text, fontFamily: fonts.ethiopicMedium, fontSize: bodySize + 3, lineHeight: (bodySize + 3) * 1.8 }]}>{line}</Text>
              ))}
              <View style={[styles.rule, { backgroundColor: colors.borderStrong }]} />
              <Text style={[styles.chantTranslation, { color: colors.text }, primary]}>{reading.verses[0].text[lang] ?? ''}</Text>
              {secondary && par && <Text style={[styles.chantTranslation, { color: colors.secondary, marginTop: 12 }, secondary]}>{reading.verses[0].text[par] ?? ''}</Text>}
            </>
          ) : (
            <Text style={[styles.missing, { color: colors.secondary }, uiFont(settings.uiLang)]}>{t.textMissing}</Text>
          )}
        </View>
      ) : (
        <>
          <Text style={[styles.ref, { color: colors.text, fontFamily: isEthiopic(lang) ? fonts.ethiopicMedium : fonts.serifSemi }]}>{ref || '[reference]'}</Text>
          <Text style={[styles.sub, { color: colors.secondary }, uiFont(settings.uiLang)]}>
            {parRef && parRef !== ref ? `${parRef} · ` : ''}{hasText ? t.verses(reading.verses.length) : ''}
          </Text>
          {!hasText && <Text style={[styles.missing, { color: colors.secondary }, uiFont(settings.uiLang)]}>{t.textMissing}</Text>}
          {reading.verses.map(v => (
            <Pressable
              key={v.n}
              accessibilityRole="text"
              onLongPress={() => onLongPressVerse({ ref, n: v.n, text: v.text[lang] ?? '' })}
              delayLongPress={350}
              style={({ pressed }) => [styles.verse, pressed && { backgroundColor: colors.elevated, borderRadius: radius.control }]}
            >
              <View style={styles.verseRow}>
                <Text style={[styles.n, { color: colors.muted, lineHeight: primary.lineHeight }]}>{v.n}</Text>
                <Text style={[styles.verseText, { color: colors.text }, primary]}>{v.text[lang] ?? ''}</Text>
              </View>
              {secondary && par && !!v.text[par] && (
                <Text style={[styles.verseText, styles.parallel, { color: colors.secondary }, secondary]}>{v.text[par]}</Text>
              )}
            </Pressable>
          ))}
        </>
      )}
      <View style={styles.footer}>
        {next ? (
          <>
            <Text style={[styles.footerEyebrow, { color: colors.secondary }, uiFont(settings.uiLang)]}>{t.next}</Text>
            <Text style={[styles.footerLabel, { color: colors.text }, uiFont(settings.uiLang)]}>{labelFor(next, settings.uiLang)}</Text>
            <Text style={[styles.footerRef, { color: colors.accent }, isEthiopic(lang) ? { fontFamily: fonts.ethiopic } : null]}>{refFor(next, lang)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t.next} onPress={onNext} style={[styles.nextButton, { backgroundColor: colors.accent }]}>
              <Ionicons name="arrow-forward" size={22} color={colors.onAccent} />
            </Pressable>
          </>
        ) : (
          <Text style={[styles.footerLabel, { color: colors.secondary }, uiFont(settings.uiLang)]}>{t.endOfReadings}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  ref: { fontSize: 22, lineHeight: 32 },
  refCentered: { fontSize: 22, lineHeight: 32, textAlign: 'center', marginTop: 24 },
  sub: { fontSize: 13, marginTop: 2, marginBottom: 18, textAlign: 'left' },
  center: { alignItems: 'center' },
  eyebrow: { fontSize: 12, marginTop: 16, marginBottom: 6 },
  eyebrowLatin: { letterSpacing: 0.7, fontWeight: '600' },
  chantLine: { textAlign: 'center' },
  rule: { width: 56, height: 1, marginVertical: 22 },
  chantTranslation: { textAlign: 'center' },
  missing: { fontSize: 15, marginBottom: 16 },
  verse: { marginBottom: 14, paddingVertical: 2 },
  verseRow: { flexDirection: 'row', gap: 8 },
  n: { fontSize: 11, minWidth: 24, flexShrink: 0, textAlign: 'right', paddingTop: 1 },
  verseText: { flex: 1 },
  parallel: { marginLeft: 30, marginTop: 4 },
  footer: { alignItems: 'center', marginTop: 28, gap: 4 },
  footerEyebrow: { fontSize: 13 },
  footerLabel: { fontSize: 18, fontWeight: '600' },
  footerRef: { fontSize: 15 },
  nextButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
});
