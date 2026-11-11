# I1 — uji integrasi di HP

Status: selesai dengan keterbatasan uji di bawah; kalibrasi, latihan, sinkronisasi online dan antrean Uji Dengar berhasil
menurut pengguna. Dua puluh durasi telah dilaporkan; p90 3910 ms memenuhi target.
Uji antrean percobaan video saat internet putus tetapi LAN tetap aktif belum dilakukan.
Tidak memerlukan dataset tim.

Pengganti uji WAN pada jaringan bersama: koneksi Supabase disimulasikan gagal dengan
override environment proses Metro ke `http://127.0.0.1:1`; URL API latihan tidak berubah.
Pengguna berhasil mendapat hasil Level 1 dan melihat satu catatan menunggu dikirim.
Override kemudian dihapus dan Metro dijalankan ulang memakai konfigurasi asli dari `.env`.
Pengguna mengonfirmasi catatan otomatis terkirim setelah pemulihan, sebelum menekan
Sinkronkan sekarang. Simulasi antrean percobaan video lulus; ini bukan uji putus WAN sungguhan.

Persiapan laptop terverifikasi: login Expo CLI berhasil, server mengembalikan
`mock_mode:false`, manifest iOS dan bundle JavaScript iOS berhasil diambil (HTTP 200).
Keberhasilan bundle belum membuktikan app berjalan di iPhone.

Hambatan saat uji: kalibrasi rest tertahan 0%; Tes koneksi app dan health dari Safari
kemudian timeout, sementara health dari laptop tetap berhasil. Aturan firewall
`CerminWicara-API-LAN-8000` berhasil ditambahkan lewat UAC Administrator: inbound TCP 8000,
sumber LocalSubnet, profil Public/Private. Uji ulang tetap timeout menurut pengguna.
Server kemudian dijalankan ulang di luar sandbox agen (seperti Metro); health dari laptop
tetap HTTP 200 dengan `mock_mode:false`. Setelah restart di luar sandbox, pengguna
mengonfirmasi Tes koneksi berhasil dan kalibrasi rest lanjut ke a. Pengguna kemudian
mengonfirmasi kalibrasi lengkap selesai; sebelumnya sempat diminta mengulang bunyi
tanpa rincian flag kualitas. Kemampuan mengulang langkah sampai selesai teramati.

Hambatan sinkronisasi yang sudah teratasi: awalnya `Anonymous sign-ins are disabled`, lalu setelah
pengguna mengaktifkannya muncul `profiles: Could not find the table public.profiles in the schema cache`.
Pengguna menerapkan `docs/supabase/schema.sql` pada proyek yang dipakai app dan menguji ulang
Sinkronkan sekarang; RLS tetap dipertahankan.

Setelah penerapan skema, pengguna mengonfirmasi app menampilkan
`Semua catatan sudah tersimpan online`. Sinkronisasi online lulus berdasarkan laporan app;
isi tabel cloud belum diperiksa langsung oleh agen. Pengguna juga mengonfirmasi satu
Uji Dengar menambah antrean saat mode pesawat/Wi-Fi mati, kemudian terkirim setelah
internet kembali. Uji antrean percobaan video dengan LAN tetap aktif masih menunggu.

## Persiapan

- Server: `MOCK_MODE=false`, `DATASET_MODE=false`, `DEBUG=false`, `SCORER_MODE=rules`.
- Gunakan Python dari `server/.venv`. Bila terminal agen mewarisi `DEBUG=release`,
  atur `$env:DEBUG='false'` hanya di terminal server sebelum memulai uvicorn.
- Server: `.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log`.
- App: isi URL LAN laptop di `app/.env`, lalu `npx.cmd expo start -c --lan`.
- Saat persiapan ini, IP Wi-Fi laptop adalah `192.168.18.94`; cek ulang setelah pindah jaringan.
- Buka `exp://192.168.18.94:8081` di browser HP lalu pilih Expo Go; Android juga bisa
  memakai Enter URL manually di Expo Go. Gunakan akun Expo yang sama dengan CLI bila diminta.
- Browser HP harus membuka `/v1/health` dan melihat `mock_mode:false`.
- Supabase: Anonymous Sign-Ins aktif, `docs/supabase/schema.sql` diterapkan, konfigurasi app terisi.
- Dataset dan debug tetap nonaktif. Jangan mengirim rekaman atau token ke chat.

