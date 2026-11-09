import { Body, InfoNote, Screen, Title } from '../src/components';
import { DATASET_MODE } from '../src/config';

/** Hidden dataset recording screen (SPEC §8.1, §10). Placeholder (B0); recording/upload come in B1. */
export default function Dataset() {
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
      <InfoNote text="Hanya untuk perekam tim yang sudah memberi persetujuan tertulis." />
      <Body muted>(Perekaman dan unggah dataset menyusul.)</Body>
    </Screen>
  );
}
