import Ionicons from '@expo/vector-icons/Ionicons';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import type { ReactNode } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { colors, fontSize, spacing } from '../theme';

export interface PermissionGateProps {
  children: ReactNode;
  /** What the recording is for, shown under the title. */
  purpose?: string;
}

const DEFAULT_PURPOSE =
  'Kamera depan dipakai untuk melihat bentuk bibir, mikrofon untuk merekam suara. Wajah tidak dikenali; hanya bentuk mulut yang diukur.';

/** Shows children only when both camera and microphone are granted; otherwise a visual explanation. */
export function PermissionGate({ children, purpose = DEFAULT_PURPOSE }: PermissionGateProps) {
  const [camera, requestCamera] = useCameraPermissions();
  const [mic, requestMic] = useMicrophonePermissions();

  if (!camera || !mic) {
    return (
      <View style={styles.center} accessible accessibilityLabel="Memeriksa izin">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (camera.granted && mic.granted) return <>{children}</>;

  const blocked = (!camera.granted && !camera.canAskAgain) || (!mic.granted && !mic.canAskAgain);

  async function ask() {
    if (!camera?.granted) await requestCamera();
    if (!mic?.granted) await requestMic();
  }

  return (
    <Card>
      <View style={styles.icons} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <PermissionIcon name="camera" granted={camera.granted} />
        <Ionicons name="add" size={32} color={colors.textMuted} />
        <PermissionIcon name="mic" granted={mic.granted} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Izinkan kamera dan mikrofon
      </Text>
      <Text style={styles.body}>{purpose}</Text>
      <View style={styles.status}>
        <Text style={styles.body}>Kamera: {camera.granted ? '✓ diizinkan' : '✕ belum'}</Text>
        <Text style={styles.body}>Mikrofon: {mic.granted ? '✓ diizinkan' : '✕ belum'}</Text>
      </View>
      {blocked ? (
        <>
          <Text style={styles.body}>
            Izin sudah ditolak. Buka Pengaturan HP → Aplikasi → Expo Go → Izin, lalu aktifkan Kamera dan Mikrofon.
          </Text>
          <BigButton label="Buka Pengaturan" icon="settings" onPress={() => Linking.openSettings()} />
        </>
      ) : (
        <BigButton label="Izinkan" icon="checkmark" onPress={ask} />
      )}
    </Card>
  );
}

function PermissionIcon({ name, granted }: { name: 'camera' | 'mic'; granted: boolean }) {
  return (
    <View style={[styles.iconBox, granted && styles.iconGranted]}>
      <Ionicons name={name} size={48} color={granted ? colors.onPrimary : colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', padding: spacing.lg },
  icons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconGranted: { backgroundColor: colors.success, borderColor: colors.success },
  title: { fontSize: fontSize.large, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: fontSize.body, color: colors.text, lineHeight: 28, marginBottom: spacing.sm },
  status: { marginVertical: spacing.sm },
});
