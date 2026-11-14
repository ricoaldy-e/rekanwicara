import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, fontSize, lineHeight, spacing, textFont } from '../theme';

const SHARE_OF_SCREEN = 0.5;

/** The spinner in the middle of the area (not at the top edge), with an optional line under it. */
export function LoadingView({ label, text }: { label: string; text?: string }) {
  const { height } = useWindowDimensions();
  return (
    <View accessible accessibilityLabel={label} accessibilityLiveRegion="polite" style={[styles.wrap, { minHeight: height * SHARE_OF_SCREEN }]}>
      <ActivityIndicator size="large" color={colors.text} />
      {text ? <Text maxFontSizeMultiplier={2} style={[styles.text, textFont()]}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  text: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted, textAlign: 'center' },
});
