import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from './AuthProvider';

/**
 * When the session disappears while the app is open (signed out, or a 401 that could not be refreshed),
 * go to Masuk. The auth screens and the start gate decide for themselves, so they are left alone.
 */
export function SignedOutRedirect() {
  const { ready, required, session } = useAuth();
  const router = useRouter();
  const first = (useSegments() as string[])[0];
  const handledElsewhere = first === undefined || first === 'index' || first === 'auth';
  useEffect(() => {
    if (ready && required && !session && !handledElsewhere) router.replace('/auth/sign-in');
  }, [ready, required, session, handledElsewhere, router]);
  return null;
}
