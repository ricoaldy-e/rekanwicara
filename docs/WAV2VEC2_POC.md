# Eksperimen Wav2Vec2 Bahasa Indonesia

Status 13 November 2026: **berfungsi untuk jalur eksekusi lokal CPU**. CLI dan API nyata
berhasil pada audio/video sintetis. Akurasi ucapan, khususnya ucapan pengguna Tuli, belum
diukur. Materi eksperimen: **Tolong, Saya Tuli, Hai, Makan, PA, MA**. Level 3 utama belum diganti.

Tambahan PA/MA di layar HP telah diselaraskan dengan kontrak Uji Gabungan dan diuji
otomatis: 521 pytest, 285 Jest, TypeScript dan Ruff lolos; lint 0 error/8 warning lama.
Reload Expo Go untuk memuat pilihan baru. Uji native dan pengenalan ucapan PA/MA manusia
belum dilakukan. Target tetap hanya untuk pembandingan setelah transkripsi.

## CLI evaluasi target dinamis (13 November 2026)

`ml/tools/wav2vec2_eval.py` menambahkan evaluasi single WAV dan batch manifest tanpa
mengubah aplikasi/API. Memakai model, venv dan dependency yang sama; tidak ada instalasi,
training, fine-tuning atau perubahan bobot. Model dimuat sekali per proses evaluasi,
kemudian setiap WAV dikenali secara berurutan dengan greedy CTC bebas, tanpa LM.
`load_recognizer()` dipakai ulang dari PoC; CLI JSON lama tetap kompatibel dengan endpoint.

