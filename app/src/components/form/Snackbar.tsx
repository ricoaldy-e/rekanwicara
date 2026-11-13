import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { UI } from '../../forms/messages';
import { colors, fontSize, radius, spacing, touchTarget } from '../../theme';
import { announce } from './announce';

/** Shortest time a message may stay (flow §7.7.1: at least 5 seconds). */
export const SNACKBAR_MIN_MS = 5000;

/**
 * Short text at the bottom of the scene, so inside a tab it sits above the bottom bar. It stays at least
 * 5 seconds, is read by screen readers, and can be closed by tapping it. No animation.
 */
export function Snackbar({ message, onDismiss, durationMs = SNACKBAR_MIN_MS }: { message: string | null; onDismiss: () => void; durationMs?: number }) {
  useEffect(() => {
    if (!message) return;
    announce(message);
    const timer = setTimeout(onDismiss, Math.max(durationMs, SNACKBAR_MIN_MS));
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;
  return (
    <Pressable
      testID="snackbar"
      onPress={onDismiss}
      accessibilityRole="alert"
      accessibilityLabel={message}
      accessibilityHint={UI.dismiss}
      accessibilityLiveRegion="polite"
      style={styles.bar}
    >
      <Ionicons name="checkmark-circle-outline" size={22} color={colors.text} />
      <Text style={styles.text}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.tile,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
  },
  text: { flex: 1, fontSize: fontSize.body, color: colors.text },
});
