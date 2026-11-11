# CONTEXT — Cermin Wicara (serah terima ke agen AI lain / laptop lain)

Status: **Rabu 11 November 2026 malam**. Dokumen ini ditulis untuk agen AI (mis. Codex) yang melanjutkan
pekerjaan di laptop lain **tanpa riwayat percakapan sebelumnya**. Semua konteks penting ada di berkas repo:

1. `AGENTS.md` / `CLAUDE.md`: aturan kerja (wajib).
2. `CONTEXT.md` (berkas ini): ringkasan, status, keterbatasan, cara menyiapkan laptop.
3. `docs/SPEC.md`: spesifikasi. **§5 = kontrak API (sumber kebenaran)**.
4. `docs/PROGRESS.md`: status tiap fase dan **semua keputusan** beserta alasannya (bagian "Keputusan penting").
5. `docs/NEXT_STEPS.md`: tugas manual video/submission; I1 di `docs/I1_CHECKLIST.md`, B4 di `app/README.md`, F di `docs/SUBMISSION_CHECKLIST.md`.
6. `docs/EVAL_REPORT.md`, `docs/MODEL_CARD.md`: hasil evaluasi dan batasan jujur.

---

## 1. Ringkasan proyek

- **Cermin Wicara**: aplikasi latihan pelafalan untuk penyandang Tuli/tunarungu yang **memilih** berlatih bicara.
  Pengguna merekam 2–3 detik video wajah + suara; server menilai **bentuk bibir** (MediaPipe Face Landmarker)
  dan **suara** (Parselmouth/Praat) dengan **aturan berambang**; app menampilkan dua indikator (Bibir, Suara)
  dan satu petunjuk.
- Lomba **LOGICODIX 2026**, subtema Inclusive Health. **Kunci fitur: Jumat 13 Nov 2026 malam.
  Submission: Sabtu 14 Nov 2026.** Source code tidak boleh diubah setelah submission.
- **Tidak ada training model.** Data tim (3 perekam, 81 klip + 16 video model) hanya dipakai untuk menyetel
  ambang dan menguji. Wav2Vec2 ditunda ke roadmap.
- **Batas produk (wajib di semua kode dan teks UI):** alat bantu latihan, bukan diagnosis atau terapi; jangan pakai
  kata "normal", "abnormal", "gangguan", "diagnosis" (ada tes jest yang memindai `app/app` dan `app/src`);
  status **Sesuai / Mendekati / Belum sesuai** selalu warna + ikon + teks; UI tanpa isyarat suara (visual + getar);
  rekaman produk dihapus segera setelah dianalisis; log hanya angka dan kode status; tanpa pengenalan identitas wajah.

## 2. Status fase

| Fase | Isi | Status |
|---|---|---|
| P0, A0, B0 | repo, server + mock, kerangka Expo | selesai |
| A1 | media + cek kualitas + MediaPipe | selesai |
| B1 | perekaman, upload, Mode Dataset | selesai, diuji di 3 iPhone |
| A2 | fitur bibir dan suara, alat plot | selesai |
| A3 | kalibrasi, segmentasi, aturan L0–3, petunjuk; `/analyze` dan `/calibrate` sungguhan | selesai |
| B2 | onboarding, kalibrasi, latihan, hasil (SVG) | selesai, diuji di HP |
| A4 | proses dataset, halaman `/labeler`, fold LOSO, laporan | selesai; cek label manusia selesai (162 penilaian) |
| A6 | penyetelan ambang, evaluasi LOSO, model card | selesai |
| B3 | Supabase, aturan kemajuan §8.4, Mode Pendamping | kode selesai; sinkronisasi nyata dan antrean diuji saat I1 (rincian manual tersisa di checklist I1) |
| A5 | scorer Wav2Vec2 | dilewati (roadmap) |
| **I1** | **integrasi ujung ke ujung di HP** | selesai dengan keterbatasan uji; iPhone, p90 manual 3,91 s; pemulihan antrean video diuji dengan simulasi koneksi Supabase gagal |
| **B4** | polish, layar "Tentang", mode demo, ikon, (APK bila perlu) | selesai untuk Expo Go; Tentang/demo/pemulihan profil dikonfirmasi di iPhone. APK belum diminta/disiapkan; splash release dan VoiceOver penuh belum diuji |
| **F** | kunci fitur, README root, tag `v1.0-submission` | selesai; kode dibekukan, video dan pengiriman ke panitia masih tugas manual |

