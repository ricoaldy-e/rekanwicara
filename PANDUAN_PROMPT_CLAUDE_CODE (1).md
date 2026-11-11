# Panduan Prompt Claude Code — Cermin Wicara MVP

## Cara pakai (baca dulu)

1. Buat folder repo `cermin-wicara/`, lalu salin isi paket `cermin-wicara-starter/` ke dalamnya
   (`CLAUDE.md`, `docs/SPEC.md`, `docs/PROGRESS.md`).
2. Buka terminal di root repo dan jalankan Claude Code. `CLAUDE.md` di root otomatis dibaca setiap sesi,
   jadi prompt fase di bawah tidak perlu mengulang konteks proyek.
3. **Satu fase = satu sesi.** Setelah fase selesai dan di-commit, ketik `/clear` sebelum menempel prompt fase berikutnya.
   Ini menjaga konteks tetap ringan.
4. Untuk fase yang ditandai **[Plan]**, masuk Plan Mode dulu (tekan Shift+Tab sampai mode plan aktif, atau ketik `/plan`).
   Claude akan membaca dan menyusun rencana tanpa mengubah berkas. Setujui rencananya, baru biarkan ia mengerjakan.
5. Ada dua jalur paralel:
   - **Track A (server/AI):** A0 → A1 → A2 → A3 → A4 → A6 (A5 dilewati)
   - **Track B (app):** B0 → B1 → B2 → B3 → B4
   - **Bersama:** P0 di awal, I1 setelah A3 + B2, dan F di akhir.
6. Kalau Claude mulai mengerjakan hal di luar fase, hentikan dengan Esc dan ingatkan: "Hanya fase X."
7. Setiap fase ditutup dengan commit. Kalau sebuah fase gagal di tengah, kembali ke commit sebelumnya, jangan menumpuk perbaikan.

Prompt boleh disalin persis. Bagian dalam `<...>` diisi sendiri.

---

## P0 — Inisialisasi repo (Bersama, Selasa pagi) [Plan]

```
Fase P0. Baca CLAUDE.md dan docs/SPEC.md (§4 saja). Jangan menulis kode aplikasi atau server dulu.

Tujuan: repo siap dipakai dua jalur kerja paralel.

Kerjakan:
1. git init (bila belum), buat struktur folder kosong persis seperti di CLAUDE.md, masing-masing dengan .gitkeep bila perlu.
2. .gitignore gabungan untuk Python, Node/Expo, dan aturan data: data/, server/models/*.task, *.joblib, *.pt,
   .env, .venv/, node_modules/, .expo/, *.mp4 kecuali app/assets/model-videos/.
3. README.md root: deskripsi singkat produk (alat bantu latihan, bukan diagnosis), struktur repo,
   tautan ke docs/SPEC.md, dan placeholder bagian "Cara menjalankan".
4. server/.env.example dan app/.env.example berisi semua variabel dari SPEC §4 dan §8 tanpa nilai rahasia.
5. LICENSE (MIT) dan docs/THIRD_PARTY.md berisi daftar komponen pihak ketiga yang akan dipakai
   (MediaPipe, Parselmouth/Praat, FFmpeg, Wav2Vec2, Expo, Supabase) dengan kolom lisensi yang
   kamu isi setelah mengecek sumber resminya.
6. Periksa dan laporkan versi tool di mesin saya: python3 --version, node --version, ffmpeg -version, git --version.
   Bila Python bukan 3.10/3.11 atau ffmpeg tidak ada, beri instruksi instalasi untuk OS saya dan berhenti.

Kriteria selesai: struktur dan berkas di atas ada, laporan versi tool, commit "phase P0: repo init".
```

---

## Track A — Server dan AI

### A0 — Kerangka FastAPI, mode mock, upload dataset (Selasa) [Plan]

