import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ContentProvider } from '../src/state/content';
import { SettingsProvider } from '../src/state/settings';
import { colors, fontSize } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ContentProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.primary,
              headerTitleStyle: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
              contentStyle: { backgroundColor: colors.background },
              headerBackTitle: 'Kembali',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ title: 'Selamat datang' }} />
            <Stack.Screen name="calibration" options={{ title: 'Kalibrasi' }} />
            <Stack.Screen name="home" options={{ title: 'Cermin Wicara', headerBackVisible: false }} />
            <Stack.Screen name="practice/[itemId]" options={{ title: 'Latihan' }} />
            <Stack.Screen name="companion" options={{ title: 'Mode Pendamping' }} />
            <Stack.Screen name="dataset/index" options={{ title: 'Mode Dataset' }} />
            <Stack.Screen name="dataset/session" options={{ title: 'Sesi Dataset' }} />
            <Stack.Screen name="dataset/model-videos" options={{ title: 'Rekam Video Model' }} />
            <Stack.Screen name="settings" options={{ title: 'Pengaturan' }} />
          </Stack>
        </ContentProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
