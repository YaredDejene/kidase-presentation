import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { T } from '@/i18n';
import { uiFont, verseRef } from '@/lib/text';
import { useSettings } from '@/store/settings';
import { radius, useTheme } from '@/theme';

export interface VerseSelection { ref: string; n: string; text: string }

interface Props { selection: VerseSelection | null; onClose: () => void }

/** Long-press sheet: the verse under its reference, then Copy and Share. Share text is reference, text, app name. */
export function VerseActions({ selection, onClose }: Props) {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const t = T[settings.uiLang];
  const f = uiFont(settings.uiLang);
  if (!selection) return null;
  const refLine = verseRef(selection.ref, selection.n);
  const payload = `${refLine}\n${selection.text}\n${Constants.expoConfig?.name ?? ''}`.trim();

  const copy = async () => { await Clipboard.setStringAsync(payload); onClose(); };
  const share = async () => { onClose(); await Share.share({ message: payload }).catch(() => undefined); };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.ref, { color: colors.secondary }]}>{refLine}</Text>
          <Text numberOfLines={3} style={[styles.verse, { color: colors.text }]}>{selection.text}</Text>
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <Pressable accessibilityRole="button" onPress={copy} style={styles.action}><Text style={[styles.actionText, { color: colors.accent }, f]}>{t.copy}</Text></Pressable>
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <Pressable accessibilityRole="button" onPress={share} style={styles.action}><Text style={[styles.actionText, { color: colors.accent }, f]}>{t.share}</Text></Pressable>
        </View>
        <View style={[styles.sheet, styles.cancel, { backgroundColor: colors.surface }]}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.action}><Text style={[styles.actionText, { color: colors.text, fontWeight: '600' }, f]}>{t.cancel}</Text></Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: 12 },
  sheet: { borderRadius: radius.card, overflow: 'hidden' },
  cancel: { marginTop: 8, marginBottom: 12 },
  ref: { fontSize: 12, textAlign: 'center', paddingTop: 12 },
  verse: { fontSize: 13, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  sep: { height: StyleSheet.hairlineWidth },
  action: { height: 52, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 18 },
});
