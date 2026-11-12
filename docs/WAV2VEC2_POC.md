# Eksperimen Wav2Vec2 Bahasa Indonesia

Status 13 November 2026: **berfungsi untuk jalur eksekusi lokal CPU**. CLI dan API nyata
berhasil pada audio/video sintetis. Akurasi ucapan, khususnya ucapan pengguna Tuli, belum
diukur. Materi eksperimen: **Tolong, Saya Tuli, Hai, Makan**. Level 3 utama belum diganti.

## Menggunakan aplikasi di laptop ini

1. Laptop dan HP memakai jaringan yang sama. Backend tetap port **8000**;
   Metro/Expo port **8081**, keduanya sudah dijalankan untuk percobaan ini.
2. Buka `exp://192.168.101.22:8081` lewat Expo Go, dengan akun yang sama seperti Expo CLI.
   IP ini khusus jaringan saat pengujian; sesuaikan saat jaringan berubah.
3. Reload. Tekan lama judul **Misi hari ini** selama dua detik untuk membuka Pengaturan.
4. Pastikan URL server `http://192.168.101.22:8000` dan Tes koneksi berhasil.
5. Tekan **Uji Wav2Vec2**, pilih target, lalu **Latih kata ini** dan **Rekam ucapan**.
   Ucapkan target sekali setelah indikator MEREKAM muncul. Rekaman memakai durasi bawaan
   RecordPanel (2,5 detik); usahakan frasa selesai dalam waktu tersebut.
6. Lihat teks asli, pesan kecocokan teks, atau keterangan belum ada teks. **Rekam lagi**
   mempertahankan target; **Pilih kata lain** kembali ke pilihan materi.

Teks cocok setelah kapitalisasi, tanda baca, dan spasi berulang diabaikan. Ini tidak
menilai bunyi satu per satu atau menghasilkan nilai pelafalan. Target tidak dikirim ke
model. Teks yang berbeda tidak diganti ke target. Hasil tidak dicatat sebagai progres.

## Lingkungan dan model

- Python **3.11.5**, venv terpisah `ml/wav2vec2/.venv`, Torch **2.15.0+cpu**,
  Transformers **5.22.2**, NumPy **2.4.6**, Pydantic **2.14.3**, PyYAML **6.0.3**.
  Seluruh versi runtime dikunci di `ml/requirements-wav2vec2.txt`; `pip check` lolos.
