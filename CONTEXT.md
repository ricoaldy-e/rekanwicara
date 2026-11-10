# CONTEXT — Cermin Wicara (serah terima ke laptop baru)

Dokumen ini merangkum **semua yang sudah dikerjakan dari awal sampai 10 November 2026 malam**, keputusan
yang sudah diambil, dan **langkah menyiapkan laptop baru** supaya tim bisa langsung merekam dataset dengan
server yang berjalan di laptop itu.

> **Untuk Claude Code di laptop baru:** baca berkas ini, lalu `CLAUDE.md` (aturan kerja), `docs/SPEC.md`
> (spesifikasi, §5 = kontrak API), dan `docs/PROGRESS.md` (status fase). Percakapan sebelumnya tidak ikut
> pindah; semua konteks penting ada di empat berkas itu.

---

## 1. Ringkasan proyek

- **Cermin Wicara**: aplikasi latihan pelafalan untuk penyandang Tuli/tunarungu yang memilih berlatih bicara.
  Pengguna merekam 2–3 detik video wajah + suara; server menilai **bentuk bibir** (MediaPipe) dan **suara**
  (Parselmouth) dengan **aturan berambang**; app menampilkan dua indikator (Bibir, Suara) + satu petunjuk.
- Lomba **LOGICODIX 2026**, subtema Inclusive Health. **Kunci fitur: Jumat 13 Nov 2026 malam.
  Submission: Sabtu 14 Nov 2026.** Source code tidak boleh diubah setelah submission.
- Batas produk (wajib di kode dan UI): alat bantu latihan, **bukan** diagnosis/terapi; tidak memakai kata
  "normal", "abnormal", "gangguan", "diagnosis"; label status **Sesuai / Mendekati / Belum sesuai** (selalu
  warna + ikon + teks); UI tanpa isyarat suara (visual + getar); rekaman produk dihapus segera setelah
  dianalisis; log hanya angka dan kode status; tidak ada pengenalan identitas wajah.
- **Tidak ada training model.** Dataset tim (3 perekam, ±100 video) hanya dipakai untuk **menyetel ambang**
  di `server/app/config/thresholds.yaml` dan **menguji akurasi** (SPEC §10). Wav2Vec2 ditunda ke roadmap.

## 2. Status fase

| Fase | Isi | Status | Catatan |
|---|---|---|---|
| P0 | Inisialisasi repo | selesai | |
| A0 (+A0-fix) | Server FastAPI, mode mock, upload dataset | selesai | 188 tes saat itu |
| B0 | Kerangka app Expo | selesai | Expo SDK 54 |
| A1 | Pipeline media + cek kualitas + deteksi wajah MediaPipe | selesai | 243 tes server hijau |
| **B1** | Perekaman, upload, Mode Dataset | **selesai, diuji di 3 iPhone (11 Nov)** | Dataset 81 klip + 16 video model sudah ada di `data/`; catatan klip cacat di `docs/PROGRESS.md` |
| A2 | Fitur bibir + fitur suara + alat plot | belum | Butuh beberapa rekaman asli dulu |
| A3 | Kalibrasi, segmentasi, aturan L0–3, petunjuk | belum | Setelah ini `/v1/analyze` memberi hasil sungguhan |
| B2 | Onboarding, kalibrasi, alur latihan, hasil | belum | |
| A4 | Proses dataset, alat cek label, LOSO | belum | |
| B3 | Supabase, logika kemajuan, Mode Pendamping | belum | |
| A5 | Scorer Wav2Vec2 | dilewati | roadmap |
| I1, A6, B4, F | Integrasi, penyetelan ambang + evaluasi, polish, kunci fitur | belum | |

Riwayat git: `87b3df4` P0 → `5ae0195` A0 → `8e7b0c5` A0-fix → `4f3acec` chore → `4a955a1` B0 →
`4800d54` A1 → `dc4008f` B1 (kode). Remote: `https://github.com/ricoaldy-e/matasuara` (branch `main`).

## 3. Struktur repo (yang penting)

