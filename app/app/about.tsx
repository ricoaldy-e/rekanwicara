import Constants from 'expo-constants';

import { Body, InfoNote, Screen, Title } from '../src/components';
import { useContent } from '../src/state/content';

export default function About() {
  const { health } = useContent();
  return (
    <Screen>
      <Title>Tentang Rekan Wicara</Title>
      <Body>Alat bantu latihan pelafalan bagi penyandang Tuli yang memilih berlatih bicara, untuk LOGICODIX 2026.</Body>
      <InfoNote text="Hasil adalah perkiraan sistem untuk latihan. Bukan pengganti guru atau terapis, dan bukan penilaian klinis." />
      <Title>Batas penggunaan</Title>
      <Body>Materi mencakup vokal a, i, u dan konsonan m, p, b. Bunyi yang mirip masih dapat mendapat hasil sama. Evaluasi awal berasal dari tiga anggota tim; belum diuji pada pengguna Tuli dan anak.</Body>
      <Body>Deteksi kata belum andal pada semua ucapan. Kalibrasi dan pendamping membantu penggunaan; hasil bukan ukuran kemampuan seseorang.</Body>
      <Title>Privasi</Title>
      <Body>Wajah dipakai untuk mengukur bentuk bibir, tanpa pengenalan identitas. Rekaman latihan dihapus setelah diproses. Rekaman yang gagal dikirim dapat dikirim ulang dan dibuang saat merekam ulang atau meninggalkan layar.</Body>
      <Body>Yang disimpan adalah hasil latihan dan angka kalibrasi. Supabase menyimpan hasil dan progres, tanpa video atau audio. Mode demo memakai profil contoh terpisah dan tidak mengirim hasil ke Supabase.</Body>
      <Title>Versi</Title>
      <Body>App: {Constants.expoConfig?.version ?? 'Tidak tersedia'}</Body>
      <Body>Mesin: {health?.engine_version ?? 'Belum terhubung ke server'}</Body>
      {health?.mock_mode ? <InfoNote text="Server memakai mode contoh. Hasilnya bukan analisis rekaman." /> : null}
    </Screen>
  );
}