Commit basis sebelum I1: `638d878` (modul B3 dipulihkan; `/data/` di gitignore). Lihat `git log -1` untuk commit terkini.
Remote: `https://github.com/ricoaldy-e/rekanwicara` (repo **publik**, jangan push tanpa instruksi).
Tes akhir F: server/ML **389** lulus, **0 skip**, app **174** lulus.
TypeScript, Ruff check/format dan Doctor 20/20 lolos; lint app exit 0 dengan 8 warning lama.
Pytest memiliki 1 peringatan deprecation Starlette/HTTPX. Rincian di checklist submission.
11 patch Expo diperbarui dengan persetujuan pengguna (expo 58.0.24); npm melaporkan 28 advisori
(1 rendah, 27 sedang; audit baca-saja F: tidak ada tinggi/kritis, dampak belum ditelaah per advisori).
Mode demo di pengaturan tersembunyi hanya di memori,
memakai progres contoh dan tidak menimpa profil/PIN pribadi atau mengirim hasil ke Supabase.
Mode demo nonaktif lagi setelah app dimulai ulang. README app memuat checklist dan batas uji.
I1: kalibrasi dan latihan L0–3, Supabase online dan antrean sudah diuji melalui pengguna.
Latensi 20 percobaan: p50 2,385 s, p90 3,91 s, maksimum 14,5 s; semua sampel dihitung.
WAN jaringan bersama tidak diputus; kegagalan koneksi Supabase disimulasikan, lalu endpoint asli dipulihkan.
Rincian bukti dan pemeriksaan manual yang belum dilakukan ada di `docs/I1_CHECKLIST.md`.

## 3. Hasil terukur dan keterbatasan (jujur, jangan dilebih-lebihkan)

LOSO (setel di 2 orang, uji di orang ke-3; 3 penutur dewasa dari tim, semua iPhone, satu ruang tenang):

| Kemampuan | Hasil | Target SPEC §11 |
|---|---|---|
| Deteksi bibir rapat | 56/60 = 93% | ≥ 90% ✅ |
| Suara saat bibir rapat | 43/50 = 86% | ≥ 80% ✅ |
| Vokal a/i/u | 19/23 = 83% | ≥ 85% ❌ |
| Status kata (hijau vs bukan) | 12/22 = 55% | ≥ 80% ❌ |
| `bad_face` diminta ulang | 3/3 | semua ✅ |
| Klip layak salah ditolak | 1/74 | < 10% ✅ |
| Waktu proses server p90 | 984 ms | ≤ 5 s ✅ |

Keterbatasan yang sudah diketahui (detail di `docs/EVAL_REPORT.md` dan `docs/PROGRESS.md`):
- Level 3 (kata) paling lemah: "a" di dalam kata kurang terbuka; penutupan /b/ sebelum "u" ("bu") sering terlewat
  pada 15 fps. **Untuk demo pakai kata yang stabil (mis. "mama"); hindari "ibu" dan "bumi".**
- Rentang /p/ dan /b/ tumpang tindih setelah penyetelan: belum andal menangkap /p/ yang terlalu bersuara.
- Bunyi mirip (mis. u dan o) bisa dinilai sama: vokal e dan o belum dinilai (item bonus, `active: false`).
- Tanpa kalibrasi, orang dengan bentuk bibir diam berbeda (P3) dinilai lebih ketat. Kalibrasi belum dievaluasi
  dengan rekaman asli.
