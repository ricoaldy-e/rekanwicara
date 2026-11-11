# NEXT_STEPS — pekerjaan yang tersisa (per Rabu 11 Nov 2026 malam)

Urutan: **tugas manual pengguna → I1 → B4 → F → video demo → submission.** Kunci fitur Jumat 13 Nov malam,
submission Sabtu 14 Nov (kirim minimal 3 jam sebelum tenggat). Tiap fase: rencana singkat dulu, tunggu persetujuan
(lihat `AGENTS.md`). Aturan umum, privasi, dan batas produk ada di `AGENTS.md` dan `CLAUDE.md`.

Pembaruan setelah I1: kalibrasi, latihan iPhone, sinkronisasi Supabase dan pemulihan antrean
sudah diuji; p90 20 durasi manual 3,91 s. Uji putus WAN diganti simulasi kegagalan koneksi
Supabase karena jaringan bersama. Lihat `docs/I1_CHECKLIST.md` untuk bukti dan keterbatasan.
B4 kemudian selesai untuk target Expo Go: Tentang/demo/pemulihan profil diuji pengguna di iPhone,
174 Jest dan tsc lolos, Doctor 20/20 setelah 11 patch Expo diperbarui dengan persetujuan.
APK belum diminta/disiapkan; splash release, Android/tablet dan VoiceOver penuh belum diuji.
Fase berikutnya **F**, belum dimulai; tetap perlu rencana dan persetujuan.

## Tugas manual pengguna (agen tidak bisa mengerjakannya)

1. **Supabase:** buat proyek, aktifkan *Anonymous Sign-Ins* (Authentication → Sign In / Providers), jalankan seluruh
   `docs/supabase/schema.sql` di SQL Editor, isi `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY` di `app/.env`.
2. **Akun Expo** yang sama di Expo Go (iPhone) dan Expo CLI laptop; cabut token Expo lama yang pernah tertempel di chat
   (expo.dev/settings/access-tokens).
3. **Video model** (`data/model_videos/*.mp4`, 16 berkas) tidak ada di git: salin lewat flashdisk bila ingin langkah
   "Lihat" menampilkan video di demo (tanpa itu app memakai teks + ilustrasi bibir).
4. **Pesan ke panitia** (runbook): (1) bolehkah video demo menampilkan pengguna mengucapkan kata latihan, (2) submission
   berupa repo, APK, atau keduanya dan jam berapa tenggat 14 Nov, (3) apakah ada internet di lokasi final.
5. **Video demo** (3–5 menit) setelah fase F: masalah → kalibrasi → latihan "a" → "mama" salah lalu benar → Mode
   Pendamping → tabel hasil evaluasi → penutup. **Submission** minimal 3 jam sebelum tenggat; pastikan `.env` dan `data/`
   tidak ada di repo. Pertimbangkan mengubah repo GitHub ke Private sebelum submission bila panitia mengizinkan.

## Sebelum I1: pastikan (agen memeriksa, pengguna melengkapi)

- Server `MOCK_MODE=false`, `DATASET_MODE=false`, `DEBUG=false` dan **dijalankan ulang** setelah mengubah `.env`.
- `http://<IP-laptop>:8000/v1/health` dari browser HP menampilkan `"mock_mode":false`.
- Di Mode Pendamping, nyalakan **"Buka semua materi"** untuk uji dan demo (Level 2+ terkunci secara bawaan).
- Pilih kata demo yang stabil: **"mama"**; hindari "ibu" dan "bumi" (lihat keterbatasan di `CONTEXT.md` §3).

## I1 — Integrasi ujung ke ujung (Kamis malam) [Selesai; prompt acuan]

```
Fase I1. Baca AGENTS.md, CLAUDE.md, CONTEXT.md, docs/SPEC.md §5, §11.

Tujuan: app sungguhan + server sungguhan bekerja bersama di HP.

Kerjakan:
1. Server MOCK_MODE=false, DATASET_MODE=false, SCORER_MODE=rules. Pastikan GET /v1/model-video tetap jalan. App diarahkan ke IP laptop.
2. Jalankan skenario: onboarding → kalibrasi → l0_hold_a → l1_a → l2_ma → l3_mama (benar dan salah) → Mode Pendamping.
3. Catat setiap ketidakcocokan kontrak (field hilang, tipe berbeda) dan perbaiki di sisi yang salah, bukan dengan tambalan
   di kedua sisi.
4. Ukur waktu dari selesai merekam sampai hasil tampil untuk 20 percobaan; laporkan p50/p90.
5. Tambah tes kontrak otomatis: server menghasilkan contoh respons, app memvalidasi terhadap types.ts.

Kriteria selesai: skenario lengkap berjalan tanpa error, p90 ≤ 5 s. Commit "phase I1: end-to-end integration".
```

