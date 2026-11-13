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
| A4 | ML | Proses dataset, alat cek label, putaran LOSO | Rabu 11 Nov | selesai | `ml/dataset/{process,folds,report}.py` (logika di `server/app/dataset/`), halaman `/labeler`. 81 klip diproses tanpa gagal (71 s; ulang = lewati semua), `auto_labels.csv` 81 baris, 3 fold LOSO (uji 27, setel 54). `/labeler` diuji di browser sungguhan (video, pintasan 1/2/3/4/spasi/←, simpan, lanjut setelah muat ulang). Saat A4: 368 tes server hijau; cek label manusia kemudian selesai untuk A6 (162 penilaian, Tugas 4). |
| B3 | App | Supabase, logika kemajuan, Mode Pendamping | Kamis 12 Nov | selesai | `src/state/progression.ts` (aturan §8.4, 37 tes), antrean offline + Supabase (`src/data/sync.ts`, `supabase.ts`), `docs/supabase/schema.sql` (4 tabel, 12 kebijakan RLS), Home dengan sesi hari ini dan tahap materi, Mode Pendamping (PIN, ringkasan 7 hari, Uji Dengar, pengaturan, bagikan laporan, saran konsultasi). Saat B3: 164 tes jest, tsc, expo-doctor 20/20, bundle Android bersih. Integrasi iPhone dan Supabase nyata kemudian diuji di I1; rincian cek manual tersisa ada di checklist I1. |
| A5 | ML | Scorer Wav2Vec2 | — | dilewati | data terlalu sedikit; roadmap |
| I1 | Bersama | Integrasi ujung ke ujung di HP | Kamis 12 Nov malam | selesai (dengan keterbatasan uji) | Doctor 20/20, 383 pytest, 166 Jest, tsc dan lint perubahan lolos. Kalibrasi dan latihan L0–3 di iPhone berhasil menurut pengguna setelah server dijalankan di luar sandbox. Supabase online, antrean Uji Dengar offline→online, serta antrean percobaan video saat koneksi Supabase disimulasikan gagal lalu pulih otomatis berhasil. 20 durasi manual: p50 2385 ms, p90 3910 ms, maks 14500 ms (semua sampel dihitung). WAN jaringan bersama tidak diputus; lihat rincian dan cek manual tersisa di `docs/I1_CHECKLIST.md`. |
| A6 | ML | Penyetelan ambang, evaluasi LOSO, model card | Kamis–Jumat | selesai | `ml/eval/{tune_thresholds,evaluate}.py` (logika `server/app/dataset/evaluation.py`), `docs/EVAL_REPORT.md`, `docs/MODEL_CARD.md`; ambang final ditulis ke `thresholds.yaml`. LOSO: bibir rapat 56/60 = 93% ✓, suara saat rapat 43/50 = 86% ✓, vokal 19/23 = 83% (target 85), status kata 12/22 = 55% (target 80); bad_face 3/3, salah tolak 1/74, p90 984 ms. 382 tes hijau |
| B4 | App | Polish, mode demo, build | Jumat 13 Nov | selesai (target Expo Go) | Layar Tentang, profil demo di memori (isolasi dari penyimpanan dan sinkronisasi pribadi), feedback sinkronisasi, label tombol panjang, pemulihan daftar materi kosong, aset cermin/bibir orisinal, dan README app selesai. 174 Jest dan tsc lolos; lint exit 0 dengan 8 warning lama; detektor UI tidak menemukan masalah mekanis. Setelah persetujuan pengguna, 11 patch Expo diperbarui (expo 58.0.24), manifest/lockfile lama dicadangkan; Doctor 20/20. Pengguna mengonfirmasi Tentang tampil baik di iPhone, demo benar dan angka percobaan pribadi kembali sama setelah demo dimatikan. APK/release splash, Android/tablet dan VoiceOver penuh belum diuji. npm: 28 advisori (1 rendah, 27 sedang). |
| F | Bersama | Kunci fitur, README, tag submission | Jumat 13 Nov malam | selesai | Diselesaikan lebih awal dengan persetujuan pengguna. README setup/demo/evaluasi lengkap, lisensi model dari tiga model card Apache-2.0, inventaris Python/JS, scan Git/privasi dan perbaikan log CLI dataset. 389 pytest (0 skip), 174 Jest, tsc, Ruff check/format dan Doctor 20/20 lolos. Lint app exit 0 (8 warning lama), 1 warning deprecation pytest. Tag `v1.0-submission`; daftar berkas dan batas pemeriksaan di `docs/SUBMISSION_CHECKLIST.md`. Video/pengiriman manual belum dilakukan. |
| F-fix1 | App | Penghapusan rekaman kalibrasi (masalah 1 audit) | Kamis 12 Nov | selesai | Freeze dibuka khusus perbaikan atas persetujuan pengguna. `discard(file)` memakai URI kiriman, bukan state render lama. Lima tes baru; dua tes penghapusan gagal pada kode lama lalu lulus. 179 Jest (17 suite), tsc lolos, lint exit 0 dengan 8 warning lama. Tidak mengubah server/API/dependency atau memindahkan tag lama. Masalah 2 belum diperbaiki; penghapusan fisik di iPhone dan cache lama belum diperiksa. |
| F-fix2 | App | Hasil rekaman setelah komponen ditutup (masalah 2 audit) | Kamis 12 Nov | selesai untuk hasil ber-URI | RecordPanel menghapus hasil terlambat tanpa callback/getar selesai. Lima tes komponen dengan kamera, haptics dan operasi berkas sintetis; dua tes reproduksi gagal pada kode lama lalu lulus. 184 Jest (18 suite), tsc lolos, lint exit 0 dengan 8 warning lama. Native menolak tanpa URI masih butuh verifikasi cache di HP; cache lama tidak dibersihkan. Tag lama tidak dipindahkan, tanpa push. |
| F-fix3 | App | Pengalihan materi macet (masalah 3 audit) | Kamis 12 Nov | selesai | Calon inti macet dialihkan satu level ke bawah, lalu selevel, hanya ke materi terbuka yang tidak macet. Pemanasan/tantangan mengecualikan macet. Tanpa pengganti, beranda mengarahkan ke Mode Pendamping. 10 tes baru, 9 reproduksi gagal pada kode lama; seluruh 194 Jest (18 suite), tsc lolos, lint exit 0 dengan 8 warning lama. Riwayat/status/ambang tetap; manfaat pada pengguna sasaran dan tampilan HP belum diuji. Tanpa push/perubahan tag. |
| F-fix4 | App | Pemulihan video contoh gagal diputar (masalah 4 audit) | Kamis 12 Nov | selesai di kode/tes | ModelVideo memantau statusChange, menampilkan loading atau pesan gagal/404 beserta teks/ilustrasi, dan menyediakan coba ulang dengan pemutar baru. Delapan tes baru, tujuh gagal pada kode lama. Seluruh 202 Jest (19 suite), tsc lolos, lint exit 0 dengan 8 warning lama. Pemutaran/cleanup native di HP belum diuji. Tanpa dependency/API baru, push atau perubahan tag. |
| Allosaurus PoC | Riset | CLI fonetik CPU terisolasi | Kamis 12 Nov | selesai untuk eksekusi; akurasi belum diuji | Branch experiment/allosaurus-poc, ml/.venv Python 3.11.5, Allosaurus 1.0.2, Torch 2.15.0+cpu, model uni2005. CLI WAV PCM 16-bit mono 16 kHz, JSON mentah, error aman. 406 pytest termasuk 17 tes baru; Ruff lolos. Inferensi nada sintetis dan pembatasan koneksi Python berhasil; bukan bukti akurasi ucapan. Dependency/config backend tetap sama. Tanpa perubahan pipeline/scoring/API/frontend, commit, merge, push, atau tag. Rincian di docs/ALLOSAURUS_POC.md. |
| Allosaurus App | Riset | Rekam dan lihat prediksi langsung di aplikasi | Kamis 12 Nov | selesai di kode/tes; uji native HP belum | Pengguna menyetujui layar Uji Allosaurus dari Pengaturan versi dev dan endpoint DEBUG-only /v1/experiments/allosaurus. Video -> WAV sementara -> CLI ml/.venv -> JSON mentah. 419 pytest, 214 Jest, tsc dan Ruff lolos; lint 0 error/8 warning lama. Bundle iOS HTTP 200; HTTP server asli dengan video sintetis sukses. Cleanup diuji sintetis, tanpa data pribadi. Rekam/tampilan native serta akurasi belum diuji. Tidak menambah dependency, mengubah scoring/pipeline utama, commit/merge/push atau tag. |