```
cermin-wicara/
├── CLAUDE.md            aturan kerja per fase (rencana → persetujuan → kerjakan → tes → PROGRESS → commit)
├── CONTEXT.md           berkas ini
├── docs/                SPEC.md, PROGRESS.md, THIRD_PARTY.md, supabase/
├── server/              Python 3.11 + FastAPI
│   ├── app/main.py                 entry point (create_app)
│   ├── app/api/v1/                 health, items, analysis (mock), dataset, model_video, debug
│   ├── app/api/schemas.py          model pydantic = kontrak SPEC §5
│   ├── app/core/                   settings (.env), logging (privasi), storage (dataset), thresholds loader
│   ├── app/config/thresholds.yaml  SEMUA ambang (nilai awal SPEC §6.2–§6.7 + asumsi A1)
│   ├── app/content/                items.json (materi), hints.json (kalimat petunjuk)
│   ├── app/pipeline/               media.py, face.py, quality.py, features.py (A1)
│   ├── scripts/download_models.py  unduh model MediaPipe resmi
│   ├── models/                     face_landmarker.task (TIDAK di-commit)
│   └── tests/                      pytest
├── app/                 Expo SDK 58 + expo-router + TypeScript strict
│   ├── app/                        layar (route): onboarding, calibration, home, practice/[itemId],
│   │                               companion, settings (tersembunyi), dataset/{index,session,model-videos}
│   ├── src/api/                    types.ts (= SPEC §5), client.ts, upload.ts, apiError.ts, errors.ts
│   ├── src/recording/              RecordPanel, PermissionGate, ClipPreview, recorder, useUpload, localFile
│   ├── src/dataset/                script.ts (27 klip), modelVideos.ts (16), session.ts, device.ts, errors.ts
│   ├── src/components/             BigButton, StatusBadge, Card, StepHeader, InfoNote, ProgressBar, ...
│   └── __tests__/                  jest
├── ml/                  dataset/, train/, eval/, tools/ (masih kosong)
└── data/                raw/, processed/, labels/, splits/, calibration/ (TIDAK di-commit; rekaman masuk ke sini)
```

## 4. Server (yang sudah ada)

**Endpoint (prefix `/v1`):**

| Endpoint | Fungsi | Aktif bila |
|---|---|---|
| `GET /health` | status, versi, `mock_mode` | selalu |
| `GET /items` | materi aktif (Level 0–3) dari `items.json` | selalu |
| `POST /analyze` | analisis rekaman: **sungguhan** saat `MOCK_MODE=false` (A3), contoh saat `true` (`?mock=hijau\|kuning\|merah\|retry`) | selalu |
| `POST /calibrate` | kalibrasi: sungguhan saat `MOCK_MODE=false` (simpan angka ke `data/calibration/`), contoh saat `true` | selalu |
| `POST /dataset/upload` | simpan klip ke `data/raw/{speaker}/{item}__r{rep}__{error}__{cond}.mp4` + baris `data/raw/metadata.csv`; `purpose=model_video` → `data/model_videos/{item}.mp4` (timpa) | `DATASET_MODE=true` (selain itu 404) |
| `GET /labeler` | halaman cek label (§10.5), hanya dari laptop server: `http://localhost:8000/labeler`; label ke `data/labels/labels_{P}.csv` | `DATASET_MODE=true` |
| `GET /model-video/{item_id}` | kirim video model (mendukung `Range`; 404 bila belum ada) | selalu |
| `GET/POST /debug/features` | ringkasan kualitas rekaman sungguhan (flag, % frame berwajah, av_offset, timing) | `DEBUG=true` (selain itu 404) |

**Pipeline A1:** upload → satu direktori sementara → ffprobe (`av_offset_ms`) → ffmpeg (WAV mono 16 kHz +
PNG 15 fps tinggi 480 px, maks 4 s) → MediaPipe Face Landmarker (VIDEO mode, 478 titik + 52 blendshape per
frame, disimpan di memori untuk A2) → cek kualitas (`no_face`, `face_off_frame`, `too_quiet`, `too_noisy`,
`clipping`, `too_short`) → direktori sementara dihapus di `finally` (juga saat error).

