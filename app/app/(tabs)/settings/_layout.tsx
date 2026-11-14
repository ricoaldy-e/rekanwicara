import { Stack } from 'expo-router';

import { darkStackOptions } from '../../../src/navigation/stackOptions';

/**
 * Pengaturan is open to everyone (design.md §6.7, D2): Getar is the Tuli user's own preference.
 * Ganti PIN asks the old PIN itself; Keluar goes through the PIN-gated `sign-out` screen.
 */
export default function Layout() {
  return (
    <Stack screenOptions={darkStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Pengaturan' }} />
      <Stack.Screen name="change-pin" options={{ title: 'Ganti PIN' }} />
      <Stack.Screen name="sign-out" options={{ title: 'Keluar' }} />
    </Stack>
  );
}
