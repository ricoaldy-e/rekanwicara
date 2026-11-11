# Cermin Wicara — server

FastAPI server untuk analisis rekaman latihan. Kontrak API: [docs/SPEC.md §5](../docs/SPEC.md).
Analisis `/analyze` dan kalibrasi `/calibrate` sudah memakai pipeline sungguhan bila
`MOCK_MODE=false`. Produk/demo juga memakai `DATASET_MODE=false`, `DEBUG=false`, dan
`SCORER_MODE=rules`. Panduan setup terpadu ada di [README root](../README.md).

## Prasyarat

- **Python 3.11** (versi yang dipakai dan diuji; torch tidak dipasang di MVP)
- **FFmpeg + ffprobe** di PATH (`ffmpeg -version`)
  - Windows: `winget install -e --id Gyan.FFmpeg`, lalu buka ulang terminal/VS Code
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
  - Setelah memasang, **tutup dan buka ulang VS Code/terminal**: PATH baru hanya terbaca oleh proses baru.
    Cek dengan `ffmpeg -version` di terminal yang dipakai untuk menjalankan server dan pytest.
- **Model MediaPipe** `models/face_landmarker.task` (tidak di-commit), lihat bagian berikut.

## Model Face Landmarker

```bash
python scripts/download_models.py          # tambah --force untuk mengunduh ulang
```

Sumber resmi (Google AI Edge, halaman Face Landmarker, bagian "Models"; dicek 10 Nov 2026):
`https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`

Dokumentasi hanya menyediakan path `latest`, tanpa versi/checksum. Unduhan 10 Nov 2026:
3,58 MB, SHA-256 `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
Skrip mencetak SHA-256; bila berbeda, model di server berubah: catat di `docs/PROGRESS.md`.

## Setup venv

Versi Python dipin ke 3.11 lewat `server/.python-version`. Di Windows, venv **dibuat dengan
`py -3.11 -m venv .venv`** (bukan `python -m venv`, yang bisa memakai Python lain).
Saat start, server menampilkan peringatan jelas bila Python bukan 3.10 atau 3.11.

Windows (PowerShell):
```powershell
cd server
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
```

macOS / Linux:
```bash
cd server
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Variabel penting di `.env` (lihat `.env.example`):

| Variabel | Arti |
|---|---|
| `MOCK_MODE` | `true`: `/analyze` dan `/calibrate` mengembalikan contoh valid tanpa analisis |
| `DATASET_MODE` | `true`: mengaktifkan `POST /v1/dataset/upload` (hanya saat sesi rekam dataset) |
| `DATA_DIR` | folder data; relatif terhadap `server/` (default `../data`) |
| `SCORER_MODE` | MVP selalu `rules` (Wav2Vec2 ditunda; nilai lain ditolak saat start) |
| `MAX_UPLOAD_MB` | batas ukuran upload (default 15) |
| `DEBUG` | `true`: mengaktifkan `GET/POST /v1/debug/features` (pengembangan saja, matikan saat demo) |
| `FACE_MODEL_PATH` | model MediaPipe, relatif terhadap `server/` (default `models/face_landmarker.task`) |
| `TMP_DIR` | folder direktori sementara per request (kosong = temp sistem); selalu dihapus setelah request |

Semua ambang penilaian dan kualitas ada di `app/config/thresholds.yaml` (dimuat dan divalidasi saat start).

## Menjalankan

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
```

`--host 0.0.0.0` wajib supaya HP di Wi-Fi yang sama bisa mengakses laptop.
Dokumentasi interaktif: `http://<IP-laptop>:8000/docs`.

### Mencari IP LAN laptop

| OS | Perintah | Cari |
|---|---|---|
| Windows | `ipconfig` | "IPv4 Address" di adapter **Wi-Fi**, mis. `192.168.1.10` |
| macOS | `ipconfig getifaddr en0` | langsung tampil IP-nya |
| Linux | `hostname -I` (atau `ip -4 addr show`) | alamat pertama `192.168.x.x` / `10.x.x.x` |

