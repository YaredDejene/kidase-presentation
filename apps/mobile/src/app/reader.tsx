import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReaderPage } from '@/components/ReaderPage';
import { TextOptions } from '@/components/TextOptions';
import { VerseActions, type VerseSelection } from '@/components/VerseActions';
import { T } from '@/i18n';
import { useDay } from '@/lib/readings';
import { labelFor, uiFont } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { fonts, useTheme } from '@/theme';

/** Full-screen reader: one page per reading, swipe between them, five-segment indicator below. */
export default function ReaderScreen() {
  useKeepAwake();
  const { date, index } = useLocalSearchParams<{ date: string; index?: string }>();
  const { settings } = useSettings();
  const { colors, motion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const t = T[settings.uiLang];
  const { day, status } = useDay(date);
  const [current, setCurrent] = useState(Number(index ?? 0));
  const [options, setOptions] = useState(false);
  const [selection, setSelection] = useState<VerseSelection | null>(null);
  const [progress, setProgress] = useState(0);
  const list = useRef<FlatList>(null);

  // Opened from Today the day is already cached; a cold deep link loads it first and a day with no readings falls back to Today.
  useEffect(() => {
    if (status !== 'loading' && !day) router.canGoBack() ? router.back() : router.replace('/');
  }, [status, day]);
  if (!day) return null;
  const readings = day.readings;
  const reading = readings[current];
  const goTo = (i: number) => {
    if (i < 0 || i >= readings.length) return;
    list.current?.scrollToIndex({ index: i, animated: motion });
    setCurrent(i);
  };
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== current) { setCurrent(i); setProgress(0); }
  };
  const header = settings.uiLang === 'en' ? `${reading.label.en.toUpperCase()}  ·  ${reading.label.am}` : labelFor(reading, settings.uiLang);
  const longReading = reading.verses.length >= 30;

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.close} onPress={() => router.back()} hitSlop={8} style={styles.barButton}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.title, { color: colors.secondary }, settings.uiLang === 'en' ? styles.titleLatin : { fontFamily: fonts.ethiopic }]}>{header}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t.textOptions} onPress={() => setOptions(true)} hitSlop={8} style={styles.barButton}>
          <Text style={[styles.aa, { color: colors.text }]}>Aa</Text>
        </Pressable>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: longReading ? colors.border : 'transparent' }]}>
        {longReading && <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${Math.round(progress * 100)}%` }]} />}
      </View>
      <FlatList
        ref={list}
        data={readings}
        keyExtractor={r => r.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Number(index ?? 0)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item, index: i }) => (
          <ReaderPage
            reading={item}
            next={readings[i + 1]}
            width={width}
            onNext={() => goTo(i + 1)}
            onLongPressVerse={setSelection}
            onProgress={i === current ? setProgress : undefined}
          />
        )}
      />
      <View style={[styles.segments, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        {readings.map((r, i) => {
          const active = i === current;
          const label = settings.uiLang === 'en' ? SHORT_EN[r.key] : (settings.uiLang === 'am' ? SHORT_AM[r.key] : SHORT_TI[r.key]);
          return (
            <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => goTo(i)} style={styles.segment}>
              <View style={[styles.segmentBar, { backgroundColor: active ? colors.accent : colors.borderStrong }]} />
              <Text style={[styles.segmentLabel, { color: active ? colors.text : colors.muted, fontWeight: active ? '700' : '400' }, uiFont(settings.uiLang)]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextOptions visible={options} onClose={() => setOptions(false)} />
      <VerseActions selection={selection} onClose={() => setSelection(null)} />
    </View>
  );
}

const SHORT_EN: Record<string, string> = { pauline: 'Paul', apostle: 'Catholic', acts: 'Acts', misbak: 'Misbak', gospel: 'Gospel' };
const SHORT_AM: Record<string, string> = { pauline: 'ጳውሎስ', apostle: 'ሐዋርያት', acts: 'ግብረ', misbak: 'ምስባክ', gospel: 'ወንጌል' };
const SHORT_TI: Record<string, string> = { pauline: 'ጳውሎስ', apostle: 'ሓዋርያት', acts: 'ግብሪ', misbak: 'ምስባክ', gospel: 'ወንጌል' };

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  barButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 12 },
  titleLatin: { letterSpacing: 0.7, fontWeight: '600' },
  aa: { fontSize: 17, fontWeight: '700' },
  progressTrack: { height: 2 },
  progressFill: { height: 2 },
  segments: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, paddingHorizontal: 12, gap: 6 },
  segment: { flex: 1, alignItems: 'center', gap: 6, minHeight: 44 },
  segmentBar: { alignSelf: 'stretch', height: 3, borderRadius: 2 },
  segmentLabel: { fontSize: 11 },
});
