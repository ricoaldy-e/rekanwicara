# Pemeriksaan submission — fase F

Tanggal: 11 November 2026. Kunci fitur dilakukan lebih awal atas persetujuan pengguna.
Snapshot awal: `main`, tag `v1.0-submission` pada `1c930f9`. Freeze kemudian dibuka
atas persetujuan pengguna untuk F-fix1–F-fix3 (12 November); tag lama tidak dipindahkan.
Dokumen ini mencatat pemeriksaan repo; pengiriman ke panitia belum dilakukan.

## Pembaruan F-fix3 — 12 November 2026

Bila calon inti macet, sesi otomatis memilih materi terbuka yang tidak macet satu level
lebih rendah, lalu materi lain selevel, mengikuti urutan konten. Materi macet juga
dikecualikan dari pemanasan dan tantangan. Tanpa pengganti, latihan inti ditiadakan;
beranda memberi petunjuk membuka Mode Pendamping, tanpa klaim sesi selesai. Riwayat,
kelulusan, kunci level, ambang macet dan saran konsultasi yang sudah ada tidak diubah.
Materi tetap dapat dipilih manual.

Sepuluh tes baru memeriksa pilihan alternatif, urutan yang konsisten, penolakan calon
macet/terkunci, pemanasan/tantangan, keadaan tanpa alternatif dengan/tanpa pemanasan,
dan sesi pendek yang penuh ulasan. Sembilan reproduksi gagal pada kode lama sebelum
perbaikan. Tes juga memastikan planner tidak mengubah riwayat atau progres.
Hasil terbaru: **194 Jest, 18 suite**, TypeScript lolos, lint exit 0 dengan 0 error dan
8 warning lama. Tes F-fix1/F-fix2 tetap lulus. Server/ML, Doctor dan audit dependency
tidak diulang karena server, konfigurasi dan dependency tidak berubah.

Belum memeriksa tampilan pengalihan di HP atau efektivitasnya bagi pengguna sasaran.
Batas privasi native tanpa URI dari F-fix2 masih berlaku. Tidak membaca dataset,
melakukan push atau mengubah tag lama. Tag `v1.0-submission` tetap `1c930f9`, belum
memuat F-fix1–F-fix3; dua panduan staged pengguna tetap di luar commit perbaikan.

## Pembaruan F-fix2 — 12 November 2026

RecordPanel menghapus file ber-URI yang dikembalikan kamera setelah komponen ditutup,
tanpa memanggil onRecorded, getaran selesai, atau memperbarui tampilan. Pemakai komponen
adalah latihan, kalibrasi dan dua layar dataset. Hasil saat masih aktif tetap diserahkan
sekali ke pemanggil, tanpa dihapus sebelum upload/preview.

Lima tes komponen baru memakai kamera/haptics/operasi berkas sintetis dan timer terkontrol:
hasil terlambat, hasil normal, pembatalan hitung mundur, penolakan promise terlambat,
serta hasil terlambat saat stop kamera melempar error. Timer bersih setelah pembatalan;
callback dan getar selesai tidak dijalankan untuk hasil terlambat. Dua tes penghapusan
gagal pada kode lama lalu lulus setelah perbaikan.

Hasil terbaru: **184 Jest, 18 suite**, TypeScript lolos, lint exit 0 dengan 0 error dan
8 warning lama; lima tes F-fix1 tetap lulus. Server/ML, Doctor dan audit dependency tidak
diulang karena server, dependency dan konfigurasi tidak berubah. Tidak membaca dataset,
membersihkan cache lama, mengubah tag, menambah dependency, atau push.

Batas penting: Expo iOS bisa menolak promise saat kamera ditutup tanpa mengembalikan URI.
Tes rejection hanya membuktikan penanganan promise dan tidak adanya callback; **bukan bukti
file fisik terhapus**. Penghapusan cache iPhone/Android belum diperiksa langsung. Jangan
menyatakan seluruh privasi terpenuhi. Tag `v1.0-submission` masih snapshot lama `1c930f9`,
tanpa F-fix1/F-fix2; dua panduan staged pengguna tidak dimasukkan ke commit perbaikan.

## Pembaruan F-fix1 — 12 November 2026

