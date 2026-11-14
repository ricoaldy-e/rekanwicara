import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../components/BackButton';
import { useUser } from '../state/user';
import { colors, fontSize, layout, spacing, textFont } from '../theme';

/**
 * Header of the stack screens (design.md §5.2): only the back capsule that names the previous screen.
 * It is a plain View, not the native header: iOS 26 wraps native header items in glass bubbles (empty circle,
 * a capsule inside a capsule) and squeezes the title. Screens carry their own serif title in the content (Figma).
 */
/** The screen's own `headerBackTitle`, else the previous screen's title; a route name such as "(tabs)" is not a name for people. */
export function backLabel(own?: string, previous?: string): string {
  const title = own || previous;
  return !title || /^\(|\//.test(title) ? 'Kembali' : title;
}

export function AppHeader({ back, options }: { back?: { title?: string }; options: { headerBackVisible?: boolean; headerBackTitle?: string } }) {
  const insets = useSafeAreaInsets();
  const showBack = !!back && options.headerBackVisible !== false;
  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      {showBack ? <BackButton label={backLabel(options.headerBackTitle, back?.title)} onPress={() => router.back()} /> : <View />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
});
