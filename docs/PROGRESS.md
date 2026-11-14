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
- Perbaikan setelah audit 13 Nov malam (di luar PROMPT_UI, atas permintaan pemilik proyek):
  - Ikon app dan splash diwarnai ulang (garis krem, latar `#08110B`); latar ikon adaptif Android `#08110B`. Sebelumnya `icon.png`
    berlatar putih penuh sehingga tampil sebagai kotak putih saat app dibuka.
  - Skala teks dikecilkan: body/label 16 (baris 24, token `lineHeight.body`), large 20, title 24, display 34; small tetap 15.
  - `practice`: judul header "Ucapkan “kata”"; StepHeader "dari 3" (Ulangi adalah tombol, bukan layar).
  - Ikon barbel diganti `mic-outline` (bar bawah) dan `mic` (`StageBadge` Berlatih).
  - Pengaturan bisa dibuka dari layar Tentang (tombol "Pengaturan"); tekan-lama "Misi hari ini" tetap ada. Isi Pengaturan:
    Getar dan keterangan ukuran teks di atas, bagian "Untuk operator demo" (alamat server, profil demo, uji eksperimen) di bawah.
    Alasan: sakelar Getar sebelumnya hanya ada di layar tersembunyi, bertentangan dengan §2 (getar bisa dimatikan).
  - Getar hasil (§8) ditambahkan: Sesuai = notifikasi berhasil, Mendekati/Belum sesuai = impact ringan, berdasarkan `overall`;
    tidak bergetar saat hasil disembunyikan (mode `hidden`). Tes di `__tests__/haptics.test.ts`.
  - `home` diurutkan ulang: catatan (demo, kalibrasi, server), Misi hari ini + kartu utama, langkah hari ini, kemajuan,
    lalu "Semua materi" dengan ubin level tepat di atas daftar materinya. Tidak ada isi yang dihapus.
  - Onboarding langkah PIN menjelaskan fungsi PIN (mengunci Mode Pendamping) dan bahwa PIN tidak dikirim ke server.
  - Typecheck kini lulus penuh setelah `npx expo start` membuat ulang tipe rute.
- Fase UI (13 Nov 2026, cabang `design`): UI-1 sampai UI-10 selesai dan di-commit; UI-11 audit. Langkah opsional 0.2 kemudian dikerjakan
  (UI-12): Playfair Display Bold dimuat di `app/_layout.tsx` (cadangan serif sistem bila gagal) dan cincin fokus di `BigButton`/`Card`;
  keduanya **belum diverifikasi di perangkat** (design.md §14). (Diperbarui FL-10; kalimat lama "tidak dikerjakan" usang.)
- `npm run typecheck` lulus (FL-10, cabang `flow-v2`). Bila tipe rute usang setelah menambah layar, jalankan `npx expo start` sekali di `app/`
  agar `.expo/types/router.d.ts` dibuat ulang. (Kalimat lama "typecheck masih gagal" usang.)
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

## Alur v2
- FL-D (13 Nov 2026, cabang `flow-v2`): lapisan data v2 tanpa mengubah layar. Berkas baru: `src/api/v2.ts`, `src/data/{types,mappers,catalog,analyze,useCatalog}.ts`,
  `src/mock/` (`catalog.json`, `words/*.json`, `index.ts`). Diubah: `src/config.ts` (`USE_MOCK`, `ANALYZE_API`), `.env.example`,
  `src/api/types.ts` (bagian v2 di bawah; v1 tidak berubah), `src/api/upload.ts` (field `headers` opsional untuk Bearer; v1 tidak mengirimnya).
  Tes: `__tests__/mappers.test.ts`, `__tests__/analyzeSource.test.ts`; 30 suite / 316 tes lulus, typecheck lulus.
- Penyimpangan dari kontrak FE §4–§5 (disetujui Rico):
  - Id suku kata bawaan di tiruan = id v1 (`l2_ma`, `l2_pa`) agar `ANALYZE_API=v1` bisa menilainya.
  - Berkas tiruan kata Pendamping bernama `custom_1111.json`/`custom_2222.json` (Windows melarang `:`); id di dalamnya tetap id kontrak.
    Id suku kata TO/LONG (`custom_syllable:…`) dikarang; kontrak tidak menyebutnya.
  - `visuals` memakai tipe `Visuals` v1 (anchor boleh `null`, `loudness` bertipe) alih-alih bentuk dalam kontrak (`loudness: unknown`).
  - `fromV1`: petunjuk tunggal v1 masuk `lip_feedback` bila Bibir belum sesuai, selain itu `voice_feedback` bila Suara belum sesuai;
    keduanya `null` bila keduanya Sesuai (kontrak §5 aturan 5). `feedback` = `{ code: hint_id, message: teks hint }`; `engine` = `engine_version`.
  - Galat v2 tanpa kode di body diberi kode dari status (§9: 401 `UNAUTHENTICATED`, 404 `ITEM_NOT_FOUND`, dst.).
  - Kata `source: 'custom'` dengan `ANALYZE_API=v1` melempar `NotSupportedError` (`code: 'NOT_SUPPORTED_V1'`); pesan diputuskan di FL-4 (K10).
- Belum teruji: klien v2 belum pernah memanggil server sungguhan (server lokal hanya punya `/v1`). Hasil `ANALYZE_API=mock` ditandai `sample: true`;
  layar wajib memberi label "Hasil contoh" (K10).

- FL-1 (13 Nov 2026): verifikasi aset, tanpa perubahan kode. `splash-icon.png`, `android-icon-foreground.png`, `favicon.png`: PNG RGBA, sudut transparan
  (RGB krem `#FAFCF9`, alfa 0), tanpa piksel tepi putih/abu di area transparan. `android-icon-monochrome.png`: RGBA, sudut transparan.
  `icon.png` dan `android-icon-background.png`: PNG RGB tanpa alfa (latar penuh `#08110B`, piksel pertama (8,17,11), bukan putih). `splash-wordmark.png` belum ada:
  splash tetap memakai ikon; wordmark menunggu aset dari Rico. Belum diuji: splash di build sungguhan (Expo Go memakai splash sendiri).
  Pengingat FL-2: setiap layout baru (`(tabs)/_layout`, Stack bersarang) wajib memakai `contentStyle`/`sceneStyle` berlatar `colors.background`.