## Skenario (pengguna menjalankan, agen mencatat hasil)

| Langkah | Yang harus terbukti | Hasil |
|---|---|---|
| Browser HP ke health | Terhubung ke server sungguhan | Lulus menurut laporan pengguna |
| Expo Go | App terbuka; izin kamera dan mikrofon dapat diberikan | App dan rekaman kalibrasi/latihan berhasil menurut pengguna |
| Onboarding pada profil baru | Dua persetujuan dan PIN 4 angka; kembali ke app tidak mengulang onboarding | Belum diuji |
| Kalibrasi | Rest, a, i, u tersimpan; langkah ditolak bisa diulang | Lulus menurut pengguna setelah mengulang langkah |
| Mode Pendamping | PIN salah ditolak, PIN benar masuk; centang Buka semua materi | Pengguna berhasil membuka materi; penolakan PIN salah belum dikonfirmasi |
| l0_hold_a | Rekaman 4 detik; grafik suara; indikator bibir tidak relevan | Lima percobaan dilaporkan lulus; detail visual belum dikonfirmasi |
| l1_a | Dua indikator, petunjuk, peta vokal dan cermin bibir sesuai hasil | Empat lulus, satu retry dengan petunjuk ruangan terlalu bising; detail visual belum dikonfirmasi |
| l2_ma | Hasil tampil tanpa crash | Lulus menurut pengguna |
| l3_mama | Coba benar dan sengaja berbeda; catat hasil apa adanya | Empat lulus; satu menampilkan percobaan tercatat (pengurangan umpan balik sesuai aturan B3); perbandingan salah/benar belum dirinci |
| Rekaman tidak layak | Meminta ulang dan tidak menambah jumlah percobaan | Retry bising teramati di L1; jumlah percobaan sesudah retry belum diperiksa |
| Ulangi dan kembali | Tidak crash; rekaman latihan tidak tersisa | Tombol berhasil menurut pengguna; penghapusan di HP belum diperiksa manual |
| Mode Pendamping | Ringkasan, Uji Dengar dan bagikan laporan teks berfungsi | Belum diuji |
| Contoh video tanpa berkas | Teks + ilustrasi tetap bisa dipakai | Belum diuji |

Untuk menguji onboarding gunakan profil/perangkat uji baru. Jangan menghapus progres yang ingin disimpan.
Video model diuji otomatis memakai media sintetis di direktori sementara; agen tidak membuka video di dataset.
Kesalahan penilaian yang sudah diketahui tetap dilaporkan, bukan disembunyikan dengan mock.

## Sinkronisasi dan putus internet

Uji awal yang tidak memerlukan LAN: aktifkan mode pesawat dan matikan Wi-Fi,
lakukan satu Uji Dengar di Mode Pendamping, pastikan jumlah catatan menunggu bertambah.
Sambungkan kembali Wi-Fi/internet dan pastikan antrean terkirim. Ini memeriksa antrean
`listen_checks`; tidak menggantikan pengujian percobaan video offline di LAN di bawah.

1. Dengan internet tersambung, lakukan satu percobaan. Periksa baris milik pengguna uji pada
   `profiles`, `attempts`, `progress`; Uji Dengar menambah `listen_checks`.
2. Catat jumlah baris `attempts` pengguna uji sebelum putus internet; tabel tidak harus kosong.
3. Putus internet sambil mempertahankan LAN HP ke server laptop. Mode pesawat dengan Wi-Fi mati
   tidak cocok: analisis video memerlukan server. Jangan beralih ke jaringan seluler saat menguji.
4. Lakukan percobaan baru. Hasil harus tampil dari server LAN, antrean lokal bertambah,
   jumlah baris cloud belum berubah.
5. Sambungkan internet. Saat app tetap aktif, baris baru harus muncul dalam sekitar 30 detik;
   tombol Sinkronkan sekarang juga dapat dicoba.
6. Ulangi sinkron: UUID yang sama tidak membuat baris ganda. Tutup-buka app untuk memeriksa progres lokal.

## Waktu sampai hasil tampil

