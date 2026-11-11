# PROGRESS

Perbarui tabel ini di akhir setiap fase (status: belum / berjalan / selesai / ditunda).

| Fase | Track | Isi | Target hari | Status | Catatan |
|---|---|---|---|---|---|
| P0 | Bersama | Inisialisasi repo | Selasa 10 Nov pagi | selesai | Python 3.11.9, ffmpeg 9.0.2, Node 22.13.0, git 2.49.0 |
| A0 | Server | Kerangka FastAPI, mock, upload dataset | Selasa 10 Nov | selesai | A0-fix: disesuaikan dengan spec tim 3 orang (lihat Keputusan). 188 tes hijau. Akses dari HP: menunggu cek tim |
| B0 | App | Kerangka Expo, navigasi, komponen dasar | Selasa 10 Nov | selesai | Expo SDK 54 (RN 0.81.5, React 19.1.0, expo-router 6). 30 tes jest hijau, tsc + lint + expo-doctor bersih. Uji di HP: menunggu cek tim |
| A1 | Server | Media + cek kualitas + MediaPipe dasar | Selasa 10 Nov | selesai | mediapipe 1.2.2, parselmouth 0.4.7. 243 tes hijau (0 skip; 6 `requires_model` jalan dengan model asli). Uji rekaman HP ke `/v1/debug/features`: menunggu cek tim |
| B1 | App | Perekaman, upload, Mode Dataset | Selasa 10 Nov | selesai | Diuji di HP (Expo Go SDK 58) oleh 3 perekam di 3 iPhone (iOS 26.5, 26.6.2, 27.0): sesi 27 klip per orang tanpa crash, 81 klip + 16 video model tersimpan di `data/`, metadata 81 baris. Cek kualitas A1 atas 81 klip: 5 klip cacat (lihat Keputusan, 11 Nov) |
| A2 | Server | Fitur bibir + fitur suara + alat plot | Rabu 11 Nov pagi | selesai | `pipeline/lips.py`, `pipeline/audio.py`, `ml/tools/draw_landmarks.py`, `ml/tools/plot_features.py`; deret waktu di `/v1/debug/features`. 255 tes hijau. Indeks 13/14/61/291/33/263 + kontur bibir diverifikasi dengan gambar (P1, P2). l3_mama/l3_papa P1–P3: 2 penutupan di keenam klip; /m/ tengah 100% bersuara (3/3); /p/ tengah P3 0%, P2 38%, P1 57% bersuara (lihat Keputusan) |
| A3 | Server | Kalibrasi, segmentasi, aturan L0–3, petunjuk | Rabu 11 Nov | selesai | `pipeline/calibration.py`, `segment.py`, `rules.py`, `hints.py`; `/analyze` dan `/calibrate` sungguhan saat `MOCK_MODE=false`. 313 tes hijau. Data tim tanpa kalibrasi (L1–L3, klip benar): L1 18/21 hijau (+1 retry klip cacat), L2 12/18, L3 4/18; a_narrow 3/3 dan mama_no_closure 3/3 merah. processing_ms median 803 (749–943, request pertama 1669) pada 68 rekaman |
| B2 | App | Onboarding, kalibrasi, alur latihan, hasil | Rabu 11 Nov | selesai | Onboarding (penjelasan, 2 persetujuan, PIN 4 angka di keystore), kalibrasi 4 langkah, Home (misi hari ini + status terakhir), Practice Lihat→Tiru→Bandingkan→Ulangi, ResultView (2 lencana, petunjuk, Peta Vokal, Cermin Bibir, grafik kekerasan L0, label perkiraan sistem). 99 tes jest, tsc, expo-doctor 20/20, bundle Android bersih. Uji di HP: menunggu |
| A4 | ML | Proses dataset, alat cek label, putaran LOSO | Rabu 11 Nov | selesai | `ml/dataset/{process,folds,report}.py` (logika di `server/app/dataset/`), halaman `/labeler`. 81 klip diproses tanpa gagal (71 s; ulang = lewati semua), `auto_labels.csv` 81 baris, 3 fold LOSO (uji 27, setel 54). `/labeler` diuji di browser sungguhan (video, pintasan 1/2/3/4/spasi/←, simpan, lanjut setelah muat ulang). 368 tes server hijau. **Cek label manusia belum dilakukan** (Tugas 4) |
| B3 | App | Supabase, logika kemajuan, Mode Pendamping | Kamis 12 Nov | selesai | `src/state/progression.ts` (aturan §8.4, 37 tes), antrean offline + Supabase (`src/data/sync.ts`, `supabase.ts`), `docs/supabase/schema.sql` (4 tabel, 12 kebijakan RLS), Home dengan sesi hari ini dan tahap materi, Mode Pendamping (PIN, ringkasan 7 hari, Uji Dengar, pengaturan, bagikan laporan, saran konsultasi). Saat B3: 164 tes jest, tsc, expo-doctor 20/20, bundle Android bersih. Integrasi iPhone dan Supabase nyata kemudian diuji di I1; rincian cek manual tersisa ada di checklist I1. |
| A5 | ML | Scorer Wav2Vec2 | — | dilewati | data terlalu sedikit; roadmap |
| I1 | Bersama | Integrasi ujung ke ujung di HP | Kamis 12 Nov malam | selesai (dengan keterbatasan uji) | Doctor 20/20, 383 pytest, 166 Jest, tsc dan lint perubahan lolos. Kalibrasi dan latihan L0–3 di iPhone berhasil menurut pengguna setelah server dijalankan di luar sandbox. Supabase online, antrean Uji Dengar offline→online, serta antrean percobaan video saat koneksi Supabase disimulasikan gagal lalu pulih otomatis berhasil. 20 durasi manual: p50 2385 ms, p90 3910 ms, maks 14500 ms (semua sampel dihitung). WAN jaringan bersama tidak diputus; lihat rincian dan cek manual tersisa di `docs/I1_CHECKLIST.md`. |
| A6 | ML | Penyetelan ambang, evaluasi LOSO, model card | Kamis–Jumat | selesai | `ml/eval/{tune_thresholds,evaluate}.py` (logika `server/app/dataset/evaluation.py`), `docs/EVAL_REPORT.md`, `docs/MODEL_CARD.md`; ambang final ditulis ke `thresholds.yaml`. LOSO: bibir rapat 56/60 = 93% ✓, suara saat rapat 43/50 = 86% ✓, vokal 19/23 = 83% (target 85), status kata 12/22 = 55% (target 80); bad_face 3/3, salah tolak 1/74, p90 984 ms. 382 tes hijau |
| B4 | App | Polish, mode demo, build | Jumat 13 Nov | selesai (target Expo Go) | Layar Tentang, profil demo di memori (isolasi dari penyimpanan dan sinkronisasi pribadi), feedback sinkronisasi, label tombol panjang, pemulihan daftar materi kosong, aset cermin/bibir orisinal, dan README app selesai. 174 Jest dan tsc lolos; lint exit 0 dengan 8 warning lama; detektor UI tidak menemukan masalah mekanis. Setelah persetujuan pengguna, 11 patch Expo diperbarui (expo 58.0.24), manifest/lockfile lama dicadangkan; Doctor 20/20. Pengguna mengonfirmasi Tentang tampil baik di iPhone, demo benar dan angka percobaan pribadi kembali sama setelah demo dimatikan. APK/release splash, Android/tablet dan VoiceOver penuh belum diuji. npm: 28 advisori (1 rendah, 27 sedang). |
| F | Bersama | Kunci fitur, README, tag submission | Jumat 13 Nov malam | belum | |