- FL-2 (13 Nov 2026): tiga tab tetap. `app/(tabs)/_layout.tsx` (Tabs, `tabBar` = `BottomBar`, `sceneStyle` berlatar `background`, area aman dari `insets` milik `tabBar`),
  masing-masing tab punya Stack sendiri. `home.tsx`, `companion.tsx`, `settings.tsx` dipindah (git mv) ke `app/(tabs)/<nama>/index.tsx`; isinya tetap, hanya path impor
  dan footer `BottomBar` di Beranda dibuang. URL `/home`, `/companion`, `/settings` tidak berubah. `practice/[itemId]` tetap di Stack akar, jadi menutupi tab dan bar tersembunyi.
  Opsi header gelap dipindah ke `src/navigation/stackOptions.tsx` (dipakai Stack akar dan Stack tiap tab; `DemoIndicator` ikut pindah).
  Karena bar Beranda hilang, ditambah tombol sekunder "Tentang aplikasi" di kaki Beranda (tautan ke About; sebelumnya item bar).
  Tes diubah: `home.test.tsx` (impor path baru; langkah menekan tombol "Mode Pendamping" dibuang karena bar bukan lagi bagian Beranda);
  tes baru `BottomBar.test.tsx` menggantikannya. Belum teruji di perangkat: tombol kembali Android/iOS dari tab, label bar pada skala teks 200%.
- FL-3 (13 Nov 2026): Beranda dua kartu tanpa misi. `app/(tabs)/home/index.tsx` ditulis ulang: catatan demo, kalibrasi (`calibration-banner`), server mock,
  galat kesehatan tetap; kartu "Level 1, Bunyi vokal" dan "Level 2 dan 3, Pilih kata" (`Card` dengan `onPress`, ringkasan "x dari N sesuai"), tautan
  "Tentang aplikasi", "Mode Dataset" bila `DATASET_MODE`. Katalog dari `useCatalog` (alamat server dari `useSettings`); galat katalog = `home-error` + "Coba lagi".
  Baru: `src/data/progress.ts` (`bestStatus`, `lastStatus`, `summary` per `itemId` unik), `app/(tabs)/home/level-1.tsx` (daftar bunyi L1, `item-<itemId>`,
  ke `practice/[itemId]`, tanpa kunci), `app/(tabs)/home/words.tsx` (sementara: "Segera hadir"; diganti FL-5).
  Dihapus dari UI (NAV-3/NAV-4, Q6): tekan-lama "Misi hari ini", `HeroCard` misi, "Langkah hari ini", `StatTile`, ubin Level 0–4, `StageBadge`, kalimat kunci.
  Berkas logika (`progression.ts`, `homeStats.ts`, `levels.ts`) dibiarkan.
  Keputusan: badge di daftar L1 memakai status **terakhir** berlabel "Terakhir" (LAT-1), sedangkan ringkasan kartu memakai status **terbaik** (kontrak §8);
  menampilkan status terbaik dengan label "Terakhir" tidak jujur. Ringkasan kartu L2–3 sementara hanya menghitung kata (Level 3); suku kata ditambah di FL-5.
  Tes dihapus dari `home.test.tsx` beserta alasannya: "directs the user to Companion when no replacement exists" (×2) dan "does not report missing alternatives"
  (misi/`needsHelp` dibuang, NAV-3); "opens the hidden Settings with a long press" (Pengaturan kini tab, NAV-4); "lists only the chosen level" (ubin level dibuang);
  "offers recovery for an empty list" diganti tes galat katalog. Tes baru: `home.test.tsx` (4), `level1.test.tsx` (2), `progress.test.ts` (3).
  **Penting untuk demo:** server lokal belum punya `/v2/catalog`, jadi `app/.env` harus berisi `EXPO_PUBLIC_USE_MOCK=true`; tanpa itu Beranda menampilkan `home-error`.
  Risiko: `l1_o` di `server/app/content/items.json` `active: false`, sehingga `practice/[itemId]` (masih membaca `/v1/items`) menampilkan "Materi tidak ditemukan"
  untuk O sampai FL-4. Progres lama dari Level 0–4 ikut terhitung bila id-nya sama dengan katalog. Belum teruji di perangkat (skala teks 200%, TalkBack).
- FL-4 (13 Nov 2026): sesi latihan memakai `PracticeItem` dan hasil per level.
  - `practice/[itemId]` menerima `itemId` + opsional `wordId`, `position`; materi dicari lewat `usePracticeItem` (katalog L1, atau `getWord` → langkah/kata utuh).
    Tidak ditemukan → "Materi tidak ditemukan." + "Kembali". Kirim lewat `src/data/analyze.ts` (bawaan `/v1/analyze` + `fromV1`). 503/504 → "Penilaian belum bisa dilakukan. Coba lagi."
  - Kata `source: 'custom'` dengan `ANALYZE_API=v1`: tombol rekam disembunyikan, catatan "Penilaian kata ini belum tersedia di server demo." (usulan K10; menunggu keputusan Rico).
  - Progres: `attemptFromResult` (baru, `src/user/pure.ts`) menyimpan hanya `evaluated`; `retry` dan **hasil tiruan (`sample`) tidak disimpan** (hasil contoh bukan analisis rekaman).
    `score` disimpan sebagai cermin status (1 / 0,5 / 0) karena v2 tidak punya skor; bukan skor terukur. `feedbackDetail` (mode `hidden`/`overall`) tidak dipanggil lagi.
  - `ResultView(result: AnalyzeResult, item: PracticeItem)`: lencana Bibir/Suara hanya bila tidak `null`; kartu umpan balik `result-hint` (maks 2 kalimat, Bibir dulu, tidak dirender bila tidak ada kalimat);
    grafik hanya `level === 1`; `result-sample` "Hasil contoh, bukan analisis rekaman."; retry: alasan (`result-retry-reason`) + "Rekaman ini tidak dihitung sebagai percobaan." dan tombol "Rekam ulang".
    Kartu target selalu tampil (L1 dengan gambar bibir bila bunyinya a/i/u).
  - `statusStyles`, `StatusIcon`, `StatusBadge`, `buzzResult` kini berkunci `sesuai`/`mendekati`/`belum_sesuai` (warna dan bentuk tetap); `CombinedObservations` dan `level-1.tsx` disesuaikan.
  - Keluar latihan (NAV-6): `headerLeft` "Keluar latihan" (≥ 48 dp); `usePreventRemove` (`@react-navigation/native` 7.5.1, tanda tangan dicek di `.d.ts` terpasang) + `Alert.alert` saat `record`/`send`.
  - `ModelVideo(item: PracticeItem)`: instruksi selalu tampil; video tim `/v1/model-video/{itemId}` hanya bila `ANALYZE_API=v1`; video dibisukan; label "Instruksi dibuat dengan bantuan AI" bila `instructionSource === 'ai'`.
    `item.video` (signed URL) belum disambung (FL-8). Gambar bibir per unit dibuang dari fallback (PracticeItem tidak punya `units`); hanya vokal L1 yang bergambar.
  - Tes diubah: `ResultView.test.tsx` ditulis ulang (HAS-1..4, kontrak §5: L1 tiga status + grafik, L2 dua status tanpa grafik, `mendekati` L2 tidak tampil, umpan balik ≤ 2 urut Bibir-Suara,
    tanpa kartu bila sesuai, retry, label hasil contoh; tes mode `overall`/`hidden` dihapus karena fiturnya dihapus, kontrak §8); `StatusBadge.test.tsx` dan `haptics.test.ts` (kunci status v2);
    `ModelVideo.test.tsx` (`PracticeItem`, video dibisukan, instruksi, tanpa v1 = teks saja, label AI). Baru: `practice.test.tsx` (6). 34 suite / 328 tes.
  - Risiko: `l1_o` tidak aktif di server tetapi diterima `/v1/analyze` (`items_by_id`); aturan e/o belum disetel, jadi hasil O belum dapat dipercaya.
    Belum teruji: alur di HP, dialog keluar + tombol kembali Android, v2 sungguhan, signed URL.
