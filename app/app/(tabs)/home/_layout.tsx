import { Stack } from 'expo-router';

import { darkStackOptions } from '../../../src/navigation/stackOptions';

export default function Layout() {
  return (
    <Stack screenOptions={darkStackOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="level-1" options={{ title: 'Level 1' }} />
      <Stack.Screen name="words/index" options={{ title: 'Pilih kata' }} />
      <Stack.Screen name="words/[wordId]" options={{ title: 'Kata' }} />
    </Stack>
  );
}