Lalu buka `http://<IP>:8000/v1/health` dari browser HP. Isi `EXPO_PUBLIC_API_URL=http://<IP>:8000` di `app/.env`.

**Tidak bisa diakses dari HP?**
- HP dan laptop harus di Wi-Fi yang sama (bukan Wi-Fi tamu yang mengisolasi perangkat).
- Windows: profil jaringan Wi-Fi harus **Private** (Settings → Network & internet → Wi-Fi → properti jaringan).
  Saat pertama kali menjalankan uvicorn, izinkan Python di dialog Windows Defender Firewall untuk jaringan Private.
- macOS: System Settings → Network → Firewall, izinkan Python.

## Contoh curl

Analisis (mock). Pilih variasi dengan `?mock=hijau|kuning|merah|retry` (default `hijau`):
```bash
curl -X POST "http://localhost:8000/v1/analyze?mock=merah" \
  -F "file=@klip.mp4;type=video/mp4" \
  -F user_id=user-1 -F item_id=l3_mama -F session_id=sesi-1
```

Kalibrasi (mock); `step` ∈ `rest | vowel_a | vowel_i | vowel_u`:
```bash
curl -X POST "http://localhost:8000/v1/calibrate" \
  -F "file=@klip.mp4;type=video/mp4" -F user_id=user-1 -F step=vowel_a
```

Upload dataset (butuh `DATASET_MODE=true`):
```bash
curl -X POST http://localhost:8000/v1/dataset/upload \
  -F "file=@klip.mp4;type=video/mp4" \
  -F purpose=dataset -F speaker_id=P1 -F item_id=l3_mama -F rep=1 \
  -F intended_error=none -F condition=quiet -F session_id=sesi-1 \
  -F device="Samsung A52"
# -> {"status":"ok","clip_id":"P1__l3_mama__r1__none__quiet"}
# berkas: DATA_DIR/raw/P1/l3_mama__r1__none__quiet.mp4 + baris di DATA_DIR/raw/metadata.csv
```

Video model (timpa bila sudah ada) dan mengambilnya kembali:
```bash
curl -X POST http://localhost:8000/v1/dataset/upload \
  -F "file=@model_mama.mp4;type=video/mp4" \
  -F purpose=model_video -F speaker_id=P1 -F item_id=l3_mama -F rep=1 \
  -F intended_error=none -F condition=quiet -F session_id=sesi-model
curl -o mama.mp4 http://localhost:8000/v1/model-video/l3_mama   # 404 bila belum ada
```

Contoh video uji 2 detik dibuat dengan ffmpeg:
```bash
ffmpeg -f lavfi -i testsrc=duration=2:size=320x240:rate=15 -f lavfi -i sine=frequency=220:duration=2 \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest klip.mp4
```

## Endpoint debug (fase A1, hanya bila `DEBUG=true`)

Bukan bagian kontrak SPEC §5; rute tidak ada sama sekali (404) bila `DEBUG=false`.

```bash
curl http://localhost:8000/v1/debug/features            # status: ffmpeg, model, ambang, versi
curl -X POST http://localhost:8000/v1/debug/features -F "file=@rekaman_hp.mp4;type=video/mp4"
```

Isi respons POST (angka saja):

| Field | Arti |
|---|---|
| `quality_flags` | flag SPEC §6.2: `no_face`, `face_off_frame`, `too_quiet`, `too_noisy`, `clipping`, `too_short` |
| `info` | catatan, mis. `noise_floor_uncertain` (klip hampir penuh suara; `too_noisy` tidak dicek, `too_quiet` memakai batas absolut) |
| `n_frames`, `face_frames`, `face_frame_pct` | frame 15 fps (maks. 4 s) dan persentase frame berwajah |
| `av_offset_ms` | awal stream audio − awal stream video |
| `audio_duration_ms`, `has_audio` | durasi WAV 16 kHz mono |
| `audio.*` | `peak_db`, `noise_floor_db`, rentang ucapan, `clip_ratio`, dll. (dB versi Praat) |
| `face.*` | `face_width_ratio` (median lebar wajah ÷ lebar frame), `mouth_out_ratio` |
| `timings_ms` | `media_ms`, `landmarker_init_ms`, `face_detect_ms`, `audio_ms`, `total_ms` |

