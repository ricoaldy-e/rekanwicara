import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton, Body, Card, CheckRow, InfoNote, Screen, StepHeader } from '../src/components';
import { useUser } from '../src/state/user';
import { colors, fontSize, spacing } from '../src/theme';

const CYCLE = [
  { icon: 'eye', text: 'Lihat contoh bentuk bibir.' },
  { icon: 'videocam', text: 'Tiru dan rekam wajah dan suaramu.' },
  { icon: 'git-compare', text: 'Bandingkan hasilnya.' },
  { icon: 'refresh', text: 'Ulangi sampai terasa pas.' },
] as const;

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useUser();
  const [step, setStep] = useState(1);
  const [consentUser, setConsentUser] = useState(false);
  const [consentCompanion, setConsentCompanion] = useState(false);
  const finish = () => {
    completeOnboarding();
    router.replace('/calibration');
  };

  return (
    <Screen>
      <StepHeader step={step} total={2} title={['Kenali Rekan Wicara', 'Persetujuan'][step - 1]} />

      {step === 1 ? (
        <>
          <Body>Rekan Wicara membantu kamu berlatih mengucapkan bunyi dengan melihat bentuk bibir dan merasakan suara.</Body>
          {CYCLE.map((c) => (
            <Card key={c.text}>
              <View style={styles.row}>
                <Ionicons name={c.icon} size={24} color={colors.text} accessible={false} />
                <Text style={styles.rowText}>{c.text}</Text>
              </View>
            </Card>
          ))}
          <InfoNote text="Aplikasi ini alat bantu latihan mandiri. Bukan pengganti guru atau terapis, dan bukan penilaian klinis." />
          <BigButton label="Lanjut" icon="arrow-forward" onPress={() => setStep(2)} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Body>
            Rekaman wajah dan suaramu hanya dikirim ke server latihan untuk dinilai, lalu dihapus. Yang disimpan hanya
            hasil berupa angka. Angka hasil latihan juga disimpan online tanpa namamu, supaya kemajuanmu tidak hilang.
          </Body>
          <CheckRow
            checked={consentUser}
            onToggle={() => setConsentUser((v) => !v)}
            text="Saya mengerti ini alat bantu latihan dan setuju rekaman saya dinilai."
          />
          <CheckRow
            checked={consentCompanion}
            onToggle={() => setConsentCompanion((v) => !v)}
            text="Pendamping (orang tua, keluarga, atau guru) tahu dan setuju."
          />
          <BigButton
            label="Lanjut ke kalibrasi"
            icon="arrow-forward"
            disabled={!consentUser || !consentCompanion}
            onPress={finish}
          />
          <BigButton label="Kembali" variant="secondary" onPress={() => setStep(1)} />
        </>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, fontSize: fontSize.body, color: colors.text },
});