- FL-5 (13 Nov 2026): Pilih kata dan Jalur kata. Baru: `src/components/SourceChip.tsx` (ikon + "Bawaan"/"Dari Pendamping", `radius.tile`),
  `app/(tabs)/home/words/index.tsx` (daftar semua kata, `word-<id>`, kosong = `InfoNote`), `words/[wordId].tsx` (bagian "Level 2 · Suku kata" bila ada, "Level 3 · Kata", penanda "Berikutnya"
  pada langkah pertama yang status terbaiknya belum sesuai, urut L2 lalu L3; tanpa kunci; ketuk → `practice/[itemId]` dengan `wordId` + `position`; 404 → "Materi tidak ditemukan." + Kembali).
  Placeholder `words.tsx` FL-3 dihapus. Kata `custom` dengan `ANALYZE_API=v1`: kartu tetap tampil, catatan "Penilaian belum tersedia di server demo." (K10).
  Keputusan: ringkasan di daftar hanya "Level 3: sesuai/belum" (ringkasan Level 2 butuh `getWord` per kata = N permintaan di v2; ditunda). Status di Jalur kata berlabel "Terbaik" (status terbaik per `itemId` unik).
  Tes: `words.test.tsx` (7). 35 suite / 335 tes. Belum teruji: di HP, katalog v2 sungguhan, kata Pendamping sungguhan.
