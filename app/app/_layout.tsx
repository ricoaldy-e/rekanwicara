import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { AuthProvider } from '../src/auth/AuthProvider';
import { SignedOutRedirect } from '../src/auth/SignedOutRedirect';
import { darkStackOptions } from '../src/navigation/stackOptions';
import { PinSessionProvider } from '../src/pin/PinSession';
import { ContentProvider } from '../src/state/content';
import { SettingsProvider } from '../src/state/settings';
import { UserProvider } from '../src/state/user';
import { setInterLoaded, setPlayfairLoaded } from '../src/theme';

// Keep the splash up until the title font is loaded or has failed (then titles use the system serif).
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold, Inter_400Regular, Inter_700Bold });
  // useFonts is all-or-nothing, so one flag per family is set together; on error both fall back to system fonts.
  setPlayfairLoaded(fontLoaded);
  setInterLoaded(fontLoaded);
  useEffect(() => {
    if (fontLoaded || fontError) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontLoaded, fontError]);
  if (!fontLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ContentProvider>
          <AuthProvider>
          <UserProvider>
          <PinSessionProvider>
          <StatusBar style="light" />
          <SignedOutRedirect />
          <Stack screenOptions={darkStackOptions}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="auth/sign-in" options={{ title: 'Masuk', headerShown: false }} />
            <Stack.Screen name="auth/sign-up" options={{ title: 'Daftar', headerShown: false }} />
            <Stack.Screen name="auth/check-email" options={{ title: 'Cek email', headerBackVisible: false, headerLeft: () => null }} />
            <Stack.Screen name="auth/forgot-pin" options={{ title: 'Lupa PIN' }} />
            <Stack.Screen name="auth/create-pin" options={{ title: 'Buat PIN', headerBackVisible: false, headerLeft: () => null }} />
            <Stack.Screen name="onboarding" options={{ title: 'Selamat datang', headerShown: false }} />
            <Stack.Screen name="calibration" options={{ title: 'Kalibrasi' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="practice/[itemId]" options={{ title: 'Latihan' }} />
            <Stack.Screen name="dataset/index" options={{ title: 'Mode Dataset' }} />
            <Stack.Screen name="dataset/session" options={{ title: 'Sesi Dataset' }} />
            <Stack.Screen name="dataset/model-videos" options={{ title: 'Rekam Video Model' }} />
            <Stack.Screen name="about" options={{ title: 'Tentang aplikasi' }} />
          </Stack>
          </PinSessionProvider>
          </UserProvider>
          </AuthProvider>
        </ContentProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
