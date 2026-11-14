import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { auth } from '../../../src/auth/session';
import { ConfirmDialog, Screen } from '../../../src/components';
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

  /** Sign out: the session is removed even when the server cannot be reached; the PIN of the account stays. */
  async function signOut() {
    try {
      await auth.signOut();
    } catch {
      // offline: the local session is dropped by the SDK; nothing else to do
    }
    lock();
    router.replace('/auth/sign-in');
  }

  return (
    <Screen>
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