| Wav2Vec2 ASR PoC | Riset | Kata/frasa komunikasi dalam eksperimen | Jumat 13 Nov | berfungsi untuk eksekusi; akurasi belum diuji | Pengguna menyetujui transkripsi dibanding target dan materi eksperimen Tolong/Saya Tuli/Hai/Makan, tanpa mengganti Level 3. Venv ml/wav2vec2/.venv, Python 3.11.5, Torch 2.15.0+cpu, Transformers 5.22.2, checkpoint Wikidepia XLS-R 300M Indonesia dipin revisi/hash. CLI offline, endpoint DEBUG-only, layar rekam native. 455 pytest, 250 Jest, tsc/Ruff lolos; lint 0 error/8 warning lama. CLI offline dan HTTP asli memakai data sintetis sukses; bundle iOS 200. Dependency/config backend identik. Tanpa commit/merge/push/deploy/tag; rincian docs/WAV2VEC2_POC.md. |

## Tugas manual

Revisi terbaru 13 November: pengguna memilih **MediaPipe + Wav2Vec2**, tanpa Parselmouth
di jalur Uji Gabungan. MediaPipe menjadi syarat indikasi berbicara; kecocokan teks memakai
Levenshtein generik menjadi Berhasil/Mendekati/Coba lagi, error proses tetap terpisah.
493 pytest, 280 Jest, tsc dan Ruff lolos; lint 8 warning lama. Model asli sudah diuji
sintetis; pengguna mengonfirmasi kategori Berhasil atau Mendekati muncul di HP.
Validasi ambang terhadap pendengar masih menunggu. Rincian terbaru
di docs/COMBINED_POC.md; catatan tiga observasi di bawah merujuk versi sebelumnya.