**Lainnya:** format error `{"detail":{"code","message"}}` (daftar kode di `server/README.md`); upload hanya
mp4/mov ≤ 15 MB; log hanya metode, rute, status, durasi; `speaker_id` dataset hanya `P1`/`P2`/`P3`.

**Variabel `server/.env`** (salin dari `.env.example`): `HOST`, `PORT`, `MOCK_MODE`, `DATASET_MODE`, `DEBUG`,
`DATA_DIR` (default `../data`), `SCORER_MODE=rules`, `ENGINE_VERSION`, `MAX_UPLOAD_MB`, `FACE_MODEL_PATH`,
`TMP_DIR`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 5. App (yang sudah ada)

- **Expo SDK 58** (React Native 0.88.1, React 19.3.0, expo-router 58) — dinaikkan dari SDK 54 pada 10 Nov malam
  karena **Expo Go di App Store kini SDK 58**. Semua modul bawaan Expo Go (tanpa modul native custom): expo-camera, expo-video,
  expo-file-system, expo-haptics, AsyncStorage.
- **Home**: daftar materi dari `/v1/items` per level, catatan bila server mode mock, tombol Mode Pendamping,
  dan tombol **Mode Dataset** (hanya bila `EXPO_PUBLIC_DATASET_MODE=true`).
- **Pengaturan tersembunyi**: **tekan lama 2 detik judul "Misi hari ini"** di Home → ganti URL server,
  Tes koneksi, Simpan, Kembalikan ke bawaan (`.env`). Dipakai bila IP laptop berubah.
- **RecordPanel** (satu komponen rekam untuk semua layar): kamera depan video + audio, bingkai oval,
  hitung mundur 3-2-1 besar + getar, lencana merah "MEREKAM" + bilah waktu, durasi dari props
  (default 2500 ms; Level 0 4000 ms). Penjelasan izin kamera + mikrofon bergambar.
  Catatan teknis: di Android `maxDuration` expo-camera hanya detik bulat, jadi perekaman dihentikan oleh
  timer JS tepat di `durationMs`.
- **Upload** (XMLHttpRequest, karena `fetch` RN tidak punya progres upload): progres %, coba ulang otomatis
  2× hanya untuk gangguan jaringan/timeout, tombol "Coba kirim lagi". Fungsi untuk `/analyze`, `/calibrate`,
  `/dataset/upload`.
- **Mode Dataset** → *Sesi Dataset*: form P1/P2/P3 + kondisi ruangan → 27 klip (SPEC §10.2, acak di dalam
  blok) → materi besar + instruksi (kuning untuk blok F/G) → rekam → putar ulang → **Simpan / Ulang rekam**
  → penghitung "Langkah n dari 27". **Bisa dilanjutkan** bila app tertutup (disimpan di AsyncStorage).
- **Mode Dataset** → *Rekam Video Model*: 16 materi SPEC §10.4 dengan centang "Sudah ada" (dicek ke server
  tanpa mengunduh), peringatan menimpa, simpan dengan `purpose=model_video`.
- Berkas rekaman di HP **dihapus** setelah terkirim atau saat "Ulang".
- Placeholder (diisi di B2/B3): onboarding, calibration, practice, companion.

**Variabel `app/.env`** (salin dari `.env.example`): `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DATASET_MODE`.

## 6. Keputusan penting (sudah disepakati)

- Dataset: `speaker_id` hanya P1/P2/P3; item bonus (`l1_e`, `l1_o`, `l3_mau`, `l3_bau`, `l3_boba`)
  `active: false`; `SCORER_MODE` selalu `rules`; saat `status:"retry"`, `indicators` juga `null`.
- Kesalahan disengaja (SPEC §10.3) dan itemnya: `mama_as_papa`→l3_mama, `u_flat_lips`→l1_u,
  `a_narrow`→l1_a, `mama_no_closure`→l3_mama, `bad_noise`→l1_a (kondisi selalu `noisy`),
  **`bad_face`→l3_mama** (keputusan B1; SPEC membolehkan item apa saja).