## Tugas manual

| No | Isi | Sebelum prompt | Status |
|---|---|---|---|
| 1 | Pasang Expo Go di HP | B0 | selesai (Expo Go: SDK 58; iPhone butuh login akun Expo yang sama dengan Expo CLI) |
| 2 | Rekam: 3 orang × 27 klip + 16 video model | A2 | selesai (rekam ulang di ruang tenang, 10 Nov malam; 5 klip cacat, lihat Keputusan) |
| 3 | Buat proyek Supabase (isi SQL dan .env saat B3) | B3 | selesai; login anonim/skema diterapkan dan sinkronisasi diuji saat I1 |
| 4 | Cek label: tiap orang ±54 klip milik dua orang lain | A6 | selesai (162 penilaian; "sesuai materi" 90%, kappa 0.65) |
| 5 | Video demo | setelah F | belum |
| 6 | Submission | Sabtu 14 Nov | belum |

## Keputusan penting
- Rabu 11 Nov (B4): target fase Expo Go; APK belum diminta dan belum disiapkan. Profil demo
  hanya di memori, memakai user_id terpisah, dengan a/ma lulus lewat aturan kemajuan asli;
  kalibrasi tidak dipalsukan. Penyimpanan profil/PIN dan semua jalur sinkronisasi hasil demo
  diblokir. Pergantian profil ditahan selama sinkronisasi pribadi; mematikan demo atau memulai
  ulang app mengembalikan profil pribadi. Isolasi diuji dengan Jest dan pergantian profil
  dikonfirmasi pengguna di iPhone. Laporan demo diberi label data contoh.
