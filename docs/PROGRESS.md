# PROGRESS

Perbarui tabel ini di akhir setiap fase (status: belum / berjalan / selesai / ditunda).

| Fase | Track | Isi | Target hari | Status | Catatan |
|---|---|---|---|---|---|
| P0 | Bersama | Inisialisasi repo | Selasa 10 Nov pagi | selesai | Python 3.11.9, ffmpeg 9.0.2, Node 22.13.0, git 2.49.0 |
| A0 | Server | Kerangka FastAPI, mock, upload dataset | Selasa 10 Nov | selesai | A0-fix: disesuaikan dengan spec tim 3 orang (lihat Keputusan). 188 tes hijau. Akses dari HP: menunggu cek tim |
| B0 | App | Kerangka Expo, navigasi, komponen dasar | Selasa 10 Nov | selesai | Expo SDK 54 (RN 0.81.5, React 19.1.0, expo-router 6). 30 tes jest hijau, tsc + lint + expo-doctor bersih. Uji di HP: menunggu cek tim |
| A1 | Server | Media + cek kualitas + MediaPipe dasar | Selasa 10 Nov | selesai | mediapipe 1.2.2, parselmouth 0.4.7. 243 tes hijau (0 skip; 6 `requires_model` jalan dengan model asli). Uji rekaman HP ke `/v1/debug/features`: menunggu cek tim |
| B1 | App | Perekaman, upload, Mode Dataset | Selasa 10 Nov | selesai | Diuji di HP (Expo Go SDK 58) oleh 3 perekam di 3 iPhone (iOS 26.5, 26.6.2, 27.0): sesi 27 klip per orang tanpa crash, 81 klip + 16 video model tersimpan di `data/`, metadata 81 baris. Cek kualitas A1 atas 81 klip: 5 klip cacat (lihat Keputusan, 11 Nov) |
| A2 | Server | Fitur bibir + fitur suara + alat plot | Rabu 11 Nov pagi | selesai | `pipeline/lips.py`, `pipeline/audio.py`, `ml/tools/draw_landmarks.py`, `ml/tools/plot_features.py`; deret waktu di `/v1/debug/features`. 255 tes hijau. Indeks 13/14/61/291/33/263 + kontur bibir diverifikasi dengan gambar (P1, P2). l3_mama/l3_papa P1–P3: 2 penutupan di keenam klip; /m/ tengah 100% bersuara (3/3); /p/ tengah P3 0%, P2 38%, P1 57% bersuara (lihat Keputusan) |
| A3 | Server | Kalibrasi, segmentasi, aturan L0–3, petunjuk | Rabu 11 Nov | belum | |
| B2 | App | Onboarding, kalibrasi, alur latihan, hasil | Rabu 11 Nov | belum | |
| A4 | ML | Proses dataset, alat cek label, putaran LOSO | Rabu 11 Nov | belum | |
| B3 | App | Supabase, logika kemajuan, Mode Pendamping | Kamis 12 Nov | belum | |
| A5 | ML | Scorer Wav2Vec2 | — | dilewati | data terlalu sedikit; roadmap |
| I1 | Bersama | Integrasi ujung ke ujung di HP | Kamis 12 Nov malam | belum | |
| A6 | ML | Penyetelan ambang, evaluasi LOSO, model card | Kamis–Jumat | belum | |
| B4 | App | Polish, mode demo, build | Jumat 13 Nov | belum | |
| F | Bersama | Kunci fitur, README, tag submission | Jumat 13 Nov malam | belum | |

## Tugas manual

| No | Isi | Sebelum prompt | Status |
|---|---|---|---|
| 1 | Pasang Expo Go di HP | B0 | selesai (Expo Go: SDK 58; iPhone butuh login akun Expo yang sama dengan Expo CLI) |
| 2 | Rekam: 3 orang × 27 klip + 16 video model | A2 | selesai (rekam ulang di ruang tenang, 10 Nov malam; 5 klip cacat, lihat Keputusan) |
| 3 | Buat proyek Supabase (isi SQL dan .env saat B3) | B3 | belum |
| 4 | Cek label: tiap orang ±54 klip milik dua orang lain | A6 | belum |
| 5 | Video demo | setelah F | belum |
| 6 | Submission | Sabtu 14 Nov | belum |

## Keputusan penting
- Selasa 10 Nov (A1): tanpa `opencv-python-headless`; mediapipe 1.2.2 sudah membawa `opencv-contrib-python`
  (modul `cv2` yang sama). Frame dibaca dari PNG hasil ffmpeg lewat `mp.Image.create_from_file`.
