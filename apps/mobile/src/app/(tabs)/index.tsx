import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateBlock } from '@/components/DateBlock';
import { addDays, todayIso } from '@/lib/ethDate';
import { useTheme } from '@/theme';

export default function TodayScreen() {
  const [date, setDate] = useState(todayIso);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <DateBlock date={date} onStep={d => setDate(addDays(date, d))} onPick={() => undefined} onToday={() => setDate(todayIso())} />
      <Text style={{ color: colors.muted, textAlign: 'center' }}>Readings arrive in phase B.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { paddingHorizontal: 16, paddingBottom: 100 } });