```
Fase A0. Baca CLAUDE.md, docs/SPEC.md §3, §4, §5, §10.

Tujuan: server yang bisa dipakai developer app HARI INI (mode mock) dan siap menerima rekaman dataset.

Kerjakan:
1. server/ dengan virtualenv Python 3.11 dan requirements.txt awal: fastapi, uvicorn[standard], python-multipart,
   pydantic-settings, numpy, scipy, soundfile, pyyaml, pytest, httpx, ruff. (MediaPipe, Parselmouth, torch belum.)
2. Settings via pydantic-settings dari server/.env sesuai SPEC §4.
3. Model pydantic untuk semua request/response di SPEC §5 (server/app/api/schemas.py). Ini wajib persis kontrak.
4. server/app/content/items.json dari tabel SPEC §3 dan hints.json dari SPEC §13, plus loader yang memvalidasi
   setiap unit hanya berisi fon Tahap A (tolak materi yang melanggar dengan error jelas).
5. Endpoint: GET /v1/health, GET /v1/items, POST /v1/analyze dan POST /v1/calibrate (MOCK_MODE: respons contoh
   valid, variasi lewat ?mock=hijau|kuning|merah|retry), POST /v1/dataset/upload (hanya bila DATASET_MODE=true;
   purpose=dataset → simpan sesuai SPEC §5 dan tambah baris metadata.csv; purpose=model_video → simpan/timpa
   DATA_DIR/model_videos/{item_id}.mp4; tolak bila speaker_id/item_id tidak valid), dan
   GET /v1/model-video/{item_id} (kirim mp4 atau 404; selalu aktif, tidak bergantung DATASET_MODE).
6. Batas upload 15 MB, tipe video saja. CORS terbuka (demo LAN).
7. Logging: hanya metode, endpoint, status, durasi ms. Jangan pernah mencatat nama file atau isi upload.
8. Fixture tes: buat video 2 detik dengan ffmpeg (testsrc + sine 220 Hz). Tes semua endpoint.
9. server/README.md: setup venv, menjalankan dengan --host 0.0.0.0, cara mencari IP LAN laptop (Windows/Mac/Linux),
   dan contoh curl untuk /v1/analyze dan /v1/dataset/upload.

Kriteria selesai: pytest hijau; /v1/health bisa dibuka dari HP di Wi-Fi yang sama (saya yang cek);
commit "phase A0: fastapi skeleton, mock, dataset upload".
```

### A1 — Media, cek kualitas, MediaPipe dasar (Selasa) [Plan]

```
Fase A1. Baca CLAUDE.md, docs/SPEC.md §4, §6.1, §6.2, §6.4 (bagian deteksi wajah saja).

Tujuan: setiap upload diubah menjadi audio + frame yang sinkron, dicek kualitasnya, lalu dihapus.

Kerjakan:
1. Tambah dependency: mediapipe, praat-parselmouth, opencv-python-headless (bila perlu untuk membaca frame).
   Cek di dokumentasi resmi MediaPipe cara memakai Face Landmarker Python Tasks API dengan running mode VIDEO.
2. Skrip server/scripts/download_models.py untuk mengunduh face_landmarker.task dari sumber resmi Google
   ke server/models/. Tulis URL-nya di skrip dan README, setelah kamu verifikasi dari dokumentasi resmi.
3. pipeline/media.py: ffprobe (start_time stream audio/video → av_offset_ms), ffmpeg ke WAV mono 16 kHz dan
   frame 15 fps tinggi 480 px, potong maksimal 4 s. Semua di direktori sementara; hapus di finally,
   termasuk ketika exception. Tambah tes yang membuktikan direktori sementara terhapus saat error.
4. pipeline/quality.py: semua flag SPEC §6.2. Ambang dibaca dari server/app/config/thresholds.yaml (buat berkasnya,
   isi nilai awal dari SPEC §6.2–§6.7 dengan komentar asal nilainya).
5. Deteksi wajah per frame dengan Face Landmarker (num_faces=1, output_face_blendshapes=True). Simpan hasil mentah
   per frame di memori untuk fase A2 (landmark + blendshape + timestamp_ms).
6. Endpoint debug GET/POST /v1/debug/features (hanya bila DEBUG=true): kembalikan ringkasan kualitas, jumlah frame,
   persentase frame berwajah, av_offset_ms, durasi audio.
7. Tes: klip fixture tanpa wajah harus memicu no_face; audio diam harus memicu too_quiet; audio dipotong keras
   (clipping) harus memicu clipping.

Kriteria selesai: pytest hijau; saya bisa mengirim rekaman HP sungguhan ke /v1/debug/features dan melihat
persentase frame berwajah mendekati 100%. Commit "phase A1: media pipeline and quality checks".
```

