import { useRouter } from 'expo-router';

import { BigButton, Body, InfoNote, Screen, StepHeader } from '../src/components';

/** Placeholder (B0). Real content (explanation, consent, companion PIN) comes in B2. */
export default function Onboarding() {
  const router = useRouter();
  return (
    <Screen>
      <StepHeader step={1} total={3} title="Kenali Cermin Wicara" />
      <Body>
        Cermin Wicara membantu kamu berlatih mengucapkan bunyi dengan melihat bentuk bibir dan merasakan
        suara.
      </Body>
      <InfoNote text="Aplikasi ini alat bantu latihan mandiri. Bukan pengganti guru atau terapis." />
      <Body muted>(Isi lengkap: persetujuan dan PIN pendamping menyusul.)</Body>
      <BigButton label="Lanjut ke kalibrasi" icon="arrow-forward" onPress={() => router.push('/calibration')} />
      <BigButton label="Lewati ke beranda" variant="secondary" onPress={() => router.replace('/home')} />
    </Screen>
  );
}
