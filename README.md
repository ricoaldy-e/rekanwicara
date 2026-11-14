# Rekan Wicara

Aplikasi latihan pelafalan untuk teman Tuli dan tunarungu yang memilih berlatih bicara.
Pengguna merekam video wajah dan suara selama 2–3 detik. Aplikasi lalu menampilkan dua
indikator, **Bibir** dan **Suara**, beserta satu petunjuk yang bisa langsung dicoba lagi.
Seluruh umpan balik bersifat visual: warna, ikon, dan teks, dengan getar sebagai pelengkap.
Tidak ada isyarat yang hanya berupa bunyi.

Proyek ini dibuat tim kami untuk LOGICODIX 2026, subtema Inclusive Health.

> **Batas produk.** Rekan Wicara adalah alat bantu latihan. Aplikasi ini bukan alat
> diagnosis, bukan terapi, dan tidak menggantikan terapis wicara atau guru. Hasilnya
> adalah perkiraan sistem untuk latihan, bukan penilaian klinis.

## Fitur

- **Latihan bertahap.** Level 1 melatih bunyi vokal, Level 2 suku kata, dan Level 3 kata
  sederhana. Setiap latihan terdiri atas empat langkah: Lihat, Tiru, Menganalisis, Hasil.
- **Dua indikator terpisah.** Bibir dinilai dari geometri mulut, Suara dari ciri akustik.
  Status memakai tiga label: *Sesuai*, *Mendekati*, dan *Belum sesuai*. Tidak ada skor angka.
- **Hasil yang bisa dibandingkan.** Level 1 menampilkan "Cermin bibir" dan "Peta vokal",
  yaitu bentuk target dan bentuk milik pengguna pada grafik yang sama.
- **Mode Pendamping.** Keluarga atau guru dapat menambah kata latihan sendiri. Mode ini
  dikunci dengan PIN.
- **Akun opsional.** Dengan Supabase, riwayat dan kemajuan tersimpan per akun. Tanpa
  Supabase, aplikasi tetap bisa dipakai dan menyimpan data di perangkat.
- **Aksesibilitas sebagai syarat.** Teks tidak lebih kecil dari 15, target sentuh minimal
  48 dp, kontras diukur, status tidak dibedakan hanya lewat warna, dan animasi mengikuti
  pengaturan Reduce Motion.

## Cara kerja

```
HP (Expo Go)                              Laptop (server lokal)
┌───────────────────────┐   video+audio   ┌──────────────────────────────┐
│ Kamera: satu rekaman  │ ──────────────▶ │ FFmpeg: ambil frame dan audio │
│ Hasil: Bibir + Suara  │ ◀────────────── │ MediaPipe: geometri mulut     │
└───────────────────────┘   JSON angka    │ Parselmouth: ciri suara       │
                                          │ Aturan berambang: status      │
                                          └──────────────────────────────┘
```

Rekaman latihan dihapus segera setelah dianalisis, termasuk ketika terjadi galat. Log
hanya memuat angka dan kode status. Wajah dipakai semata-mata untuk mengukur bentuk mulut;
tidak ada pengenalan identitas. Penilaian memakai aturan berambang yang disetel dari data
tim, bukan model yang dilatih.

## Struktur repositori

| Folder | Isi |
|---|---|
| `app/` | Aplikasi Expo: React Native, TypeScript strict, expo-router |
| `server/` | Server FastAPI (Python 3.11) dan pipeline analisis di `server/app/pipeline` |
| `ml/` | Skrip dataset, pelabelan, penyetelan ambang, dan evaluasi; memakai ulang pipeline server |
| `docs/` | Spesifikasi (`SPEC.md`), desain (`design.md`), laporan evaluasi, model card, skema Supabase |
| `data/` | Data pengembangan lokal. Tidak di-commit |

## Menjalankan secara lokal

### Prasyarat

Git, Python 3.11, FFmpeg dan ffprobe di `PATH`, Node 22.13 atau lebih baru, dan HP dengan
Expo Go untuk SDK 58. HP dan laptop harus berada di jaringan yang sama. Perintah di bawah
untuk PowerShell; `npm.cmd` dan `npx.cmd` menghindari blokir skrip `.ps1`.

```powershell
py -3.11 --version
ffmpeg -version
ffprobe -version
node --version
```

### Server

```powershell
cd server
py -3.11 -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
.venv/Scripts/python.exe scripts/download_models.py
```

Model Face Landmarker tidak disertakan di Git; skrip di atas mengunduhnya. SHA-256 unduhan
yang diuji ialah `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
Bandingkan dengan keluaran skrip, karena URL sumber memakai `latest` dan isinya dapat berubah.

Untuk penggunaan sungguhan, atur `server/.env`:

```dotenv
MOCK_MODE=false
DATASET_MODE=false
DEBUG=false
SCORER_MODE=rules
```

`MOCK_MODE=true` hanya mengembalikan contoh hasil dan tidak membuktikan analisis. Variabel
shell mengalahkan `.env`, jadi pastikan terminal tidak mewarisi `DEBUG=release` atau sejenisnya.
Variabel lain dijelaskan di `server/.env.example`. Jalankan server dan biarkan terminal terbuka:

```powershell
.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
```

Dari browser HP, buka `http://<IP-laptop>:8000/v1/health`. Responsnya harus berupa JSON
dengan `mock_mode: false`. IPv4 Wi-Fi laptop bisa dilihat dengan `ipconfig`.