### A2 — Fitur bibir, fitur suara, alat plot (Rabu pagi) [Plan]

```
Fase A2. Baca CLAUDE.md, docs/SPEC.md §6.4, §6.5.

Tujuan: deret waktu fitur bibir dan suara yang bisa dilihat dan dicek dengan mata.

Kerjakan:
1. pipeline/lips.py: fitur per frame SPEC §6.4 (jaw_open, lip_gap_ratio, lip_width_ratio, rounding, closed),
   normalisasi terhadap kalibrasi bila ada atau jarak mata 33–263 bila belum, median filter 3 frame,
   ekstraksi lip_contour. Sebelum memakai indeks 13, 14, 61, 291, buat skrip ml/tools/draw_landmarks.py
   yang menggambar titik-titik itu di satu frame dan simpan PNG, supaya saya bisa memverifikasi posisinya.
2. pipeline/audio.py: intensitas, F0 + status bersuara, F1/F2 dengan parameter SPEC §6.5; fungsi median vokal.
3. Penyelarasan waktu: semua deret memakai milidetik sejak awal audio, setelah koreksi av_offset_ms.
4. ml/tools/plot_features.py <video.mp4>: satu PNG berisi panel jaw_open, lip_gap_ratio, rounding, intensitas,
   bersuara (0/1), F1, F2 terhadap waktu, dengan arsiran saat closed=true. Alat ini dipakai menyetel ambang.
5. /v1/debug/features sekarang juga mengembalikan deret waktu ringkas (untuk debug).
6. Tes unit dengan data sintetis: deret lip_gap_ratio buatan harus menghasilkan closed di rentang yang benar.

Kriteria selesai: pada rekaman "mama" sungguhan, PNG plot menunjukkan 2 penutupan bibir dengan suara bersuara,
dan pada "papa" 2 penutupan dengan senyap. Kirim saya contoh perintahnya. Commit "phase A2: lip and audio features".
```

### A3 — Kalibrasi, segmentasi, aturan Level 0–3, petunjuk (Rabu) [Plan]

```
Fase A3. Baca CLAUDE.md, docs/SPEC.md §5, §6.3, §6.6–§6.9, §13.

Tujuan: /v1/analyze dan /v1/calibrate yang sungguhan (MOCK_MODE=false) untuk Level 0–3.

Kerjakan:
1. pipeline/calibration.py: langkah rest, vowel_a, vowel_i, vowel_u; simpan angka ke DATA_DIR/calibration/{user_id}.json;
   pembaruan jangkar dari 10 percobaan hijau terakhir; flag "uncalibrated" bila belum ada.
2. pipeline/segment.py: wilayah ucapan, penutupan bibir, batas suku kata dan cadangan lembah intensitas (SPEC §6.6).
3. pipeline/rules.py: penilaian Level 0, vokal, m_hum, konsonan p/b/m, gabungan unit (SPEC §6.7), status dan skor
   (§6.8), reason_code. Rancang supaya fungsi penilaian menerima deret fitur (bukan video), agar bisa dites
   dengan data sintetis.
4. pipeline/hints.py: pilih satu hint_id sesuai prioritas §6.9.
5. Rakit respons lengkap sesuai kontrak §5, termasuk visuals (vowel_point, vowel_anchors, lip_contour, loudness),
   scorer="rules", engine_version, processing_ms.
6. Tes: data sintetis untuk setiap baris tabel §6.7 (hijau, kuning, merah), contoh "mama" dengan penutupan kedua
   senyap harus menghasilkan skor 0,75, overall merah, hint m_voicing. Tes kontrak: respons divalidasi skema pydantic.
7. Ukur processing_ms pada 5 rekaman sungguhan dan laporkan.

Kriteria selesai: pytest hijau; saya bisa menguji 4 kasus dengan rekaman sendiri (a benar, a mulut sempit,
mama benar, mama seperti papa) dan hasilnya masuk akal. Commit "phase A3: calibration, segmentation, rules".
```

