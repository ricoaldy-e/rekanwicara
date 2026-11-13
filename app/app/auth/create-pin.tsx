import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { InfoNote } from '../../src/components';
import { MESSAGES, messageOf, type Problem } from '../../src/forms/messages';
import { isWeakPin } from '../../src/forms/validators/pin';
import { useAuth } from '../../src/auth/AuthProvider';
import { savePin } from '../../src/pin/pinStore';
import { PinScreenBody, usePinInput } from '../../src/pin/PinScreenBody';
import { useUser } from '../../src/state/user';

/** AUTH-3: make the companion PIN in two steps. The PIN only locks the settings screens; it is not strong security. */
export default function CreatePin() {
  const router = useRouter();
  const { profile } = useUser();
  const { uid } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const first = useRef('');

  const done = async (pin: string) => {
    if (step === 1) {
      if (isWeakPin(pin)) {
        setProblem('pinWeak');
      } else {
        first.current = pin;
        setProblem(null);
        setStep(2);
      }
      pad.clear();
      return;
    }
    if (pin !== first.current) {
      first.current = '';
      setProblem('pinMismatch');
      setStep(1);
      pad.clear();
      return;
    }
    try {
      await savePin(uid, pin);
      router.replace(profile.onboarded ? '/home' : '/onboarding');
    } catch {
      setSaveFailed(true);
      first.current = '';
      setStep(1);
      pad.clear();
    }
  };
  const pad = usePinInput(done);

  return (
    <PinScreenBody
      title={step === 1 ? 'Buat PIN 4 angka' : 'Ulangi PIN'}
      instruction={
        step === 1
          ? 'PIN ini mengunci tab Pendamping dan Pengaturan agar pengaturan latihan tidak berubah tanpa sengaja. PIN disimpan di HP ini dan tidak dikirim ke server.'
          : undefined
      }
      filled={pad.digits.length}
      message={problem ? messageOf(problem) : null}
      onDigit={pad.onDigit}
      onDelete={pad.onDelete}
    >
      {saveFailed ? <InfoNote tone="warning" text={MESSAGES.pinSaveFailed} testID="pin-save-error" /> : null}
    </PinScreenBody>
  );
}
