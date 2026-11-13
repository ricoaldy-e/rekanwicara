# Cermin Wicara

Alat bantu latihan pelafalan untuk teman Tuli/tunarungu yang **memilih** berlatih bicara.
Pengguna merekam 2–3 detik video wajah dan suara; aplikasi menampilkan indikator Bibir,
Suara, dan satu petunjuk. Status selalu memakai ikon, teks dan warna; tanpa isyarat suara.

Hasil adalah **perkiraan sistem untuk latihan**, bukan penilaian klinis atau pengganti
guru/terapis. Dibuat oleh tim Cermin Wicara (3 anggota) untuk LOGICODIX 2026,
subtema Inclusive Health. Versi submission: tag `v1.0-submission`.

## Arsitektur

- `app/`: Expo Go, React Native, TypeScript strict dan expo-router. Kamera merekam video
  beserta audio; hasil/progres disimpan lokal. Profil demo terpisah di memori.
- `server/`: FastAPI, Python 3.11. FFmpeg menyiapkan audio/frame, MediaPipe mengukur
  geometri mulut, Parselmouth/Praat mengukur suara, lalu aturan berambang menilai hasil.
  Tidak ada pengenalan identitas wajah atau training model.
- Supabase: autentikasi email/password pendamping, profil/hasil/progres numerik, antrean sinkronisasi
  dan RLS berdasarkan `auth.uid()`. Video tidak dikirim ke Supabase.
- `ml/`: alat dataset, label, penyetelan ambang dan evaluasi, memakai ulang pipeline server.
- `docs/`: kontrak, evaluasi, model card, bukti uji dan panduan submission.

HP menghubungi server laptop melalui LAN. Internet dibutuhkan untuk instalasi, akun Expo
dan sinkronisasi Supabase; analisis berjalan di laptop. Wav2Vec2, torch dan transformers
ditunda. MVP mencakup Level 0–3, vokal a/i/u dan konsonan m/p/b.

## Prasyarat

Git, **Python 3.11**, **FFmpeg dan ffprobe di PATH**, **Node ≥22.13**, serta HP dengan
Expo Go yang mendukung SDK proyek (SDK 58 pada pengujian). HP dan laptop harus berada
di jaringan yang mengizinkan komunikasi antarkeduanya.

```powershell
py -3.11 --version
ffmpeg -version
ffprobe -version
node --version
```

Jika launcher `py` tidak tersedia, gunakan interpreter Python 3.11 yang terpasang.
Untuk venv yang sudah dibuat, cek interpreter venv langsung. Berhenti bila prasyarat gagal.
Perintah di bawah memakai PowerShell; `npm.cmd`/`npx.cmd` menghindari blokir skrip `.ps1`.

## Menyiapkan server

Dari root repo:

```powershell
cd server
py -3.11 -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
.venv/Scripts/python.exe scripts/download_models.py
```

Model tidak disertakan di Git. SHA-256 unduhan yang diuji:
`64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
Bandingkan keluaran skrip; URL upstream memakai `latest` sehingga isinya dapat berubah.
Lisensi komponen bundle ada di [THIRD_PARTY.md](docs/THIRD_PARTY.md).

Atur `server/.env` untuk produk/demo:

```dotenv
MOCK_MODE=false
DATASET_MODE=false
DEBUG=false
SCORER_MODE=rules
```

`MOCK_MODE=true` menghasilkan contoh hasil dan tidak membuktikan analisis sungguhan.
Variabel shell mengalahkan `.env`; singkirkan override `DEBUG=release` bila diwarisi terminal.
`DATA_DIR` menyimpan kalibrasi numerik dan video model lokal. `FACE_MODEL_PATH`, `TMP_DIR`,
`MAX_UPLOAD_MB`, dan `ENGINE_VERSION` dijelaskan di `.env.example`. Server tidak memerlukan
kunci Supabase untuk MVP. Jalankan dan biarkan terminal terbuka:

```powershell
.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
```

Dari browser HP, buka `http://<IP-laptop>:8000/v1/health`; harus tampil JSON dengan
`mock_mode:false`. Cari IPv4 Wi-Fi laptop memakai `ipconfig`.

## Menyiapkan app

Di terminal kedua dari root repo:

```powershell
cd app
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Isi `app/.env`:

- `EXPO_PUBLIC_API_URL=http://<IP-laptop>:8000`
- `EXPO_PUBLIC_DATASET_MODE=false`
- Opsional: `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  Aktifkan provider **Email/password** dan gunakan [schema.sql](docs/supabase/schema.sql)
  yang sudah ada. Jangan gunakan service-role key di app. Login anonim otomatis sudah
  dihentikan. Logic autentikasi siap, UI login belum dibuat; onboarding PIN akun
  memerlukan sesi pendamping terlebih dahulu. Data lama tidak dihapus/ditautkan otomatis.
  Rincian setup dan batas integrasi: [AUTH.md](docs/supabase/AUTH.md).

```powershell
npx.cmd expo login --no-browser
npx.cmd expo whoami
npx.cmd expo start -c --lan --go
```

Login akun Expo yang sama di CLI dan Expo Go iPhone. Pindai QR atau buka
`exp://<IP-laptop>:8081` dari Safari lalu pilih Expo Go. Izinkan jaringan lokal, kamera
dan mikrofon. Login situs Expo saja belum membuktikan CLI sudah login.