Fase eksperimen terbaru (13 November): **Uji Gabungan berfungsi untuk eksekusi/tes**.
Satu konversi untuk MediaPipe, Parselmouth dan Wav2Vec2, hasil terpisah tanpa skor gabungan,
dukungan hasil sebagian, batas ASR terpusat di YAML. **474 pytest, 279 Jest, tsc dan Ruff
lolos**; lint 0 error/8 warning lama. Model asli dan hasil sebagian diuji sintetis;
latensi gabungan n=3 p50 6137,8 ms/p90 6948,7 ms, belum target total 5 detik.
Pengguna mengonfirmasi ketiga bagian hasil gabungan muncul di HP. Akurasi masih perlu
dievaluasi. Detail di docs/COMBINED_POC.md.

| No | Isi | Sebelum prompt | Status |
|---|---|---|---|
| 1 | Pasang Expo Go di HP | B0 | selesai (Expo Go: SDK 58; iPhone butuh login akun Expo yang sama dengan Expo CLI) |
| 2 | Rekam: 3 orang × 27 klip + 16 video model | A2 | selesai (rekam ulang di ruang tenang, 10 Nov malam; 5 klip cacat, lihat Keputusan) |
| 3 | Buat proyek Supabase (isi SQL dan .env saat B3) | B3 | selesai; login anonim/skema diterapkan dan sinkronisasi diuji saat I1 |
| 4 | Cek label: tiap orang ±54 klip milik dua orang lain | A6 | selesai (162 penilaian; "sesuai materi" 90%, kappa 0.65) |
| 5 | Video demo | setelah F | belum |
| 6 | Submission | Sabtu 14 Nov | belum |

## Keputusan penting

- Jumat 13 Nov (publikasi Git): pengguna secara eksplisit meminta push ke main, menggantikan
  batas sebelumnya tanpa commit/merge/push untuk eksperimen. Cakupan publikasi adalah kode,
  tes, konfigurasi dan dokumentasi eksperimen yang telah disetujui, termasuk hasil akhir
  MediaPipe + Wav2Vec2 dan kategori Levenshtein. Validasi terakhir: 493 pytest, 280 Jest,
  tsc/Ruff lolos, lint 8 warning lama. Pemeriksaan calon berkas tidak menemukan pola
  kredensial; rekaman, dataset, model, venv dan .env tidak disertakan. Tag submission lama
  tetap tidak dipindahkan.

- Jumat 13 Nov (kategori latihan dua komponen): pengguna menyetujui MediaPipe sebagai
  pemeriksaan indikasi berbicara dan seluruh kecocokan ucapan dari Wav2Vec2, mengeluarkan
  Parselmouth dari jalur eksperimen ini. Hanya Berhasil bila gate visual lulus dan teks
  cocok; Mendekati tidak menjadi lulus. Audio dasar NumPy/RMS menolak senyap/terlalu singkat.
  Landmark digunakan sepanjang bagian audio aktif dengan offset AV, normalisasi skala mata
  dan filter median; gerak di luar audio atau bibir statis tidak meluluskan. Ini heuristik
  indikasi, bukan bukti sumber suara atau identitas. Ambang awal semuanya dalam YAML.
  Levenshtein generik menggantikan rencana regex variasi; normalisasi Unicode/casefold/
  tanda baca dan spasi, ambang panjang 0,75 atau maksimal satu edit untuk target <=3 karakter.
  Target multipart wajib dan dibatasi empat materi; hanya dipakai setelah inferensi,
  tidak sebagai prompt ASR. Teks mentah dipertahankan, tanpa persentase ketepatan pelafalan.
  Kegagalan model/timeout tidak menjadi ucapan salah: outcome null. SPEC/schema/types,
  fixture, native upload, validator dan layar hasil disinkronkan. 493 pytest, 280 Jest,
  tsc/Ruff lolos; lint 8 warning lama. Jalur baru terbukti dapat diimpor dan memeriksa audio
  dengan impor parselmouth diblokir. Regresi latihan utama lulus. HTTP model asli pada
  video sintetis no_face: Coba lagi/visual_gate, 6224,6 ms; target invalid 422, tipe salah
  415. Pengguna kemudian mengonfirmasi Berhasil atau Mendekati muncul di HP pada versi ini.
  Itu konfirmasi eksekusi/tampilan, belum pengujian masing-masing kategori atau validasi
  ambang terhadap pendengar. Tidak menambah dependency, mengganti progres/Level 3 utama,
  commit/merge/push/deploy/tag, atau membaca dataset pribadi.