- Tanpa `opencv-python-headless`: mediapipe 1.2.2 sudah membawa `opencv-contrib-python`.
- `face_off_frame` = median lebar wajah < 0,25 lebar frame ATAU > 10% frame berwajah punya titik mulut
  (13, 14, 61, 291) di luar frame (asumsi A1, disetel di A6).
- noise_floor = persentil ke-10 intensitas. Pengaman: bila rentang ucapan > 85% klip (mis. "tahan aaa"),
  floor dianggap tidak pasti → `too_quiet` memakai batas absolut 55 dB, `too_noisy` tidak dicek. Cakupan
  absolut (> 50 dB) hanya dihitung bila ≥ 50% frame-nya bersuara, supaya bising kipas/musik tidak dianggap suara.
- Landmarker MediaPipe dibuat per request; waktunya dilaporkan di debug. Request pertama ±1 s (import), berikutnya ±0,4 s.
- Tes yang butuh model diberi marker `requires_model` dan di-skip dengan pesan bila model belum diunduh.

## 7. Masalah terbuka / risiko

- **Clipping:** aturan SPEC (> 1% sampel |x| ≥ 0,99) bisa jarang terpicu pada rekaman HP karena kompresi
  AAC (uji: 0,04% sampel ≥ 0,99 walau 31% ≥ 0,9). Setel di A6 dengan rekaman asli.
- Klip berisi bising bersuara (musik/TV) bisa lolos tanpa `too_noisy` bila floor tidak pasti. Cek di A6.
- Lisensi model `face_landmarker.task` belum terverifikasi (lihat `docs/THIRD_PARTY.md`).
- SPEC §5: contoh `score: 0.75` tidak cocok dengan rumus §6.8 (server mengikuti §6.8).
- **Belum diuji di HP:** app B0/B1 di Expo Go, akses HP → laptop, rekaman asli ke `/v1/debug/features`.
- Jaringan: Wi-Fi publik (kafe) biasanya mengisolasi perangkat dan profil Windows "Public" memblokir
  koneksi masuk → HP tidak bisa menjangkau server. Pakai hotspot HP (lihat §9.4).

## 8. Yang harus dilakukan berikutnya (urutan)

1. Siapkan laptop baru (§9) dan pastikan semua tes hijau.
2. **Uji B1 di HP:** rekam 3 klip lewat Mode Dataset → cek `data/raw/P1/*.mp4` dan `data/raw/metadata.csv`
   muncul di laptop baru. Lalu jalankan **satu sesi penuh 27 klip tanpa crash** (kriteria selesai B1).
3. Perbarui baris B1 di `docs/PROGRESS.md` menjadi "selesai" + catatan uji HP, lalu commit
   `phase B1: recording and dataset mode` (kode B1 sendiri sudah ada di `dc4008f`).
4. Rekam dataset lengkap: P1, P2, P3 masing-masing satu sesi 27 klip + 16 video model oleh satu orang (§10).
5. Lanjut fase A2 (fitur bibir + suara), memakai rekaman asli untuk memverifikasi indeks landmark bibir.

## 9. Setup laptop baru (Windows)

### 9.1 Prasyarat

| Alat | Versi | Cara pasang / cek |
|---|---|---|
| Git | apa saja | `git --version` |
| **Python 3.11** | 3.11.x (laptop lama 3.11.9) — **bukan 3.12+** | python.org atau `winget install -e --id Python.Python.3.11`; cek `py -3.11 --version` |
| **FFmpeg + ffprobe** | laptop lama 9.0.2 | `winget install -e --id Gyan.FFmpeg`, lalu **tutup dan buka ulang VS Code/terminal**; cek `ffmpeg -version` dan `ffprobe -version` |
| **Node.js** | ≥ 22.13 (laptop lama 22.13.0, npm 10.9.2) | nodejs.org (LTS); cek `node -v` |
| HP | **Expo Go yang mendukung SDK 58** | Expo Go → Settings → "Supported SDK" harus 58. Android: bila bukan 58, pasang dari expo.dev/go. Jangan update Expo Go sampai demo selesai |
| Disk | ±2 GB bebas | venv (mediapipe, opencv) ±600 MB, node_modules ±500 MB |

