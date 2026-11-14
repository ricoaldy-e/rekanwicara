import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

/** Scrollable page container with safe-area padding and consistent spacing. */
/** `footer` sits below the scroll area (inside the safe area), so it never covers content. */
export function Screen({
  children,
  footer,
  contentStyle,
  edges = ['bottom', 'left', 'right'],
  scrollRef,
}: {
  children: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Safe-area edges to pad; add 'top' when the stack header is hidden. */
  edges?: readonly Edge[];
  /** For screens that scroll to a spot themselves (a form moving to the first empty field). */
  scrollRef?: Ref<ScrollViewInstance>;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
});
