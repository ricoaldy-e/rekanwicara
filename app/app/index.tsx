import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Screen } from '../src/components';
import { hasPin, LOCAL_UID } from '../src/pin/pinStore';
import { useUser } from '../src/state/user';
import { colors } from '../src/theme';

/** First launch goes through the PIN and onboarding; after that straight to the home screen. */
export default function Index() {
  const { ready, profile } = useUser();
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  useEffect(() => {
    // If the keystore cannot be read, go on to create a PIN rather than hang here.
    hasPin(LOCAL_UID).then(setPinSet, () => setPinSet(false));
  }, []);
  if (!ready || pinSet === null) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memuat" />
      </Screen>
    );
  }
  if (!pinSet) return <Redirect href="/auth/create-pin" />;
  return <Redirect href={profile.onboarded ? '/home' : '/onboarding'} />;
}