- Rabu 11 Nov (B4): pengguna menyetujui 11 pembaruan patch Expo untuk mengembalikan Doctor
  ke 20/20. Manifest dan lockfile lama dicadangkan di Temp sebelum pembaruan; 174 Jest,
  tsc dan bundle iOS lolos sesudahnya. npm melaporkan 28 advisori (1 rendah, 27 sedang);
  tidak menjalankan audit fix. Ikon/splash orisinal dihasilkan skrip dengan Pillow yang sudah
  terpasang, tanpa dependency baru. Splash akhir membutuhkan release build, bukan bukti Expo Go.
- Rabu 11 Nov (I1): pengujian WAN tidak dilakukan karena memakai jaringan bersama. Sebagai
  pengganti, URL Supabase dioverride hanya pada proses Metro ke localhost tanpa layanan;
  API latihan tetap di LAN. Satu hasil latihan tersimpan sebagai pending, kemudian otomatis
  tersinkron setelah URL asli dipulihkan dan app dimuat ulang. `.env` tidak diubah untuk simulasi.
  Pengguna melaporkan antrean Uji Dengar juga pulih setelah mode pesawat. Dua puluh durasi
  manual termasuk retry dan umpan balik tersembunyi dihitung seluruhnya; p90 3,91 s lulus,
  maksimum 14,5 s tetap dicatat sebagai keterbatasan, bukan dibuang sebagai outlier.
- Rabu 11 Nov (baseline/I1): modul B3 `app/src/data` dipulihkan oleh commit teman `638d878`;
  `.gitignore` kini `/data/`. Tidak perlu mengubah dependency atau mengecualikan pemeriksaan Doctor:
  pemeriksaan ulang `expo-doctor@1.21.6 --verbose` lolos 20/20 dengan akses jaringan.
  `DEBUG=release` dari proses terminal agen menimpa `.env`; override disingkirkan hanya untuk proses server/tes.
  Baseline sebelum tambahan I1: 382 pytest, 164 Jest, tsc lolos; lint app exit 0 dengan 8 warning lama.
  Fixture I1 bersifat sintetis dan tidak memakai dataset. Uji offline Supabase harus mempertahankan LAN ke server.
- Selasa 10 Nov (A1): tanpa `opencv-python-headless`; mediapipe 1.2.2 sudah membawa `opencv-contrib-python`
  (modul `cv2` yang sama). Frame dibaca dari PNG hasil ffmpeg lewat `mp.Image.create_from_file`.
- Selasa 10 Nov (A1): `face_off_frame` = median lebar wajah < 0,25 lebar frame ATAU > 10% frame berwajah
  punya titik mulut (13, 14, 61, 291) di luar frame; dihitung dari frame berwajah saja (asumsi A1, disetel di A6).
- Selasa 10 Nov (A1): noise_floor = persentil ke-10. Pengaman: bila rentang ucapan > 85% klip, floor
  "tidak pasti" → `too_quiet` memakai batas absolut (`abs_min_peak_db` 55 dB), `too_noisy` tidak dicek, info
  `noise_floor_uncertain` di debug. Cakupan juga diukur dengan ambang absolut (`abs_speech_db` 50 dB), tapi
  hanya bila ≥ 50% frame pitch di rentang itu bersuara; tanpa syarat ini bising latar yang keras ikut
  dianggap "penuh suara" dan `too_noisy` tidak pernah dicek.
