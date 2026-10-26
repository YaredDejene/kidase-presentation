import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useTheme } from '@/theme';

export const WHEEL_ITEM = 44;
const VISIBLE = 5;

interface Props {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  /** Ethiopic labels take the Ethiopic serif. */
  fontFamily?: string;
  flex?: number;
}

/** One scroll wheel: a snapping list with the selected row centred under a tinted band. */
export function Wheel({ items, index, onChange, fontFamily, flex = 1 }: Props) {
  const { colors } = useTheme();
  const list = useRef<FlatList<string>>(null);
  const pad = WHEEL_ITEM * Math.floor(VISIBLE / 2);

  useEffect(() => {
    list.current?.scrollToOffset({ offset: index * WHEEL_ITEM, animated: false });
  }, [index, items.length]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(items.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM)));
    if (i !== index) onChange(i);
  };

  return (
    <View style={{ flex, height: WHEEL_ITEM * VISIBLE }}>
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: WHEEL_ITEM, offset: WHEEL_ITEM * i, index: i })}
        initialScrollIndex={index}
        snapToInterval={WHEEL_ITEM}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: pad }}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        renderItem={({ item, index: i }) => (
          <View style={styles.row}>
            <Text style={[styles.label, { color: i === index ? colors.text : colors.muted, fontWeight: i === index ? '600' : '400', fontFamily }]}>{item}</Text>
          </View>
        )}
      />
      <View pointerEvents="none" style={[styles.band, { top: pad, backgroundColor: colors.elevated }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: WHEEL_ITEM, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 20 },
  band: { position: 'absolute', left: 0, right: 0, height: WHEEL_ITEM, borderRadius: 10, zIndex: -1 },
});
