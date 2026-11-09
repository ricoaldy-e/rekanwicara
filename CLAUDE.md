# Cermin Wicara — konteks proyek untuk Claude Code

## Ringkas
Aplikasi latihan pelafalan untuk penyandang Tuli/tunarungu yang **memilih** berlatih bicara.
Pengguna merekam 2–3 detik video wajah beserta suaranya. Server menilai bentuk bibir
(MediaPipe) dan suara (Parselmouth) dengan aturan berambang, lalu
aplikasi menampilkan dua indikator (Bibir, Suara) dan satu petunjuk.

- Lomba: LOGICODIX 2026, subtema Inclusive Health.
- Kunci fitur: Jumat 13 November 2026 malam. Submission: Sabtu 14 November 2026.
- Source code tidak boleh diubah setelah submission. Versi itu yang dipakai di babak final.

## Batas produk (wajib di semua kode dan teks UI)
- Alat bantu latihan, BUKAN diagnosis atau terapi. Jangan pakai kata "normal", "abnormal",
  "gangguan", atau "diagnosis" di UI maupun output API. Label status: Sesuai / Mendekati / Belum sesuai.
- Rekaman produk (bukan dataset) dihapus segera setelah dianalisis, termasuk saat error.
- Log hanya berisi angka dan kode status. Tidak boleh ada path file rekaman, frame, atau potongan audio.
- Tidak ada pengenalan identitas wajah. Wajah hanya dipakai untuk geometri mulut.
- UI tidak boleh bergantung pada suara: semua isyarat visual (+ getar). Tidak ada bunyi beep.
- Status tidak boleh dibedakan dengan warna saja: selalu warna + ikon + teks.
- Cakupan MVP: Level 0–3, bunyi Tahap A (vokal a, i, u [+ e, o bonus]; konsonan m, p, b).
  Level 4 (pasangan minimal) adalah bonus.

## Stack
- `app/`: React Native + Expo (TypeScript strict, expo-router), expo-camera (satu rekaman video+audio),
  react-native-svg, @supabase/supabase-js, expo-haptics. Harus bisa jalan di **Expo Go**:
  jangan menambah modul native custom.
- `server/`: Python 3.11, FastAPI, MediaPipe Face Landmarker (Python Tasks API), praat-parselmouth,
  FFmpeg/ffprobe (binary sistem), numpy/scipy, scikit-learn (hanya untuk metrik evaluasi).
  Wav2Vec2 DITUNDA ke roadmap: jangan memasang torch/transformers di MVP.
- Data tim: 3 perekam, maksimal 100 video. Tidak ada training model; data hanya untuk menyetel ambang dan menguji.
- `ml/`: skrip dataset, pelabelan, penyetelan ambang, evaluasi. Wajib memakai ulang modul `server/app/pipeline`.
- Supabase: profil, riwayat latihan, progres. Server menyimpan kalibrasi di disk lokal (angka saja).
- Demo: HP Android (Expo Go) + laptop server di Wi-Fi yang sama.

## Struktur repo
```
cermin-wicara/
├── CLAUDE.md
├── docs/            SPEC.md, PROGRESS.md, EVAL_REPORT.md, MODEL_CARD.md, supabase/
├── app/             Expo app
├── server/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/         routers (v1)
│   │   ├── core/        settings, logging
│   │   ├── pipeline/    media, quality, lips, audio, calibration, segment, rules, hints
│   │   ├── content/     items.json, hints.json
│   │   └── config/      thresholds.yaml
│   ├── models/          face_landmarker.task (tidak di-commit)
│   └── tests/
├── ml/              dataset/, train/, eval/, tools/
└── data/            raw/, processed/, labels/, splits/, calibration/  (tidak di-commit)
```

## Dokumen acuan
- `docs/SPEC.md`: spesifikasi lengkap. Baca bagian yang disebut di prompt fase sebelum mulai.
  **Kontrak API di SPEC §5 adalah sumber kebenaran untuk app dan server.**
- `docs/PROGRESS.md`: status setiap fase. Perbarui di akhir fase.

## Cara kerja per fase
1. Kerjakan HANYA fase yang diminta. Jangan mencicil fase berikutnya.
2. Mulai dengan rencana singkat (daftar berkas yang akan dibuat/diubah). Tunggu persetujuan.
3. Semua ambang penilaian ada di `server/app/config/thresholds.yaml`, tidak di-hardcode.
4. Logika baru wajib punya tes (pytest untuk server/ml, jest untuk app). Jalankan tes sebelum selesai.
5. Akhir fase: perbarui `docs/PROGRESS.md`, commit dengan pesan `phase <ID>: <ringkas>`,
   lalu laporkan: apa yang selesai, cara menguji manual, risiko/pekerjaan tersisa.
6. Tanya dulu sebelum menambah dependency besar atau mengubah kontrak API.
7. Kalau API sebuah library tidak pasti, cek dokumentasi resminya. Jangan menebak.
8. Kalau sesuatu gagal di lingkungan saya (misalnya ffmpeg tidak ada), berhenti dan beri instruksi,
   jangan membuat solusi diam-diam.

## Perintah umum
- Server: `cd server && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
  (Windows: `.venv\Scripts\activate`)
- Tes server: `cd server && pytest -q`
- App: `cd app && npx expo start`
- Tes app: `cd app && npm test`

## Konvensi
- Python: type hints, model pydantic untuk I/O, format dengan ruff.
- TypeScript: strict, komponen fungsional, tipe API di `app/src/api/types.ts` sesuai SPEC §5.
- Nama berkas, variabel, dan komentar kode dalam bahasa Inggris. Teks untuk pengguna dalam Bahasa Indonesia.

## Data dan rahasia
- `data/`, `server/models/*.task`, `*.joblib`, `*.pt`, `.env` tidak di-commit.
- Kunci Supabase: app di `app/.env` (`EXPO_PUBLIC_...`), server di `server/.env`.
- Dataset rekaman (`data/raw`) hanya untuk pengembangan, dengan persetujuan tertulis penutur,
  dan tidak pernah diunggah ke layanan cloud publik.