Masalah 1 audit: callback kalibrasi menghapus URI state dari render lama. Penghapusan
sekarang menerima URI file kiriman secara eksplisit. Lima tes regresi baru memakai
komponen kalibrasi dan hook upload asli dengan kamera/API/operasi berkas sintetis:
sukses, kualitas retry, gagal jaringan, kirim ulang sukses, dan Rekam ulang.
Dua tes penghapusan gagal pada kode lama (operasi delete nol), lalu seluruhnya lulus
setelah perbaikan. File tetap dipertahankan ketika pengiriman gagal.

Hasil setelah perbaikan: **179 Jest, 17 suite**, TypeScript lolos, lint exit 0 dengan
0 error dan 8 warning lama. Server/ML, Doctor dan audit dependency di bawah adalah
hasil F sebelumnya; tidak diulang karena server, dependency dan konfigurasi tidak berubah.
Saat F-fix1, masalah 2 masih terbuka; perkembangan berikutnya ada pada bagian F-fix2 di atas.
Tidak menguji penghapusan fisik di iPhone, membersihkan cache lama, atau membaca dataset.

Tag `v1.0-submission` **belum mencakup perbaikan ini**. Jangan menyatakan seluruh
persyaratan privasi sudah terpenuhi atau tag lama sudah diperbaiki. Dua panduan staged
milik pengguna tetap di luar commit perbaikan; tidak ada push atau tag pengganti dibuat.

## Hasil nyata

| Pemeriksaan | Hasil |
|---|---|
| Python venv | 3.11.5 |
| Node | 24.11.0 |
| FFmpeg dan ffprobe | tersedia di PATH, build N-119465 (2025-05-13) |
| `pytest -q` (server dan logika ML) | 389 lulus, 0 skip, 1 peringatan deprecation Starlette/HTTPX |
| `ruff check app tests ../ml` | lolos |
| `ruff format --check app tests ../ml` | 76 berkas sesuai |
| `npm test -- --runInBand` | 174 lulus, 16 suite |
| `tsc --noEmit` | lolos |
| `expo lint` | exit 0, 0 error, 8 warning lama |
| `expo-doctor@1.21.6` | 20/20 |
| `npm audit --json` (baca-saja) | 28 advisori: 1 rendah, 27 sedang, 0 tinggi/kritis |
| Health runtime lokal | status ok, mock_mode false, engine_version 0.1.0 |

Warning lint lama berkaitan refs/effect pada dataset, settings, RecordPanel dan content;
tidak dinonaktifkan untuk fase F. Dampak advisori npm belum ditelaah satu per satu;
tidak menjalankan audit fix atau menambah dependency. Override shell `DEBUG=release`
dihilangkan hanya untuk proses tes agar konfigurasi server bisa dimuat dengan benar.
Versi FFmpeg evaluasi A6 di laptop sebelumnya berbeda; evaluasi A6 tidak dijalankan ulang.

## Checklist repo

- [x] README root mencakup deskripsi, arsitektur, setup server/model/app, lingkungan,
  Supabase opsional, demo, tim serta evaluasi dan batas produk.
- [x] Status fase dan serah terima diselaraskan di PROGRESS, CONTEXT dan NEXT_STEPS.
- [x] THIRD_PARTY memuat dependency langsung Python/JS dan sumber lisensi. Tiga model
  card resmi komponen Face Landmarker menyatakan Apache-2.0. Bundle unduhan tidak dibundel.
- [x] Daftar berkas Git saat ini dan nama berkas seluruh riwayat/ref diperiksa: tidak
  menemukan `.env` nyata, root `data/`, rekaman mp4/mov atau model task/joblib/pt.
- [x] Tidak ada blob terpantau pada HEAD yang melebihi 5 MB.
- [x] Pemindaian pola pada teks terlacak saat ini tidak menemukan private key, token
  GitHub, AWS access key atau JWT. Isi blob historis tidak dipindai untuk semua rahasia.
- [x] Semua lokasi `print`, logger dan console di kode server/ML/app ditinjau. Log
  request memakai templat rute, status/durasi dan jenis exception. CLI dataset/evaluasi
  tidak mencetak nama/path rekaman; laporan rinci tetap lokal, error tak terduga aman.
  Skrip unduh model mencetak path **model**, bukan rekaman.