- Selasa 10 Nov (A1): `face_off_frame` = median lebar wajah < 0,25 lebar frame ATAU > 10% frame berwajah
  punya titik mulut (13, 14, 61, 291) di luar frame; dihitung dari frame berwajah saja (asumsi A1, disetel di A6).
- Selasa 10 Nov (A1): noise_floor = persentil ke-10. Pengaman: bila rentang ucapan > 85% klip, floor
  "tidak pasti" → `too_quiet` memakai batas absolut (`abs_min_peak_db` 55 dB), `too_noisy` tidak dicek, info
  `noise_floor_uncertain` di debug. Cakupan juga diukur dengan ambang absolut (`abs_speech_db` 50 dB), tapi
  hanya bila ≥ 50% frame pitch di rentang itu bersuara; tanpa syarat ini bising latar yang keras ikut
  dianggap "penuh suara" dan `too_noisy` tidak pernah dicek.
- Selasa 10 Nov (A1): landmarker dibuat per request (VIDEO mode); waktu pembuatannya dilaporkan di
  `timings_ms.landmarker_init_ms`. Request pertama ±1 s karena import mediapipe, berikutnya ±0,4 s (klip 2 s).
- Selasa 10 Nov (A1): tes yang butuh model diberi marker `requires_model` dan di-skip dengan pesan bila model
  belum diunduh. Model diunduh 10 Nov: SHA-256 `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- Selasa 10 Nov (B0): app memakai **Expo SDK 54** karena Expo Go di HP tim hanya mendukung SDK 54
  (npm terbaru SDK 58; dokumen Expo menyarankan SDK 57 untuk Expo Go selama transisi). Bila Expo Go di HP
  diperbarui ke SDK lain, app harus dinaikkan (`npx expo install expo@^<SDK> --fix`).
- Selasa 10 Nov malam: app dinaikkan ke **Expo SDK 58** (expo 58.0.23, RN 0.88.1, React 19.3.0, TypeScript 6,
  jest 30, Testing Library 14). Alasan: Expo Go yang terpasang dari App Store kini SDK 58, jadi HP baru tim
  tidak bisa membuka proyek SDK 54. Perubahan kode: `StyleSheet.absoluteFillObject` → `absoluteFill`,
  `await render(...)` di tes, `types: ["jest","node"]` di tsconfig (TS 6), `newArchEnabled`/`edgeToEdgeEnabled`
  dihapus dari app.json. Aturan lint baru `react-hooks/refs` dan `set-state-in-effect` sementara `warn`.
  66 tes jest, tsc, expo-doctor 20/20, bundle Android bersih. Uji di HP: menunggu.
- Rabu 11 Nov (A2): jarak landmark dihitung dalam piksel (x dan y MediaPipe dinormalkan terpisah; frame
  HP berdiri 360×480). `mouth_width_rest` disimpan relatif terhadap jarak mata 33–263; tanpa kalibrasi
  dipakai `default_mouth_to_eye_ratio` 0,59 (diukur: P1 0,62, P2 0,59, P3 0,55). Selisih antarorang ±6%
  hampir sebesar margin ambang i/u (±5%), jadi kalibrasi per pengguna di A3 penting.
- Rabu 11 Nov (A2): `closed_gap_ratio` 0,05 → **0,08** (asumsi A2, disetel di A6). Saat bicara, titik bibir
  dalam jarang benar-benar bertemu: minimum penutupan tengah kata median 0,028, p90 0,061, maks 0,089
  (18 kata); puncak vokal ≥ 0,121; diam ±0,002. 0,05 melewatkan 5/18 penutupan, 0,08 melewatkan 1/18.
- Rabu 11 Nov (A2), untuk A3/A6: bibir rapat saat diam (sebelum/sesudah kata) juga terbaca `closed`;
  penutupan konsonan awal kata menyatu dengan diam, jadi `voiced_ratio` §6.6.3 harus diukur di bagian akhir
  penutupan (tepat sebelum bibir terbuka), bukan seluruhnya. /p/ di tengah kata bisa terbaca bersuara karena
  getaran terbawa dari vokal sebelumnya (P1 57%, intensitas di penutupan 50–60 dB vs diam ±35 dB); ambang
  p `voiced_ratio < 0,3` perlu diuji, mungkin dikombinasi dengan `closure_db`. Klip `mama_as_papa` justru
  bersuara saat bibir rapat (35–90%): kemungkinan perekam tetap bersenandung → periksa saat cek label silang.
- Rabu 11 Nov (B1): rekaman pertama di kafe dibuang (bising latar 63–71 dB, sebagian bersuara, merusak pembeda
  /p/ vs /b/ dan /m/); direkam ulang di ruang tenang (bising latar ±28–45 dB). Klip cacat yang tersisa:
  `P3/l0_hold_a` (suara bersambung 1,38 s, aturan butuh ≥ 3 s), `P2/l1_i__r1__none` (terlalu pelan, kena
  `too_noisy`), dan `l1_a__bad_noise` P1/P2/P3 (bising hanya 47–49 dB, SNR 24–30 dB, tidak memicu flag).
  Diputuskan tidak direkam ulang sebelum A2/A3; bila `too_noisy` tidak bisa disetel di A6, rekam ulang
  `bad_noise` dengan bising keras. Vokal tunggal a/i/u hanya bersuara ±0,2–0,4 s (3–6 frame): periksa dengan
  plot di A2 sebelum menyetel ambang vokal. Semua perekam memakai iPhone.
- Selasa 10 Nov (B0): layar Pengaturan tersembunyi dibuka dengan tekan lama (2 detik) judul "Misi hari ini" di Home.
  URL server pengganti disimpan di AsyncStorage; tombol "Kembalikan ke bawaan" memakai nilai `app/.env`.
- Selasa 10 Nov (B0): `app/src/content/hints.json` salinan server; tes jest memastikan isinya identik.
  Tes jest juga menolak kata "normal/abnormal/gangguan/diagnosis" di `app/app` dan `app/src`.
- (catat di sini: misalnya "Rabu malam: SCORER_MODE demo = hybrid karena kesepakatan 87% vs 78%")
- Selasa 10 Nov (A0-fix): `/v1/dataset/upload` hanya menerima `speaker_id` `P1`/`P2`/`P3`;
  `intended_error` + `bad_face` (item apa saja) dan `bad_noise` (hanya `l1_a`).
- Selasa 10 Nov (A0-fix): metadata.csv mengikuti §10.5 (tanpa `sex`/`age_group`). Field upload opsional
  `device` mengisi kolom `device`. Belum ada `data/raw/metadata.csv` lama saat penyesuaian.
- Selasa 10 Nov (A0-fix): item kelas `other` (`other_na` … `other_bising`) dihapus; dataset hanya menerima item `items.json`.
- Selasa 10 Nov (A0-fix): `SCORER_MODE` hanya `rules` (nilai lain ditolak saat start); field `scorer` di API selalu `"rules"`.
- Senin 9 Nov (A0): item bonus (`l1_e`, `l1_o`, `l3_mau`, `l3_bau`, `l3_boba`) `active: false` sampai aturan e/o siap.
- Senin 9 Nov (A0): saat `status:"retry"`, `indicators` juga `null` (selain overall/score/units).
- Senin 9 Nov (A0): format error `{"detail":{"code","message"}}`; daftar kode di `server/README.md`.

## Masalah terbuka
- A1: aturan clipping SPEC §6.2 (> 1% sampel |x| ≥ 0,99) bisa jarang terpicu pada rekaman HP. Setelah
  encode AAC, sinyal yang di-clip keras hanya punya 0,04% sampel ≥ 0,99 (31% ≥ 0,9). Fixture tes memakai
  audio lossless (ALAC). Setel ambang/amplitudo dengan rekaman HP sungguhan di A6.
- A1: PATH proses VS Code saat ini belum memuat ffmpeg (ada di PATH User Windows). Buka ulang VS Code
  sebelum menjalankan server/pytest dari terminal VS Code.
- A1: dengan floor tidak pasti, klip berisi bising bersuara (musik/TV) bisa lolos tanpa `too_noisy`. Cek di A6
  dengan klip `bad_noise`.
- Disk C: tinggal ±5 GB (turun dari ±9 GB). Temp per request kecil, tapi bisa diarahkan ke D: lewat `TMP_DIR`.
- B0: akses HP → laptop (port 8000) belum dicoba dari HP. Bila gagal, cek Windows Firewall (izinkan inbound TCP 8000
  untuk jaringan Private) dan pastikan Wi-Fi laptop berprofil Private.
- SPEC §5: contoh `/analyze` berisi `score: 0.75` untuk unit hijau + merah, padahal rumus §6.8 memberi 0.5.
  Server mengikuti rumus §6.8. Perbaiki contoh di SPEC?
- Lisensi model `face_landmarker.task` belum terverifikasi (lihat `docs/THIRD_PARTY.md`).
- Drive C: laptop server tinggal ±9 GB; arahkan cache pip ke D: sebelum memasang MediaPipe.
- Starlette memberi peringatan bahwa `httpx` untuk TestClient sudah usang (disarankan `httpx2`); tes tetap lolos.
