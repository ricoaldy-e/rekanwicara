# Model card — penilai Cermin Wicara (scorer `rules`, engine 0.1.0)

## Tujuan

Memberi umpan balik latihan pelafalan kepada penyandang Tuli/tunarungu yang **memilih** berlatih bicara:
dua indikator (Bibir, Suara) berlabel Sesuai / Mendekati / Belum sesuai, ditambah satu petunjuk. Dipakai
mandiri di antara pertemuan dengan guru atau terapis.

**Bukan** alat diagnosis, terapi, atau penilaian klinis, dan bukan pengganti guru atau terapis wicara.
Hasil selalu ditampilkan sebagai "perkiraan sistem untuk latihan". Penilai tidak mengenali identitas
wajah; wajah hanya dipakai untuk geometri mulut.

Cakupan: Level 0–3, bunyi Tahap A (vokal a, i, u; konsonan m, p, b). Vokal e dan o belum dinilai.

## Komponen

Tidak ada model yang dilatih oleh tim. Penilaian = model pralatih + pengukuran akustik + aturan berambang.

| Komponen | Versi | Peran |
|---|---|---|
| MediaPipe Face Landmarker (Python Tasks API, mode VIDEO) | mediapipe 1.2.2, `face_landmarker.task` float16 (SHA-256 `64184e229b263107…`) | 478 titik wajah + 52 blendshape per frame (15 fps) |
| Parselmouth (Praat) | praat-parselmouth 0.4.7 | intensitas, nada dan status bersuara, formant F1/F2 (langkah 10 ms) |
| FFmpeg / ffprobe | 9.0.2 | audio WAV mono 16 kHz, frame 480 px, selisih waktu audio-video |
| Aturan Cermin Wicara | `server/app/pipeline/` | segmentasi suku kata, aturan SPEC §6.7, skor §6.8, petunjuk §6.9 |
| Ambang | `server/app/config/thresholds.yaml` | nilai awal SPEC, disetel A2/A3 dan A6 (LOSO) |

Lingkungan: Python 3.11, numpy 2.4.6, scipy 1.17.1, FastAPI 0.162.2. Lisensi komponen ada di
`docs/THIRD_PARTY.md` (lisensi berkas model Face Landmarker belum terverifikasi).

## Data

- 81 klip video (2,5–4 detik, wajah + suara) dari **3 anggota tim** (P1, P2, P3), 27 klip per orang
  menurut skrip SPEC §10.2, termasuk kesalahan sengaja dan klip buruk. Ditambah 16 video model dari satu
  orang (contoh di app, tidak dipakai untuk penyetelan).
- Perekaman: iPhone (iOS 26.5, 26.6.2, 27.0) di app Cermin Wicara (Expo Go), satu ruang tenang,
  10 November 2026. Rekaman pertama di kafe dibuang karena bising latar merusak pengukuran suara.
- **Persetujuan**: ketiga perekam adalah anggota tim dan menyepakati pemakaian rekaman mereka untuk
  pengembangan dan evaluasi Cermin Wicara selama lomba (kesepakatan tim, SPEC §10.1). Rekaman tidak
  dipakai untuk melatih model dan tidak dibagikan.
- Label: label otomatis dari skrip (§10.3) + cek label oleh 2 anggota yang bukan perekamnya untuk setiap
  klip. Kesepakatan "sesuai materi" 90%, kappa 0.65.

## Hasil (ringkas; rincian di `docs/EVAL_REPORT.md`)

Leave-one-speaker-out (setel pada 2 orang, uji pada orang ke-3):

| Kemampuan | Hasil | Target |
|---|---|---|
| Deteksi bibir rapat | 56/60 = 93% | ≥ 90% |
| Senyap vs bersuara saat bibir rapat | 43/50 = 86% | ≥ 80% |
| Vokal a/i/u | 19/23 = 83% | ≥ 85% (belum) |
| Status kata (hijau vs bukan) | 12/22 = 55% | ≥ 80% (belum) |
| Klip wajah keluar bingkai diminta ulang | 3/3 | semua |
| Klip layak yang salah ditolak | 1/74 | < 10% |
| Waktu proses server p90 | 984 ms | ≤ 5 s |

Ini **bukti awal dari 3 penutur dewasa**, bukan akurasi sistem.

## Batasan yang diketahui

- **Belum diuji pada penutur Tuli dan anak**, yaitu pengguna sasarannya. Pola bibir dan suara mereka bisa
  sangat berbeda dari data tim.
- Data sangat kecil; ambang bisa terlalu pas dengan 3 orang ini. Semua klip dari iPhone di satu ruangan.
- Pada kata, mesin masih lebih ketat dari penilai manusia (status kata 55%): "a" di dalam kata kurang
  terbuka dibanding "a" tunggal, dan penutupan /b/ sebelum "u" bisa terlewat pada 15 fps.
- Rentang /p/ dan /b/ tumpang tindih setelah penyetelan: sistem belum andal menangkap /p/ yang terlalu
  bersuara. Bunyi mirip (mis. u dan o) bisa dinilai sama karena e dan o belum dinilai.
- Tanpa kalibrasi, penilaian memakai default populasi; orang yang bentuk bibir diamnya berbeda (mis. P3)
  dinilai lebih ketat. Kalibrasi di app diharapkan membantu, tetapi belum dievaluasi dengan rekaman asli.
- Bising latar yang bersuara (musik, obrolan) bisa lolos dari pemeriksaan kualitas bila tidak terlalu keras.

## Privasi dan etika

- Rekaman latihan dihapus dari server segera setelah dianalisis, termasuk saat error; dari HP dihapus
  setelah terkirim. Yang disimpan hanya angka (hasil dan kalibrasi). Log hanya berisi metode, rute,
  kode status, dan durasi.
- Rekaman dataset hanya ada di laptop tim (`data/`, tidak di-commit, tidak diunggah ke layanan cloud) dan
  dihapus setelah lomba kecuali perekam setuju disimpan.
- Halaman cek label hanya terbuka dari laptop server; penilai tidak melihat hasil mesin.
- UI tidak bergantung pada suara; status selalu warna + ikon + teks; tanpa istilah klinis.
- Risiko: umpan balik yang salah dapat membuat pengguna berlatih bentuk yang keliru atau kehilangan
  motivasi. Mitigasi: label "perkiraan sistem", saran berkonsultasi dengan guru atau terapis bila kemajuan
  macet (SPEC §8.4), dan Mode Pendamping.

## Rencana lanjutan

1. Evaluasi ulang dengan kalibrasi pengguna (rest + a/i/u).
2. Data mitra dengan persetujuan tertulis (sekolah luar biasa, komunitas Tuli, terapis wicara), termasuk
   penilaian oleh ahli, sebelum dipakai lebih luas.
3. Scorer Wav2Vec2 untuk penilaian suara yang lebih kaya (ditunda di MVP karena data terlalu kecil).
4. Vokal e/o, pasangan minimal (Level 4), kamera Android, perekaman 30 fps.
