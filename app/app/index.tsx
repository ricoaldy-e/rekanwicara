import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../src/auth/AuthProvider';
import { LogoMark } from '../src/components';
import { hasPin } from '../src/pin/pinStore';
import { useUser } from '../src/state/user';
import { colors, displayFont, entry, fontSize, lineHeight, spacing, textFont } from '../src/theme';

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
  if (signedOut) return <Redirect href="/welcome" />;
  if (pinSet === null) return <Loading />;
  if (!pinSet) return <Redirect href="/auth/create-pin" />;
  return <Redirect href={profile.onboarded ? '/home' : '/onboarding'} />;
}

/** "Splash · Memuat" (Figma 106:627): the mark, the name and the product boundary while the gate decides. */
function Loading() {
  return (
    <View accessible accessibilityLabel="Memuat" accessibilityLiveRegion="polite" style={styles.screen} testID="splash-loading">
      <View style={styles.center}>
        <LogoMark size={entry.splashLogo} />
        <View style={styles.names}>
          <Text maxFontSizeMultiplier={1.5} style={[styles.name, displayFont()]}>Rekan Wicara</Text>
          <Text maxFontSizeMultiplier={2} style={[styles.tagline, textFont()]}>Latihan bicara dengan bantuan visual</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        {/* Decorative: a still bar, it does not report progress. */}
        <View style={styles.track}>
          <View style={styles.fill} />
        </View>
        <Text maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>Alat bantu latihan, bukan pengganti terapis wicara.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: entry.welcomeGutter },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg + spacing.xs },
  names: { alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.display, lineHeight: lineHeight.display, color: colors.text, textAlign: 'center' },
  tagline: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted, textAlign: 'center' },
  bottom: { alignItems: 'center', gap: spacing.lg, paddingBottom: spacing.xl + spacing.md },
  track: { width: entry.splashBar.width, height: entry.splashBar.height, borderRadius: entry.splashBar.height, backgroundColor: colors.hairline, overflow: 'hidden' },
  fill: { width: entry.splashBar.fill, height: entry.splashBar.height, borderRadius: entry.splashBar.height, backgroundColor: colors.textMuted },
  note: { maxWidth: 300, fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted, textAlign: 'center' },
});
