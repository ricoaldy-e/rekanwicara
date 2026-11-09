import { Body, Card, InfoNote, Screen, Title } from '../src/components';

/** Placeholder (B0). PIN, weekly summary, Uji Dengar and text report come in B3. */
export default function Companion() {
  return (
    <Screen>
      <Title>Mode Pendamping</Title>
      <InfoNote text="Bagian ini untuk orang tua, keluarga, atau guru. Nanti dibuka dengan PIN." />
      <Card>
        <Body>• Ringkasan latihan minggu ini</Body>
        <Body>• Uji Dengar (opsional)</Body>
        <Body>• Pengaturan durasi sesi</Body>
        <Body>• Bagikan laporan teks</Body>
      </Card>
      <Body muted>(Isi menyusul.)</Body>
    </Screen>
  );
}
