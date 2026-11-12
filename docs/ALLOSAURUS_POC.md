# Allosaurus PoC lokal

Status: **CLI dan endpoint eksperimen berfungsi pada CPU**. Pengguna sudah melaporkan hasil
rekaman dari HP; tampilan huruf baru dan akurasi ucapan masih perlu diperiksa di perangkat.
Branch `experiment/allosaurus-poc`; pipeline penilaian utama dan snapshot submission tetap utuh.

## Bunyi Indonesia dan tampilan huruf

Sesuai persetujuan pengguna, decoder kini dibatasi ke 32 bunyi dalam
`ml/config/indonesian_phones.txt`. File ini dipakai langsung sebagai inventaris Allosaurus;
model dan bobot tidak diubah. Inventaris dipastikan merupakan subset token `uni2005`.
Jika hilang, kosong, berisi duplikat atau token tidak didukung, CLI gagal dengan
`inventory_invalid`; tidak kembali diam-diam ke inventaris universal.

Inventaris `ind` bawaan model bertanda dialek Central Java dan memuat 36 token, tetapi tidak
memuat `tʃ`/`dʒ`. Inventaris eksperimen memakai bunyi umum Indonesia dan serapan termasuk
kedua afrikat tersebut untuk huruf c/j; bukan klaim mencakup semua dialek atau variasi ucapan.
Acuan mekanisme: [inventaris Allosaurus](https://github.com/xinjli/allosaurus#inventory-customization).

Tampilan utama aplikasi memakai padanan huruf, misalnya:

| Token IPA | Tampilan |
|---|---|
| ŋ / ɲ | ng / ny |
| ʃ / x | sy / kh |
| tʃ / dʒ | c / j |
| j / ɡ | y / g |
| ə / e / ɛ | e |
| o / ɔ | o |
| ʔ | henti glotal |

Token tetap dipisahkan spasi, seperti `m a m a`; tidak digabung atau dikoreksi menjadi kata
target. Token tak dikenal ditandai **bunyi lain**. **Lihat detail** menampilkan string IPA
asli tanpa perubahan. Penggabungan variasi e/o hanya penyederhanaan tampilan; detail tetap
membedakannya. API dan CLI tetap mengembalikan `phonetic_prediction` mentah beserta waktu
inferensi, tanpa skor atau field kontrak baru. Cakupan decoder ini dicatat di SPEC §5.

Pembatasan dapat memetakan bunyi di luar daftar ke pilihan bunyi yang tersedia. Huruf yang
lebih mudah dibaca tidak membuktikan ucapan atau pengenalan model sudah tepat.

Verifikasi pembaruan: **424 pytest, 231 Jest**, TypeScript, Ruff check/format dan bundle iOS
lolos; lint exit 0 dengan 8 warning lama. Lima tes Python baru memastikan inventaris salah
tidak memakai fallback serta mencakup c/j. Sepuluh tes pemetaan huruf dan satu tes layar
baru memeriksa padanan, token asing, IPA tersembunyi/detail asli, dan reset detail saat rekam ulang.
Model asli dikonfirmasi memakai 32 token (di luar blank CTC), mencakup c/j, dan tetap CPU.
CLI pada nada sintetis sukses dengan prediksi kosong (678,638 ms); API video sintetis
juga HTTP 200, prediksi kosong (664,04 ms). Ini bukan hasil pengujian akurasi ucapan.
Lakukan **Expo Go → Reload**, lalu rekam lagi untuk memakai tampilan baru.

## Mencoba dari aplikasi

HP dan laptop harus memakai Wi-Fi yang sama. Pada pengujian ini IP Wi-Fi laptop adalah
`192.168.101.22`; cek `ipconfig` jika jaringan berubah.

Terminal 1, dari root repo:

```powershell
Push-Location server
$env:DEBUG = 'true'
$env:DATASET_MODE = 'false'
$env:MOCK_MODE = 'false'
$env:PYTHONDONTWRITEBYTECODE = '1'
& .venv/Scripts/python.exe -B -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
Pop-Location
```

Terminal 2, dari root repo:

```powershell
Push-Location app
$env:EXPO_NO_TELEMETRY = '1'
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '192.168.101.22'
npm.cmd start -- --clear --lan --port 8081
Pop-Location
```

Gunakan `npm.cmd`/`npx.cmd` jika PowerShell menolak launcher `.ps1`. Untuk Expo Go di iPhone,
jalankan Expo secara online agar manifest menyertakan akun CLI. Pastikan `npx.cmd expo whoami`
menampilkan akun yang sama dengan Expo Go; jika belum, jalankan `npx.cmd expo login` pada
terminal sendiri. Jangan kirim password atau token ke chat.
Lihat [panduan akun Expo Go](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).

1. Buka proyek di Expo Go melalui `exp://192.168.101.22:8081`.
2. Selesaikan onboarding bila belum pernah memakai aplikasi, lalu buka beranda.
3. Tekan lama judul **Misi hari ini** selama dua detik untuk membuka Pengaturan.
4. Pastikan alamat server `http://192.168.101.22:8000`, tekan **Simpan** bila berubah,
   lalu **Tes koneksi**. Buka **Uji Allosaurus** (gulir bila perlu).
5. Izinkan kamera/mikrofon, tekan **Rekam ucapan**, tunggu hitung mundur, lalu ucapkan satu
   kata saat indikator merekam muncul. Upload dan analisis dimulai otomatis setelah 2,5 detik.
6. Lihat huruf bunyi dan waktu inferensi; **Lihat detail** membuka IPA mentah.
   Gunakan **Rekam lagi** untuk mencoba ulang.

Tombol dan layar eksperimen hanya tersedia dalam versi pengembangan (`__DEV__`). Endpoint
`POST /v1/experiments/allosaurus` hanya terdaftar saat `DEBUG=true`; saat tidak aktif app memberi
petunjuk setup. DEBUG juga mengaktifkan alat debug yang sudah ada; gunakan untuk pengembangan lokal.
Kembali ke `DEBUG=false` untuk menjalankan produk biasa.

Aplikasi memakai perekam video yang sudah ada. Server memeriksa upload, mengekstrak audio saja
dengan FFmpeg, dan menjalankan CLI di venv eksperimen sebagai subprocess. Tidak menjalankan
MediaPipe/Parselmouth untuk endpoint ini, tidak menambah dependency backend/app, dan tidak
mengubah hasil latihan atau Supabase. Model dimuat sekali untuk setiap permintaan, sehingga
waktu menunggu pengguna juga mencakup pemuatan model di luar `inference_ms`.

Upload/WAV server dibersihkan pada sukses/error. App mencoba menghapus file lokal pada sukses,
error, atau keluar layar; upload dibatalkan saat keluar dan hasil terlambat diabaikan.
Tidak ada retry upload otomatis; error menawarkan rekam ulang. Penghapusan fisik native tetap
perlu pemeriksaan HP; keterbatasan RecordPanel ketika native gagal tanpa URI masih berlaku.

Verifikasi integrasi: **419 pytest** (13 tes endpoint baru), **214 Jest** (7 tes layar dan
5 tes client baru), TypeScript dan Ruff lolos. Lint app exit 0 dengan 8 warning lama.
Bundler menghasilkan bundle iOS (HTTP 200, 8.534.218 byte); manifest menunjuk IP Wi-Fi yang benar.
Ini bukti kompilasi, bukan verifikasi tampilan/kamera native.
Uji video sintetis melalui server HTTP yang berjalan menghasilkan HTTP 200:

```json
{"status":"success","model":"uni2005","phonetic_prediction":"","inference_ms":1172.308}
```

Uji API terisolasi memakai video sintetis 2,5 detik menghasilkan HTTP 200, prediksi kosong,
`inference_ms: 660.356`; video 4,2 detik ditolak HTTP 422 `audio_too_long`. Direktori sementara
kosong setelah keduanya. Tes juga mencakup video rusak/tanpa audio, error/timeout CLI,
endpoint nonaktif, validasi respons, status memproses, hasil kosong, error jaringan/model,
rekam ulang, pembatalan upload, dan hasil yang datang setelah layar ditutup.
Hash requirements/config venv dan daftar paket backend masih sama dengan sebelum PoC.

Server/Expo dijalankan dengan override lingkungan hanya pada proses; `.env` dan snapshot tidak diubah.
Tidak melakukan commit, merge, push, atau deploy. Belum ada bukti akurasi pada ucapan manusia.

Perbaikan koneksi iPhone: sesi Expo awal memakai `--offline`, sehingga manifest tidak
menyertakan username meskipun CLI sudah login sebagai `rekanwicara`. Sesi itu dihentikan;
Expo online dijalankan di port 8082. Manifest aktual sekarang menyertakan
`extra.expoGo.username: "rekanwicara"` dan `hostUri: "192.168.101.22:8082"`.
Backend tetap pada port 8000 dan health HTTP 200. Pengguna perlu membuka URL baru di HP;
keberhasilan membuka proyek setelah perbaikan belum dikonfirmasi di perangkat.

Reset layanan berikutnya atas permintaan pengguna: proses backend lama (8000), backend
pembanding (8001), dan Metro lama (8082) dihentikan. Backend dijalankan ulang di luar sandbox
pada 8000 dan Expo online pada 8081. Manifest kini menyertakan username `rekanwicara` serta
host `192.168.101.22:8081`. Health melalui IP LAN dan upload video sintetis ke IP LAN berhasil
(HTTP 200, prediksi kosong, inferensi 577,696 ms). Hanya port 8000/8081 yang aktif untuk proyek.
Alamat bawaan app tetap `http://192.168.101.22:8000`. Jika HP menyimpan override port 8001,
gunakan **Kembalikan ke bawaan** di Pengaturan; restart Metro tidak menghapus override di HP.
Profil, progres, dataset, Git dan token tidak direset. Upload HP setelah reset masih perlu dicoba.

## Jika upload dari HP tertahan lalu timeout

Pada uji HP, Tes koneksi berhasil tetapi upload melalui XMLHttpRequest sempat bertahan di
0% lalu timeout. Log backend belum menunjukkan POST baru yang selesai; penyebab pasti
di perangkat belum terkonfirmasi. Jalur khusus Allosaurus kini memakai `UploadTask` native
`expo-file-system` yang sudah terpasang, multipart `file`, MIME video, sesi foreground.
Rekaman diperiksa ada/tidak kosong sebelum dikirim; tidak disalin, tidak dicoba ulang otomatis.
Progres awal tidak menampilkan persentase sampai ada byte count native. Timeout membatalkan
task dan handle native dilepas pada sukses/gagal. Upload latihan/kalibrasi/dataset tetap memakai
jalur sebelumnya. Acuan API: [Expo UploadTask](https://docs.expo.dev/versions/latest/sdk/filesystem/#uploadtask).

Lakukan **menu Expo Go → Reload**, buka lagi Uji Allosaurus, lalu rekam ulang. Jika masih
gagal, laporkan teks pesan yang tampil; tidak perlu mengirim rekaman pribadi. Pesan
"Rekaman tidak dapat dibaca" menunjukkan pemeriksaan file lokal gagal sebelum upload.
Verifikasi perbaikan ini: 220 Jest (termasuk 11 tes native-upload pengganti 5 tes XHR eksperimen),
TypeScript dan kompilasi bundle iOS lolos; lint exit 0 dengan 8 warning lama.
Tes native memakai mock, bukan file fisik HP;
keberhasilan upload pada perangkat setelah perubahan masih menunggu pengguna.

## Pakai sekarang (PowerShell, dari root repo)

```powershell
& ml/.venv/Scripts/python.exe ml/tools/allosaurus_poc.py --help
& ml/.venv/Scripts/python.exe ml/tools/allosaurus_poc.py --file 'samples/mama.wav'
```

Ganti argumen contoh dengan WAV milik Anda. `samples/mama.wav` tidak disediakan oleh repo.
Input harus berekstensi `.wav` huruf kecil, WAV PCM 16-bit, mono, 16 kHz, memiliki sampel lengkap,
dan berdurasi maksimal sesuai `server/app/config/thresholds.yaml` (saat ini 4 detik).
CLI menolak format lain tanpa konversi atau pemotongan. Pengguna mengonversi secara lokal bila perlu.

Output sukses di stdout berupa satu objek JSON: `status`, `model`, `phonetic_prediction`,
`inference_ms`. Waktu hanya mencakup `recognize()`, termasuk pembacaan WAV dan ekstraksi fitur
Allosaurus; tidak mencakup import dan pemuatan model. Tiap eksekusi CLI memuat model sekali.
Prediksi kosong tetap sukses secara teknis; tidak diubah menjadi kata target atau skor latihan.
JSON memakai escape Unicode agar aman untuk terminal Windows; parser JSON memulihkan simbol IPA.

Error di stderr berupa JSON `status: "error"`, `code`, dan pesan Indonesia, dengan exit code 1.
Kode: `invalid_arguments`, `invalid_wav`, `unsupported_wav`, `empty_wav`, `audio_too_long`,
`dependency_missing`, `model_missing`, `model_error`, `inference_error`, `tool_failed`.
Tidak ada path/nama rekaman atau traceback di output yang dikelola CLI. Keluaran Python dari
library selama pemrosesan ditahan. CLI tidak menyalin, mengubah, menghapus, atau menyimpan ulang input.

## Lingkungan yang benar-benar diuji

Windows, Python **3.11.5**, Allosaurus **1.0.2**, Torch **2.15.0+cpu**, NumPy **2.4.6**,
SciPy **1.17.1**, Pydantic **2.13.2**, PyYAML **6.0.3**. Model tetap `uni2005`, CPU
(`device_id=-1`), inventaris Indonesia terkontrol dari repo, top-1 bawaan. Model memakai mode evaluasi dan
`torch.inference_mode()`. Tidak ada patch upstream atau penonaktifan pengamanan checkpoint.
Seluruh versi runtime dipin di `ml/requirements-allosaurus.txt`; `pip check` lolos.
Tidak memasang FastAPI, MediaPipe, atau Parselmouth ke venv eksperimen.

## Menyiapkan ulang

Jangan menjalankan instalasi ini dalam `server/.venv`. Pada laptop ini launcher `py` hanya
mencantumkan Python 3.12, sehingga gunakan executable Python 3.11 langsung. Di laptop lain,
sesuaikan hanya lokasi executable Python 3.11.

```powershell
& 'C:\Users\TUF GAMING\AppData\Local\Programs\Python\Python311\python.exe' -m venv ml/.venv
& ml/.venv/Scripts/python.exe -m pip install --no-cache-dir -r ml/requirements-allosaurus.txt
& ml/.venv/Scripts/python.exe -m pip check

$modelArchive = Join-Path (Resolve-Path ml/.venv) 'uni2005.tar.gz'
$modelRoot = 'ml/.venv/Lib/site-packages/allosaurus/pretrained'
Invoke-WebRequest -Uri 'https://github.com/xinjli/allosaurus/releases/download/v1.0/uni2005.tar.gz' -OutFile $modelArchive -UseBasicParsing
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $modelArchive).Hash -ne '7dc4f20802012f64ac07deb04ade263f199c839521e58eae83c99d79028fc4de') {
    throw 'Hash model berbeda; hentikan setup dan periksa sumber resmi.'
}
New-Item -ItemType Directory -Force -Path $modelRoot | Out-Null
tar -xzf $modelArchive -C $modelRoot
if ($LASTEXITCODE -ne 0) { throw 'Ekstraksi model gagal.' }
```

Model berada di dalam `ml/.venv`, yang sudah diabaikan Git. CLI memeriksa keberadaan artefak
lokal sebelum memanggil loader agar tidak memicu unduhan otomatis. Unduhan hanya bagian setup.
SHA-256 `model.pt` hasil ekstraksi:
`552751ac877abcba22481a9d022c82b22f97b0254b72bd4e312cd744ed291cbe`.
Hash dicatat dari unduhan ini, bukan checksum terpisah yang diterbitkan pembuat model.

Sumber: [paket PyPI](https://pypi.org/project/allosaurus/1.0.2/),
[repositori resmi](https://github.com/xinjli/allosaurus),
[model resmi uni2005](https://github.com/xinjli/allosaurus/releases/download/v1.0/uni2005.tar.gz),
[indeks Torch CPU](https://download.pytorch.org/whl/cpu).
Kode Allosaurus berlisensi [GPL-3.0](https://github.com/xinjli/allosaurus/blob/master/LICENSE).
Ketentuan distribusi bobot belum diverifikasi tersendiri; jangan membundel model ke submission.

## Bukti pengujian aktual

Input uji adalah nada sinus 220 Hz, satu detik, amplitudo 4000 pada PCM 16-bit/16 kHz/mono;
dibuat secara sintetis di `ml/.venv/synthetic.wav`. Tidak membaca rekaman pribadi atau `data/`.

```powershell
& ml/.venv/Scripts/python.exe ml/tools/allosaurus_poc.py --file ml/.venv/synthetic.wav
```

Output aktual (exit 0):

```json
{"status": "success", "model": "uni2005", "phonetic_prediction": "", "inference_ms": 892.545}
```

Input tidak ditemukan (exit 1):

```json
{"status": "error", "code": "invalid_wav", "message": "Berkas WAV tidak ditemukan atau tidak dapat dibaca."}
```

Uji offline mengulang CLI dengan `socket.socket.connect`, `connect_ex`, dan
`socket.create_connection` diblokir: exit 0, prediksi kosong, `inference_ms: 722.083`,
**0 upaya koneksi**. Ini pembatasan koneksi dalam proses Python, bukan pengujian firewall OS.
Import modul CLI pada interpreter backend juga berhasil tanpa mengimpor Torch atau Allosaurus.

```powershell
Push-Location server
$env:DEBUG = 'false'
$env:PYTHONDONTWRITEBYTECODE = '1'
& .venv/Scripts/python.exe -B -m pytest -q -p no:cacheprovider
& .venv/Scripts/python.exe -B -m ruff check --no-cache app tests ../ml
& .venv/Scripts/python.exe -B -m ruff format --check --no-cache app tests ../ml
Pop-Location
```

Hasil: **406 pytest lulus**, termasuk **17 tes baru**; 1 peringatan deprecation Starlette/HTTPX
yang sudah ada. Ruff check dan format check lolos (78 berkas). Override `DEBUG` hanya untuk
proses pengujian karena terminal mewarisi `DEBUG=release`; `.env` tidak diubah. Jalankan blok
pengujian dalam terminal khusus agar override lingkungan tidak memengaruhi proses kerja lain.
Hash `server/requirements.txt`, `server/.venv/pyvenv.cfg`, dan keluaran `pip freeze` backend sama
sebelum/sesudah. Tidak memasang paket atau menulis bytecode ke venv backend selama verifikasi.
Tes frontend, TypeScript, dan lint app tidak diulang karena frontend/kontrak tidak berubah.

## Batas hasil

Angka waktu di atas adalah sampel eksekusi, bukan benchmark atau bukti akurasi fonetik.
Belum menjalankan MA, BA, PA, DA, LA, MAMA, PAPA, atau BACA dari ucapan manusia.
Uji manual target tersebut memakai rekaman pengguna sendiri, lokal dan dengan persetujuan.
Hasil model tidak menjadi ground truth, penentu benar/salah, atau kesimpulan klinis.
Inventaris universal tidak membuktikan kemampuan Bahasa Indonesia maupun tuturan pengguna sasaran.
Versi kombinasi ini sudah berhasil pada laptop ini; instalasi dari nol pada laptop kedua belum diuji.
