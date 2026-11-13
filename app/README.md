# Cermin Wicara — aplikasi Expo

Latihan pelafalan melalui indikator bibir dan suara. Gunakan Node ≥22.13 dan Expo Go SDK 58.
Server Python harus berjalan di laptop dalam jaringan lokal yang bisa dijangkau HP.

## Menjalankan

```powershell
npm.cmd ci
# Salin .env.example ke .env hanya bila .env belum ada.
npx.cmd expo login --no-browser
npx.cmd expo start -c --lan --go
```

Isi `EXPO_PUBLIC_API_URL` dengan `http://<IP-laptop>:8000`. Untuk Supabase, isi URL dan
anon/publishable key di `.env`, aktifkan Email/password, dan gunakan schema existing
`../docs/supabase/schema.sql`. Logic sesi/PIN/sinkronisasi kini mengikuti akun pendamping;
login anonim otomatis dihentikan. UI login belum ditambahkan, sehingga sesi akun perlu
disediakan melalui logic sebelum onboarding PIN. Lihat [panduan Auth](../docs/supabase/AUTH.md).
`.env` tidak di-commit. Jangan menaruh service-role key pada app.

Di iPhone, login Expo Go dengan akun yang sama dengan CLI. Buka alamat
`exp://<IP-laptop>:8081` dari Safari dan pilih Expo Go. Pastikan izin jaringan lokal,
kamera dan mikrofon diberikan. Server dan Metro harus dijalankan di lingkungan yang
mengizinkan koneksi LAN; proses dalam sandbox agen sempat tidak dapat diakses dari HP.
Windows Firewall memerlukan izin LAN untuk port 8000 dan 8081, bukan mematikan firewall.

## Pengaturan operator

Tekan lama judul **Misi hari ini** selama 2 detik untuk membuka URL server dan tes koneksi.
Teks sukses atau gagal muncul di layar. Mode Pendamping memakai PIN yang dibuat saat onboarding.
Checkbox **Buka semua materi** hanya membuka materi; tidak membuat materi lulus.

### Profil demo

Di pengaturan tersembunyi, centang **Gunakan profil demo**. Profil contoh memiliki a dan ma
yang lulus melalui aturan kemajuan asli. Latihan tetap dianalisis server; kalibrasi tidak
dipalsukan. Penanda Mode demo tampil pada header dan beranda.

Profil demo hanya di memori: tidak menimpa profil/PIN pribadi, tidak disimpan di AsyncStorage,
dan semua jalur sinkronisasi hasil demo diblokir. Laporan yang dibagikan diberi label data contoh.
Matikan checkbox atau mulai ulang app untuk kembali ke profil pribadi. Perubahan progres demo
akan hilang. Pergantian profil ditahan ketika sinkronisasi pribadi masih berlangsung.

## Ikon dan splash

Lima PNG orisinal menggambarkan cermin dan bibir dengan warna utama aplikasi, tanpa aset luar.
`app.json` memakai jalur aset yang sudah ada, sehingga tidak perlu konfigurasi tambahan.
Untuk menghasilkan ulang, dari root repo gunakan:

```powershell
server/.venv/Scripts/python.exe app/scripts/build_brand_assets.py
```

Skrip memakai Pillow yang sudah terpasang di lingkungan server dan memeriksa ukuran/alpha.
Expo Go tidak sepenuhnya menampilkan splash seperti aplikasi mandiri; pengujian splash akhir
memerlukan release build ([dokumentasi Expo](https://docs.expo.dev/versions/latest/sdk/splash-screen/)).

## Verifikasi

Status B4 untuk target Expo Go: selesai. 174 Jest dan TypeScript lolos, lint exit 0 dengan 8 warning lama.
Setelah pembaruan 11 patch paket Expo yang disetujui pengguna (termasuk expo 58.0.24),
Expo Doctor lolos 20/20. Package manifest dan lockfile sebelumnya dicadangkan di Temp.
npm melaporkan 28 advisori dependency (1 rendah, 27 sedang); tidak menjalankan audit fix.
Pengguna mengonfirmasi layar Tentang tampil baik di iPhone, tanda/progres demo benar,
dan jumlah percobaan pribadi kembali sama setelah demo dimatikan.

Saat uji B4, IP Wi-Fi laptop berubah dari `192.168.18.94` menjadi `192.168.101.22`.
Tautan Expo dan URL API harus mengikuti IP baru. Jika pernah menyimpan pengganti URL
di pengaturan tersembunyi, perbarui atau pilih Kembalikan ke bawaan setelah pindah jaringan.

```powershell
npm.cmd test -- --runInBand
npx.cmd tsc --noEmit
npx.cmd expo lint
npx.cmd --yes expo-doctor@1.21.6
```

Tes demo memeriksa progres contoh memakai aturan kemajuan asli, tidak ada penyimpanan atau
pengiriman demo, perlindungan PIN, pemulihan profil pribadi dan batas pergantian saat sinkronisasi.

## Daftar periksa demo

- [x] Alur dasar kalibrasi dan latihan L0–3 di iPhone (I1, laporan pengguna).
- [x] Supabase online dan pemulihan antrean (I1; kegagalan koneksi video disimulasikan).
- [x] Fixture kontrak server → TypeScript dan Jest.
- [x] Layar Tentang memuat posisi produk, keterbatasan, privasi dan versi; tes otomatis.
- [x] Isolasi profil demo dan pemulihan profil pribadi; tes otomatis.
- [x] Feedback sinkronisasi berlangsung dan waktu sukses terakhir; tes otomatis.
- [x] Label tombol panjang dapat membungkus, tombol nonaktif lebih terbaca; status tetap ikon + teks + warna.
- [x] Kontras pasangan teks utama/status dihitung: minimum 6,57:1; teks tombol nonaktif 8,62:1.
- [x] Ikon/splash orisinal dibuat, dimensi dan transparansi diperiksa.
- [x] Uji layar Tentang dan profil demo di iPhone setelah perubahan B4, termasuk angka percobaan pribadi setelah keluar demo (laporan pengguna).

Pemeriksaan tambahan yang belum dilakukan: teks besar/VoiceOver penuh dan izin ditolak pada
perangkat, tampilan Android/tablet, serta splash pada release build. Tes komponen tidak
menggantikan pemeriksaan ini. Splash release dan APK berada di luar target Expo Go saat ini.

Untuk demo, gunakan materi a dan mama. Laporkan hasil sebagai perkiraan latihan; status kata
pada evaluasi kecil tim masih 55%. Latensi I1 p90 3,91 s, dengan satu respons 14,5 s;
rincian di `../docs/I1_CHECKLIST.md` dan `../docs/EVAL_REPORT.md`.

## APK Android

Belum disiapkan: kebutuhan APK belum dikonfirmasi, target uji saat ini Expo Go di iPhone.
Jika panitia memerlukan APK, konfirmasi dahulu; perlu akun EAS, profil preview dan pengujian
pada Android. Jangan menyatakan APK atau splash native sudah diuji dari hasil Expo Go.
