import { Stack } from 'expo-router';
import { View } from 'react-native';

import { darkStackOptions } from '../../../src/navigation/stackOptions';
import { PinGate } from '../../../src/pin/PinGate';
import { usePinSession } from '../../../src/pin/PinSession';

/** Open only after the companion PIN; every touch restarts the 5-minute idle timer. */
export default function Layout() {
  const { touch } = usePinSession();
  return (
    <PinGate headerless>
      <View style={{ flex: 1 }} onTouchStart={touch}>
        <Stack screenOptions={darkStackOptions}>
          <Stack.Screen name="index" options={{ title: 'Pendamping', headerShown: false }} />
          <Stack.Screen name="words/new" options={{ title: 'Tambah kata' }} />
          <Stack.Screen name="words/[wordId]/edit" options={{ title: 'Ubah kata' }} />
        </Stack>
      </View>
    </PinGate>
  );
}
