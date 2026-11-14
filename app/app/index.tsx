import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../src/auth/AuthProvider';
import { SplashIntro } from '../src/components/SplashIntro';
import { hasPin } from '../src/pin/pinStore';
import { useUser } from '../src/state/user';

// The opening animation plays once per launch; coming back to this gate later (sign-out, sign-up) skips it.
let introPlayed = false;

/** Start gate: signed in → has a PIN → onboarding done → Beranda. Each missing step is sent to its screen. */
export default function Index() {
  const { ready, profile } = useUser();
  const auth = useAuth();
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const signedOut = auth.required && !auth.session;

  useEffect(() => {
    if (!auth.ready || signedOut) return;
    setPinSet(null);
    // If the keystore cannot be read, go on to create a PIN rather than hang here.
    hasPin(auth.uid).then(setPinSet, () => setPinSet(false));
  }, [auth.ready, auth.uid, signedOut]);

  const onDone = useCallback(() => {
    introPlayed = true;
    setIntroDone(true);
  }, []);

  let href: '/welcome' | '/auth/create-pin' | '/home' | '/onboarding' | null = null;
  if (ready && auth.ready) {
    if (signedOut) href = '/welcome';
    else if (pinSet !== null) href = !pinSet ? '/auth/create-pin' : profile.onboarded ? '/home' : '/onboarding';
  }

  if (introDone && href) return <Redirect href={href} />;
  return <SplashIntro animate={!introPlayed} ready={href !== null} onDone={onDone} />;
}