- Jumat 13 Nov (Uji Gabungan): implementasi disetujui pengguna setelah rencana satu fase.
  MediaPipe untuk observasi wajah/bibir, Parselmouth untuk ciri/kualitas audio, Wav2Vec2
  untuk transkripsi bebas; target tetap Tolong/Saya Tuli/Hai/Makan di mode eksperimen.
  Tidak menggabungkan menjadi skor, voting, koreksi kata, atau penilaian semua fonem.
  Reuse langsung helper media/komponen yang sudah ada; tidak perlu refactor pipeline
  utama features.py/media.py. Satu upload dan satu konversi, validasi WAV sebelum komponen,
  audio berlebih ditolak. Kegagalan komponen menjadi partial tanpa menghapus hasil lainnya;
  wajah hilang/audio kurang baik tidak menghilangkan teks. Tidak ada syarat F0 baru.
  POST /v1/experiments/combined DEBUG-only, schema/SPEC/types disinkronkan. Wav2Vec2 tetap
  lokal CPU pada venv terpisah; dependency backend identik. Timeout ASR gabungan 30 detik
  ditambahkan ke thresholds.yaml, nilai aturan/kualitas lama tetap. Shared SpeechExperiment
  menjaga alur rekam/upload/cleanup kedua layar sama. Fixture kontrak sintetis diuji kedua
  sisi. 474 pytest, 279 Jest (24 suite), tsc/Ruff lolos; lint 8 warning lama. HTTP asli
  tiga pasang sintetis berhasil; contoh gabungan visual no_face tidak membatalkan teks.
  Hasil partial juga diuji dengan model wajah hilang dan subprocess ASR timeout sungguhan,
  temporary kosong. Latensi 6–7 detik belum target 5 detik dan bukan benchmark pengguna.
  Pengguna kemudian mengonfirmasi ketiga bagian hasil gabungan muncul di HP, sehingga
  alur rekam-ke-hasil terkonfirmasi. Akurasi/perbandingan dengan pendengar, waktu ujung
  ke ujung dari HP dan penghapusan fisik cache native belum dievaluasi.
  Tidak ada dependency baru, penggantian Level 3/progres/Supabase, commit/merge/push/deploy/tag.

- Jumat 13 Nov (pemulihan Expo/uji native): pengguna melaporkan Expo Go tertahan di
  Opening project. Manifest LAN laptop merespons 200 dan menunjuk host/bundle
  192.168.101.22:8081 dengan akun rekanwicara; ini belum membuktikan akses dari HP.
  Log Metro juga memperlihatkan TypeError Cannot convert BigInt to number pada progres
  upload iOS. Helper native kini mengonversi kedua counter byte ke Number sebelum membagi,
  berlaku untuk Allosaurus dan Wav2Vec2. Empat kasus regresi BigInt/mixed/zero gagal pada kode
  lama lalu lulus; 254 Jest dan tsc lolos. Metro dijalankan ulang dengan --clear pada 8081;
  backend tetap 8000. Penyebab macet Opening project masih menunggu cek koneksi/browser HP.
  Pembaruan: pengguna mengonfirmasi /status dari browser HP menampilkan
  packager-status:running. Log backend setelah restart juga mencatat beberapa upload
  Wav2Vec2 dengan respons 200; tampilan hasil di HP masih menunggu konfirmasi, tanpa membaca
  atau menyimpan isi rekaman/transkripsinya untuk pemeriksaan ini.
  Pengguna kemudian mengonfirmasi aplikasi sudah terbuka dan hasil teks muncul di HP.
  Pemulihan pembukaan dan alur rekam-ke-teks terkonfirmasi; akurasi transkripsi serta
  penghapusan fisik cache native belum dinilai.

- Jumat 13 Nov (Wav2Vec2 ASR PoC): arah materi baru adalah kata/frasa komunikasi sehari-hari
  dan meminta bantuan: Tolong, Saya Tuli, Hai, Makan. Pengguna memilih memasukkannya ke mode
  eksperimen dahulu dan meminta teks ucapan dibanding target, belum skor pelafalan per bunyi.
  Dependency/model baru dan endpoint disetujui sebelum implementasi. Checkpoint komunitas
  Wikidepia/wav2vec2-xls-r-300m-indonesian, revisi 8a9d507f0804f8e5fca07b17214b2c0266ba7491,
  bobot SHA-256 e0068f2a14d76c98bf99a3a656bb6a76f71381675055e2ca43d98516aa143bda.
  Tidak melakukan training. Memakai feature extractor/tokenizer eksplisit dan greedy CTC
  tanpa LM; target tidak dikirim ke decoder. Teks mentah dipertahankan; pembandingan hanya
  mengabaikan kapitalisasi/tanda baca/spasi berulang. Tidak ada fuzzy matching atau skor.
  Validasi WAV/konversi sementara dibagi dengan Allosaurus agar privasi dan penolakan durasi
  tetap konsisten; helper upload native juga dipakai ulang. Regresi Allosaurus nyata lulus.
  Model lokal CPU, weights_only=True, tanpa jaringan saat inferensi; venv backend/config/
  pip freeze tidak berubah. CLI offline: 611,954 ms; HTTP video sintetis: 200, total 5649,1 ms,
  inferensi 638,072 ms, teks kosong. 455 pytest, 250 Jest, tsc, Ruff lolos, lint 8 warning lama.
  Ini bukti eksekusi, bukan akurasi. HP/ucapan manusia masih menunggu uji pengguna. Level 3,
  scorer rules, progres dan Supabase tidak diganti. Tetap di working tree eksperimen yang
  sudah berisi pekerjaan Allosaurus, tanpa pindah branch, commit, merge, push atau tag.