Jika timeout, cek IP terbaru, jaringan HP/laptop, proses server/Metro dan izin firewall
LAN untuk port 8000/8081. Gunakan izin terbatas jaringan lokal; jangan mematikan firewall.
Runtime dalam sandbox agen sempat tidak dapat dijangkau HP; gunakan terminal lokal yang
mengizinkan LAN. Setelah pindah jaringan, perbarui URL dan jalankan ulang Metro.
Tekan lama **Misi hari ini** 2 detik untuk URL dan **Tes koneksi**.

## Alur demo

Onboarding → kalibrasi diam/a/i/u → latihan a → ma → mama → Mode Pendamping.
Checkbox **Buka semua materi** membuka akses. Untuk contoh materi yang sudah lulus,
aktifkan **Gunakan profil demo** di pengaturan tersembunyi. Demo tidak menimpa atau
menyinkronkan progres pribadi; matikan checkbox untuk kembali ke profil pribadi.
Layar **Tentang aplikasi** memuat privasi dan versi app/mesin server.

Dataset teman **tidak diperlukan** untuk menjalankan app atau tes. Video model opsional
dapat disiapkan sendiri secara lokal; tanpa video, app memakai teks dan ilustrasi bibir.
Agen tidak boleh membuka, memutar, menyalin atau mengunggah isi `data/`.
Panduan dan checklist: [app/README.md](app/README.md). Target yang diuji ialah Expo Go
iPhone; APK/EAS belum disiapkan karena belum diminta.

## Verifikasi

Dari `server/`:

```powershell
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m ruff check app tests ../ml
.venv/Scripts/python.exe -m ruff format --check app tests ../ml
```

Dari `app/`:

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npx.cmd expo lint
npx.cmd --yes expo-doctor@1.21.6
```

Hasil F, pemeriksaan privasi dan berkas pengumpulan dicatat di
[SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md). Tes ML termasuk dalam pytest
server, memakai data sintetis/temporer. Evaluasi dataset nyata tidak dijalankan ulang.

## Hasil dan keterbatasan

Evaluasi LOSO dari 3 anggota tim, seluruhnya iPhone di satu ruangan:

| Pengukuran | Hasil | Target |
|---|---|---|
| Bibir rapat | 56/60 (93%) | ≥90% |
| Suara saat bibir rapat | 43/50 (86%) | ≥80% |
| Vokal a/i/u | 19/23 (83%) | ≥85%, belum tercapai |
| Status kata | 12/22 (55%) | ≥80%, belum tercapai |
| Waktu proses server p90 | 984 ms | ≤5 s |

I1 melalui iPhone: 20 durasi manual dari selesai merekam sampai hasil, p50 2,385 s,
p90 3,91 s, maksimum 14,5 s. Seluruh sampel termasuk retry dihitung. Antrean pulih
saat koneksi kembali; putus WAN fisik diganti simulasi kegagalan Supabase.

Ini bukti awal, **bukan akurasi pada pengguna sasaran**. Belum diuji pada penutur Tuli,
anak atau kamera Android. Kata dan perbedaan p/b masih lemah; kalibrasi belum dievaluasi
kuantitatif pada dataset. Mama dipakai untuk demo; ibu/bumi kurang stabil. VoiceOver
menyeluruh dan splash release belum diuji. Rincian: [EVAL_REPORT.md](docs/EVAL_REPORT.md),
[MODEL_CARD.md](docs/MODEL_CARD.md), [I1_CHECKLIST.md](docs/I1_CHECKLIST.md).

## Privasi, lisensi dan serah terima

Rekaman latihan dihapus setelah dianalisis, termasuk saat error. Kalibrasi dan riwayat
yang disimpan berupa angka; log aplikasi tidak memuat path rekaman. Dataset pengembangan
tetap lokal dan tidak dikumpulkan. `.env`, `data/`, venv, node_modules dan model unduhan
tidak disertakan di Git. Jangan menaruh token/kunci di chat, log atau commit.

Kode milik tim berlisensi [MIT](LICENSE). Komponen pihak ketiga mempertahankan lisensinya,
termasuk kewajiban GPL Parselmouth/Praat dan lisensi build FFmpeg; MIT repo tidak
menggantikan ketentuan tersebut. Sumber: [THIRD_PARTY.md](docs/THIRD_PARTY.md).

Aturan: [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md). Kontrak: [SPEC.md §5](docs/SPEC.md).
Status: [PROGRESS.md](docs/PROGRESS.md), [CONTEXT.md](CONTEXT.md),
[NEXT_STEPS.md](docs/NEXT_STEPS.md). Setelah tag submission dibuat, kode dibekukan.
Video demo dan pengiriman ke panitia tetap dikerjakan tim. Jangan push tanpa instruksi.
