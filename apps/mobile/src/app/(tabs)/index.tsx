import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateBlock } from '@/components/DateBlock';
import { ReadingCard } from '@/components/ReadingCard';
import { EmptyState, Skeleton } from '@/components/States';
import { T } from '@/i18n';
import { addDays, todayIso } from '@/lib/ethDate';
import { useDay } from '@/lib/readings';
import { uiFont } from '@/lib/text';
import { useSelectedDate } from '@/store/date';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

export default function TodayScreen() {
  const { date, setDate } = useSelectedDate();
  const { settings } = useSettings();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = T[settings.uiLang];
  const { day, status, offline, reload } = useDay(date);
  const openReader = (index: number) => router.push({ pathname: '/reader', params: { date, index: String(index) } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.secondary} />}
      >
        {status === 'empty' ? (
          <EmptyState onRetry={reload} />
        ) : (
          <>
            <DateBlock date={date} onStep={d => setDate(addDays(date, d))} onPick={() => undefined} onToday={() => setDate(todayIso())} offline={offline} />
            {status === 'loading' || !day ? <Skeleton /> : day.readings.map((r, i) => <ReadingCard key={r.key} reading={r} onPress={() => openReader(i)} />)}
          </>
        )}
      </ScrollView>
      {day && status === 'ready' && (
        <Pressable accessibilityRole="button" onPress={() => openReader(0)} style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? colors.accentHover : colors.accent }]}>
          <Ionicons name="book-outline" size={18} color={colors.onAccent} />
          <Text style={[styles.pillText, { color: colors.onAccent }, uiFont(settings.uiLang)]}>{t.readAll}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  pill: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, height: 48, borderRadius: radius.pill, elevation: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  pillText: { fontSize: 16, fontWeight: '600' },
});
