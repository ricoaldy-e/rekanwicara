import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useAuth } from '../src/auth/AuthProvider';
import { Screen } from '../src/components';
import { hasPin } from '../src/pin/pinStore';
import { useUser } from '../src/state/user';
import { colors } from '../src/theme';

/** Start gate: signed in → has a PIN → onboarding done → Beranda. Each missing step is sent to its screen. */
export default function Index() {
  const { ready, profile } = useUser();
  const auth = useAuth();
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const signedOut = auth.required && !auth.session;

  useEffect(() => {
    if (!auth.ready || signedOut) return;
    setPinSet(null);
    // If the keystore cannot be read, go on to create a PIN rather than hang here.
    hasPin(auth.uid).then(setPinSet, () => setPinSet(false));
  }, [auth.ready, auth.uid, signedOut]);

  if (!ready || !auth.ready) return <Loading />;
  if (signedOut) return <Redirect href="/auth/sign-in" />;
  if (pinSet === null) return <Loading />;
  if (!pinSet) return <Redirect href="/auth/create-pin" />;
  return <Redirect href={profile.onboarded ? '/home' : '/onboarding'} />;
}

function Loading() {
  return (
    <Screen>
      <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memuat" />
    </Screen>
  );
}
