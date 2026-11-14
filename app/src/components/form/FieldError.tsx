import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, iconSize, lineHeight, spacing } from '../../theme';
import { announce } from './announce';

/** An error line: icon + text, never colour alone. Announced when it appears or changes. */
export function FieldError({ text, testID }: { text: string; testID?: string }) {
  useEffect(() => announce(text), [text]);
  return (
    <View testID={testID} accessible accessibilityLabel={text} accessibilityLiveRegion="polite" style={styles.row}>
      <Ionicons name="alert-circle" size={iconSize.field} color={colors.danger} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  text: { flex: 1, fontSize: fontSize.small, lineHeight: lineHeight.body, color: colors.danger },
});
