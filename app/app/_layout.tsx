import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

import { ContentProvider } from '../src/state/content';
import { SettingsProvider } from '../src/state/settings';
import { UserProvider, useUser } from '../src/state/user';
import { colors, fontSize } from '../src/theme';

function DemoIndicator() {
  const { demo } = useUser();
  return demo ? <Text accessibilityLabel="Mode demo aktif" style={{ color: colors.primary, fontSize: fontSize.small, fontWeight: '700' }}>Mode demo</Text> : null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ContentProvider>
          <UserProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.primary,
              headerTitleStyle: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
              contentStyle: { backgroundColor: colors.background },
              headerBackTitle: 'Kembali',
              headerRight: () => <DemoIndicator />,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ title: 'Selamat datang' }} />
            <Stack.Screen name="calibration" options={{ title: 'Kalibrasi' }} />
            <Stack.Screen name="home" options={{ title: 'Rekan Wicara', headerBackVisible: false }} />
            <Stack.Screen name="practice/[itemId]" options={{ title: 'Latihan' }} />
            <Stack.Screen name="companion" options={{ title: 'Mode Pendamping' }} />
            <Stack.Screen name="dataset/index" options={{ title: 'Mode Dataset' }} />
            <Stack.Screen name="dataset/session" options={{ title: 'Sesi Dataset' }} />
            <Stack.Screen name="dataset/model-videos" options={{ title: 'Rekam Video Model' }} />
            <Stack.Screen name="settings" options={{ title: 'Pengaturan' }} />
            <Stack.Screen name="about" options={{ title: 'Tentang aplikasi' }} />
          </Stack>
          </UserProvider>
        </ContentProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
