import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BigButton, Body, Card, InfoNote, Screen, StepHeader } from '../src/components';

/** SPEC §8.1: 4 steps (rest 3 s, a, i, u). Placeholder (B0); recording comes in B1/B2. */
const STEPS = [
  { title: 'Diam dan rileks', text: 'Tutup mulut dengan santai selama 3 detik.' },
  { title: 'Ucapkan "a"', text: 'Buka mulut lebar dan ucapkan "aaa".' },
  { title: 'Ucapkan "i"', text: 'Tarik sudut bibir ke samping dan ucapkan "iii".' },
  { title: 'Ucapkan "u"', text: 'Bulatkan bibir dan ucapkan "uuu".' },
] as const;

export default function Calibration() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  return (
    <Screen>
      <StepHeader step={index + 1} total={STEPS.length} title={step.title} />
      <Card>
        <Body>{step.text}</Body>
      </Card>
      <InfoNote text="Perekaman belum aktif di versi kerangka ini." />
      <BigButton
        label={last ? 'Selesai, ke beranda' : 'Langkah berikutnya'}
        icon={last ? 'checkmark' : 'arrow-forward'}
        onPress={() => (last ? router.replace('/home') : setIndex(index + 1))}
      />
      {index > 0 ? <BigButton label="Kembali" variant="secondary" onPress={() => setIndex(index - 1)} /> : null}
    </Screen>
  );
}
