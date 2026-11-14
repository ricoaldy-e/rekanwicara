import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { auth } from '../../../src/auth/session';
import { ConfirmDialog, InfoNote, Screen } from '../../../src/components';
import { PinGate } from '../../../src/pin/PinGate';
import { usePinSession } from '../../../src/pin/PinSession';

/** Keluar asks the companion PIN first (design.md §6.7), then the confirmation that was on Pengaturan. */
export default function SignOutScreen() {
  const { touch } = usePinSession();
  return (
    <PinGate>
      <View style={{ flex: 1 }} onTouchStart={touch}>
        <SignOutConfirm />
      </View>
    </PinGate>
  );
}

export function SignOutConfirm() {
  const router = useRouter();
  const { lock } = usePinSession();
  const [failed, setFailed] = useState(false);

  /** Keep the PIN and profile; only leave after the SDK confirms local session removal. */
  async function signOut() {
    try {
      await auth.signOut();
    } catch {
      setFailed(true);
      return;
    }
    lock();
    router.replace('/auth/sign-in');
  }

  return (
    <Screen>
      {failed ? <InfoNote tone="warning" text="Logout belum berhasil. Coba lagi." testID="sign-out-error" /> : null}
      <ConfirmDialog
        visible
        title="Keluar dari akun?"
        message="Riwayat latihan tetap tersimpan di akun. Untuk masuk lagi, butuh email dan kata sandi."
        confirmLabel="Keluar"
        confirmIcon="log-out-outline"
        cancelLabel="Batal"
        danger
        onCancel={() => router.back()}
        onConfirm={signOut}
      />
    </Screen>
  );
}
