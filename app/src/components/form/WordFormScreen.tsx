import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

import { colors, displayFont, fontSize, layout, lineHeight, spacing, textFont } from '../../theme';
import { BackButton } from '../BackButton';
import { Screen } from '../Screen';

/**
 * The frame of Kata baru and Ubah kata (Figma 50:506, 61:716): back capsule, serif title, a muted line, then the form.
 * The stack header is hidden for these screens, so the top inset is ours (the tab bar below handles the bottom inset).
 * Simpan, Batal (and Hapus kata) are the last part of the form, reached by scrolling to the end; nothing sticks to the bottom.
 */
export function WordFormScreen({ title, note, onBack, scrollRef, children }: { title: string; scrollRef?: Ref<ScrollViewInstance>; note?: string; onBack: () => void; children: ReactNode }) {
  return (
    <Screen edges={TOP_EDGES} contentStyle={styles.content} scrollRef={scrollRef}>
      <View style={styles.back}>
        <BackButton label="Daftar kata" onPress={onBack} testID="word-form-back" />
      </View>
      <View style={styles.title}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.heading, displayFont()]}>{title}</Text>
        {note ? <Text maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>{note}</Text> : null}
      </View>
      {children}
    </Screen>
  );
}

const TOP_EDGES = ['top', 'left', 'right'] as const;

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.lg - spacing.xs },
  back: { alignItems: 'flex-start' },
  title: { gap: spacing.xs + spacing.xs / 2 },
  heading: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  note: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted },
});
