import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BigButton, Body, Card, CheckRow, InfoNote, Screen, StepHeader } from '../src/components';
import { useUser } from '../src/state/user';
import { isValidPin } from '../src/user/pure';
import { colors, fontSize, radius, spacing, touchTarget } from '../src/theme';

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
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const pinError = !isValidPin(pin) ? 'PIN harus 4 angka.' : pin !== pinAgain ? 'Kedua PIN belum sama.' : null;

  const finish = async () => {
    if (pinError) return;
    setSaving(true);
    setSaveError(false);
    try {
      await completeOnboarding(pin);
      router.replace('/calibration');
    } catch {
      setSaveError(true); // keystore refused the PIN: stay here so it can be retried
      setSaving(false);
    }
  };

  return (
    <Screen>
      <StepHeader step={step} total={3} title={['Kenali Rekan Wicara', 'Persetujuan', 'PIN pendamping'][step - 1]} />

      {step === 1 ? (
        <>
          <Body>Rekan Wicara membantu kamu berlatih mengucapkan bunyi dengan melihat bentuk bibir dan merasakan suara.</Body>
          {CYCLE.map((c) => (
            <Card key={c.text}>
              <View style={styles.row}>
                <Ionicons name={c.icon} size={32} color={colors.text} />
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
            label="Lanjut"
            icon="arrow-forward"
            disabled={!consentUser || !consentCompanion}
            onPress={() => setStep(3)}
          />
          <BigButton label="Kembali" variant="secondary" onPress={() => setStep(1)} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Body>Pendamping membuat PIN 4 angka untuk membuka Mode Pendamping. PIN disimpan aman di HP ini.</Body>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
            style={styles.input}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="PIN 4 angka"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="PIN pendamping, 4 angka"
            testID="pin-input"
          />
          <TextInput
            value={pinAgain}
            onChangeText={(t) => setPinAgain(t.replace(/\D/g, '').slice(0, 4))}
            style={styles.input}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="Ulangi PIN"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Ulangi PIN pendamping"
            testID="pin-again-input"
          />
          {pin.length > 0 && pinAgain.length > 0 && pinError ? <InfoNote tone="warning" text={pinError} /> : null}
          {saveError ? <InfoNote tone="warning" text="PIN belum bisa disimpan. Coba lagi." /> : null}
          <BigButton label="Simpan, lanjut ke kalibrasi" icon="checkmark" disabled={pinError !== null || saving} onPress={finish} />
          <BigButton label="Kembali" variant="secondary" onPress={() => setStep(2)} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  input: {
    minHeight: touchTarget,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.large,
    color: colors.text,
    letterSpacing: 6,
  },
});