- FL-5b (13 Nov 2026): komponen formulir bersama, belum dipakai layar mana pun. Baru: `src/forms/{limits,messages,useFormState}.ts` (semua teks pesan di `messages.ts`;
  `Problem` = kunci atau kunci + nilai untuk `{placeholder}`), `src/forms/validators/{auth,pin,word,video}.ts` (fungsi murni), `src/components/form/`
  (`TextField`, `PasswordField`, `Checkbox` (membungkus `CheckRow`), `FormBanner`, `Snackbar`, `ConfirmDialog`, `PinDots`, `PinPad`, `FieldError`, `announce`),
  token `pinKey` (64) dan `stroke.focus` (3). Tes: `validators.test.ts` (105), `formComponents.test.tsx` (17). 37 suite / 457 tes.
  Keputusan aturan yang ambigu:
  - Sandi tidak pernah dipangkas atau diubah (boleh ditempel). Spasi di awal/akhir **ditolak** (pesan baru `passwordEdgeSpace`, tidak ada di flow §7.1.1); spasi (juga ganda) di tengah boleh.
  - "Huruf" di sandi = huruf Unicode apa pun; angka hanya 0–9. Username/kata/suku kata hanya ASCII A–Z (sesuai flow). Emoji dihitung satu karakter.
  - Spasi ganda: kata → satu spasi; instruksi → spasi/tab dirapatkan, baris baru tetap; suku kata dan sandi tidak dinormalisasi selain pangkas (sandi tidak dipangkas).
  - `isWeakPin`: semua sama atau urutan naik/turun tepat 4 digit (0123, 9876 ikut); tidak melingkar (8901 lolos).
  - Ukuran video pada pesan dibulatkan ke atas ("51 MB" untuk 50 MiB + 1 byte) agar tidak terbaca sama dengan batas.
  - `syllablesMatch` hanya peringatan (`Problem` dengan nilai), `maxSyllables(count)` mengembalikan `syllablesFull` saat penuh.
  - Pesan Masuk: "Isi email." dan galat umum "Email atau kata sandi salah." (kontrak #4); pesan ketersediaan username dibuang.
  - `Snackbar` absolut di dasar scene (di dalam tab ia berada di atas bar bawah), minimal 5 detik, ketuk untuk menutup, tanpa animasi.
  - `ConfirmDialog`: fokus pembaca layar awal ke Batal (`setAccessibilityFocus`, belum teruji di perangkat); latar memakai `overlay.scrim`.
  Belum dikerjakan (bukan bagian prompt): `VideoField`, `SyllableRow` (FL-8). Belum teruji: pengumuman pembaca layar (iOS `announceForAccessibility`, Android live region), fokus garis 3 dp, skala teks 200%.
- FL-6 (13 Nov 2026): PIN Pendamping per akun. Baru: `src/pin/lock.ts` (murni: `lockState`, `afterFailure`, `parseLock`), `pinStore.ts` (SecureStore: `hasPin`, `savePin`, `verifyPin`,
  `getLock`, `recordFailure`, `clearFailures`, `attemptPin`; migrasi sekali dari `cw.companionPin`), `PinSession.tsx` (terbuka/terkunci; kunci saat `AppState` bukan `active`, saat tab Latihan tampil,
  dan 5 menit tanpa sentuhan), `PinScreenBody.tsx` (+ `usePinInput`), `PinGate.tsx`; layar `app/auth/create-pin.tsx` dan `(tabs)/settings/change-pin.tsx`; `src/forms/flash.ts` (snackbar "PIN diganti." di Pengaturan).
  `PIN_LIMITS` di `src/forms/limits.ts` (5 salah, kunci 30 detik, diam 5 menit). Gerbang ada di `_layout` tab Pendamping dan Pengaturan; tab Latihan dan sesi latihan tidak pernah meminta PIN.
  `index.tsx`: tanpa PIN → `/auth/create-pin`, lalu `/onboarding` atau `/home`. Onboarding kini 2 langkah; `completeOnboarding()` tanpa argumen dan tidak lagi menyimpan PIN;
  `savePin`/`verifyPin` lama di `user/storage.ts` dihapus. Pengaturan punya tombol "Ganti PIN". Teks PIN tidak mengklaim keamanan (hanya pengunci tampilan, disimpan di HP ini).
  Keputusan: (1) kunci SecureStore `rw.companionPin.<uid>` dan `rw.pinLock.<uid>` (tanda `:` dari kontrak §2 ditolak SecureStore: hanya huruf/angka/`.`/`-`/`_`); `uid` = `'local'` sampai FL-7.
  (2) Setelah kunci 30 detik habis, hitungan salah mulai dari 0 (5 percobaan baru). (3) Getar salah = `buzzLight` (impact ringan, mengikuti sakelar Getar), bukan pola error; tanpa animasi goyang.
  (4) Pindah ke Latihan memakai `useSegments` di layout tab; membuka sesi latihan (di luar tab) tidak mengunci, tetapi app ke latar mengunci. (5) Berbagi laporan (`Share`) dari Pendamping bisa
  membuat `AppState` bukan `active` di sebagian perangkat → sesi terkunci; belum dicek di perangkat. (6) "Lupa PIN?" **belum ada** (butuh sandi akun dari FL-7); tautan disembunyikan.
  Tes diubah: `onboarding.test.tsx` (langkah PIN dan tes keystore dibuang; kini tes dua langkah), `demo.test.tsx` (`completeOnboarding()` tanpa PIN; asersi `savePin` dibuang karena fungsinya pindah),
  `companion.test.tsx` (tes layar PIN diganti tes "tidak meminta PIN sendiri + Kunci kembali memanggil `lock`"; pembantu `unlock` hanya merender). Baru: `pin.test.tsx` (17). 38 suite / 472 tes.
  Belum teruji: di perangkat (iOS, TalkBack), `isValidPin` di `user/pure.ts` kini tak dipakai UI (dibiarkan).
- FL-7 (13 Nov 2026): Masuk, Daftar, Cek email, sesi tersimpan. Baru: `src/auth/{supabase,errors,session,AuthProvider,authForm}`, `src/mock/auth.ts`, layar `auth/{sign-in,sign-up,check-email}`.
  Klien Supabase dipindah ke `src/auth/supabase.ts` (satu klien; `data/supabase.ts` mengimpornya). `auth` di `session.ts` memilih Supabase atau tiruan lewat `USE_MOCK` di satu tempat;
  sesi yang sampai ke UI hanya `{uid, email, displayName}` (tanpa token, tanpa sandi). Peta galat (`mapAuthError`) memakai `code` supabase-js v2 (`invalid_credentials`, `email_exists`/`user_already_exists`,
  `email_not_confirmed`, `AuthRetryableFetchError`), bukan teks pesan. Masuk = email + sandi (kontrak #4); Daftar = username (display_name), email, sandi + daftar periksa + ulangi + persetujuan privasi (tautan ke `/about`).
  Gerbang awal `index.tsx`: belum ada sesi → `/auth/sign-in`; tanpa PIN → `/auth/create-pin`; belum onboarding → `/onboarding`; selain itu `/home`. PIN kini per akun (`useAuth().uid`).
  K3: `signInAnonymously()` dihapus; `ensureUser()` kini melempar "Belum masuk" tanpa sesi akun. Baris `profiles` (display_name) dibuat best-effort saat sesi muncul (`ensureProfile`).
  Tiruan: `salah@contoh.id` → INVALID_CREDENTIALS, `dipakai@contoh.id` → EMAIL_TAKEN (daftar), `cek@contoh.id` → tanpa sesi (layar Cek email), `mati@contoh.id` → NETWORK; uid `mock-user`.
  `src/api/v2.ts`: 401 `UNAUTHENTICATED` → `refreshSession` sekali, ulang sekali, gagal → `onSessionLost` (belum disambung ke layar: klien v2 belum dipakai layar; tes saja).
  Keputusan di luar prompt: (1) **Tanpa akun** (tidak ada URL/kunci Supabase dan `USE_MOCK` mati) gerbang melewati Masuk, uid `'local'`; kalau tidak, app tak bisa dibuka di demo server-lokal tanpa Supabase.
  (2) **`createRemote()` null saat `USE_MOCK=true`**: pengguna tiruan bukan pengguna Supabase, jadi sinkron online mati selama mode tiruan. (3) Sinkron kini hanya jalan bila ada sesi akun; riwayat anonim lama tidak dipindah (K3).
  (4) Penyimpanan sesi tetap AsyncStorage (K7, usulan audit; bukan SecureStore karena sesi Supabase besar). (5) PIN lama di uid `'local'` tidak otomatis menjadi PIN akun: akun baru membuat PIN baru.
  Tes: sync/user tidak berubah (memakai Remote palsu; tidak pernah menguji login anonim); `pin.test.tsx` menambah mock `useAuth`. Baru: `auth.test.tsx` (35). 39 suite / 507 tes.
  Belum teruji: Supabase sungguhan (konfirmasi email aktif atau tidak), iOS, isi otomatis pengelola sandi, 200% teks, papan ketik menutupi tombol. Keluar (signOut) dikerjakan FL-9.
- FL-9 (13 Nov 2026): Pengaturan disusun ulang: Getar, keterangan ukuran teks dan gerak ("Gerak mengikuti pengaturan HP.", tanpa sakelar baru), Ganti PIN, Tentang aplikasi (keduanya `Card` dengan `›`),
  Keluar (hanya bila ada sesi akun), lalu "Untuk operator demo" (alamat server, tes koneksi, profil demo, uji eksperimen `__DEV__`; `testID` lama tetap). Keluar memakai `ConfirmDialog` ("Keluar dari akun? ..."),
  lalu `auth.signOut()` (galat jaringan diabaikan; sesi lokal tetap dibuang), `lock()` sesi PIN, dan `/auth/sign-in`. PIN per akun tidak dihapus.
  K12 (belum dijawab): **cache akun tidak dihapus** (progres lokal ikut tinggal di HP). Alasan: percobaan yang belum tersinkron akan hilang, dan katalog tidak di-cache. Teks dialog "tetap tersimpan di akun" hanya benar untuk
  percobaan yang sudah tersinkron. Tes baru `settings.test.tsx` (9); tidak ada tes lama yang diubah. 40 suite / 516 tes. Belum teruji: Keluar luring dengan Supabase sungguhan, di perangkat.
- FL-8a (13 Nov 2026): data kata Pendamping + daftar + hapus (dipecah atas izin Rico; formulir = FL-8b'). Keputusan Rico: `expo-image-picker` boleh dipasang (di FL-8b'), Supabase **tiruan saja** (K1).
  Baru: `src/data/words.ts` (tipe baris seperti tabel kontrak, `WordStore`, `createWord`/`updateWord`/`removeWord`/`listMine` dengan kompensasi kontrak §6: unggah → baris kata → suku kata → video;
  gagal di tahap mana pun menghapus baris dan berkas percobaan itu; ubah = unggah baru → ganti baris → baru hapus berkas lama; hapus = ambil path → hapus baris → hapus berkas, gagal → antrean),
  `src/mock/words.ts` (AsyncStorage, diisi TOLONG dan MINUM dari `src/mock/words/*.json` dengan path video contoh; injeksi galat untuk tes), `src/data/media.ts` (`getWordStore()` = tiruan bila `USE_MOCK`,
  selain itu `null`; `videoUrl()`), `src/data/supabaseWords.ts` (**belum dites, belum dinyalakan**: tabel `custom_*` dan bucket tidak ada di `schema.sql`; nama kolom mengikuti `words.ts`).
  Katalog tiruan kini = kata bawaan JSON + kata dari store yang **lengkap** saja ("Belum lengkap" tidak sampai ke Pilih kata). Q7: riwayat kata terhapus otomatis hilang dari ringkasan karena ringkasan dihitung dari katalog.
  `app/(tabs)/companion/index.tsx` diganti: "Kata saya" (jumlah suku kata, "Belum lengkap" ikon + teks, tombol "Ubah …"/"Hapus …"), "Tambah kata", "Kata bawaan" (chip Bawaan, tanpa tombol), "Kunci kembali";
  hapus lewat `ConfirmDialog` dengan nama + jumlah suku kata, lalu snackbar. `BigButton` mendapat prop opsional `accessibilityLabel`. Rute sementara `companion/words/new` dan `words/[wordId]/edit` (diganti FL-8b').
  Dibuang dari UI (Q11): ringkasan mingguan, Uji Dengar, lama sesi, laporan teks, status sinkron di layar Pendamping (berkas logikanya dibiarkan). `__tests__/companion.test.tsx` dihapus karena layarnya diganti.
  Tes baru: `wordsData.test.ts` (12), `companionList.test.tsx` (7). 41 suite / 526 tes.
  **K1 untuk FL-10:** `about.tsx` masih menulis Supabase menyimpan "tanpa video atau audio"; dengan kata Pendamping sungguhan (bukan tiruan) kalimat itu tidak benar lagi. Tidak diubah di sini.
- FL-8b' (13 Nov 2026): formulir kata Pendamping. Dependensi baru atas izin Rico: `expo-image-picker ~58.0.10` (`npx expo install`; plugin di `app.json` dengan teks izin Indonesia untuk galeri, kamera, mikrofon).
  Baru: `src/data/pickVideo.ts` (`launchImageLibraryAsync`/`launchCameraAsync`; `duration` dalam **milidetik**, `fileSize` byte, dicek di tipe SDK 58; kamera dibatasi `videoMaxDuration` 30 dtk),
  `src/components/form/{VideoField,SyllableRow,WordForm}.tsx`, `src/forms/keys.ts`, layar `companion/words/new.tsx` dan `words/[wordId]/edit.tsx`; `createWord`/`updateWord` menerima `AbortSignal` (Batalkan memutus di antara unggahan; file yang sudah naik dibersihkan).
  `VideoField`: pilih galeri/rekam, pratinjau **dibisukan tanpa autoplay**, ganti, hapus; video salah (format, ukuran, durasi) ditolak dengan alasan dan nilai lama tetap; izin kamera ditolak → kalimat + "Buka pengaturan" (`Linking.openSettings`).
  `SyllableRow`: Naik/Turun/Hapus berlabel (bukan seret), hapus baris berisi minta konfirmasi. `WordForm`: blok Kata + 0–6 suku kata, peringatan kecocokan (bukan penghalang), duplikat (termasuk kata bawaan), persetujuan video wajib tiap simpan,
  validasi semua saat kirim + fokus ke kolom teks/instruksi pertama yang salah + umumkan jumlah, progres unggah (teks + bar + Batalkan), galat → `FormBanner` + "Coba lagi" dengan isian utuh, "Buang perubahan?" lewat `usePreventRemove`
  (tombol Batal, header, tombol kembali Android), sukses → snackbar "Kata “…” disimpan.". Instruksi diketik manual (tombol AI = FL-8b).
  Keputusan: (1) kata dan suku kata **disimpan HURUF BESAR** (kontrak/katalog memakai TOLONG, MAMA; flow §7.7.3 menulis huruf kecil — duplikat tetap tanpa peka huruf). (2) `WordForm`, `VideoField`, `SyllableRow` **tidak diekspor lewat `components/index.ts`**
  karena menarik modul native (image-picker, video) ke setiap tes layar. (3) Picker tanpa `fileSize` → 0 (ukuran tak bisa dicek di app; server 413 jadi pengaman). (4) Jumlah galat yang diumumkan: tiap kolom salah dihitung, baris suku kata dihitung per kolom.
  Tes: `wordForm.test.tsx` (19), `wordScreens.test.tsx` (4). 43 suite / 549 tes. Belum teruji: di perangkat (galeri/kamera, izin, iOS, TalkBack, 200% teks), Supabase Storage sungguhan.
- FL-10 (13 Nov 2026): pemeriksaan akhir alur v2 (tanpa fitur baru).
  - **Tes:** 43 suite / 549 tes lulus; `npm run typecheck` lulus. Baseline cabang 296 → 549 (+253). Tes yang dihapus/diubah tercatat per langkah di atas
    (FL-2 home, FL-3 home ×5, FL-4 ResultView/StatusBadge/haptics/ModelVideo, FL-6 onboarding/demo/companion, FL-7 pin, FL-8a `companion.test.tsx` dihapus).
  - **Pindaian (app/app, app/src):** kata terlarang: hanya nama fungsi `normalize…` (kode, bukan teks UI); tidak ada "Cermin Wicara"/"RekanWicara"; tidak ada hex literal di
    `app/app` dan `app/src/components`; tidak ada `fontStyle: 'italic'`, `shadow`, `elevation`.
  - **Langkah dilewati / belum:** FL-8b (tombol AI) belum dikerjakan; "Lupa PIN?" (AUTH-7) disembunyikan; lupa sandi (Q15) tidak ada; wordmark splash (FL-1) menunggu aset;
    ringkasan Level 2 di Pilih kata; kata Pendamping hanya tiruan (Supabase `custom_*` + bucket belum ada, K1); klien v2 belum menerima token dari layar
    (`getToken`/`refreshSession` belum disambung) dan belum pernah memanggil server sungguhan; Keluar tidak menghapus cache akun (K12).
  - **Teks klaim yang tidak benar lagi menurut kode — usulan, BELUM diubah** (perubahan langsung ditolak; menunggu keputusan Rico):
    1. `app/app/about.tsx` "Materi mencakup vokal a, i, u dan konsonan m, p, b." → "Penilaian disetel untuk vokal a, i, u dan konsonan m, p, b. Bunyi O belum disetel,
       jadi hasilnya belum dapat dipercaya. Kata dari Pendamping belum bisa dinilai di server demo." (K11; O kini bisa dilatih dari katalog).
    2. `about.tsx` "Supabase menyimpan hasil dan progres, tanpa video atau audio." → tambah "Bila akun dipakai, Supabase menyimpan email, username, hasil dan progres,
       tanpa video atau audio. PIN Pendamping disimpan di HP ini saja. Video contoh dari Pendamping tidak dikirim ke server pada versi ini." (K1; FL-7 menambah akun email).
    3. `app/app/onboarding.tsx` "Angka hasil latihan juga disimpan online tanpa namamu" → "Bila terhubung ke akun, angka hasil latihan juga disimpan online supaya
       kemajuanmu tidak hilang." (akun kini punya email dan username/display_name).
    4. `README.md`: judul dan tim "Cermin Wicara" → "Rekan Wicara" (design.md §1); "teman Tuli/tunarungu" → "teman Tuli" (design.md §7); "autentikasi anonim" →
       "akun email (Pendamping)"; "Aktifkan Anonymous Sign-Ins" → "Aktifkan login Email"; "Tekan lama Misi hari ini" → "tab Pengaturan (setelah PIN), bagian Untuk operator
       demo"; Alur demo → "Masuk/Daftar → Buat PIN → onboarding → kalibrasi → Beranda; Level 1 A; Pilih kata → PAPA → PA → PAPA; Pendamping/Pengaturan dengan PIN; materi
       tidak dikunci"; "pengaturan tersembunyi" → "tab Pengaturan"; tambah `EXPO_PUBLIC_USE_MOCK` dan `EXPO_PUBLIC_ANALYZE_API`; "MVP mencakup Level 0–3" → struktur L1–L3 (K11).
    5. `app/README.md`: "aktifkan Anonymous Sign-Ins" → login Email; "Tekan lama judul Misi hari ini" → tab Pengaturan; "PIN yang dibuat saat onboarding" → layar Buat PIN
       sebelum onboarding, per akun; "Buka semua materi" → materi tidak dikunci; "pengaturan tersembunyi" → tab Pengaturan.
    6. `docs/MODEL_CARD.md` §cakupan menyebut Level 0–3, kemajuan/macet (SPEC §8.4) dan Mode Pendamping lama: perlu disesuaikan (K8, K11).
    7. README "Batasan": tambahkan daftar langkah dilewati di atas (AI, Lupa PIN, lupa sandi, wordmark, kata Pendamping tiruan, v2).
    Teks yang **masih benar**: "Rekaman latihan dihapus setelah diproses" (kode menghapus setelah hasil dan saat keluar layar); "tanpa video atau audio" untuk Supabase
    (kata Pendamping tiruan menyimpan video di HP saja); "Mode demo tidak mengirim hasil ke Supabase".
  - **Usulan perubahan dokumen (belum diubah):** design.md §0 dan §6.2.1 (tekan-lama "Misi hari ini" dihapus; Pengaturan kini tab), §5.9 (bar: Latihan/Pendamping/Pengaturan,
    di semua layar tab, tersembunyi di sesi latihan), §6 tabel layar (Beranda dua kartu, Level 1, Pilih kata, Jalur kata, Pendamping CRUD, auth/*, change-pin), §6.2.1
    (sketsa dua kartu + tautan Tentang), §6.2.3 (hasil per level: dua lencana, umpan balik ≤ 2 kalimat, grafik hanya L1; mode overall/hidden dihapus), §5.3 (L2–L3 dua status);
    flow-srs-ui §10 ("tiga kartu" → dua kartu). Konflik c.2 yang belum diperbaiki di dokumen: kontrak FE "lima poin" (isinya tujuh); flow §7.1.1 Masuk "email atau username"
    (kode: email saja); flow `source: 'companion'` (kode: `custom`); flow `belum` (kode: `belum_sesuai`); kontrak `EXPO_PUBLIC_API_BASE_URL` (kode: `EXPO_PUBLIC_API_URL`, K6);
    kontrak §2 kunci `rw.companionPin:<uid>` (SecureStore menolak `:`; kode: `rw.companionPin.<uid>`); flow §7.7.3 kata "huruf kecil" (kode: HURUF BESAR seperti katalog).
  - **Daftar periksa design.md §12** (layar diubah: Beranda, Level 1, Pilih kata, Jalur kata, Latihan/Hasil, Pendamping, formulir kata, Pengaturan, Ganti PIN, Buat PIN, Masuk, Daftar, Cek email):
    terbukti lewat kode/tes: tidak ada hex literal di layar/komponen, tidak ada bayangan/miring, tombol `BigButton` dan item bar punya `accessibilityLabel`, status = ikon + label + warna
    (tes StatusBadge), teks tanpa kata terlarang (tes ResultView/settings/messages). **Hanya bisa dicek di HP (belum):** hitam-putih, skala 200%, perangkat dibisukan + getar mati,
    target sentuh ≥ 48 dp dan jarak 12 dp, Reduce Motion, efek tekan, keadaan "Merekam", cahaya terang, TalkBack.
  - **Kriteria kontrak §10:** [ ] alur penuh `USE_MOCK=true` di HP (bagian-bagiannya dites: auth, PIN, Pilih kata, Jalur kata, latihan, hasil, retry; belum dicoba utuh di HP);
    [x] hasil L1 tiga status + grafik, L2–L3 dua status tanpa grafik (`ResultView.test.tsx`); [ ] bar tampil di layar tab dan tersembunyi di sesi (struktur rute; belum dicek di HP);
    [x] Pendamping tambah tanpa/dengan suku kata, ubah, hapus, kata bawaan tanpa jalur ubah/hapus (tiruan: `wordsData`, `wordScreens`, `companionList`); [ ] tombol AI (FL-8b belum);
    [~] PIN: buat, masuk, salah, terkunci dites (`pin.test.tsx`); ganti PIN belum punya tes layar; [ ] `USE_MOCK=false` tidak mengubah layar (belum dibuktikan; v2 tidak ada di server lokal);
    [x] tes jest validator, pemetaan DTO, status per level.
  - **Keputusan Rico yang masih terbuka:** K1 (video wajah Pendamping di Supabase + teks Tentang/README), K2 (AI pihak ketiga; FL-8b), K3 (login anonim dihapus — usulan dipakai,
    mohon konfirmasi; riwayat anonim lama tidak dipindah), K4 (catatan "v2 diatur kontrak FE" di SPEC §5), K6 (nama env API), K7 (sesi di AsyncStorage), K8 (README/MODEL_CARD
    tanpa misi/Uji Dengar/laporan), K9 (Getar di balik PIN), K10 (kata Pendamping di v1: catatan "belum tersedia" — usulan dipakai), K11 (teks cakupan materi), K12 (Keluar:
    hapus cache atau tidak; teks dialog), K13 (persetujuan privasi di Daftar — sudah dibuat), kata disimpan HURUF BESAR, flow-srs-ui rev. 9 (berkas yang ada rev. 7), semua usulan
    teks di atas, usulan perubahan design.md/flow.
  - **Belum teruji sama sekali di perangkat:** seluruh alur v2 (FL-2 … FL-8b'), Supabase sungguhan (akun email, sinkron tanpa login anonim, Keluar luring), server v2, iOS,
    galeri/kamera untuk video Pendamping, pengumuman pembaca layar, Playfair dan cincin fokus.
- Tambahan setelah FL-10 (13 Nov 2026): tiga celah ditutup (yang lain tetap seperti daftar FL-10).
  (1) **Token v2:** `src/auth/v2Auth.ts` (`getToken`, `refreshSession`, `onSessionLost`) dan `withAccount()` mengisi bawaan akun di `getCatalog`/`getWord`/`analyze` (v2); 401 → refresh sekali → ulang sekali → gagal = `signOut`.
  `SignedOutRedirect` (root layout) mengantar ke Masuk saat sesi hilang di dalam app. Belum pernah memanggil `/v2` sungguhan. (2) **Lupa PIN:** tautan di gerbang PIN (hanya bila ada akun), layar `auth/forgot-pin`
  (verifikasi kata sandi akun lewat `signIn`, lalu `create-pin`; PIN lama diganti saat PIN baru disimpan). Di mode tiruan sandi apa pun diterima kecuali `salah@contoh.id`. Lupa sandi (Q15) tetap tidak ada.
  (3) **Ringkasan Level 2** di kartu Pilih kata ("Level 2: x dari N sesuai · Level 3: …"), diambil per kartu lewat `useWordPath` (di v2 = satu permintaan per kata; saat memuat/gagal hanya Level 3 yang disebut).
  Catatan: kartu "Level 2 dan 3" di Beranda masih menghitung kata (Level 3) saja. Panduan: `docs/PANDUAN_JALANKAN_DAN_CEK.md`. Tes baru: `forgotPin.test.tsx` (5), `v2Auth.test.tsx` (9), tambahan di `words.test.tsx` dan `pin.test.tsx`. 45 suite / 566 tes.
- Perbaikan 14 Nov 2026 (temuan di HP, iOS): layar latihan (`practice/[itemId]`) jatuh dengan "Couldn't find a navigation object" saat dibuka (dari Level 1 maupun Jalur kata). Sebabnya
  `usePreventRemove` diimpor dari `@react-navigation/native`, paket terpisah dari salinan react-navigation milik expo-router, sehingga tidak menemukan konteks navigasinya. Berlaku sejak FL-4;
  `WordForm` (FL-8b') punya kesalahan yang sama. Diperbaiki: keduanya memakai `usePreventRemove` dari `expo-router`. Tes tidak menangkapnya karena modulnya di-mock; ditambah
  `navigationImports.test.ts` yang menggagalkan impor `@react-navigation/*` langsung. **Pelajaran:** alur rekam → hasil FL-4 belum pernah benar-benar jalan di HP sebelum ini; semua klaim
  "alur v2" tetap belum teruji di perangkat sampai daftar periksa `docs/PANDUAN_JALANKAN_DAN_CEK.md` dijalankan. 46 suite / 567 tes.

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

## Implementasi Figma (design v7)
- FG-1 (14 Nov 2026, cabang `fe/design`): token v7 tanpa perubahan tata letak.
  - `app/src/theme/index.ts`: palet netral §3.1; token baru `hairline`, `dangerPressed`, `warning`, `segment`; `radius.sheet` 28 dan `radius.dialog` 24;
    `statusStyles` memakai token (tidak ada hex literal lagi di luar `theme/`). Nama token lama tidak berubah, jadi layar otomatis berganti warna.
  - Inter 400 dan 700 (`@expo-google-fonts/inter`, disetujui D4) dimuat di `app/_layout.tsx` bersama Playfair. `fontFamily.text` dan `textFont(bold)`
    memberi Inter bila termuat, selain itu font sistem. **Belum dipakai di layar**: penerapan per layar dikerjakan langkah FG berikutnya
    (Inter 400/700 adalah dua family terpisah, jadi patch global `Text` akan mengubah tampilan semua layar sekaligus).
  - `__tests__/theme.contrast.test.ts`: menghitung kontras pasangan kunci §3.1 (teks 4,5:1, garis dan fokus 3:1); gagal bila di bawah batas.
  - Belum diubah: `app.json` (`backgroundColor` ikon/splash `#08110B`) karena gambar ikon dan splash masih berlatar lama; ganti bersama aset.
  - Belum ditambah: token `titleLarge` 28 dan `pinKey` 76 (di luar daftar FG-1; ikut langkah layar terkait).
  - Belum diverifikasi di perangkat: Inter dan cadangan font sistem.
- Saran skill `interfaces:better-colors` yang ditolak (bertentangan dengan design.md): ganti nama `primary` menjadi `accent` (design.md memakai `primary` untuk tombol
  dan `accent` untuk koral); tier primitif/semantik dan ramp 50–950 (design.md §3.1 menetapkan satu tier token datar); `prefers-color-scheme` (hanya tema gelap, §3.2).
- FG-2 (14 Nov 2026): komponen dasar, mengikuti Figma ("Button", "Field", "Back" di "Komponen · Interaksi", node 55:500, 55:515, 55:538, 65:621).
  - `BigButton`: tipe `danger` baru; ditekan mengubah isi (primaryPressed, dangerPressed, surfaceRaised); nonaktif = isi `surfaceRaised`, tanpa garis, tanpa opacity;
    secondary tinggi 48 dengan garis 2 dp, primary dan danger 52 tanpa garis. Ikon 24 dp dan jarak ikon-label 10 mengikuti Figma (design.md §5.1 menulis 20).
  - `Card`: garis `hairline` 1 dp. `TextField`/`PasswordField`: garis 1 dp, fokus 2 dp (`stroke.focus` dihapus; hanya TextField memakainya), jarak label-kolom-pesan 6, tinggi 56 (`fieldHeight`), label 15 Bold,
    area teks panjang 104. Figma menggambar garis 1 dp di semua state; yang dipakai 1 dp (diperbaiki setelah FG-2: sebelumnya 2 dp mengikuti design.md, itu keliru karena Figma sumber utama).
  - `BackButton` baru (kapsul 48, chevron + keterangan tujuan). Dipasang sebagai `headerLeft` bawaan di `darkStackOptions` (`label` = judul layar sebelumnya, cadangan "Kembali";
    tidak tampil di layar pertama stack) dan sebagai tombol "Keluar latihan" di layar latihan (label dan aksi sama). `headerBackTitle` dihapus. `sign-in`, `check-email`, `create-pin`
    diberi `headerLeft: () => null` agar tetap tanpa tombol kembali. Teks kapsul memakai `textFont()` (Inter bila termuat).
  - Tes: `BackButton.test.tsx` baru; `BigButton.test.tsx` menambah kasus danger. Skill `figma-design-to-code` dimuat dari MCP resource `skill://figma/figma-design-to-code/SKILL.md` (tidak ada di Skill tool); `get_design_context` dipanggil dengan `skillNames: resource:figma-design-to-code`.
  - Saran skill `interfaces:better-ui` yang ditolak: skala tekan 0,96 (design.md §5.1: 0,98), pengganti garis dengan bayangan (design.md: tanpa bayangan), transisi kustom (efek tekan hanya perubahan isi).
  - Belum diverifikasi di perangkat: bentuk kapsul `headerLeft` di iOS dan Android (tinggi header), keterangan tujuan yang panjang di skala teks 200%.
- FG-3 (14 Nov 2026): StatusBadge baru, mengikuti Figma ("StatusBadge" di "Komponen", node 25:86; glyph `status-glyph/*`).
  - `StatusBadge`: tanpa wadah (latar, `borderLeft`, padding, radius dihapus). Isinya glyph + label `text` bobot 700 (`textFont(true)`), padding vertikal 2, jarak glyph-label 6 (md) atau 10 (lg).
    Ukuran teks dan lineHeight md 15/20, lg 16/22. `accessibilityLabel`, `testID` (`<id>-icon`), prop `status`/`label`/`size` tidak berubah. Metrik masuk token baru `statusBadge` di theme.
  - `StatusIcon`: tiga simbol lingkaran dengan react-native-svg, path disalin dari aset SVG Figma (digambar dalam kotak 18, diskalakan; garis tetap dalam dp):
    lingkaran penuh + centang (centang `colors.background`), lingkaran garis + setengah terisi, lingkaran garis + panah ulang. `testID` bentuk: `status-shape-full`, `-half`, `-retry` (dulu `-circle`, `-triangle`, `-square`).
  - Ukuran glyph md 18 dan lg 26 mengikuti Figma (design.md §5.4 menulis 24 untuk lg; Figma menang, design.md perlu diperbarui). `CombinedObservations` memakai `StatusIcon size={28}` dan tetap jalan (tampilan lama, di luar FG-3).
  - "Mendekati" di Level 2–3 dipetakan ke "belum sesuai" oleh `data/mappers.ts` sejak sebelum FG-3; tidak diubah.
  - Tes `StatusBadge.test.tsx` diubah: testID bentuk baru, assert tanpa wadah (tanpa `backgroundColor`, `borderLeftWidth`, `borderRadius`) dan label berwarna `text` (bukan lagi `borderLeftColor`),
    ditambah tes ukuran glyph/teks md dan lg. `npm test` 595 lulus, `npm run typecheck` bersih.
  - Skill `figma-design-to-code` dan `interfaces:better-accessibility` dimuat lewat Skill tool sebelum kode. Saran skill: tidak ada yang bertentangan dengan design.md. Catatan a11y skill yang dipakai:
    glyph disembunyikan dari pembaca layar (`accessible={false}`), label teks membawa arti, status tidak hanya warna (bentuk glyph berbeda; 1.4.1).
  - Belum diverifikasi di perangkat: tampilan glyph di HP Android (Expo Go), skala teks 200% (label panjang "Suara: Belum sesuai" membungkus karena `flexShrink`), kecocokan piksel dengan Figma.