- [x] Enam tes privasi CLI baru memakai nama sintetis dan folder temporer, tanpa dataset.
- [x] Pemindaian istilah terlarang di UI/output ditinjau bersama tes: sisa kecocokan
  berupa identifier `normalize*` dan daftar kata yang ditolak validator, bukan teks produk.
- [x] Kontrak API, dependency runtime dan ambang tidak diubah di F.

Pemindaian di atas dibatasi pola dan berkas terlacak; ini bukan audit keamanan menyeluruh
atau jaminan seluruh jenis rahasia terdeteksi. Tidak membaca, memutar, menyalin atau
mengunggah isi folder `data/`. Tes tidak membutuhkan dataset teman.

## Yang dikumpulkan

Gunakan **berkas terlacak pada tag `v1.0-submission`**, termasuk:

- `app/`: source, tes/fixture sintetis, aset orisinal, manifest, package/lockfile,
  `.env.example`, README dan generator aset.
- `server/`: source, tes, requirements, `.env.example`, skrip unduh model/kontrak dan README.
- `ml/`: alat dataset, plot, penyetelan/evaluasi (bukan hasil/rekaman lokal).
- `docs/`: SPEC, PROGRESS, NEXT_STEPS, EVAL_REPORT, MODEL_CARD, THIRD_PARTY,
  I1_CHECKLIST, checklist ini, dan `supabase/schema.sql`.
- README root, LICENSE, AGENTS, CLAUDE, CONTEXT serta konfigurasi Git yang terlacak.

Tidak disertakan: `.env`, `data/`, model unduhan, venv, node_modules, cache, binary FFmpeg,
atau panduan lokal pengguna yang belum terlacak. Tidak ada APK yang sudah dibangun dan
tidak ada pengiriman/push otomatis. Tim perlu memastikan format artefak yang diminta panitia.

## Bukti manual dan batas penggunaan

I1: onboarding/kalibrasi, latihan L0–3 dan tombol hasil berhasil menurut pengguna di iPhone.
Supabase online dan antrean Uji Dengar offline→online berhasil. Antrean latihan video
diuji dengan koneksi Supabase disimulasikan gagal sementara LAN tetap aktif, lalu pulih
otomatis setelah endpoint asli dipulihkan. WAN jaringan bersama tidak diputus.
20 durasi manual: p50 2,385 s, p90 3,91 s, maksimum 14,5 s; tidak membuang sampel lambat.
Lihat [I1_CHECKLIST.md](I1_CHECKLIST.md).

B4: pengguna mengonfirmasi Tentang tampil baik, penanda demo/a/ma lulus benar dan angka
percobaan pribadi kembali sama setelah demo dimatikan. Tidak mengulang semua uji HP di F,
karena perubahan runtime F hanya pada CLI lokal. Lihat [README app](../app/README.md).

Evaluasi A6 tetap bukti awal 3 penutur tim: vokal 83% (target 85%), kata 55% (target 80%).
Belum diuji pada Tuli/anak, kamera Android, VoiceOver menyeluruh atau splash release.
Kalibrasi belum diuji kuantitatif pada dataset. PIN 4 digit bukan pengamanan kuat.
Alat hanya untuk latihan dengan label perkiraan sistem, bukan penilaian klinis.

## Tugas tim setelah freeze

- [ ] Konfirmasi jam tenggat, format repo/APK, izin adegan mengucapkan materi dan internet
  final kepada panitia. Belum ada jawaban panitia yang tercatat.
- [ ] Cabut token Expo lama yang pernah ditempel ke percakapan; status pencabutan belum dibuktikan.
- [ ] Siapkan video model sendiri secara lokal bila diperlukan, atau gunakan ilustrasi bawaan.
- [ ] Rekam video demo 3–5 menit; jelaskan batas evaluasi dan labeli data demo sebagai contoh.
- [ ] Kumpulkan versi tag, minimal 3 jam sebelum tenggat resmi 14 November 2026.
  Pastikan akses repo bagi penilai. Jangan mengubah kode setelah freeze/submission.
