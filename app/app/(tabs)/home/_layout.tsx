import { Stack } from 'expo-router';

import { darkStackOptions } from '../../../src/navigation/stackOptions';
import { colors, displayFont, fontSize } from '../../../src/theme';

export default function Layout() {
  return (
    <Stack screenOptions={darkStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Rekan Wicara', headerTitleStyle: { ...displayFont(), fontSize: fontSize.large, color: colors.text } }} />
      <Stack.Screen name="level-1" options={{ title: 'Level 1' }} />
      <Stack.Screen name="words/index" options={{ title: 'Pilih kata' }} />
      <Stack.Screen name="words/[wordId]" options={{ title: 'Kata' }} />
    </Stack>
  );
}
