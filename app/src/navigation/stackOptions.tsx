import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import { useUser } from '../state/user';
import { colors, fontSize } from '../theme';

function DemoIndicator() {
  const { demo } = useUser();
  return demo ? <Text accessibilityLabel="Mode demo aktif" style={{ color: colors.text, fontSize: fontSize.small, fontWeight: '700' }}>Mode demo</Text> : null;
}

/** Dark header shared by the root Stack and the Stack inside each tab. */
export const darkStackOptions: NonNullable<ComponentProps<typeof Stack>['screenOptions']> = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  contentStyle: { backgroundColor: colors.background },
  headerBackTitle: 'Kembali',
  headerRight: () => <DemoIndicator />,
};