Audit: checkpoint Indonesia yang sudah ada tetap sesuai untuk *menguji* ASR bebas.
[Model card](https://huggingface.co/Wikidepia/wav2vec2-xls-r-300m-indonesian) menyatakan
fine-tuning Common Voice 8 dan MagicHub Indonesia, lisensi Apache-2.0. Metadata processor
menyebut `Wav2Vec2ProcessorWithLM`, tetapi kode memakai feature extractor/tokenizer
eksplisit serta `argmax`, sehingga tidak memuat LM. Preprocessing: PCM int16 menjadi
float32 dibagi 32768, lalu feature extractor dengan `do_normalize=true`, 16 kHz.
Model lokal: `eval()`, `inference_mode()`, CPU dan `weights_only=True`.
Tidak mengganti checkpoint atau menambah dependency ke requirements eksperimen/server.

### Single audio

Dari root repo, buat direktori lokal berikut. Rekaman, manifest dan hasil di dalamnya
diabaikan Git; jangan memakai nama orang sebagai ID. Contoh nama berkas di bawah hanya
placeholder, bukan rekaman yang telah diuji. Siapkan WAV PCM **16-bit mono 16 kHz** sendiri.

```powershell
New-Item -ItemType Directory -Force ml/wav2vec2/local | Out-Null
& ml/wav2vec2/.venv/Scripts/python.exe -B ml/tools/wav2vec2_eval.py --file ml/wav2vec2/local/r001.wav --trial-id T001 --speaker-id S01 --target PA --ground-truth BA
```

`--target PA` adalah instruksi latihan; `--ground-truth BA` hanya diisi bila manusia
telah memverifikasi audio sebenarnya berbunyi BA. Ground truth opsional: jika belum
diverifikasi, hilangkan flag tersebut. Tidak diisi otomatis dari target atau nama berkas.
Target apa pun diterima tanpa mengganti kode atau training. JSON stdout berisi hasil
dan ringkasan. `raw_transcription` dipertahankan persis seperti keluaran tokenizer.
`target_match` dan `ground_truth_match` dihitung terpisah **setelah** inferensi.
Normalisasi hanya kapitalisasi dan peringkasan spasi; tanda baca/ejaan tidak dikoreksi,
spasi di tengah bunyi tidak dihapus: `P A` tetap berbeda dari `PA`.

### Batch audio

Buat `ml/wav2vec2/local/trials.csv` UTF-8. Kolom wajib `trial_id,file,target`;
`ground_truth,speaker_id` opsional. ID percobaan wajib unik; ID hanya huruf ASCII,
angka, garis bawah atau tanda hubung, maksimal 64 karakter. Path relatif dihitung dari
folder manifest. Jangan memakai identitas pribadi. Contoh berikut **template, bukan data**;
ganti ground truth dengan hasil verifikasi pendengar, atau kosongkan jika belum tersedia.

```csv
trial_id,file,target,ground_truth,speaker_id
T001,r001.wav,PA,PA,S01
T002,r002.wav,PA,BA,S01
T003,r003.wav,PA,MA,S01
T004,r004.wav,BA,BA,S01
T005,r005.wav,BA,PA,S01
T006,r006.wav,MA,MA,S01
T007,r007.wav,PI,,S01
T008,r008.wav,BI,,S01
T009,r009.wav,MI,,S01
T010,r010.wav,PU,,S01
T011,r011.wav,BU,,S01
T012,r012.wav,MU,,S01
T013,r013.wav,PAPA,PAPA,S01
T014,r014.wav,PAPA,BABA,S01
T015,r015.wav,MAMA,,S01
T016,r016.wav,BABA,,S01
```

```powershell
& ml/wav2vec2/.venv/Scripts/python.exe -B ml/tools/wav2vec2_eval.py --manifest ml/wav2vec2/local/trials.csv --csv ml/wav2vec2/local/results-01.csv
```

Tambahkan baris dengan ID baru untuk ulangan/penutur lain, misalnya S02. Untuk pemeriksaan
independensi target, gunakan WAV yang sama pada beberapa baris dengan target berbeda:
transkripsi harus tetap sama. Model hanya menerima audio, bukan Trial/target/ground truth.
Manifest dipilih sebagai satu cara batch sederhana; tidak ada inferensi label dari folder.

CSV menyimpan ID, kode penutur, target, ground truth, transkripsi mentah dan hasil
normalisasi, dua kecocokan, durasi detik, waktu inferensi milidetik, status dan error aman.
Path/nama rekaman tidak diekspor. Status `ok` berarti teks tersedia, `empty` berarti
inferensi sukses tanpa teks, `error` berarti validasi/pemrosesan gagal; bukan label pelafalan.
Kegagalan satu WAV tidak menghentikan baris berikutnya. Bila model gagal dimuat, baris
audio valid dilaporkan gagal tanpa mencoba memuat model berkali-kali.

Ringkasan JSON stdout melaporkan jumlah kosong/error, kecocokan target, serta
`recognition_rate = ground_truth_matches / ground_truth_trials`. Penyebut mencakup
**semua** baris ber-ground-truth, termasuk hasil kosong dan error; baris tanpa ground
truth tidak dihitung. Tanpa ground truth, recognition_rate null. Ini rasio pengenalan
teks pada data uji, **bukan skor ketepatan pelafalan**. Rata-rata/median/maksimum latensi
hanya dari inferensi sukses (termasuk kosong), hanya forward model + greedy decoding.
Impor library, pemuatan model, preprocessing dan I/O tidak termasuk; percobaan pertama
tetap dihitung, tanpa warm-up tersembunyi.

Input tidak diubah/disalin dan tidak dikonversi otomatis. Batas durasi mengikuti
`media.max_duration_s` di thresholds.yaml (saat ini 4 detik); format/durasi yang tidak
sesuai mendapat error. `data/` ditolak sebelum dibaca, termasuk referensi melalui symlink.
CSV hasil harus bernama baru dengan direktori induk tersedia; berkas lama tidak ditimpa.
Exit 0 mencakup hasil berbeda/kosong; exit 1 menandakan ada error proses/argumen/I/O.
Untuk batch yang memiliki error per rekaman, CSV lengkap tetap ditulis.
CSV menyimpan teks mentah tanpa mengubah karakter awalan: bila membuka dengan spreadsheet,
impor kolom teks sebagai **Text**, jangan mengeksekusi isinya sebagai formula.

### Bukti dan interpretasi evaluasi dinamis

515 pytest server/ML lulus (22 tes baru), satu warning deprecation Starlette/HTTPX lama;
Ruff check dan format check lulus pada 93 berkas. Tes memakai audio sintetis, termasuk
independensi target/ground truth, satu pemuatan model per batch, hasil kosong/error,
kelanjutan batch, manifest rusak/ID ganda, CSV tanpa path, dan penolakan penimpaan.

Model asli CPU diuji dengan socket Python diblokir, WAV nada 220 Hz berdurasi 2,5 detik
yang sama untuk target PA dan BA. Model dimuat **sekali**, input tetap identik:

| ID sintetis | Target | Ground truth ucapan | Teks mentah | Status | Inferensi |
|---|---|---|---|---|---|
| SYN01 | PA | tidak ada (nada) | kosong | empty | 2668,206 ms |
| SYN02 | BA | tidak ada (nada) | kosong | empty | 438,650 ms |

Pemuatan pertama termasuk impor library 25165,2 ms; total evaluasi batch 28318,7 ms.
Pengukuran dilakukan bersamaan dengan regresi pytest sehingga bukan benchmark CPU
terkontrol. Rasio pengenalan tetap null, bukan 0% akurasi ucapan. Dua nada kosong bukan
ukuran frekuensi teks kosong pada suku kata manusia. Pengujian proses CLI single asli
juga sukses pada nada tersebut: evaluasi 765,103 ms; CLI PoC lama 755,284 ms dan format
JSON tetap sama. Keduanya mempertahankan teks kosong, tanpa klaim pengenalan ucapan.

Belum ada rekaman ucapan manusia yang diuji pada eksperimen dinamis ini. Karena itu
belum dapat menjawab apakah PA/BA/MA dikenali, PA dibedakan dari BA, kata lebih mudah
daripada suku kata, atau model sering menghasilkan kata lain. Suku kata pendek memiliki
sedikit konteks akustik sehingga merupakan risiko yang perlu diuji, bukan hasil terukur.
Normalisasi dapat menyamakan kapitalisasi/spasi berulang, tetapi tidak boleh menyamarkan
substitusi PA menjadi BA. Keluaran ASR dapat cocok secara teks tanpa membuktikan mutu
pelafalan. Secara teknis target dinamis dapat dievaluasi tanpa training ulang; keputusan
kelayakan model untuk Level 2 menunggu rekaman berulang, ground truth manusia, beberapa
penutur dan perbandingan hasil per target. Belum memilih kategori cocok/tidak cocok.

## Menggunakan aplikasi di laptop ini

1. Laptop dan HP memakai jaringan yang sama. Backend tetap port **8000**;
   Metro/Expo port **8081**, keduanya sudah dijalankan untuk percobaan ini.
2. Buka `exp://192.168.101.22:8081` lewat Expo Go, dengan akun yang sama seperti Expo CLI.
   IP ini khusus jaringan saat pengujian; sesuaikan saat jaringan berubah.
3. Reload. Tekan lama judul **Misi hari ini** selama dua detik untuk membuka Pengaturan.
4. Pastikan URL server `http://192.168.101.22:8000` dan Tes koneksi berhasil.
5. Tekan **Uji Wav2Vec2**, pilih target, lalu **Latih target ini** dan **Rekam ucapan**.
   Ucapkan target sekali setelah indikator MEREKAM muncul. Rekaman memakai durasi bawaan
   RecordPanel (2,5 detik); usahakan frasa selesai dalam waktu tersebut.
6. Lihat teks asli, pesan kecocokan teks, atau keterangan belum ada teks. **Rekam lagi**
   mempertahankan target; **Pilih target lain** kembali ke pilihan materi.

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

Belum diuji: akurasi enam target dengan ucapan manusia, penutur Tuli, kebisingan, perangkat
berbeda, penutur di luar data training, dan penggunaan serentak. Tidak ada commit, merge,
push, deploy, atau perubahan tag submission. Penggantian Level 3 perlu keputusan terpisah
setelah bukti uji, karena scorer aturan lama tidak mencakup bunyi/frasa baru ini.