### 9.2 Ambil kode

```powershell
git clone https://github.com/ricoaldy-e/matasuara.git cermin-wicara
cd cermin-wicara
git log --oneline -3          # harus ada dc4008f (B1)
```
Bila repo private: pemilik mengundang akun GitHub teman di Settings → Collaborators.

### 9.3 Server

```powershell
cd server
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
python scripts/download_models.py
pytest -q -rs
```
- Edit `server/.env` untuk sesi rekam: **`MOCK_MODE=true`**, **`DATASET_MODE=true`**, `DEBUG=false`
  (boleh `true` saat ingin memakai `/v1/debug/features`).
- Model: skrip mencetak SHA-256; unduhan 10 Nov = `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
  (3,58 MB). Bila berbeda, model di Google berubah — catat di PROGRESS.
- Hasil tes yang diharapkan: **243 passed, 0 skipped** (butuh ffmpeg di PATH dan model terunduh).
- Bila PowerShell menolak `activate`: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### 9.4 Jaringan (HP harus bisa menjangkau laptop)

1. **Paling andal: hotspot HP.** Nyalakan hotspot di HP, sambungkan laptop ke hotspot itu.
   Hindari Wi-Fi kafe/kampus (biasanya mengisolasi perangkat).
2. Windows: Settings → Network & internet → Wi-Fi → (jaringan itu) → **Network profile type: Private**.
   Jangan jadikan Private untuk Wi-Fi publik.
3. Saat uvicorn pertama kali jalan dan muncul dialog **Windows Defender Firewall**, izinkan untuk **Private**.
4. Cari IP laptop: `ipconfig` → "IPv4 Address" di adapter Wi-Fi (mis. `192.168.43.x`, `10.x.x.x`, `192.168.1.x`).

### 9.5 Jalankan server

```powershell
cd cermin-wicara\server
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Harus muncul `Uvicorn running on http://0.0.0.0:8000`. Uji dari **browser HP**:
`http://<IP-laptop>:8000/v1/health` → `{"status":"ok",...,"mock_mode":true}`.
Biarkan terminal ini terbuka; setiap klip terkirim muncul sebagai `POST /v1/dataset/upload 200`.

### 9.6 App

```powershell
cd cermin-wicara\app
npm ci
copy .env.example .env
npm test                      # harus 66 passed
npx expo start -c
```
- Isi `app/.env`: `EXPO_PUBLIC_API_URL=http://<IP-laptop>:8000` dan **`EXPO_PUBLIC_DATASET_MODE=true`**.
  Setelah mengubah `.env`, selalu jalankan ulang dengan `npx expo start -c` (`-c` = baca ulang `.env`).
- Pindai QR dengan Expo Go (HP dan laptop di jaringan yang sama).
- Bila IP laptop berubah: di app tekan lama judul "Misi hari ini" → Pengaturan → isi URL → Tes koneksi → Simpan.

### 9.7 Cek akhir sebelum merekam

