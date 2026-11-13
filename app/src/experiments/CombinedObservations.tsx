import { Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import type { CombinedResponse, Status } from '../api/types';
import { Body, InfoNote, Title } from '../components';
import { StatusIcon } from '../components/StatusIcon';
import { colors, fontSize, radius, spacing, statusStyles } from '../theme';

const OUTCOMES = {
  berhasil: { label: 'Berhasil', status: 'hijau' },
  mendekati: { label: 'Mendekati', status: 'kuning' },
  coba_lagi: { label: 'Coba lagi', status: 'merah' },
} satisfies Record<string, { label: string; status: Status }>;
const REASONS = {
  matched: 'Teks cocok dengan target dan indikasi berbicara terdeteksi.',
  near_match: 'Teks yang terbaca mendekati target. Coba ulangi kata atau frasa ini.',
  different_text: 'Teks yang terbaca belum mendekati target. Coba rekam sekali lagi.',
  empty_text: 'Belum ada teks yang terbaca. Ucapkan target setelah indikator merekam muncul.',
  visual_gate: 'Pemeriksaan wajah atau gerak bibir belum lulus. Lihat petunjuk di bawah lalu rekam lagi.',
  silent_audio: 'Suara belum tertangkap cukup jelas. Periksa mikrofon dan coba rekam lagi.',
  short_audio: 'Bagian suara terdeteksi terlalu singkat. Coba ucapkan target sekali lagi.',
  component_unavailable: 'Proses belum dapat diselesaikan. Ini kegagalan pemrosesan, bukan hasil penilaian ucapan. Coba rekam lagi.',
} as const;

export function CombinedObservations({ result }: { result: CombinedResponse }) {
  const { visual, feedback } = result;
  const outcome = feedback.outcome ? OUTCOMES[feedback.outcome] : null;
  const style = outcome ? statusStyles[outcome.status] : null;
  return (
    <>
      <Title>Hasil latihan</Title>
      {outcome && style ? (
        <View accessible accessibilityLabel={`Hasil latihan: ${outcome.label}`} accessibilityLiveRegion="polite" style={{ backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: style.foreground, borderRadius: radius.tile, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <StatusIcon status={outcome.status} size={28} />
          <Text style={{ color: style.foreground, fontSize: fontSize.large, fontWeight: '700' }}>{outcome.label}</Text>
        </View>
      ) : <InfoNote tone="warning" text="Penilaian belum tersedia" />}
      <InfoNote tone={feedback.outcome === 'berhasil' ? 'info' : 'warning'} text={REASONS[feedback.reason]} />
      <Title>Pemeriksaan berbicara</Title>
      {visual.status === 'unavailable' ? (
        <InfoNote tone="warning" text="Pemeriksaan MediaPipe belum tersedia. Hasil teks tetap ditampilkan, tetapi percobaan belum dapat dinilai." />
      ) : (
        <>
          <InfoNote tone={visual.gate === 'passed' ? 'info' : 'warning'} text={visual.gate === 'passed' ? 'Indikasi berbicara terdeteksi.' : 'Indikasi berbicara belum memenuhi pemeriksaan.'} />
          {visual.warnings.includes('no_face') ? <Body>Posisikan wajah agar terlihat sepanjang rekaman.</Body> : null}
          {visual.warnings.includes('face_off_frame') ? <Body>Sesuaikan jarak dan posisi wajah agar bibir terlihat jelas.</Body> : null}
          {visual.warnings.includes('motion_missing') ? <Body>Gerakan bibir saat suara terdengar belum cukup teramati. Ucapkan target dengan nyaman setelah indikator merekam muncul.</Body> : null}
          {visual.lip_contour ? (
            <>
              <Svg width="100%" viewBox="0 0 320 140" style={{ aspectRatio: 320 / 140 }} accessible accessibilityRole="image" accessibilityLabel="Kontur bibir dari satu cuplikan rekaman, tanpa bentuk target atau penilaian ketepatan.">
                <Polygon points={visual.lip_contour.points.map(([x, y]) => `${30 + x * 260},${20 + y * 100}`).join(' ')} fill={colors.infoBg} stroke={colors.text} strokeWidth={4} strokeLinejoin="round" />
              </Svg>
              <Body muted>Kontur satu cuplikan, diskalakan untuk tampilan. Pemeriksaan gerak memakai rangkaian cuplikan.</Body>
            </>
          ) : null}
        </>
      )}
      <Body muted>Pemeriksaan ini hanya indikasi gerak bibir bersama suara, belum memastikan sumber suara. Ambang awal masih perlu diuji.</Body>
      <Body muted>Waktu proses server: {(result.processing_ms / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} detik.</Body>
    </>
  );
}
