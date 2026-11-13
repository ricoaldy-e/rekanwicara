import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { showFlash } from '../../../src/forms/flash';
import { fill, MESSAGES, messageOf, type Problem } from '../../../src/forms/messages';
import { isWeakPin, sameAsOld } from '../../../src/forms/validators/pin';
import { attemptPin, LOCAL_UID, savePin } from '../../../src/pin/pinStore';
import { PinScreenBody, usePinInput } from '../../../src/pin/PinScreenBody';

type Step = 'old' | 'new' | 'repeat';
const TITLE: Record<Step, string> = { old: 'Masukkan PIN lama', new: 'Buat PIN baru', repeat: 'Ulangi PIN baru' };

/** AUTH-5: old PIN → new PIN → repeat. The new PIN must differ from the old one. */
export default function ChangePin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('old');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const oldPin = useRef('');
  const newPin = useRef('');

  const done = async (pin: string) => {
    pad.clear();
    const problem = (p: Problem) => setMessage(messageOf(p));
    if (step === 'old') {
      setBusy(true);
      try {
        const res = await attemptPin(LOCAL_UID, pin);
        if (res.ok) {
          oldPin.current = pin;
          setMessage(null);
          setStep('new');
        } else {
          setMessage(res.locked ? fill(MESSAGES.pinLocked, { n: res.secondsLeft }) : fill(MESSAGES.pinWrong, { n: res.triesLeft }));
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === 'new') {
      if (sameAsOld(oldPin.current, pin)) return problem('pinSameAsOld');
      if (isWeakPin(pin)) return problem('pinWeak');
      newPin.current = pin;
      setMessage(null);
      setStep('repeat');
      return;
    }
    if (pin !== newPin.current) {
      newPin.current = '';
      setStep('new');
      return problem('pinMismatch');
    }
    try {
      await savePin(LOCAL_UID, pin);
      showFlash(MESSAGES.pinChanged);
      router.back();
    } catch {
      setMessage(MESSAGES.pinSaveFailed);
      setStep('new');
    }
  };
  const pad = usePinInput(done, busy);

  return (
    <PinScreenBody
      title={TITLE[step]}
      filled={pad.digits.length}
      message={message}
      padDisabled={busy}
      onDigit={pad.onDigit}
      onDelete={pad.onDelete}
    />
  );
}