### A4 — Label otomatis, alat cek label, pembagian LOSO (Rabu) [Plan]

```
Fase A4. Baca CLAUDE.md, docs/SPEC.md §10, §11.

Tujuan: 81 klip tim siap dipakai untuk menyetel ambang dan menguji. Tidak ada training model.

Kerjakan:
1. ml/dataset/process.py: untuk setiap klip di data/raw, pakai ulang server/app/pipeline untuk mengekstrak fitur
   dan hasil penilaian, simpan ke data/processed/{clip_id}.npz/.json. Lewati yang sudah diproses. Laporkan klip gagal.
2. Label otomatis: data/labels/auto_labels.csv dari metadata + pemetaan intended_error (SPEC §10.3).
3. Halaman /labeler (hanya bila DATASET_MODE=true): pilih nama annotator (P1/P2/P3), tampilkan HANYA klip yang
   bukan rekaman annotator itu. Satu klip per layar: putar video, tampilkan materi yang diminta, tombol
   "Sesuai" / "Tidak sesuai" (+ pilih heard_label, centang "bibir salah", "kualitas buruk").
   Pintasan: 1 = sesuai, 2 = tidak sesuai, spasi = putar ulang. Simpan sesuai SPEC §10.5.
   Annotator tidak boleh melihat hasil mesin.
4. ml/dataset/folds.py: buat 3 putaran LOSO (SPEC §10.6) di data/splits/fold_{1,2,3}.json.
5. ml/dataset/report.py: jumlah klip per orang dan per materi, klip yang belum dicek, kesepakatan antar annotator
   (persentase + Cohen's kappa).

Kriteria selesai: process → folds → report berjalan pada 81 klip, /labeler bisa dipakai dari browser laptop.
Commit "phase A4: dataset tools, labeler, LOSO folds".
```

### A5 — DILEWATI

Wav2Vec2 ditunda ke roadmap karena data hanya ±80 klip (SPEC §7). Langsung lanjut ke A6.
Di pitch, sebut Wav2Vec2 sebagai tahap lanjutan setelah ada data dari banyak penutur bersama mitra.

### A6 — Penyetelan ambang, evaluasi LOSO, model card (Jumat pagi) [Plan]

```
Fase A6. Baca CLAUDE.md, docs/SPEC.md §6.7, §10.6, §11, §12.

Tujuan: ambang final dan bukti kinerja yang jujur.

Kerjakan:
1. ml/eval/tune_thresholds.py: untuk setiap putaran LOSO, setel ambang utama (closure, voiced_ratio, vowel bibir,
   formant) dengan grid search kecil di 2 orang, uji di 1 orang. Lalu setel ambang final dari ketiga orang dan
   tulis ke thresholds.yaml (simpan versi lama sebagai komentar).
2. ml/eval/evaluate.py: metrik SPEC §11 per putaran dan rata-ratanya, selalu dengan jumlah klip
   (contoh "22/27 = 81%"); cek klip blok G (harus retry); latensi p50/p90.
3. docs/EVAL_REPORT.md: tabel metrik, confusion bibir rapat dan senyap/bersuara, 3 contoh kasus gagal, dan catatan
   bahwa ini bukti awal dari 3 penutur dewasa.
4. docs/MODEL_CARD.md: tujuan dan batas (bukan diagnosis), komponen (MediaPipe Face Landmarker, Parselmouth, aturan)
   beserta versi, data (81 klip, 3 anggota tim, kesepakatan tim sebagai persetujuan), hasil, batasan (belum diuji pada
   penutur Tuli dan anak, data kecil, hanya Tahap A), rencana lanjutan (data mitra, Wav2Vec2), privasi dan etika.

Kriteria selesai: laporan dan model card berisi angka nyata. Commit "phase A6: tuning, LOSO evaluation, model card".
```