### Aplikasi

Di terminal kedua, dari root repositori:

```powershell
cd app
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Isi `app/.env`:

| Variabel | Keterangan |
|---|---|
| `EXPO_PUBLIC_API_URL` | `http://<IP-laptop>:8000` |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Opsional. Aktifkan penyedia Email di Supabase, lalu jalankan [schema.sql](docs/supabase/schema.sql) di SQL Editor. Jangan menaruh service-role key di aplikasi |
| `EXPO_PUBLIC_USE_MOCK` | `true` memakai katalog dan kata contoh bawaan aplikasi. Server lokal baru menyediakan `/v1`, jadi nilai ini diperlukan agar katalog tampil |
| `EXPO_PUBLIC_ANALYZE_API` | `v1` (bawaan), `v2`, atau `mock` |
| `EXPO_PUBLIC_DATASET_MODE` | `false` untuk build produk |

```powershell
npx.cmd expo login --no-browser
npx.cmd expo start -c --lan --go
```

Masuk ke akun Expo yang sama di CLI dan Expo Go, lalu pindai QR atau buka
`exp://<IP-laptop>:8081`. Izinkan jaringan lokal, kamera, dan mikrofon. Jika koneksi gagal,
periksa IP terbaru, jaringan, dan izin Windows Firewall untuk port 8000 dan 8081 (izinkan
jaringan lokal; jangan mematikan firewall). Alamat server dan tes koneksi tersedia di bagian
operator pada tab Pengaturan.

## Pengujian

```powershell
# dari server/
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m ruff check app tests ../ml
.venv/Scripts/python.exe -m ruff format --check app tests ../ml

# dari app/
npm.cmd test
npm.cmd run typecheck
npx.cmd expo lint
```

Tes ML ikut berjalan di pytest server dengan data sintetis. Dataset nyata tidak diperlukan
untuk menjalankan aplikasi maupun tes.

## Hasil dan keterbatasan

Evaluasi leave-one-speaker-out dengan 3 anggota tim, seluruhnya memakai iPhone di satu ruangan:

| Pengukuran | Hasil | Target |
|---|---|---|
| Bibir rapat | 56/60 (93%) | ≥90% |
| Suara saat bibir rapat | 43/50 (86%) | ≥80% |
| Vokal a/i/u | 19/23 (83%) | ≥85%, belum tercapai |
| Status kata | 12/22 (55%) | ≥80%, belum tercapai |
| Waktu proses server (p90) | 984 ms | ≤5 s |

Angka ini adalah bukti awal, **bukan akurasi pada pengguna sasaran**. Belum ada pengujian
dengan penutur Tuli, anak-anak, atau kamera Android. Pembedaan p/b dan penilaian kata masih
lemah, dan seluruh antarmuka hasil desain terbaru belum diuji di perangkat (termasuk skala
teks 200%, layar 360 dp, dan pembaca layar). Rincian ada di [EVAL_REPORT.md](docs/EVAL_REPORT.md)
dan [MODEL_CARD.md](docs/MODEL_CARD.md).

## Privasi

Rekaman latihan tidak disimpan. Yang tersimpan hanya angka kalibrasi dan riwayat hasil.
Dataset pengembangan berasal dari persetujuan tertulis penutur, tetap berada di mesin lokal,
dan tidak diunggah ke layanan publik. `.env`, `data/`, virtual environment, `node_modules`,
dan model unduhan tidak ada di Git.

## Pengembangan dengan bantuan AI

Proyek ini dikembangkan dengan bantuan alat AI: **Claude** (Claude Code, Anthropic) dan
**Codex** (OpenAI). Keduanya dipakai untuk menulis dan meninjau kode, tes, dokumentasi, serta
menerjemahkan rancangan Figma ke komponen aplikasi. Arah produk, batas penggunaan, desain,
pengambilan data, penyetelan ambang, dan keputusan akhir ada pada tim. Hasil kerja AI
diperiksa dan diuji lewat tes otomatis serta pengujian manual oleh tim. Aturan kerja agen tertulis di
[CLAUDE.md](CLAUDE.md) dan [AGENTS.md](AGENTS.md); riwayat keputusan ada di
[PROGRESS.md](docs/PROGRESS.md).

## Tim

- Muhammad Helmi Abdulbaqi
- Rico Aldy Kusuma
- Steven Jonathan Sihombing

## Lisensi

Kode milik tim dirilis di bawah [Lisensi MIT](LICENSE). Komponen pihak ketiga tetap memakai
lisensi masing-masing, termasuk ketentuan GPL pada Parselmouth/Praat dan lisensi build FFmpeg
yang dipakai; lisensi MIT di repositori ini tidak menggantikannya. Daftar lengkap ada di
[THIRD_PARTY.md](docs/THIRD_PARTY.md).

## Dokumen lain

[SPEC.md](docs/SPEC.md) (kontrak API di §5) · [design.md](docs/design.md) ·
[PROGRESS.md](docs/PROGRESS.md) · [SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) ·
[app/README.md](app/README.md) · [server/README.md](server/README.md)
