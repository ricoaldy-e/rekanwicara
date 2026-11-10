import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '../src/components';
import { useUser } from '../src/state/user';
import { colors } from '../src/theme';

/** First launch goes through onboarding; after that straight to the home screen. */
export default function Index() {
  const { ready, profile } = useUser();
  if (!ready) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Memuat" />
      </Screen>
    );
  }
  return <Redirect href={profile.onboarded ? '/home' : '/onboarding'} />;
}
