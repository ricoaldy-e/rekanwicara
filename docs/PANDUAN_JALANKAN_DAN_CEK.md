# Panduan menjalankan dan memeriksa Rekan Wicara (alur v2)

Untuk Rico. Cabang `flow-v2`. Semua perintah PowerShell dari akar repo. Bagian A–C untuk menjalankan, D untuk memeriksa di HP.
Yang belum pernah dicoba di HP ditandai di `docs/PROGRESS.md` ("Belum teruji"); panduan ini cara mencobanya.

## A. Pilih konfigurasi (`app/.env`)

`app/.env` tidak di-commit. Setelah mengubahnya, **jalankan Metro dengan `-c`** (hapus cache), kalau tidak nilai lama tetap terpakai.

| Tujuan | `EXPO_PUBLIC_USE_MOCK` | `EXPO_PUBLIC_ANALYZE_API` | Supabase URL/kunci | Hasil |
|---|---|---|---|---|
| **Demo malam ini (disarankan)** | `true` | `v1` | boleh kosong | Katalog, akun, dan kata Pendamping tiruan; rekaman dinilai server lokal (`/v1/analyze`). Sinkron online **mati**. |
| Uji alur tanpa server | `true` | `mock` | kosong | Semua tiruan; hasil berlabel "Hasil contoh" dan tidak disimpan ke progres. |
| Seperti versi lama | `false` | `v1` | kosong | Tidak ada akun, tidak ada kata Pendamping; latihan L1 jalan; Pilih kata butuh `/v2` (belum ada) sehingga kosong/galat. |
| Akun sungguhan | `false` | `v1` | terisi + login Email aktif | Masuk/Daftar lewat Supabase; katalog tetap butuh `/v2` (belum ada). |

Isi minimum untuk demo:

```dotenv
EXPO_PUBLIC_API_URL=http://<IP-laptop>:8000
EXPO_PUBLIC_USE_MOCK=true
EXPO_PUBLIC_ANALYZE_API=v1
EXPO_PUBLIC_DATASET_MODE=false
```

## B. Jalankan server (terminal 1)

```powershell
cd server
.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
```

Persiapan awal (venv, model, `server/.env` dengan `MOCK_MODE=false`) ada di README bagian "Menyiapkan server".
Cek dari browser HP: `http://<IP-laptop>:8000/v1/health` harus menampilkan JSON dengan `"mock_mode":false`. IP laptop: `ipconfig` (IPv4 Wi-Fi).
Windows Firewall perlu mengizinkan port 8000 dan 8081 untuk jaringan Private (jangan dimatikan).

## C. Jalankan app (terminal 2)

```powershell
cd app
npm.cmd ci          # sekali saja (atau setelah package.json berubah)
npx.cmd expo start -c --lan --go
```

Buka Expo Go di HP (jaringan Wi-Fi sama dengan laptop), pindai QR. Izinkan kamera, mikrofon, dan jaringan lokal.
Pertama kali: **hapus data Expo Go** untuk app ini (atau pasang ulang) supaya alur dimulai dari awal.

Pemeriksaan kode sebelum ke HP (di `app/`):

```powershell
npm.cmd test        # harus: 45 suite, 566 tes lulus
npm.cmd run typecheck
```

## D. Pemeriksaan di HP (urut)

Akun tiruan (hanya saat `USE_MOCK=true`; sandi apa pun diterima): `salah@contoh.id` → "Email atau kata sandi salah."; `dipakai@contoh.id` saat daftar → "Email ini sudah terdaftar."; `cek@contoh.id` saat daftar → layar Cek email; `mati@contoh.id` → banner tanpa koneksi.

