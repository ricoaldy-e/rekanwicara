# Rekan Wicara — aplikasi Expo

Aplikasi latihan pelafalan dengan indikator Bibir dan Suara. Berjalan di Expo Go SDK 58 (Node 22.13 atau lebih baru).
Server Python harus berjalan di laptop dalam jaringan lokal yang sama dengan HP.
Panduan instalasi lengkap, variabel lingkungan, dan akun demonstrasi ada di [README root](../README.md).

## Menjalankan

```powershell
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npx.cmd expo login --no-browser
npx.cmd expo start -c --lan --go
```

Isi `.env` mengikuti [.env.example](.env.example). Jalankan Metro dengan `-c` setiap kali `.env` berubah.
Masuk ke akun Expo yang sama di CLI dan Expo Go, lalu pindai QR atau buka `exp://<IP-laptop>:8081`. Izinkan jaringan
lokal, kamera, dan mikrofon. Windows Firewall perlu izin jaringan Private untuk port 8000 dan 8081; jangan mematikannya.

## Pengaturan operator

Bagian operator di tab Pengaturan menampilkan alamat server dan tes koneksi. Setelah pindah jaringan, IP laptop bisa
berubah: perbarui `EXPO_PUBLIC_API_URL` atau pilih Kembalikan ke bawaan bila alamat pernah diganti di sini.

## Pengujian

```powershell
npm.cmd test
npm.cmd run typecheck
npx.cmd expo lint
```

## Ikon dan splash

Logo dan ikon berasal dari rancangan Figma tim. `app.json` memakai `assets/images/logo-mark.png` untuk splash dan ikon
adaptif Android. Splash penuh seperti aplikasi mandiri baru terlihat pada build rilis; Expo Go tidak menampilkannya
sepenuhnya.

## Belum dilakukan

- Pengujian di perangkat untuk skala teks 200%, layar 360 dp, VoiceOver/TalkBack, dan izin yang ditolak.
- Build APK atau IPA. Target saat ini Expo Go.

Catatan keputusan dan status tiap fase ada di [../docs/PROGRESS.md](../docs/PROGRESS.md).
