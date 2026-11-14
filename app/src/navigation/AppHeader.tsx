import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../components/BackButton';
import { useUser } from '../state/user';
import { colors, fontSize, layout, spacing, textFont } from '../theme';

/**
 * Header of the stack screens (design.md §5.2): only the back capsule that names the previous screen, plus "Mode demo".
 * It is a plain View, not the native header: iOS 26 wraps native header items in glass bubbles (empty circle,
 * a capsule inside a capsule) and squeezes the title. Screens carry their own serif title in the content (Figma).
 */
export function AppHeader({ back, options }: { back?: { title?: string }; options: { headerBackVisible?: boolean } }) {
  const insets = useSafeAreaInsets();
  const { demo } = useUser();
  const showBack = !!back && options.headerBackVisible !== false;
  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      {showBack ? <BackButton label={back?.title || 'Kembali'} onPress={() => router.back()} /> : <View />}
      {demo ? (
        <Text accessibilityLabel="Mode demo aktif" maxFontSizeMultiplier={2} style={[styles.demo, textFont(true)]}>Mode demo</Text>
      ) : null}
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
  demo: { fontSize: fontSize.small, color: colors.text },
});