- Allosaurus Indonesia: pengguna melaporkan output HP sulit dibaca, memilih bunyi Indonesia
  umum dengan huruf, lalu menyetujui implementasi. Decoder dibatasi ke inventaris repo 32
  token yang semuanya didukung uni2005, mencakup tʃ/dʒ (tidak ada pada ind bawaan model).
  Inventaris yang hilang/duplikat/tidak didukung gagal tanpa fallback universal.
  Layar memetakan ng/ny/sy/kh/c/j; IPA j dipetakan ke y. Variasi e/o digabung hanya untuk
  tampilan; glotal diberi label henti glotal. Token asing ditandai bunyi lain, tidak dihapus.
  IPA mentah dipertahankan lewat Lihat detail dan pada API; tidak mengoreksi ke kata target.
  SPEC, schemas.py dan types.ts mencatat semantik, tanpa field kontrak atau dependency baru.
  424 pytest, 231 Jest, tsc dan Ruff lolos; lint 0 error dengan 8 warning lama. Model asli
  terverifikasi 32 token di luar blank, c/j tersedia, tetap CPU. CLI/API sintetis sukses,
  bukan bukti akurasi ucapan. Bundle iOS lolos; tampilan baru masih perlu Reload dan uji HP.
  Tidak membaca data/ atau mengubah scoring, bobot model, snapshot, commit/merge/push.
- Kamis 12 Nov (reset layanan Allosaurus): setelah dua jalur upload tetap timeout, pengguna
  meminta mulai ulang server agar sesuai dengan app. Backend lama 8000, pembanding 8001,
  dan Metro 8082 dihentikan; satu backend baru berjalan di luar sandbox pada 8000 dan
  Expo online pada 8081. Manifest username rekanwicara dan host Wi-Fi diverifikasi.
  Health dan POST sintetis melalui IP LAN sukses HTTP 200 (prediksi kosong, 577,696 ms).
  App/.env sudah menunjuk 192.168.101.22:8000, sehingga tidak perlu diubah. Override URL
  yang tersimpan pada HP harus dipulihkan lewat tombol Kembalikan ke bawaan; tidak
  menghapus AsyncStorage/profil/progres, data, kredensial atau Git. Uji ulang HP masih menunggu.
- Kamis 12 Nov (upload Allosaurus App): pengguna melaporkan progres 0% lalu gagal/timeout,
  sementara Tes koneksi berhasil. Log belum menunjukkan POST baru yang selesai; akar
  penyebab native/jaringan belum terkonfirmasi. Upload khusus Allosaurus diganti dari XHR
  menjadi UploadTask expo-file-system yang sudah terpasang, sesi foreground, multipart file.
  File lokal diperiksa ada/tidak kosong sebelum upload; progres awal tidak mengarang persen,
  timeout membatalkan task, pembatalan layar diteruskan dan resource native selalu dilepas.
  Pesan file lokal dibedakan dari jaringan. Jalur latihan/kalibrasi/dataset tidak diubah;
  tanpa dependency atau perubahan kontrak server baru. 220 Jest, tsc dan bundle iOS lolos;
  lint exit 0 dengan 8 warning lama.
  pengujian ulang upload HP diminta lewat Reload. Tes native memakai mock; belum mengklaim
  keluhan perangkat selesai. Server tidak diubah sehingga 419 pytest sebelumnya tidak diulang.
- Kamis 12 Nov (koneksi Allosaurus App): Expo Go iPhone melaporkan CLI belum login.
  `expo whoami` online membuktikan akun CLI sudah `rekanwicara`; sesi Metro sebelumnya
  memakai --offline sehingga manifest anonim. Sesi offline dihentikan, Metro online
  dijalankan di port 8082. Manifest diverifikasi menyertakan username rekanwicara dan
  host Wi-Fi 192.168.101.22:8082; backend tetap sehat di port 8000. Panduan diperbaiki,
  tanpa mengubah kode aplikasi/dependency/.env; tidak meminta token atau password.
  Pengujian ulang pada HP masih menunggu pengguna. Tes kode tidak diulang untuk perubahan panduan ini.