1. **Awal:** Masuk → Daftar (username, email, sandi 8+ huruf+angka, ulangi, centang privasi) → Buat PIN (`1234` ditolak; `2580` dua kali) → onboarding 2 langkah → kalibrasi → Beranda. Tutup paksa Expo Go lalu buka lagi: langsung ke Beranda.
2. **Beranda:** dua kartu ("Level 1" dan "Level 2 dan 3") dengan "x dari N sesuai"; bar bawah Latihan / Pendamping / Pengaturan terlihat.
3. **Level 1 A:** rekam → hasil Bibir + Suara (tiga status) + peta vokal dan cermin bibir. Bar **hilang** di sesi latihan. **A panjang:** hanya Suara + grafik kekerasan.
4. **Retry:** keluar bingkai / tutup mulut → pesan alasan + "Rekam ulang", tanpa lencana, tidak mengubah "x dari N".
5. **Pilih kata → PAPA:** PA, PA, PAPA; "Berikutnya" di PA pertama. Latih PA → hasil dua status, tanpa grafik; kembali → kedua PA berstatus sama dan "Berikutnya" pindah ke PAPA. Kartu kata menampilkan "Level 2: 1 dari 1 sesuai · Level 3: belum". MINUM langsung Level 3.
6. **Keluar latihan:** saat "Merekam…" ketuk "Keluar latihan" → dialog; Lanjut = rekaman berlanjut. Coba tombol kembali Android.
7. **Pendamping:** minta PIN; salah 5 kali → terkunci 30 detik (hitung mundur), tutup paksa app → masih terkunci. Benar → "Kata saya". Tambah kata "SUSU" dengan suku kata SU, SU (video dari galeri, instruksi, centang persetujuan) → snackbar → muncul di Pilih kata. Ubah, hapus (dialog menyebut nama + jumlah suku kata). Kata bawaan tanpa tombol ubah/hapus. Video > 30 detik ditolak.
8. **Lupa PIN?** (hanya terlihat bila ada akun): di layar PIN → kata sandi akun → buat PIN baru.
9. **Pengaturan:** Getar mati → rekam → tidak bergetar. Ganti PIN (PIN lama ditolak sesudahnya). Keluar → konfirmasi → layar Masuk; masuk lagi → Beranda tanpa Buat PIN.
10. **Mode pesawat di Beranda** (dengan `USE_MOCK=false` dan `/v2` tak terjangkau): pesan galat + "Coba lagi", bukan layar kosong. Dengan `USE_MOCK=true` katalog tetap tampil; cek koneksi server lewat Pengaturan → "Tes koneksi".
11. **Aksesibilitas:** skala teks 200% (kartu, bar bawah, formulir tidak terpotong), TalkBack di Beranda dan Hasil (lencana dibacakan "Bibir: Sesuai"; titik PIN "2 dari 4 angka terisi", digit tidak dibacakan), perangkat dibisukan.

Catat hasil tiap nomor (lulus / gagal + layar) dan kirim ke saya untuk diperbaiki sebelum kunci fitur.

## E. Bila ada masalah

| Gejala | Yang dicek |
|---|---|
| App tidak menemukan server | IP laptop, Wi-Fi sama, firewall port 8000/8081, `/v1/health` dari browser HP |
| Perubahan `.env` tidak berpengaruh | `npx.cmd expo start -c` (hapus cache) |
| Beranda galat "Tidak dapat terhubung" dengan `USE_MOCK=false` | Server lokal belum punya `/v2/catalog`; pakai `USE_MOCK=true` |
| Tidak bisa Masuk dengan `USE_MOCK=false` | Supabase URL + kunci anon terisi dan login Email aktif; `schema.sql` sudah dijalankan |
| Kata Pendamping "belum tersedia" | Hanya ada di `USE_MOCK=true` (tabel/bucket Supabase belum ada) |
| Bunyi O hasilnya aneh | `l1_o` belum disetel di server (`active:false`); abaikan untuk demo |
| `typecheck` mengeluh rute | `npx.cmd expo start` sekali di `app/` untuk membuat ulang `.expo/types` |

## F. Dengan BE (temanmu)

Server `/v2` belum ada. Bila sudah, ganti dulu satu per satu: `EXPO_PUBLIC_USE_MOCK=false` (katalog dan kata), lalu `EXPO_PUBLIC_ANALYZE_API=v2`. Minta contoh JSON nyata dari `/v2/catalog`, `/v2/words/{id}`, `/v2/analyze` dan cocokkan dengan `docs/kontrak-fe-final.md` §4–§5 sebelum menyalakannya. Daftar konfirmasi untuk BE ada di bagian "Alur v2" `docs/PROGRESS.md`.