---

## Track B — Aplikasi

### B0 — Kerangka Expo, navigasi, komponen dasar (Selasa) [Plan]

```
Fase B0. Baca CLAUDE.md, docs/SPEC.md §5, §8.

Tujuan: kerangka app yang berjalan di Expo Go dan sudah bisa memanggil server mode mock.

Kerjakan:
1. Buat app Expo TypeScript di app/ dengan expo-router, versi SDK stabil terbaru yang didukung Expo Go
   (cek dokumentasi resmi Expo). Pastikan tidak ada modul native custom.
2. Struktur: app/(routes), src/api (client + types.ts persis SPEC §5), src/components, src/theme, src/content
   (salinan hints.json), src/state.
3. Tema aksesibel: kontras tinggi, ukuran teks besar, tombol besar. Komponen: BigButton, StatusBadge
   (warna + ikon + teks: Sesuai/Mendekati/Belum sesuai), Card, StepHeader, InfoNote.
4. Konfigurasi EXPO_PUBLIC_API_URL dari app/.env, layar Pengaturan tersembunyi untuk mengganti URL server saat demo.
5. Layar kerangka (isi placeholder): onboarding, calibration, home, practice/[itemId], companion, dataset.
6. API client dengan timeout, penanganan error jaringan, dan pemanggilan /v1/health serta /v1/items.
7. Jest + tes untuk API client (mock fetch) dan StatusBadge.

Kriteria selesai: app terbuka di Expo Go di HP, layar Home menampilkan daftar materi dari server mock.
Commit "phase B0: expo skeleton".
```

### B1 — Perekaman, upload, Mode Dataset (Selasa) [Plan]

```
Fase B1. Baca CLAUDE.md, docs/SPEC.md §5, §8.2, §10.

Tujuan: satu komponen rekam yang dipakai di semua layar, dan Mode Dataset yang siap dipakai merekam penutur besok.

Kerjakan:
1. Komponen RecordPanel: expo-camera kamera depan mode video dengan audio, alur izin kamera + mikrofon dengan
   penjelasan bergambar, bingkai oval, hitung mundur visual 3-2-1 + expo-haptics, indikator sedang merekam,
   durasi dari props (default 2500 ms), mengembalikan URI file. Cek dokumentasi resmi expo-camera untuk API
   perekaman video terbaru.
2. Fungsi upload multipart ke /v1/analyze, /v1/calibrate, /v1/dataset/upload dengan indikator progres dan coba ulang.
3. Layar dataset (hanya bila EXPO_PUBLIC_DATASET_MODE=true) dengan dua submode:
   a. Sesi Dataset: form singkat (speaker_id P1/P2/P3, kondisi ruangan), skrip 27 klip sesuai SPEC §10.2
      (acak di dalam blok), tampilan materi besar + instruksi untuk blok F dan G (SPEC §10.3),
      rekam → putar ulang singkat → simpan/ulang, penghitung progres, dan bisa melanjutkan sesi yang terputus.
   b. Rekam Video Model: daftar 16 materi di SPEC §10.4, rekam satu kali per materi, putar ulang,
      simpan dengan purpose=model_video, tanda centang untuk materi yang sudah ada.
4. Uji nyata di HP: rekam 3 klip ke /v1/dataset/upload dan cek berkasnya muncul di data/raw laptop.

Kriteria selesai: Mode Dataset bisa menjalankan satu sesi penuh tanpa crash. Commit "phase B1: recording and dataset mode".
```

### B2 — Onboarding, kalibrasi, alur latihan, tampilan hasil (Rabu) [Plan]

