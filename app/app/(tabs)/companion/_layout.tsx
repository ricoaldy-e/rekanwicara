import { Stack } from 'expo-router';

import { darkStackOptions } from '../../../src/navigation/stackOptions';

export default function Layout() {
  return (
    <Stack screenOptions={darkStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Mode Pendamping' }} />
    </Stack>
  );
}
