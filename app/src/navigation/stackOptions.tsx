import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors } from '../theme';
import { AppHeader } from './AppHeader';

/** Shared by the root Stack and the Stack inside each tab: our own JS header (see AppHeader). */
export const darkStackOptions: NonNullable<ComponentProps<typeof Stack>['screenOptions']> = {
  contentStyle: { backgroundColor: colors.background },
  header: (props) => <AppHeader back={props.back} options={props.options} />,
};
