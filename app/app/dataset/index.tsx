import { useRouter } from 'expo-router';

import { BigButton, Body, InfoNote, Screen, Title } from '../../src/components';
import { DATASET_MODE } from '../../src/config';
import { useSettings } from '../../src/state/settings';

/** Hidden dataset tools (SPEC §8.1, §10). Only reachable when EXPO_PUBLIC_DATASET_MODE=true. */
export default function DatasetHome() {
  const router = useRouter();
  const { apiUrl } = useSettings();

  if (!DATASET_MODE) {
    return (
      <Screen>
        <InfoNote tone="warning" text="Mode Dataset tidak aktif. Set EXPO_PUBLIC_DATASET_MODE=true di app/.env." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Mode Dataset</Title>
      <InfoNote text="Hanya untuk perekam tim (P1, P2, P3) yang sudah menyetujui pemakaian rekamannya untuk pengembangan." />
      <Body muted>Server: {apiUrl || '(belum diatur)'}. Server harus berjalan dengan DATASET_MODE=true.</Body>
      <BigButton
        label="Sesi Dataset (27 klip)"
        icon="list"
        onPress={() => router.push('/dataset/session')}
        accessibilityHint="Rekam skrip 27 klip untuk satu penutur"
      />
      <BigButton
        label="Rekam Video Model (16)"
        icon="videocam"
        variant="secondary"
        onPress={() => router.push('/dataset/model-videos')}
        accessibilityHint="Rekam video contoh untuk setiap materi"
      />
    </Screen>
  );
}