Request pertama setelah server start lebih lambat (±1 s) karena import mediapipe.
Rekaman disalin ke satu direktori sementara (`cw_media_*`) dan dihapus sebelum respons dikirim, juga saat error.

## Catatan kontrak untuk developer app

- **Error** selalu berbentuk `{"detail": {"code": "...", "message": "..."}}`. Tampilkan teks Indonesia
  berdasarkan `code`, bukan `message`. Kode: `invalid_request` (422), `invalid_item_id` (422),
  `empty_file` (422), `unsupported_media_type` (415), `file_too_large` (413),
  `not_found` / `model_video_not_found` (404), `internal_error` (500); khusus dataset juga
  `invalid_speaker_id`, `invalid_intended_error`, `intended_error_item_mismatch` (422).
  `/analyze`, `/calibrate` (tanpa mock) dan debug: `invalid_media` (422, ffmpeg tidak bisa membaca
  video), `media_tools_missing` (503), `face_model_missing` (503); `/analyze` juga `item_inactive`
  (422, item bonus yang belum dinilai).
- **Analisis sungguhan** (`MOCK_MODE=false`, fase A3): ±0,8 s per klip (request pertama ±1,7 s).
  Tanpa kalibrasi lengkap, `quality_flags` berisi `"uncalibrated"` (bukan penyebab retry) dan
  jangkar vokal memakai default populasi. Kalibrasi tersimpan sebagai angka di
  `DATA_DIR/calibration/{user_id}.json`. Untuk mencoba tanpa app: buka `http://<IP>:8000/docs`.
- `GET /v1/items` mengembalikan **array** item aktif. Item bonus (`l1_e`, `l1_o`, `l3_mau`, `l3_bau`, `l3_boba`)
  ada di `items.json` dengan `active: false`.
- Saat `status: "retry"`: `overall`, `score`, `units`, dan **`indicators`** bernilai `null`; semua kunci `visuals` `null`.
- `user_id` dan `session_id`: huruf, angka, `_`, `-`, maks. 64 karakter (UUID Supabase lolos).
- Upload: hanya video mp4/mov (dicek dari tipe dan isi berkas), maksimal 15 MB.
- Dataset: `speaker_id` ∈ `P1`, `P2`, `P3`. `item_id` = item di `items.json` (termasuk item bonus).
  `intended_error` ∈ `none`, `mama_as_papa` (l3_mama), `u_flat_lips` (l1_u), `a_narrow` (l1_a),
  `mama_no_closure` (l3_mama), `bad_face` (item apa saja), `bad_noise` (l1_a).
  Field opsional: `device` (kolom `device` di metadata.csv).
  Kolom metadata.csv (SPEC §10.5): `clip_id, speaker_id, item_id, rep, intended_error, condition, session_id, recorded_at, device`.
  Upload ulang klip yang sama (speaker/item/rep/error/kondisi sama) menimpa berkas dan baris metadata-nya.

## Privasi

- Log hanya berisi metode, templat rute, status, dan durasi (ms). Tidak ada nama berkas, isi upload,
  IP klien, atau query string. Access log bawaan uvicorn dimatikan.
- `/analyze` dan `/calibrate` tidak menyimpan rekaman.

## Tes

```bash
pytest -q -rs      # butuh ffmpeg di PATH: fixture video dibuat saat tes
ruff check . && ruff format --check .
```

Tes bertanda `requires_model` (6 tes) memakai MediaPipe sungguhan dan **di-skip** dengan pesan bila
`models/face_landmarker.task` belum diunduh. `-rs` menampilkan alasan skip. Hanya tes itu:
`pytest -m requires_model`.
