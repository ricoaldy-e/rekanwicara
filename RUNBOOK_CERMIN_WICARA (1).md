# RUNBOOK RINGKAS — Cermin Wicara MVP (tim 3 orang, ≤ 100 video)

Tidak ada model yang dilatih. AI-nya adalah MediaPipe (model pralatih) + aturan.
Rekaman hanya dipakai untuk menyetel ambang dan menguji.

## Urutan prompt
✅ = langsung tempel. ⛔ = kerjakan tugas manual dulu.

1. ✅ P0
2. ✅ A0
3. ⛔ B0 — pasang Expo Go di HP (Tugas 1)
4. ✅ A1
5. ✅ B1
6. ⛔ A2 — rekaman tim selesai (Tugas 2)
7. ✅ A3
8. ✅ B2
9. ✅ A4
10. ⛔ B3 — proyek Supabase sudah dibuat (Tugas 3)
11. ✅ I1
12. ⛔ A6 — cek label selesai (Tugas 4). A5 dilewati.
13. ✅ B4
14. ✅ F
15. Video demo, lalu submission

## Tugas manual

### Tugas 1 — Expo Go (2 menit, sebelum B0)
Pasang Expo Go dari Play Store di HP Android.

### Tugas 2 — Rekaman tim (±30 menit total, setelah B1, sebelum A2)
1. Laptop menyalakan server, HP membuka Mode Dataset. HP dan laptop di Wi-Fi yang sama.
2. Taruh HP di tumpukan buku, jarak 30–50 cm, wajah di tengah oval, cahaya dari depan.
3. **Video model (±5 menit):** satu orang dengan ucapan paling jelas memilih "Rekam Video Model"
   dan merekam 16 materi yang muncul, sekali per materi.
4. **Sesi tiap orang (±6 menit per orang):** P1, P2, P3 bergantian memilih "Sesi Dataset"
   dan merekam 27 klip yang muncul. Ikuti instruksi di layar untuk klip "salah sengaja" dan "klip buruk".
   Tekan **ulang** kalau salah ucap.
5. Cek di laptop: folder `data/raw/P1`, `P2`, `P3` masing-masing berisi ±27 berkas.

Total: 16 + 81 = 97 video.

### Tugas 3 — Supabase (±15 menit, sebelum dan selama B3)
1. Sebelum B3: buat proyek di supabase.com, aktifkan Anonymous Sign-Ins, catat URL dan anon key.
2. Saat B3: tempel `docs/supabase/schema.sql` ke SQL editor Supabase dan isi `app/.env` ketika Claude memintanya.

### Tugas 4 — Cek label (±5 menit per orang, setelah A4, sebelum A6)
1. Buka `http://localhost:8000/labeler` di laptop dan pilih namamu (P1/P2/P3).
2. Halaman hanya menampilkan klip milik dua orang lain (±54 klip).
3. Tekan **1** kalau bunyi dan bibirnya sesuai materi, **2** kalau tidak, spasi untuk memutar ulang.
4. Kerjakan sendiri-sendiri, jangan berdiskusi.

## Setelah prompt F
- **Video demo (3–5 menit):** masalah → kalibrasi → latihan "a" → "mama" salah lalu benar →
  Mode Pendamping → tabel hasil evaluasi → penutup.
- **Submission:** minimal 3 jam sebelum tenggat. Pastikan `.env` dan `data/` tidak ada di repo.

## Satu pesan untuk panitia (kirim malam ini)
> Kak, kami tim <nama> (Inclusive Health) ingin konfirmasi: (1) bolehkah video demo menampilkan pengguna
> mengucapkan kata latihan? (2) submission berupa repo, APK, atau keduanya, dan jam berapa tenggat 14 November?
> (3) apakah ada internet di lokasi final? Terima kasih.
