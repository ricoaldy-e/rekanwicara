import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, type ComponentRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, StyleSheet, Text, View } from 'react-native';

import { UI } from '../../forms/messages';
import { colors, fontSize, overlay, radius, spacing, stroke } from '../../theme';
import { BigButton } from '../BigButton';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive action: shown with a warning icon and a bin icon on the button, not by colour alone. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal question. The safe choice (Batal) gets screen-reader focus first; Android back = cancel. */
export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel = UI.cancel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
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
        <View accessibilityViewIsModal style={styles.box} testID="confirm-dialog">
          <View style={styles.titleRow}>
            {danger ? <Ionicons name="warning" size={24} color={colors.danger} /> : null}
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View ref={cancelRef} collapsable={false}>
            <BigButton label={cancelLabel} variant="secondary" onPress={onCancel} testID="confirm-cancel" />
          </View>
          <BigButton label={confirmLabel} icon={danger ? 'trash-outline' : undefined} onPress={onConfirm} testID="confirm-ok" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.md, backgroundColor: overlay.scrim },
  box: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: stroke.thick, borderColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  message: { fontSize: fontSize.body, color: colors.text },
});