```
Fase B2. Baca CLAUDE.md, docs/SPEC.md §2, §5, §8.1–§8.3, §8.5.

Tujuan: alur utama pengguna lengkap, bekerja dengan server mock maupun server sungguhan.

Kerjakan:
1. Onboarding: penjelasan bahwa ini alat bantu latihan (bukan pengganti guru/terapis dan bukan penilaian klinis),
   persetujuan pengguna dan pendamping, pembuatan PIN pendamping (simpan aman).
2. Kalibrasi 4 langkah (rest, a, i, u) dengan gambar instruksi; tangani status retry dan tampilkan pesan dari hint_id.
3. Home: misi hari ini dan daftar level/materi dengan status (sementara dari state lokal).
4. Practice: Lihat (video model dari GET /v1/model-video/{item_id}; bila 404, teks besar + emoji + ilustrasi bibir SVG),
   Tiru (RecordPanel), Bandingkan (ResultView), Ulangi. Buat komponen SVG ilustrasi bibir (rileks, a, i, u, rapat)
   dan posisi wajah dalam oval sesuai SPEC §8.1; jangan memakai gambar dari luar.
5. ResultView: dua StatusBadge, satu kalimat petunjuk, Peta Vokal SVG (segitiga jangkar + titik percobaan, sumbu sesuai
   SPEC §8.3), Cermin Bibir SVG (garis bibir pengguna vs target), grafik kekerasan untuk Level 0, label "perkiraan sistem".
6. Semua teks Bahasa Indonesia, tanpa istilah diagnosis, tanpa isyarat suara.
7. Tes jest untuk ResultView dengan respons mock hijau/kuning/merah/retry.

Kriteria selesai: dengan MOCK_MODE=true, seluruh alur onboarding → kalibrasi → latihan → hasil berjalan di HP.
Commit "phase B2: main user flow".
```

### B3 — Supabase, logika kemajuan, Mode Pendamping (Kamis) [Plan]

```
Fase B3. Baca CLAUDE.md, docs/SPEC.md §8.4, §9.

Tujuan: progres tersimpan dan aturan naik level berjalan.

Kerjakan:
1. docs/supabase/schema.sql: tabel SPEC §9 + RLS berbasis auth.uid() dengan login anonim Supabase
   (cek dokumentasi resmi Supabase untuk anonymous sign-in). Beri instruksi menjalankannya di SQL editor Supabase.
2. Lapisan data di app: simpan attempt setelah setiap analisis; antrean offline di AsyncStorage yang sinkron saat online.
3. src/state/progression.ts (TypeScript murni): semua aturan SPEC §8.4 (naik level 8/10 di ≥2 sesi, retry tidak dihitung,
   blok vs acak, pengurangan umpan balik, ulasan hari 1/3/7/14, deteksi macet). Tes jest menyeluruh dengan contoh angka.
4. Home memakai status dari progression.ts.
5. Mode Pendamping (PIN): ringkasan mingguan (jumlah sesi, materi lulus, materi macet), Uji Dengar
   (pendamping tidak melihat layar hasil, pengguna mengucapkan kata, pendamping memilih "jelas"/"belum jelas"),
   pengaturan durasi sesi, bagikan laporan teks lewat Share API, saran konsultasi ke guru/terapis bila ada materi macet.

Kriteria selesai: tes progression.ts hijau; percobaan tersimpan di Supabase dan tetap tercatat saat HP offline lalu online.
Commit "phase B3: supabase, progression, companion".
```

### B4 — Polish, mode demo, build (Jumat) [Plan]

```
Fase B4. Baca CLAUDE.md, docs/SPEC.md §8.5.

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

---

## I1 — Integrasi ujung ke ujung (Bersama, Kamis malam) [Plan]

```
Fase I1. Baca CLAUDE.md, docs/SPEC.md §5, §11.

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

---

## F — Kunci fitur dan persiapan submission (Bersama, Jumat malam) [Plan]

```
Fase F. Baca CLAUDE.md dan docs/PROGRESS.md.

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