- Kamis 12 Nov (Allosaurus App): pengguna memilih hasil langsung di layar dan menyetujui
  perubahan frontend/API eksperimen. RecordPanel dan upload client dipakai ulang; tombol masuk
  ada di Pengaturan saat __DEV__, endpoint hanya saat DEBUG=true. Kontrak ditambahkan bersama
  di SPEC §5, schemas.py dan types.ts. Tidak mengubah /analyze, /calibrate atau dependency utama.
  Server mengonversi audio saja, membatasi decode sampai satu sampel di atas batas agar CLI
  menolak klip berlebih, lalu menjalankan CLI terisolasi dengan timeout tanpa shell. Tidak
  meneruskan stderr/path. File sementara dan upload ditutup pada sukses/error. App menghapus
  rekaman setelah percobaan upload, tanpa retry otomatis; keluar layar membatalkan upload,
  mencoba cleanup dan mengabaikan hasil terlambat. Batas penghapusan native tanpa URI tetap ada.
  419 pytest (13 endpoint baru), 214 Jest (12 baru), tsc/Ruff lolos; lint 8 warning lama.
  Uji API video sintetis 2,5 detik sukses; 4,2 detik ditolak; direktori sementara kosong.
  Server HTTP asli juga sukses (prediksi kosong, inferensi 1172,308 ms). Bukan bukti akurasi.
  Bundle iOS berhasil dan manifest menunjuk IP Wi-Fi; belum ada pemeriksaan visual/kamera HP.
  Expo perlu izin menulis berkas tipe/cache; tipe route dibuat Expo, tanpa cast untuk melewati tsc.
  Snapshot, .env, daftar dependency/config venv backend dan data pribadi tetap tidak diubah.
  Backend dan Metro dijalankan untuk uji HP, tanpa commit/merge/push/deploy.
- Kamis 12 Nov (Allosaurus PoC): pengguna menyetujui eksperimen terpisah dari MVP/submission,
  termasuk dependency Torch hanya di ml/.venv dan branch experiment/allosaurus-poc.
  Python 3.11.5 memakai executable langsung karena launcher py hanya mencantumkan 3.12.
  Model resmi uni2005 dimuat pada CPU tanpa patch library atau pelonggaran pengamanan checkpoint.
  CLI hanya menerima WAV yang sesuai, memakai batas durasi/sample rate dari thresholds.yaml,
  tidak mengunduh saat inferensi, dan tidak menyimpan atau mengubah input. Prediksi mentah
  termasuk string kosong dipertahankan; error dan keluaran library ditahan agar path tidak bocor.
  Nada sintetis menghasilkan string kosong (892,545 ms); uji dengan koneksi socket Python diblokir
  juga sukses (722,083 ms, nol upaya koneksi). Belum menguji ucapan atau akurasi Bahasa Indonesia.
  406 pytest lulus (17 baru), Ruff check/format lolos; warning Starlette/HTTPX lama tetap ada.
  DEBUG=false dan larangan bytecode hanya di proses tes; tidak mengubah .env atau paket backend.
  Hash requirements/pyvenv.cfg dan pip freeze backend cocok sebelum/sesudah. Tidak membaca data/,
  mengubah kontrak/scoring/app, memindahkan tag, atau melakukan commit/merge/push/deploy.
  Ketentuan bobot model sebelum redistribusi serta akurasi pengguna sasaran belum diverifikasi.
- Kamis 12 Nov (F-fix4): pengguna menyetujui perbaikan khusus video contoh yang gagal
  diputar setelah pemeriksaan ketersediaan. ModelVideo memakai useEvent/statusChange
  dari Expo dan lifecycle useVideoPlayer yang sudah terpasang; API diperiksa dari source
  paket lokal. Kegagalan sebelum listener terpasang juga ditangani lewat status awal.
  Loading memakai indikator/teks; 404 dan error memakai InfoNote, ilustrasi yang sudah
  ada dan tombol Coba muat video lagi. Error mentah tidak ditampilkan atau dicatat.
  Beralih ke cadangan melepas komponen Player; coba ulang memeriksa ketersediaan dan
  membuat pemutar baru. Tidak ada pengulangan otomatis atau perubahan ClipPreview.
  Delapan tes baru memakai hook event Expo asli dengan API/pemutar native sintetis;
  tujuh gagal pada kode lama. Tes membuktikan status, cadangan, retry, pelepasan listener,
  cleanup mock, dan pengabaian hasil pemeriksaan setelah layar ditutup. Seluruh 202 Jest,
  tsc lolos, lint exit 0 dengan 8 warning lama; tes F-fix1–F-fix3 tetap lulus.
  Server/ML dan Doctor tidak diulang karena server/dependency/config tidak diubah.
  Tidak membuka data, memutar video wajah atau mengunggah media. Pemutaran/cleanup
  native dan tampilan di iPhone/Android belum diuji. Tag lama serta dua panduan staged
  pengguna dipertahankan; tanpa push. Batas privasi F-fix2 tanpa URI tetap berlaku.