- Selasa 10 Nov (A1): landmarker dibuat per request (VIDEO mode); waktu pembuatannya dilaporkan di
  `timings_ms.landmarker_init_ms`. Request pertama ±1 s karena import mediapipe, berikutnya ±0,4 s (klip 2 s).
- Selasa 10 Nov (A1): tes yang butuh model diberi marker `requires_model` dan di-skip dengan pesan bila model
  belum diunduh. Model diunduh 10 Nov: SHA-256 `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- Selasa 10 Nov (B0): app memakai **Expo SDK 54** karena Expo Go di HP tim hanya mendukung SDK 54
  (npm terbaru SDK 58; dokumen Expo menyarankan SDK 57 untuk Expo Go selama transisi). Bila Expo Go di HP
  diperbarui ke SDK lain, app harus dinaikkan (`npx expo install expo@^<SDK> --fix`).
- Selasa 10 Nov malam: app dinaikkan ke **Expo SDK 58** (expo 58.0.23, RN 0.88.1, React 19.3.0, TypeScript 6,
  jest 30, Testing Library 14). Alasan: Expo Go yang terpasang dari App Store kini SDK 58, jadi HP baru tim
  tidak bisa membuka proyek SDK 54. Perubahan kode: `StyleSheet.absoluteFillObject` → `absoluteFill`,
  `await render(...)` di tes, `types: ["jest","node"]` di tsconfig (TS 6), `newArchEnabled`/`edgeToEdgeEnabled`
  dihapus dari app.json. Aturan lint baru `react-hooks/refs` dan `set-state-in-effect` sementara `warn`.
  66 tes jest, tsc, expo-doctor 20/20, bundle Android bersih. Uji di HP: menunggu.
- Rabu 11 Nov (B3): dependency baru, disetujui: `@supabase/supabase-js` dan `react-native-url-polyfill` (pola resmi
  Supabase untuk React Native; JavaScript murni, jalan di Expo Go). Tanpa `netinfo`: sinkron dicoba setelah tiap
  percobaan, saat app kembali aktif, tiap 30 detik, dan lewat tombol "Sinkronkan sekarang".
- Rabu 11 Nov (B3): riwayat lokal berubah dari `{materi: [status]}` menjadi daftar percobaan lengkap (UUID, sesi, waktu,
  hasil), karena §8.4 butuh waktu dan sesi. Format B2 dibuang saat dibaca. Percobaan `retry` tetap tidak disimpan.
  Setiap percobaan punya UUID dari HP dan dikirim dengan upsert: kirim ulang setelah balasan hilang tidak membuat baris ganda.
- Rabu 11 Nov (B3): `user_id` ke server (kalibrasi) tetap id lokal; baris Supabase memakai `auth.uid()` (login anonim,
  wajib untuk RLS). Mengganti id server akan menghilangkan kalibrasi dan butuh internet saat peluncuran pertama.
  Tanpa URL dan kunci Supabase di `app/.env`, app berjalan penuh dan hanya sinkron yang nonaktif.
- Rabu 11 Nov (B3), tafsiran §8.4 (tiap pilihan ada tesnya): **lulus** = ≥ 8 hijau dari 10 percobaan terakhir dan 10
  percobaan itu mencakup ≥ 2 sesi (kurang dari 10 percobaan tidak pernah lulus); Level 3 + Uji Dengar wajib butuh ≥ 1
  "jelas". **Ulasan** 1, 3, 7, 14 hari setelah lulus; percobaan hijau pada atau setelah jatuh tempo menyelesaikannya, dan
  ulasan berikutnya paling cepat sehari sesudahnya. **Macet** = < 40% hijau pada 3 sesi terakhir materi itu (≥ 6
  percobaan). **Acak** mulai di akurasi ≥ 80% dari 10 terakhir (≥ 5 percobaan). **Umpan balik berkurang** (Level 3,
  status keseluruhan tiap 2 percobaan sesi) hanya dalam pola acak, sehingga percobaan awal selalu menampilkan hasil
  penuh. Mesin tetap menilai semua percobaan.
- Rabu 11 Nov (B3): kunci materi: Level 0–1 terbuka; Level N terbuka bila ≥ 1 materi Level N−1 lulus (materi yang sudah
  punya percobaan tidak terkunci lagi). Saklar **"Buka semua materi"** di Mode Pendamping untuk demo.
- Rabu 11 Nov (B3): sesi hari ini = pemanasan Level 0, ulasan jatuh tempo (maks. 2), materi inti (diulang 3× selama
  pola berblok), tantangan acak (benih per hari); panjangnya dari pengaturan 5/10/15 menit (3/5/8 langkah).
  Uji Dengar tanpa rekaman: pendamping menilai suara langsung. PIN 4 angka tanpa penguncian setelah salah berkali-kali.
- Rabu 11 Nov (B3): `expo-doctor@latest` terbit rusak (hilang `@expo/env`); gunakan `npx expo-doctor@1.21.6`.
- Rabu 11 Nov (A6): urutan diubah dari runbook (B3 → I1 → A6) menjadi A6 dulu: cek label sudah selesai, I1
  butuh Mode Pendamping dari B3, dan I1 sebaiknya memakai ambang final.
- Rabu 11 Nov (A6): kebenaran = kesepakatan kedua penilai; 8 klip yang penilainya berbeda pendapat tidak dipakai
  untuk status kata. Kesalahan sengaja yang dinilai "sesuai" dengan bibir benar oleh keduanya dianggap tidak
  dilakukan (`P2 mama_as_papa`, `P2 a_narrow`). Klip "benar" yang ditolak keduanya tidak dipakai untuk metrik per
  unit (aspeknya tidak diketahui).
- Rabu 11 Nov (A6): penyetelan = grid kecil satu parameter per langkah, objektif akurasi seimbang metriknya
  sendiri; seri → status kata → nilai terdekat dengan yang lama. Tie-break status kata ditambahkan karena "a"
  tunggal tidak bisa memilih di antara nilai `jaw_open` yang sama baiknya, sedangkan "a" di dalam kata kurang
  terbuka (temuan A3). Jangkar vokal per putaran hanya dari 2 penutur penyetel.
- Rabu 11 Nov (A6): **rentang /p/ (≤ 0,6) dan /b/ (≥ 0,3) kini tumpang tindih**; sistem belum andal menangkap /p/
  yang terlalu bersuara. p 0,6 di ujung grid. Tes `test_rules.py` mengunci nilai awal SPEC karena menguji
  logika, bukan angka hasil penyetelan.
- Rabu 11 Nov (A6): label yang bertentangan dengan ukuran: `P3 u_flat_lips` (penilai "tidak sesuai", rounding
  terukur 0,87) dan `P2 a_narrow` (penilai "sesuai", jaw_open 0,17). Dihitung sebagai kesalahan mesin.
- Rabu 11 Nov (A4): logika dataset ada di `server/app/dataset/` (server tidak boleh bergantung pada `ml/`, dan tes
  tetap lewat pytest); `ml/dataset/*.py` hanya skrip perintah. Klip diproses TANPA kalibrasi (default §6.3).
  `.npz` menyimpan deret bibir dan suara supaya A6 bisa menilai ulang tanpa MediaPipe. Berkas `.json` memuat
  hash `thresholds.yaml`; klip yang diproses dengan ambang lain dilaporkan "usang" dan diproses ulang otomatis.
- Rabu 11 Nov (A4): label otomatis hanya memakai yang tertulis di SPEC §10.3; sel yang SPEC tidak sebut dikosongkan
  (mis. suara `u_flat_lips`), tidak ditebak. `bad_noise` = `retry_or_scored`.
- Rabu 11 Nov (A4), `/labeler`: hanya terbuka dari laptop server (localhost atau alamat LAN laptop itu sendiri;
  perangkat lain 403) karena menayangkan video wajah. Annotator tidak melihat pembicara, jenis kesalahan sengaja,
  nama berkas, atau hasil mesin; klip dialamatkan dengan token acak dan diacak per annotator; log akses hanya
  menulis `/labeler/video/{token}`. Rekaman iPhone berformat **HEVC**, jadi tiap klip dikonversi sekali ke H.264 ke
  `data/processed/labeler_cache/` (lokal, tidak di-commit) saat pertama diputar. `heard_label` = materi aktif atau
  `unclear`; bila "Sesuai" dan kolom itu kosong, diisi materi yang diminta.
- Rabu 11 Nov (A4): laporan menandai klip yang perlu ditinjau: klip "benar" yang dinilai tidak sesuai atau
  berkualitas buruk, kesalahan sengaja yang dinilai sesuai oleh kedua annotator, dan annotator yang berbeda
  pendapat. Putuskan sebelum A6 (terutama `mama_as_papa` P2 dan `u_flat_lips` P3 dari catatan A3).
- Rabu 11 Nov (uji B2 di HP, `MOCK_MODE=false`): hasil cukup baik, tetapi bunyi yang mirip masih dinilai sama, mis.
  /u/ dan /o/. Penyebab yang diketahui: hanya a, i, u yang dinilai (e dan o bonus, `active: false`), dan
  penilaian vokal memakai ambang F1/F2 yang belum disetel. Catatan untuk A6 / roadmap, belum dikerjakan.
- Rabu 11 Nov (B2): dua dependency baru, disetujui: `react-native-svg` (semua gambar dan grafik, tanpa berkas
  gambar) dan `expo-secure-store` (PIN pendamping di keystore, bukan AsyncStorage). Keduanya bawaan Expo Go.
- Rabu 11 Nov (B2): `user_id` dibuat lokal (`u_` + 24 heks, disimpan di AsyncStorage `cw.profile`); B3 menggantinya
  dengan `auth.uid()`. `session_id` = satu id per peluncuran app. Rekaman di HP dihapus setelah dianalisis, saat
  "Rekam ulang", dan saat meninggalkan layar. Percobaan `retry` tidak dicatat.
- Rabu 11 Nov (B2): Cermin Bibir menampilkan bentuk target bawaan app (a/i/u), bukan garis dari video model: server
  tidak mengirim kontur target (mengubah kontrak §5). Kontur server dinormalkan ke kotak mulut, jadi yang
  dibandingkan bentuknya, bukan ukurannya. Tidak ditampilkan untuk "mmm" (bibir rapat, normalisasi tidak berarti).
- Rabu 11 Nov (B2): status materi di Home hanya "Belum dicoba" atau hasil terakhir. Penguncian level, lulus, ulasan
  berjarak, turunkan level, dan pengurangan umpan balik Level 3 (§8.4) masuk B3. Kalibrasi opsional (bisa dilewati;
  tanpa itu `quality_flags` berisi `uncalibrated`); semua langkah kalibrasi merekam 3 detik.
- Rabu 11 Nov (A3): prompt A3 meminta "mama dengan penutupan kedua senyap → skor 0,75"; rumus §6.8
  memberi **0,5** (hijau + merah) ÷ 2, sama seperti contoh §5 yang sudah dibetulkan. Tes memakai 0,5.
- Rabu 11 Nov (A3): kuning = dalam 15% relatif terhadap nilai ambang (mis. jaw_open ≥ 0,34 untuk ambang
  0,40); batas kuning eksplisit di SPEC (L0, p, b) dipakai apa adanya. Vokal e/o (bonus, `active: false`)
  tidak dinilai: `/analyze` mengembalikan 422 `item_inactive`. Langkah kalibrasi `rest` hanya mengecek
  flag wajah (klip diam pasti `too_quiet`). Bonus §6.7 untuk /m/ (closure_ms, closure_db) tidak mengubah status.
- Rabu 11 Nov (A3): default populasi §6.3 diukur dari dataset: rest `jaw_open` 0, rest `rounding` 0,16;
  jangkar a (819, 1410), i (310, 2521), u (416, 931) Hz.
- Rabu 11 Nov (A3), segmentasi: penutupan dihitung bila bibir terbuka di dalam wilayah ucapan (toleransi
  150 ms); waktu buka = titik tengah frame rapat terakhir dan frame terbuka pertama (sebelumnya ujung frame
  menelan sampai 67 ms vokal berikutnya → /p/ terbaca bersuara); jendela ukur maks. 300 ms sebelum buka dan
  tidak sebelum awal wilayah ucapan (senandung /m/ awal kata termasuk ucapan, diam tidak). Wilayah ucapan
  untuk segmentasi menjembatani celah sampai 300 ms supaya penutupan /p/ yang senyap tidak memotong kata.
- Rabu 11 Nov (A3), aturan vokal: fitur bibir = nilai puncak ke arah bentuk target di bagian vokal (a: jaw
  maks; i: lebar maks, rounding min; u: rounding maks, lebar min). Median 50% tengah membuat "a" dalam kata
  (3–6 frame) selalu kurang terbuka. Kalibrasi tetap median 50% tengah (§6.3).
- Rabu 11 Nov (A3), untuk A6 (penyebab klip benar L2/L3 tidak hijau): `closure_missing` ×12 (penutupan
  cepat jatuh di antara frame 15 fps; celah bibir saat rapat kadang 0,08–0,10; "u" yang membulat bisa
  terbaca rapat, celah 0,06–0,07: mengecualikan frame membulat memperbaiki 2 klip tapi merusak 3 klip
  tanpa kalibrasi, jadi tidak dipakai; `mouthClose` tidak berguna, selalu ±0); `vowel_open_low` ×8 ("a"
  dalam kata kurang terbuka, terutama P3); /p/ bersuara ×4. Label meragukan: `mama_as_papa` P2 (hijau,
  tetap bersenandung) dan `u_flat_lips` P3 (bibir tetap membulat).
- Rabu 11 Nov (A2): jarak landmark dihitung dalam piksel (x dan y MediaPipe dinormalkan terpisah; frame
  HP berdiri 360×480). `mouth_width_rest` disimpan relatif terhadap jarak mata 33–263; tanpa kalibrasi
  dipakai `default_mouth_to_eye_ratio` 0,59 (diukur: P1 0,62, P2 0,59, P3 0,55). Selisih antarorang ±6%
  hampir sebesar margin ambang i/u (±5%), jadi kalibrasi per pengguna di A3 penting.
- Rabu 11 Nov (A2): `closed_gap_ratio` 0,05 → **0,08** (asumsi A2, disetel di A6). Saat bicara, titik bibir
  dalam jarang benar-benar bertemu: minimum penutupan tengah kata median 0,028, p90 0,061, maks 0,089
  (18 kata); puncak vokal ≥ 0,121; diam ±0,002. 0,05 melewatkan 5/18 penutupan, 0,08 melewatkan 1/18.
- Rabu 11 Nov (A2), untuk A3/A6: bibir rapat saat diam (sebelum/sesudah kata) juga terbaca `closed`;
  penutupan konsonan awal kata menyatu dengan diam, jadi `voiced_ratio` §6.6.3 harus diukur di bagian akhir
  penutupan (tepat sebelum bibir terbuka), bukan seluruhnya. /p/ di tengah kata bisa terbaca bersuara karena
  getaran terbawa dari vokal sebelumnya (P1 57%, intensitas di penutupan 50–60 dB vs diam ±35 dB); ambang
  p `voiced_ratio < 0,3` perlu diuji, mungkin dikombinasi dengan `closure_db`. Klip `mama_as_papa` justru
  bersuara saat bibir rapat (35–90%): kemungkinan perekam tetap bersenandung → periksa saat cek label silang.
- Rabu 11 Nov (B1): rekaman pertama di kafe dibuang (bising latar 63–71 dB, sebagian bersuara, merusak pembeda
  /p/ vs /b/ dan /m/); direkam ulang di ruang tenang (bising latar ±28–45 dB). Klip cacat yang tersisa:
  `P3/l0_hold_a` (suara bersambung 1,38 s, aturan butuh ≥ 3 s), `P2/l1_i__r1__none` (terlalu pelan, kena
  `too_noisy`), dan `l1_a__bad_noise` P1/P2/P3 (bising hanya 47–49 dB, SNR 24–30 dB, tidak memicu flag).
  Diputuskan tidak direkam ulang sebelum A2/A3; bila `too_noisy` tidak bisa disetel di A6, rekam ulang
  `bad_noise` dengan bising keras. Vokal tunggal a/i/u hanya bersuara ±0,2–0,4 s (3–6 frame): periksa dengan
  plot di A2 sebelum menyetel ambang vokal. Semua perekam memakai iPhone.
- Selasa 10 Nov (B0): layar Pengaturan tersembunyi dibuka dengan tekan lama (2 detik) judul "Misi hari ini" di Home.
  URL server pengganti disimpan di AsyncStorage; tombol "Kembalikan ke bawaan" memakai nilai `app/.env`.
- Selasa 10 Nov (B0): `app/src/content/hints.json` salinan server; tes jest memastikan isinya identik.
  Tes jest juga menolak kata "normal/abnormal/gangguan/diagnosis" di `app/app` dan `app/src`.
- (catat di sini: misalnya "Rabu malam: SCORER_MODE demo = hybrid karena kesepakatan 87% vs 78%")
- Selasa 10 Nov (A0-fix): `/v1/dataset/upload` hanya menerima `speaker_id` `P1`/`P2`/`P3`;
  `intended_error` + `bad_face` (item apa saja) dan `bad_noise` (hanya `l1_a`).
- Selasa 10 Nov (A0-fix): metadata.csv mengikuti §10.5 (tanpa `sex`/`age_group`). Field upload opsional
  `device` mengisi kolom `device`. Belum ada `data/raw/metadata.csv` lama saat penyesuaian.
- Selasa 10 Nov (A0-fix): item kelas `other` (`other_na` … `other_bising`) dihapus; dataset hanya menerima item `items.json`.
- Selasa 10 Nov (A0-fix): `SCORER_MODE` hanya `rules` (nilai lain ditolak saat start); field `scorer` di API selalu `"rules"`.
- Senin 9 Nov (A0): item bonus (`l1_e`, `l1_o`, `l3_mau`, `l3_bau`, `l3_boba`) `active: false` sampai aturan e/o siap.
- Senin 9 Nov (A0): saat `status:"retry"`, `indicators` juga `null` (selain overall/score/units).
- Senin 9 Nov (A0): format error `{"detail":{"code","message"}}`; daftar kode di `server/README.md`.

## Masalah terbuka
- A1: aturan clipping SPEC §6.2 (> 1% sampel |x| ≥ 0,99) bisa jarang terpicu pada rekaman HP. Setelah
  encode AAC, sinyal yang di-clip keras hanya punya 0,04% sampel ≥ 0,99 (31% ≥ 0,9). Fixture tes memakai
  audio lossless (ALAC). Setel ambang/amplitudo dengan rekaman HP sungguhan di A6.
- A1: PATH proses VS Code saat ini belum memuat ffmpeg (ada di PATH User Windows). Buka ulang VS Code
  sebelum menjalankan server/pytest dari terminal VS Code.
- A1: dengan floor tidak pasti, klip berisi bising bersuara (musik/TV) bisa lolos tanpa `too_noisy`. Cek di A6
  dengan klip `bad_noise`.
- Disk C: tinggal ±5 GB (turun dari ±9 GB). Temp per request kecil, tapi bisa diarahkan ke D: lewat `TMP_DIR`.
- B0: akses HP → laptop (port 8000) belum dicoba dari HP. Bila gagal, cek Windows Firewall (izinkan inbound TCP 8000
  untuk jaringan Private) dan pastikan Wi-Fi laptop berprofil Private.
- SPEC §5: contoh `/analyze` berisi `score: 0.75` untuk unit hijau + merah, padahal rumus §6.8 memberi 0.5.
  Server mengikuti rumus §6.8. Perbaiki contoh di SPEC?
- Lisensi model `face_landmarker.task` belum terverifikasi (lihat `docs/THIRD_PARTY.md`).
- Drive C: laptop server tinggal ±9 GB; arahkan cache pip ke D: sebelum memasang MediaPipe.
- Starlette memberi peringatan bahwa `httpx` untuk TestClient sudah usang (disarankan `httpx2`); tes tetap lolos.
