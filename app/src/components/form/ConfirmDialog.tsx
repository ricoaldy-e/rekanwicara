import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, type ComponentProps, type ComponentRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, StyleSheet, Text, View } from 'react-native';

import { UI } from '../../forms/messages';
import { colors, dialog, fontSize, overlay, radius, spacing, stroke, textFont } from '../../theme';
import { BigButton } from '../BigButton';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive action: a red button with an icon + text, below the safe choice (design.md §5.12). */
  danger?: boolean;
  /** Icon on the destructive button; defaults to a bin. */
  confirmIcon?: ComponentProps<typeof Ionicons>['name'];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered dialog card (Figma 63:584). The safe choice (Batal) is the cream button on top and gets screen-reader
 * focus first; the destructive one is red below it. Without `danger` the confirm button stays outlined so the dialog
 * has a single cream button. Android back = cancel.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = UI.cancel,
  danger,
  confirmIcon = 'trash-outline',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = cancelRef.current && findNodeHandle(cancelRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card} testID="confirm-dialog">
          <View style={styles.text}>
            <Text accessibilityRole="header" style={[styles.title, textFont(true)]}>{title}</Text>
            {message ? <Text style={[styles.message, textFont()]}>{message}</Text> : null}
          </View>
          <View style={styles.actions}>
            <View ref={cancelRef} collapsable={false}>
              <BigButton label={cancelLabel} onPress={onCancel} testID="confirm-cancel" />
            </View>
            <BigButton
              label={confirmLabel}
              variant={danger ? 'danger' : 'secondary'}
              icon={danger ? confirmIcon : undefined}
              onPress={onConfirm}
              testID="confirm-ok"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, backgroundColor: overlay.scrim },
  card: {
    gap: dialog.gap,
    paddingTop: dialog.paddingTop,
    paddingHorizontal: dialog.paddingHorizontal,
    paddingBottom: dialog.paddingBottom,
    borderRadius: radius.dialog,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  text: { gap: dialog.textGap, paddingTop: dialog.textGap },
  title: { fontSize: fontSize.large, lineHeight: 28, color: colors.text },
  message: { fontSize: fontSize.body, lineHeight: 24, color: colors.textMuted },
  actions: { gap: dialog.actionsGap, paddingTop: spacing.xs },
});