- Kamis 12 Nov (F-fix3): pengguna menyetujui penanganan materi macet sesuai SPEC §8.4.
  Pemilihan inti dipakai bersama oleh planner dan beranda: jika calon pertama macet,
  cari materi terbuka yang tidak macet satu level di bawahnya, lalu selevel, dengan
  urutan konten sebagai penentu. Alternatif boleh sudah lulus/berstatus ulasan;
  pengalihan tidak menghapus riwayat atau membatalkan kelulusan. Materi macet tetap
  tersedia untuk pilihan manual, tetapi tidak dipilih otomatis sebagai pemanasan,
  inti atau tantangan. Deteksi macet, pola berblok/acak dan aturan lulus tidak diubah.
  Tanpa alternatif, inti tidak dipaksakan dan beranda mengarahkan ke Mode Pendamping,
  memakai InfoNote yang sudah ada. Pesan sesi selesai tidak ditampilkan pada keadaan
  ini. Sesi pendek yang terisi ulasan tidak keliru diberi pesan tanpa alternatif;
  kelayakan inti diperiksa terpisah dari pemotongan jumlah langkah.
  Sepuluh tes baru, sembilan reproduksi gagal pada kode lama; 194 Jest (18 suite),
  tsc lolos, lint exit 0 dengan 8 warning lama. Tes privasi F-fix1/F-fix2 tetap lulus.
  Server/ML dan Doctor tidak diulang karena server/dependency/config tidak diubah.
  Tidak membaca dataset atau mengubah tag lama; dua panduan staged pengguna tetap
  di luar commit. Pengalihan belum diuji di HP atau pada pengguna sasaran; tidak
  mengklaim efektivitas belajar. Batas privasi native tanpa URI dari F-fix2 tetap ada.
- Kamis 12 Nov (F-fix2): pengguna menyetujui perbaikan khusus hasil rekaman yang datang
  setelah RecordPanel ditutup. Pemakai komponen adalah latihan, kalibrasi, sesi dataset
  dan video model; perbaikan dilakukan sekali di komponen bersama. Hasil terlambat ber-URI
  dihapus melalui helper yang sudah ada; hasil normal tetap diserahkan ke pemanggil,
  sehingga file tidak dihapus sebelum upload/preview. Tidak menambah dependency/API.
  Tes komponen membuktikan hasil terlambat dihapus, hasil normal diteruskan tepat sekali,
  kamera/timer dibersihkan saat pembatalan, hitung mundur tidak memulai rekaman setelah
  ditutup, dan penolakan promise terlambat tertangani. Stop kamera yang melempar error
  tidak menghalangi penghapusan hasil terlambat. Microtask React tetap asli; timer rekam
  memakai timer sintetis. Lima tes baru; seluruh 184 Jest dan tsc lolos, lint 0 error
  dengan 8 warning lama. Tes F-fix1 tetap lulus. Server/ML dan Doctor tidak diulang.
  Batas: Expo iOS dapat menolak promise saat kamera ditutup tanpa mengembalikan URI.
  Tidak ada penghapusan terarah yang bisa dibuktikan untuk jalur itu; perlu pemeriksaan
  perangkat sebelum mengklaim seluruh privasi terpenuhi. Cache lama tidak dibersihkan,
  folder data tidak dibaca. Tag lama dan dua panduan staged pengguna dipertahankan.
- Kamis 12 Nov (F-fix1): pengguna menyetujui pembukaan freeze hanya untuk masalah 1.
  Callback respons kalibrasi sebelumnya menangkap `uri` lama saat rekaman diserahkan;
  sekarang penghapusan menerima argumen `file` yang dikirim. Respons sukses maupun
  kualitas `retry` menghapus file; gagal jaringan menyimpannya untuk kirim ulang.
  Tes memakai layar dan hook upload asli, kamera/API serta operasi berkas dimock:
  sukses, retry kualitas, gagal jaringan, kirim ulang sukses, dan Rekam ulang.
  Tidak membaca dataset atau menghapus cache lama. Server/ML dan Doctor tidak diulang
  karena perubahan hanya pada layar kalibrasi dan tesnya. Tag `v1.0-submission` tetap
  menunjuk commit lama `1c930f9`; bukan versi yang sudah mengandung perbaikan ini.
  Dua panduan staged milik pengguna dipertahankan di luar commit perbaikan. Tidak push.
- Rabu 11 Nov (F): kode dibekukan lebih awal atas persetujuan pengguna. Tidak menambah
  fitur, dependency atau mengubah API/ambang. CLI dataset/evaluasi sebelumnya mencetak
  nama/path rekaman dan exception mentah; kini mencetak jumlah/kode, menyimpan laporan
  rinci hanya lokal, dan menahan traceback tak terduga lewat helper bersama. Enam tes
  sintetis baru menguji exit code, error aman serta proses berhasil/gagal tanpa membaca
  dataset. Persyaratan environment tidak diakali: venv 3.11.5, Node 24.11.0,
  FFmpeg/ffprobe di PATH. `DEBUG=release` disingkirkan hanya dari proses tes.