- `bad_noise` belum teruji (bising hanya 47–49 dB di rekaman tim).
- Belum diuji pada penutur Tuli atau anak, kamera Android, atau ruangan lain.
- PIN pendamping 4 angka tanpa penguncian setelah salah berkali-kali (bukan pengamanan kuat).

## 4. Struktur repo

```
rekanwicara/
├── AGENTS.md, CLAUDE.md, CONTEXT.md     aturan dan konteks
├── docs/                SPEC.md, PROGRESS.md, NEXT_STEPS.md, EVAL_REPORT.md, MODEL_CARD.md,
│                        THIRD_PARTY.md, SUBMISSION_CHECKLIST.md, supabase/schema.sql
├── server/              Python 3.11 + FastAPI
│   ├── app/main.py                  create_app
│   ├── app/api/v1/                  health, items, analysis, dataset, model_video, debug
│   ├── app/api/labeler.py + .html   halaman cek label (hanya DATASET_MODE=true, hanya dari laptop server)
│   ├── app/pipeline/                media, face, quality, lips, audio, calibration, segment, rules, hints
│   ├── app/dataset/                 labels, process, folds, report, evaluation (dipakai ml/)
│   ├── app/config/thresholds.yaml   SEMUA ambang (hasil A6; nilai lama ada di komentar baris)
│   ├── app/content/                 items.json, hints.json
│   └── tests/                       pytest
├── app/                 Expo SDK 58 + expo-router + TypeScript strict
│   ├── app/                         layar: onboarding, calibration, home, practice/[itemId], companion, settings
│   │                                (tersembunyi), dataset/*
│   ├── src/api/                     types.ts (= SPEC §5), client.ts, upload.ts
│   ├── src/state/                   settings, content, user (profil, sinkron), progression.ts (aturan §8.4)
│   ├── src/data/                    sync.ts (antrean offline), supabase.ts
│   ├── src/results/, src/practice/  ResultView, grafik SVG, video model
│   ├── src/user/                    pure.ts (model data), storage.ts (AsyncStorage + SecureStore), report.ts
│   └── __tests__/                   jest
├── ml/                  skrip perintah: dataset/{process,folds,report}.py, eval/{tune_thresholds,evaluate}.py,
│                        tools/{draw_landmarks,plot_features}.py (semua memakai ulang server/app)
└── data/                TIDAK di-commit: raw/, model_videos/, processed/, labels/, splits/, calibration/
```

## 5. Server

Endpoint (prefix `/v1`): `GET /health`, `GET /items`, `POST /analyze`, `POST /calibrate` (sungguhan bila
`MOCK_MODE=false`, contoh bila `true`), `POST /dataset/upload` (hanya `DATASET_MODE=true`), `GET /model-video/{item_id}`
(selalu), `GET/POST /debug/features` (hanya `DEBUG=true`), dan `GET /labeler` (hanya `DATASET_MODE=true`, hanya dari
laptop server). Format error: `{"detail":{"code","message"}}`. Upload mp4/mov ≤ 15 MB.

Pipeline: upload → ffprobe + ffmpeg (WAV 16 kHz mono, frame 15 fps, tinggi 480) → MediaPipe (478 titik + blendshape)
→ cek kualitas (`no_face`, `face_off_frame`, `too_quiet`, `too_noisy`, `clipping`, `too_short`) → fitur bibir dan suara
→ segmentasi suku kata → aturan §6.7 → respons §5. Semua berkas sementara dihapus di `finally`.

**Variabel `server/.env`** (salin dari `.env.example`): `HOST`, `PORT`, `MOCK_MODE`, `DATASET_MODE`, `DEBUG`, `DATA_DIR`
(default `../data`), `SCORER_MODE=rules`, `ENGINE_VERSION`, `MAX_UPLOAD_MB`, `FACE_MODEL_PATH`, `TMP_DIR`.
**Untuk produk/demo: `MOCK_MODE=false`, `DATASET_MODE=false`, `DEBUG=false`.** `MOCK_MODE=true` selalu mengembalikan
hasil hijau contoh (bukan analisis). Setelah mengubah `.env`, server harus dijalankan ulang.

