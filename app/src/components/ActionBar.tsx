import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { actionBar, colors, layout, stroke } from '../theme';

/**
 * Actions pinned to the bottom of the screen with a `hairline` above them (design.md §6.5, Figma 58:782).
 * Pass it as the `footer` of Screen so the content scrolls behind it, never under it.
 */
export function ActionBar({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={styles.bar}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: actionBar.gap,
    paddingHorizontal: layout.gutter,
    paddingTop: actionBar.paddingTop,
    paddingBottom: actionBar.paddingBottom,
    borderTopWidth: stroke.hairline,
    borderTopColor: colors.hairline,
    backgroundColor: colors.background,
  },
});
