import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton, InfoNote } from '../../src/components';
import { MESSAGES, messageOf, type Problem } from '../../src/forms/messages';
import { isWeakPin } from '../../src/forms/validators/pin';
import { useAuth } from '../../src/auth/AuthProvider';
import { savePin } from '../../src/pin/pinStore';
import { PinScreenBody, usePinInput } from '../../src/pin/PinScreenBody';
import { useUser } from '../../src/state/user';
import { colors, entry, fontSize, lineHeight, textFont, touchTarget } from '../../src/theme';

/** AUTH-3: make the companion PIN in two steps (Figma 29:28, 29:86). The PIN only locks the settings screens; it is not strong security. */
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

  // Step 1 has nowhere to go back to: a PIN is needed before the app can be used.
  const back = () => {
    first.current = '';
    setProblem(null);
    setStep(1);
    pad.clear();
  };

  return (
    <PinScreenBody
      headerless
      contentStyle={styles.content}
      top={
        <View style={styles.stepRow}>
          {step === 2 ? <BackButton label="Kembali" onPress={back} testID="create-pin-back" /> : <View />}
          <Text maxFontSizeMultiplier={2} style={[styles.step, textFont()]}>Langkah {step} dari 2</Text>
        </View>
      }
      title={step === 1 ? 'Buat PIN 4 angka' : 'Ulangi PIN'}
      instruction={
        step === 1
          ? 'PIN ini mengunci tab Pendamping dan Pengaturan agar pengaturan latihan tidak berubah tanpa sengaja. PIN disimpan di HP ini dan tidak dikirim ke server.'
          : 'Masukkan PIN yang sama sekali lagi.'
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: entry.gutter },
  stepRow: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
});