- Rabu 11 Nov (F): model card resmi BlazeFace, Face Mesh V2 dan Blendshape V2 berhasil
  dibaca; ketiganya Apache-2.0. THIRD_PARTY kini mencatat dependency langsung Python/JS,
  komponen native utama serta batas kewajiban GPL. Audit npm baca-saja mengonfirmasi
  28 advisori (1 rendah, 27 sedang, 0 tinggi/kritis); tidak mengubah paket karena lolos
  kompatibilitas Expo dan dampak advisori belum dinilai per kasus. Pemindaian pola
  rahasia tidak membuktikan tidak ada semua jenis rahasia; riwayat dipindai nama berkasnya,
  bukan seluruh isi blob historis. Folder data tidak dibaca. Dua panduan pengguna yang
  tidak terlacak dibiarkan di luar commit. Tidak melakukan push.
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

## Perubahan UI (design v6)
- Fase UI (13 Nov 2026, cabang `design`): UI-1 sampai UI-10 selesai dan di-commit; UI-11 audit. Langkah opsional 0.2
  (Playfair Display, cincin fokus) tidak dikerjakan: judul memakai serif sistem (`Georgia`/`serif`).
- `npm run typecheck` masih gagal di `app/settings.tsx` (rute `/wav2vec2`, `/combined`, `/allosaurus`): `.expo/types/router.d.ts`
  usang sejak commit 7b06448. Perbaikan: jalankan `npx expo start` sekali di `app/` agar tipe rute dibuat ulang. Bukan kesalahan kode.
- Keputusan di luar design.md:
  - `colors.success` = `#7FD1A0` (hijau status) untuk teks/ikon "tersimpan/terkirim"; §3 tidak menyebut nilainya.
  - Token baru: `overlay.scrim` (lapisan hitung mundur), `buttonHeight` 52, `chart.userFill`. Token `lip` dihapus (gambar bibir hanya garis).
  - `InfoNote` netral tetap bergaris `border`; tanpa garis `infoBg` hampir tak terlihat di `background`.
  - `HeroCard` saat sesi selesai berjudul "Latihan hari ini" (§6.2.1 hanya menulis "judul tetap").
  - Teks "Sesi hari ini selesai. Terima kasih sudah berlatih!" menjadi "Sesi hari ini selesai." (§7: tanpa tanda seru, tanpa pujian).
  - Kartu target di Hasil memakai gabungan `units[].target` sebagai kata; testID baru `result-target`.
  - `testID` `mission` pindah ke kartu "Langkah hari ini". Ikon bar bawah: `barbell-outline`, `people-outline`, `information-circle-outline`.
  - `BottomBar` tidak melayang: `Screen` punya prop `footer` di bawah area gulir (di dalam area aman), jadi konten tidak tertutup.
  - Bobot `OptionGroup` tak terpilih 600 → 400 (UI-11, §4 hanya 400/700).
- Temuan audit UI-11 yang tidak diperbaiki (butuh keputusan):
  - Angka ukuran literal tersisa: hitung mundur 140/160 (dipertahankan §9), kata target 56 di layar dataset (layar pengembang),
    padding 20 (`HeroCard`, kartu petunjuk) dan 12 (`StatTile` lewat `spacing.sm + spacing.xs`) karena skala jarak tidak punya 12/20,
    ukuran teks SVG grafik (satuan viewBox).
  - Simbol ✓/✕ di teks status izin (`PermissionGate`) dan "✓ Terkirim"; §5.3 menghindari tanda silang untuk status hasil, bukan izin.
  - Kata "gagal"/"salah" muncul di pesan kesalahan teknis (PIN, simpan, perekaman), bukan di hasil latihan.
  - `ProgressBar` tak tentu memakai opacity 0,4 (larangan opacity hanya untuk tombol).
  - `TextFallback` di `ModelVideo` adalah `Card` di dalam `Card` saat video 404 (padding dobel).
- UI-5: `__tests__/StatusBadge.test.tsx` diubah. Uji ikon Ionicons (`icon:checkmark-circle` dst.) diganti uji bentuk SVG
  (`status-shape-circle/triangle/square`); uji latar `background` diganti uji batang kiri `borderLeftColor`; uji "ikon berbeda"
  di `statusStyles` dihapus karena `statusStyles` kini hanya `{label, foreground}` (bentuk dibuktikan oleh uji bentuk).
  Garis bagian dalam ikon (centang, ≈, panah) 2 dp, bukan 3,5 dp, agar muat di 22 dp. Belum diuji di perangkat.

- UI-10: `settings.vibration` (default true; profil lama tanpa field terbaca true). `__tests__/sync.test.ts` diubah:
  nilai pengaturan di uji round-trip dan uji default kini memuat `vibration`. Getar rekam dimulai kini impact Medium (sebelumnya Heavy), sesuai §8.
  Reduce Motion: satu-satunya animasi app adalah skala tombol (sudah mengikuti `useReduceMotion`); cincin kemajuan dan hitung mundur tidak beranimasi.

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