Ukur **20 percobaan** (misalnya masing-masing 5 untuk l0_hold_a, l1_a, l2_ma, l3_mama).
Mulai saat rekaman selesai, berhenti saat hasil pertama kali terlihat. Sertakan waktu upload;
`processing_ms` API hanya waktu proses server dan tidak menggantikan pengukuran ini.
Catat item, nomor percobaan, status, dan durasi milidetik saja; tanpa nama atau rekaman.
Catat retry/error, jangan membuang percobaan lambat. Bila hasil gagal tampil, tulis gagal dan ulangi
setelah penyebab ditangani; jangan menyatakan target tercapai dengan sampel kurang dari 20.

| Item | Durasi ms (5 percobaan) | Retry/error |
|---|---|---|
| l0_hold_a | 14500, 3300, 3030, 3910, 3230 | Tidak ada; semuanya dilaporkan lulus |
| l1_a | 2080, 2710, 2210, 1740, 2040 | Percobaan ke-4 retry: ruangan terlalu bising |
| l2_ma | 4060, 3300, 1940, 1890, 1950 | Tidak ada; semuanya dilaporkan lulus |
| l3_mama | 1910, 2190, 2590, 2560, 2110 | Percobaan ke-5 tercatat, hasil ditampilkan tiap dua percobaan |

Urutkan 20 durasi menaik: p50 = rata-rata nilai ke-10 dan ke-11;
p90 = nilai ke-18 (nearest rank). Target p90 ≤ 5000 ms.
Pengukuran stopwatch manual memiliki galat reaksi; catat metode pengukuran bersama hasil.

Hasil dari 20 durasi pengguna (manual, mengikuti instruksi rekaman selesai → hasil/status tampil):
**p50 2385 ms; p90 nearest rank 3910 ms; maksimum 14500 ms; 19/20 ≤ 5000 ms.**
Semua sampel disertakan, termasuk retry dan layar percobaan tercatat. Target p90 tercapai;
percobaan 14,5 s tetap menjadi keterbatasan yang belum ditelusuri penyebabnya.
Ada 18 percobaan yang eksplisit dilaporkan lulus, satu retry kualitas, dan satu hasil
yang tidak ditampilkan karena aturan pengurangan umpan balik. Status terakhir tersebut
bukan bukti lulus/gagal penilaian. Data ini bukan evaluasi akurasi mesin terhadap label manusia.

## Pemeriksaan otomatis

Contoh hanya sintetis, dihasilkan dari serializer server dan diperiksa dengan `satisfies` terhadap
`app/src/api/types.ts`. Ini menguji kompatibilitas contoh; bukan validasi runtime setiap respons.

```powershell
# Dari server/, setelah mengatur DEBUG proses bila diperlukan
.venv/Scripts/python.exe -m scripts.export_contract
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m ruff check app tests scripts/export_contract.py ../ml
.venv/Scripts/python.exe -m ruff format --check app tests scripts/export_contract.py ../ml
# Dari app/
npm.cmd test -- --runInBand
npx.cmd tsc --noEmit
npx.cmd expo lint
npx.cmd --yes expo-doctor@1.21.6
```

## Penutupan I1

Alur HP, kalibrasi, latihan L0–3, sinkronisasi Supabase, antrean Uji Dengar saat mode pesawat,
pemulihan otomatis antrean latihan setelah simulasi koneksi Supabase gagal, dan target p90
telah diuji berdasarkan laporan pengguna. Pemeriksaan otomatis: 383 pytest, 166 Jest,
TypeScript lolos, Ruff lolos, Expo Doctor 20/20; lint app exit 0 dengan 8 warning lama.

Keterbatasan: tidak memutus WAN jaringan bersama; pemulihan percobaan video diuji lewat
simulasi kegagalan koneksi Supabase. Pengukuran durasi manual, satu perangkat iPhone;
respons 14,5 s belum ditelusuri. Agen tidak memeriksa isi tabel cloud atau media secara langsung.
Rincian visual, PIN salah, bagikan laporan dan pemeriksaan penghapusan file di HP belum
dikonfirmasi manual (lihat tabel). Tidak ada klaim akurasi baru dari pengujian ini.
Fase berikutnya B4, dengan rencana dan persetujuan terpisah. Jangan push.