- Checkpoint komunitas [Wikidepia/wav2vec2-xls-r-300m-indonesian](https://huggingface.co/Wikidepia/wav2vec2-xls-r-300m-indonesian),
  model card menyatakan Apache-2.0 dan fine-tuning Common Voice 8/MagicHub. Tim tidak
  melakukan training atau fine-tuning tambahan. Ini bukan model akurasi pelafalan.
- Revisi **`8a9d507f0804f8e5fca07b17214b2c0266ba7491`**, bobot 1.262.054.897 byte,
  SHA-256 **`e0068f2a14d76c98bf99a3a656bb6a76f71381675055e2ca43d98516aa143bda`**.
- Downloader hanya mengambil tujuh berkas inferensi pada revisi tersebut, memverifikasi
  hash bobot sebelum mengaktifkan berkas final, dan melewati bobot yang telah cocok.
  Model disimpan di dalam venv yang diabaikan Git. Optimizer, training state, dan model
  bahasa tambahan tidak diunduh.
- Memakai `Wav2Vec2FeatureExtractor` dan `Wav2Vec2CTCTokenizer` secara eksplisit. Metadata
  upstream menunjuk `Wav2Vec2ProcessorWithLM`; eksperimen ini menggunakan greedy CTC
  tanpa LM sehingga tidak memerlukan pyctcdecode/KenLM. Metrik model card tidak boleh
  dianggap sebagai metrik eksperimen ini.
- Model dimuat lokal sekali per subprocess, CPU, `eval()`, `torch.inference_mode()` dan
  `weights_only=True`; tanpa pelonggaran pengamanan checkpoint. Pemuatan per permintaan
  dipertahankan agar proses eksperimen terisolasi; ukur kembali sebelum melayani banyak HP.

## Setup PowerShell dari root repo

Tidak perlu mengulang instalasi di laptop yang sudah disiapkan.

```powershell
& 'C:\Users\TUF GAMING\AppData\Local\Programs\Python\Python311\python.exe' -m venv ml/wav2vec2/.venv
& ml/wav2vec2/.venv/Scripts/python.exe -m pip install --cache-dir ml/wav2vec2/.venv/pip-cache -r ml/requirements-wav2vec2.txt
& ml/wav2vec2/.venv/Scripts/python.exe -B ml/tools/download_wav2vec2.py
```

Sesuaikan executable Python 3.11 pada laptop lain. Jangan memasang requirements eksperimen
ke `server/.venv`. Unduhan model/dependency membutuhkan internet; inferensi memakai berkas
lokal dengan `local_files_only=True`, `HF_HUB_OFFLINE=1` dan telemetry dinonaktifkan.
Rekaman tidak dikirim ke Hugging Face.

CLI (WAV lokal milik pengguna; jangan menaruh path rekaman di log atau commit):

```powershell
& ml/wav2vec2/.venv/Scripts/python.exe -B ml/tools/wav2vec2_poc.py --file 'D:\rekaman-lokal\tolong.wav'
```

Input harus `.wav` huruf kecil, PCM 16-bit mono 16 kHz, tidak kosong/terpotong, maksimal
4 detik sesuai `media.max_duration_s` dalam thresholds.yaml. Input dibaca tanpa diubah.
Output sukses JSON ke stdout; kegagalan JSON aman ke stderr dan exit code 1.

Untuk menjalankan layanan lagi (dua terminal, dari root repo):

```powershell
# Terminal backend; FFmpeg/ffprobe harus tersedia di PATH
$env:DEBUG='true'
$env:MOCK_MODE='false'
$env:DATASET_MODE='false'
$env:PYTHONDONTWRITEBYTECODE='1'
Set-Location server
& .venv/Scripts/python.exe -B -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log

# Terminal Expo baru, dari root repo
Set-Location app
npx.cmd expo start --clear --lan --port 8081
```

`POST /v1/experiments/wav2vec2` hanya ada saat DEBUG=true, menerima video MP4/MOV dengan
audio. Kontrak dan error di SPEC §5. Menggunakan upload native yang sama dengan Allosaurus,
tanpa retry otomatis, dengan pembatalan/timeout dan cleanup. Video upload dan WAV hasil
konversi hanya sementara. Rekaman lokal dihapus setelah sukses/gagal atau keluar layar.
Penghapusan native tetap best-effort; kegagalan kamera tanpa URI belum membuktikan cache
fisik perangkat terhapus. Tidak membaca dataset pribadi atau menulis ke Supabase.

## Bukti pengujian aktual

Audio sintetis: nada 220 Hz, 2,5 detik. Bukan ucapan, sehingga teks kosong dipertahankan.
CLI nyata dengan koneksi socket diblokir dan hash input tetap sama:

```json
{"status":"success","model":"Wikidepia/wav2vec2-xls-r-300m-indonesian","transcription":"","inference_ms":611.954}
```

Uji pemuatan awal terpisah: CPU, load 321,38 ms, inferensi 663,91 ms. Waktu total proses
CLI tetap beberapa detik karena impor/startup. HTTP backend sungguhan pada video sintetis:
**200**, total **5649,1 ms**, inferensi **638,072 ms**, transkripsi kosong. Upload WAV ke
endpoint video ditolak **415**. Regresi Allosaurus sungguhan sesudah ekstraksi helper:
**200**, prediksi kosong, inferensi **1230,011 ms**. Angka ini satu percobaan per skenario,
bukan benchmark latensi atau bukti peningkatan akurasi.

- **455 pytest lulus**, termasuk validasi WAV, kegagalan model/inferensi, local-only/CPU,
  raw text, error aman, cleanup, durasi berlebih ditolak, dan verifikasi hash downloader.
  Satu peringatan lama deprecation Starlette/HTTPX.
- **250 Jest lulus** dalam 23 suite: pemilihan/locking target, kecocokan teks, raw/mismatch/
  kosong, upload tanpa prompt target, failure, abort dan hasil terlambat.
- TypeScript lolos; Ruff check dan format check **87 berkas** lolos.
  Expo lint exit 0: **0 error, 8 warning lama**.
- Bundle iOS dari Metro HTTP **200**, **8.557.607 byte**, layar Wav2Vec2 tercakup.
  Detektor sumber TSX tidak menemukan pola yang diperiksa, tetapi tidak memeriksa kontras
  dan layout hasil render. Pemeriksaan visual/kamera/mikrofon native masih perlu HP.
- `server/requirements.txt`, `server/.venv/pyvenv.cfg` dan daftar `pip freeze` backend
  identik sebelum/sesudah. Dependency frontend dan konfigurasi skor tidak diubah.

Perintah validasi dari folder masing-masing:

Pembaruan pemulihan Expo/iOS: log native memperlihatkan counter progres `BigInt` meskipun
tipe SDK menyatakan number. Kedua counter kini dikonversi sebelum pembagian; empat tes
regresi tambahan gagal pada kode lama lalu lulus. Total terbaru **254 Jest**, tsc lolos,
lint tetap 0 error/8 warning lama. Metro dimulai ulang dengan cache bersih di port 8081.
Manifest laptop merespons 200. Pengguna mengonfirmasi /status dapat diakses dari browser HP,
lalu aplikasi sudah terbuka dan hasil teks muncul. Log backend juga memperlihatkan beberapa
upload Wav2Vec2 dengan respons 200. Ini mengonfirmasi alur rekam-ke-teks di HP, belum akurasi
transkripsi atau penghapusan fisik cache native.

```powershell
# server/
$env:DEBUG='false'
$env:PYTHONDONTWRITEBYTECODE='1'
& .venv/Scripts/python.exe -B -m pytest -q -p no:cacheprovider
& .venv/Scripts/ruff.exe check --no-cache app tests ../ml
& .venv/Scripts/ruff.exe format --no-cache --check app tests ../ml

# app/
npm.cmd test -- --runInBand
npx.cmd tsc --noEmit
npx.cmd expo lint --no-cache
```

Belum diuji: akurasi empat target dengan ucapan manusia, penutur Tuli, kebisingan, perangkat
berbeda, penutur di luar data training, dan penggunaan serentak. Tidak ada commit, merge,
push, deploy, atau perubahan tag submission. Penggantian Level 3 perlu keputusan terpisah
setelah bukti uji, karena scorer aturan lama tidak mencakup bunyi/frasa baru ini.
