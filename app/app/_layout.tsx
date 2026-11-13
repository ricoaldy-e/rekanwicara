import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { ContentProvider } from '../src/state/content';
import { SettingsProvider } from '../src/state/settings';
import { UserProvider, useUser } from '../src/state/user';
import { colors, displayFont, fontSize, setPlayfairLoaded } from '../src/theme';

// Keep the splash up until the title font is loaded or has failed (then titles use the system serif).
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function DemoIndicator() {
  const { demo } = useUser();
  return demo ? <Text accessibilityLabel="Mode demo aktif" style={{ color: colors.text, fontSize: fontSize.small, fontWeight: '700' }}>Mode demo</Text> : null;
}

export default function RootLayout() {
  const [fontLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold });
  setPlayfairLoaded(fontLoaded);
  useEffect(() => {
    if (fontLoaded || fontError) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontLoaded, fontError]);
  if (!fontLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ContentProvider>
          <UserProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitleStyle: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
              contentStyle: { backgroundColor: colors.background },
              headerBackTitle: 'Kembali',
              headerRight: () => <DemoIndicator />,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ title: 'Selamat datang' }} />
            <Stack.Screen name="calibration" options={{ title: 'Kalibrasi' }} />
            <Stack.Screen name="home" options={{
                title: 'Rekan Wicara',
                headerBackVisible: false,
                headerTitleStyle: { ...displayFont(), fontSize: fontSize.large, color: colors.text },
              }} />
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