- [ ] `pytest -q -rs` → 243 passed; `npm test` → 66 passed
- [ ] Browser HP membuka `http://<IP>:8000/v1/health`
- [ ] Di app, Home menampilkan daftar materi dan catatan "mode contoh (mock)"
- [ ] Home → Mode Dataset terlihat → Sesi Dataset → izin kamera + mikrofon diberikan
- [ ] Rekam 1 klip → Simpan → terminal server menampilkan `POST /v1/dataset/upload 200`
      → berkas muncul di `data\raw\P1\` dan baris baru di `data\raw\metadata.csv`

## 10. Panduan merekam

### 10.1 Sesi Dataset — P1, P2, P3 masing-masing 27 klip (±6 menit)
Menu **Mode Dataset → Sesi Dataset**, pilih kode penutur dan kondisi **Tenang**.

| Blok | Isi | Cara mengucap |
|---|---|---|
| A (4 detik) | Tahan "aaa"; Pelan lalu keras | Langsung "aaaa" stabil ≥ 3 detik begitu MEREKAM muncul; "a" pelan → jeda → "A" keras |
| B | a, i, u × 2 | a: mulut terbuka lebar; i: bibir ditarik ke samping; u: bibir dibulatkan dan dimajukan |
| C | mmm | Bibir rapat, bersenandung hampir sepanjang rekaman |
| D | ma, pa, ba, mi, pi, bu | Bibir rapat dulu dengan jelas, baru dibuka |
| E | mama, papa, bibi, apa, ibu, bumi | Wajar dan jelas |
| F | 4 kesalahan disengaja | Ikuti instruksi kuning di layar |
| G | wajah keluar bingkai; "a" dengan musik/kipas keras | Ikuti instruksi kuning di layar |

Salah ucap pada blok A–E → **Ulang rekam** (label "benar" diberikan otomatis, jadi klipnya harus benar).

### 10.2 Video Model — 1 orang, 16 video (±5 menit)
Menu **Mode Dataset → Rekam Video Model**. Pilih orang dengan artikulasi paling jelas; gerak bibir tegas,
wajah lurus ke kamera, cahaya terang dari depan, latar polos. Materi: a, i, u, mmm, ma, pa, ba, mama, papa,
bibi, pipi, apa, abu, ibu, ubi, bumi.

### 10.3 Tips untuk semua klip (sesuai cek kualitas A1)
Wajah utuh di dalam oval dan mulut terlihat (tanpa masker); jarak ±30–40 cm; HP disandarkan tegak sejajar
wajah; cahaya dari depan; ruangan tenang (kecuali `bad_noise`); suara normal, jangan berteriak atau terlalu
dekat mikrofon; **mulai bicara setelah tulisan MEREKAM muncul**.

### 10.4 Setelah dataset lengkap
A2 (fitur) → A3 (aturan, `/analyze` sungguhan) → A4 (proses dataset + alat cek label) → **cek label silang**
(setiap orang menilai ±54 klip milik dua orang lain) → A6 (setel ambang dengan leave-one-speaker-out,
laporan akurasi, model card).

## 11. Data dan privasi

- Rekaman tersimpan **hanya** di laptop yang menjalankan server (`data/raw/`, `data/model_videos/`).
  `data/`, `.env`, `*.task`, `*.mp4` tidak pernah di-commit (`.gitignore`).
- **Tidak boleh diunggah ke layanan cloud publik** (aturan `CLAUDE.md`). Bila perlu dipindah antar-laptop:
  flashdisk/hardisk eksternal, Quick Share/Nearby Share, atau folder bersama Windows di jaringan yang sama.
- Ketiga perekam menyetujui pemakaian rekaman untuk pengembangan; dicatat nanti di `MODEL_CARD.md`.
- Dengan merekam langsung ke laptop baru, tidak ada data yang perlu dipindah: per 10 Nov malam folder
  `data/` di laptop lama masih **kosong**.

## 12. Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| `uvicorn is not recognized` | venv belum aktif: `.venv\Scripts\activate` |
| `Could not import module "app.main"` | terminal tidak di folder `server` |
| `ffmpeg not found` di pytest / `media_tools_missing` | pasang FFmpeg, lalu tutup-buka VS Code (PATH baru hanya terbaca proses baru) |
| Tes `requires_model` di-skip | `python scripts/download_models.py` |
| Browser HP timeout ke `/v1/health` | IP salah (cek `ipconfig`), profil jaringan Public, firewall, atau Wi-Fi mengisolasi perangkat → pakai hotspot HP |
| App: "Server belum dalam Mode Dataset" | `DATASET_MODE=true` di `server/.env`, jalankan ulang uvicorn |
| Tombol Mode Dataset tidak muncul | `EXPO_PUBLIC_DATASET_MODE=true` di `app/.env`, lalu `npx expo start -c` |
| Expo Go: "Project is incompatible with this version of Expo Go" | Expo Go di HP bukan SDK 58. App harus dinaikkan (`npx expo install expo@^<SDK> --fix`) — tanya tim dulu |
| `/v1/analyze` selalu hasil contoh | `MOCK_MODE=true`; untuk analisis sungguhan set `MOCK_MODE=false` lalu jalankan ulang uvicorn |