Catatan I1: agen tidak bisa memegang HP. Bagian yang bisa diotomatisasi: tes kontrak (nomor 5), pengukuran latensi sisi
server, dan daftar periksa skenario. Bagian di HP dikerjakan pengguna mengikuti daftar periksa yang disusun agen, lalu
melaporkan hasilnya. Ini juga saat pertama B3 (Supabase, antrean offline) diuji sungguhan: uji dengan mode pesawat
(lakukan percobaan saat offline, pastikan tabel `attempts` kosong, matikan mode pesawat, baris muncul dalam ±30 detik).

## B4 — Polish, mode demo, build (Jumat) [Selesai untuk Expo Go; prompt acuan]

```
Fase B4. Baca AGENTS.md, CLAUDE.md, docs/SPEC.md §8.5.

Tujuan: app stabil untuk video demo dan penilaian.

Kerjakan:
1. Audit aksesibilitas: ukuran teks, kontras, label aksesibilitas, tidak ada isyarat suara, status tidak hanya warna.
2. Semua keadaan kosong, memuat, dan error punya tampilan yang jelas.
3. Layar "Tentang": posisi produk, batas penggunaan, ringkasan privasi, versi app dan engine_version server.
4. Mode demo (pengaturan tersembunyi): akun demo dengan beberapa materi sudah lulus agar alur naik level bisa ditunjukkan.
5. Siapkan eas.json profil preview untuk build APK Android (bila tim membutuhkan APK). Tulis langkah build di README.
6. Ikon dan splash orisinal sederhana (tanpa aset berhak cipta).

Kriteria selesai: daftar periksa demo di README app tercentang. Commit "phase B4: polish and demo".
```

Catatan B4: tanyakan dulu apakah panitia membutuhkan APK (nomor 5): semua uji sampai sekarang memakai Expo Go, dan APK
butuh akun EAS serta waktu build. Mode demo tidak boleh mengirim data demo ke Supabase pengguna sungguhan. Jangan
menambah fitur baru: fokus pada stabilitas.

## F — Kunci fitur dan persiapan submission (Jumat malam) [Plan]

```
Fase F. Baca AGENTS.md, CLAUDE.md dan docs/PROGRESS.md.

Tujuan: repo siap dikumpulkan dan tidak diubah lagi.

Kerjakan:
1. Jalankan semua tes server, ml, dan app; perbaiki hanya bug, tanpa fitur baru.
2. Periksa: tidak ada .env, data/, atau model besar yang ter-commit; tidak ada log yang mencatat path rekaman
   (grep seluruh kode); tidak ada kata "normal/abnormal/gangguan/diagnosis" di teks UI dan output.
3. README root lengkap: deskripsi, arsitektur, cara setup server (termasuk download_models.py),
   cara menjalankan app di Expo Go, variabel lingkungan, ringkasan hasil evaluasi (tautan EVAL_REPORT.md dan MODEL_CARD.md),
   batasan, dan tim.
4. Perbarui docs/PROGRESS.md (semua fase), docs/THIRD_PARTY.md (lisensi terisi).
5. Buat tag git "v1.0-submission".

Kriteria selesai: checklist di atas terpenuhi; laporkan daftar berkas yang dikumpulkan.
```

Catatan F: lisensi berkas model `face_landmarker.task` di `docs/THIRD_PARTY.md` **belum terverifikasi**; baca model card
resmi MediaPipe dan perbarui barisnya (atau tulis jujur bahwa belum terverifikasi). Tambahkan dependency Python
(`requirements.txt`) dan JS yang kini dipakai (supabase-js, react-native-svg, expo-secure-store, dll.) ke tabel itu.
Setelah tag dibuat, **jangan ubah kode lagi**.

## Opsional bila waktu ada (bukan syarat submission)

Kalibrasi pengguna dievaluasi dengan rekaman asli; perbaikan penutupan /b/ sebelum "u" (mis. 30 fps); merekam ulang
`bad_noise` dengan bising keras; vokal e/o; aturan /p/. Detail di `docs/EVAL_REPORT.md` (bagian Rekomendasi).