## 6. App

- **Expo SDK 58** (RN 0.88, React 19.3, expo-router 58). **Expo Go di App Store kini SDK 58**; SDK 57+ mewajibkan
  **login akun Expo yang sama** di Expo Go (iPhone) dan di Expo CLI laptop (`npx expo login`, atau variabel
  `EXPO_TOKEN` di terminal). Jangan menaruh token di berkas atau di chat.
- Alur: onboarding (penjelasan, 2 persetujuan, PIN 4 angka di SecureStore) → kalibrasi (rest, a, i, u) → Home (sesi
  hari ini, tahap materi) → Practice (Lihat → Tiru → Bandingkan → Ulangi) → Mode Pendamping (PIN, ringkasan 7 hari,
  Uji Dengar, pengaturan, bagikan laporan).
- **Pengaturan tersembunyi:** tekan lama 2 detik judul "Misi hari ini" di Home → ganti URL server, tes koneksi.
- **Supabase** (login anonim, RLS `auth.uid()`): `docs/supabase/schema.sql` + variabel `EXPO_PUBLIC_SUPABASE_URL` dan
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` di `app/.env`. Tanpa itu app berjalan penuh dan hanya sinkron yang nonaktif.
  `user_id` ke server (kalibrasi) = id lokal; baris Supabase memakai `auth.uid()`.
- **Aturan kemajuan §8.4** (`src/state/progression.ts`, tafsiran lengkap di `docs/PROGRESS.md`): lulus = ≥ 8 hijau dari
  10 percobaan terakhir di ≥ 2 sesi; Level 2+ terkunci sampai satu materi tingkat di bawahnya lulus.
  Checkbox "Buka semua materi" di Mode Pendamping membuka akses tanpa membuat materi lulus.
  Profil demo B4 memiliki a/ma lulus dan terpisah dari profil pribadi; dapat dipilih di pengaturan tersembunyi.
- **Variabel `app/.env`**: `EXPO_PUBLIC_API_URL` (IP laptop server), `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DATASET_MODE` (`false` untuk demo). Setelah mengubah `.env`:
  `npx expo start -c`.

## 7. Dataset dan alat (hanya ada di laptop pemilik data)

`data/` **tidak ada di git**. Di laptop pemilik: `data/raw/{P1,P2,P3}/` (81 klip HEVC dari iPhone), `data/model_videos/`
(16 video model), `data/processed/` (json + npz per klip), `data/labels/` (label otomatis dan 3 berkas penilai).
**Di laptop lain data itu tidak ada**, sehingga `ml/dataset/*` dan `ml/eval/*` tidak bisa dijalankan ulang di sana.
Ambang hasil penyetelan sudah ada di `server/app/config/thresholds.yaml` di git, jadi server dan app tetap berfungsi.
- Video model (`data/model_videos/*.mp4`) dipakai langkah "Lihat" di app lewat `GET /v1/model-video/{id}`. Tanpa
  video itu app menampilkan teks besar + ilustrasi bibir (cadangan yang sah). Salin dari laptop pemilik (flashdisk)
  bila ingin tampil di demo.
- **Jangan pernah mengunggah isi `data/` (video wajah) ke layanan cloud mana pun, termasuk ke AI, dan jangan
  menjalankan agen cloud yang menyalin folder itu.** Kerjakan hanya di laptop.

## 8. Menyiapkan laptop baru (Windows; sesuaikan untuk macOS/Linux)

Prasyarat: Git, **Python 3.11** (bukan 3.12+), **FFmpeg + ffprobe** di PATH (`winget install -e --id Gyan.FFmpeg`,
lalu tutup-buka terminal), **Node ≥ 22.13**, HP dengan **Expo Go SDK 58**, akun Expo yang sama dengan pemilik.

```powershell
git clone https://github.com/ricoaldy-e/rekanwicara.git
cd rekanwicara
# Server
cd server
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
python scripts/download_models.py        # SHA-256 yang diharapkan: 64184e229b263107…
pytest -q                                # harus 389 lulus, 0 skip
# App
cd ..\app
npm ci
copy .env.example .env
npm test                                 # harus 174 lulus
npx tsc --noEmit
npx --yes expo-doctor@1.21.6             # 20/20 (versi "latest" sempat rusak)
```
Isi `server/.env` (produk/demo: `MOCK_MODE=false`, `DATASET_MODE=false`) dan `app/.env` (`EXPO_PUBLIC_API_URL=
http://<IP-laptop>:8000`). Jalankan:
```powershell
cd server; .venv\Scripts\activate; uvicorn app.main:app --host 0.0.0.0 --port 8000   # terminal 1
cd app; npx expo start -c                                                              # terminal 2
```
Cek: `http://<IP>:8000/v1/health` dari **browser HP** harus menampilkan JSON dengan `"mock_mode":false`.

## 9. Jaringan (HP harus bisa menjangkau laptop)

- Paling andal: **hotspot HP**; laptop tersambung ke hotspot itu. Wi-Fi publik (kafe, kampus) biasanya mengisolasi
  perangkat. Windows: set profil jaringan **Private** dan izinkan python di Firewall untuk Private.
- IP laptop berubah tiap pindah jaringan (`ipconfig` → IPv4 Wi-Fi). Perbarui `EXPO_PUBLIC_API_URL`
  (lalu `npx expo start -c`) atau ganti URL lewat pengaturan tersembunyi di app.
- Laptop tidak boleh tidur selama sesi; dua terminal (server dan Expo) harus tetap terbuka.

## 10. Cara kerja dan keputusan penting

- Ikuti `CLAUDE.md` (per fase: rencana singkat → tunggu persetujuan → kerjakan → tes → perbarui `docs/PROGRESS.md` →
  commit `phase <ID>: <ringkas>`). Tanya dulu sebelum menambah dependency besar atau mengubah kontrak API.
- Jangan mengubah kontrak API (§5) tanpa mengubah SPEC, `server/app/api/schemas.py`, dan `app/src/api/types.ts` bersama-sama.
- Semua ambang ada di `thresholds.yaml`, tidak di-hardcode. Tes aturan (`tests/test_rules.py`) mengunci nilai awal SPEC
  karena menguji logika, bukan angka hasil penyetelan.
- Daftar lengkap keputusan dan alasannya: bagian "Keputusan penting" di `docs/PROGRESS.md`.

## 11. Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| `uvicorn is not recognized` | venv belum aktif: `.venv\Scripts\activate` |
| `ffmpeg not found` / `media_tools_missing` | pasang FFmpeg, tutup-buka terminal |
| Tes `requires_model` di-skip | `python scripts/download_models.py` |
| Browser HP timeout ke `/v1/health` | IP salah, profil jaringan Public, firewall, atau Wi-Fi mengisolasi perangkat → hotspot HP |
| Hasil latihan selalu hijau | server masih `MOCK_MODE=true`: ubah `.env`, jalankan ulang uvicorn |
| Expo Go: "signed in to Expo Go and Expo CLI" | login akun Expo yang sama di kedua sisi |
| Expo Go: "incompatible with this version" | Expo Go bukan SDK 58 (Android: pasang dari expo.dev/go) |
| Tombol Mode Dataset tidak muncul | `EXPO_PUBLIC_DATASET_MODE=true` lalu `npx expo start -c` (hanya untuk merekam dataset) |
| `/v1/analyze` selalu contoh | `MOCK_MODE=true` |
| Sinkron Supabase gagal | cek Anonymous Sign-Ins aktif, `schema.sql` sudah dijalankan, URL dan anon key di `app/.env` |
