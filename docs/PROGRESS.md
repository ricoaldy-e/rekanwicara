# PROGRESS

Perbarui tabel ini di akhir setiap fase (status: belum / berjalan / selesai / ditunda).

| Fase | Track | Isi | Target hari | Status | Catatan |
|---|---|---|---|---|---|
| Snapshot core-feature | Git / validasi | Simpan fitur Level 1 v2 dan uji persistensi pada branch baru | Sabtu 14 Nov | validasi lulus; siap commit/push atas permintaan pengguna | Branch be/core-feature diminta pengguna untuk fitur yang sudah dikembangkan. Mencakup rekam tutorial vokal, evaluator v2 lima vokal, integrasi Beranda dan latihan Level 1 v2, mapping/antrean attempts serta harness dan laporan uji Supabase Cloud. Validasi workspace gabungan: 717 pytest lulus di sandbox; 35 tes SQL awalnya gagal setup initdb akibat token sandbox Windows, lalu seluruh 35 lulus saat dijalankan pada PostgreSQL lokal dengan izin eksekusi sesuai (752 tes unik lulus). Tidak menjalankan migrasi Cloud. 414 Jest/43 suite dan tsc lulus; Ruff check serta format 110 berkas lulus; node syntax lulus. Expo lint lulus setelah akses cache lokal diizinkan, 0 error/8 warning lama. Pemindaian 41 berkas perubahan tidak menemukan JWT/kunci rahasia/rekaman; env dan data tidak disertakan. Tidak menggabungkan main atau deploy. Uji HP/akurasi vokal manusia dan perhitungan progress otomatis v2 tetap di luar validasi ini. |
| Persistensi SDK v2 Cloud | Backend / uji integrasi | Payload null, replay idempotent, RLS dua akun | Sabtu 14 Nov | uji Cloud dan pemeriksaan lokal lulus; seluruh data uji bersih | Supabase JS SDK 2.119.0 terpasang, operasi Cloud tanpa mock; loader menjalankan attemptFromV2Response dan syncPending asli tanpa mengubah app/. Uji akhir 52 pemeriksaan lulus; run awal 50 juga lulus. Tiga attempt metadata sintetis terisolasi (2 akun A, 1 akun B), status ok dan mapping sesuai/mendekati/belum_sesuai ke hijau/kuning/merah; score dan engine_version SQL NULL tetap utuh. Upsert awal 201, replay UUID sama 200 tanpa duplikasi; acknowledgment mencegah kirim ulang. Seluruh field payload dibaca balik dan cocok. Dua fixture progress via SDK: upsert 201 lalu 200, tetap satu baris per akun dan field cocok. Ini membuktikan DB/RLS progress, bukan perhitungan progres otomatis v2; antrean v2 tetap tidak menebak kelulusan. Retry tidak menjadi attempt. RLS dua arah: baca/update/delete data akun lain 200 tetapi nol baris, upsert lintas pemilik 403/42501; snapshot pemilik tetap. Anon ditolak 401/42501; enum v2 mentah tanpa mapping ditolak 400/23514. Role authenticated dan kecocokan sub diverifikasi pada setiap request data akun A/B; service key tidak digunakan untuk simulasi pengguna. Karena JWT DELETE tidak menghapus baris sesuai policy existing, pengguna secara eksplisit mengizinkan operator hanya cleanup: 3 attempts dan 2 progress uji akhir dihapus dengan UUID/marker/pemilik terbatas; kedua run diverifikasi sisa 0. Sesi uji logout local 204 tanpa memutus sesi HP. Dua pytest keselamatan harness, Ruff check/format dan node syntax lulus; warning deprecation Starlette lama serta cache pytest tidak dapat ditulis oleh sandbox. Laporan tersanitasi docs/supabase/v2_persistence_cloud_test_results.json. Tidak membaca rekaman, mengubah Storage, endpoint, schema, RLS, privilege, kontrak, FE atau AI; tanpa dependency baru, commit/push/merge/deploy. Uji Node bukan validasi penyimpanan native Expo Go, kamera, atau evaluasi manusia. |
| Beranda dan latihan Level 1 v2 | App | Tampilkan katalog aktual dan hubungkan tutorial/rekam/hasil | Sabtu 14 Nov | aktif di workspace; kode/tes lulus; uji HP manusia menunggu | Dikerjakan pada worktree phase-home-level-one terisolasi selama teman pengguna merekam, tanpa memicu reload atau menghentikan Metro/backend. Pengguna menyetujui sekaligus menghubungkan latihan ke v2, kemudian mengonfirmasi rekaman selesai dan mengizinkan aktivasi. Beranda akun login menampilkan LevelOneList dari GET /v2/catalog, refresh saat fokus, loading/error/retry dan state terikat UID/API; tidak menduplikasi grup Level 0/1 lama atau misi harian. Lima vokal A/I/U/E/O beserta MMM/AAA/pelan-ke-keras mengikuti katalog delapan materi server. Klik membuka detail v2, instruksi, signed URL tutorial privat saat diputar dengan pemulihan akses, rekam -> analyze v2 -> hasil -> Ulangi/Selesai. Video kosong memakai panduan teks, tidak mengganti video target. Sesi diperiksa sebelum/sesudah HTTP/Storage; respons lama/unmount/pergantian akun tidak menulis hasil. Error analisis mempertahankan klip untuk retry; sukses dan unmount membersihkan rekaman lokal. Result/feedback/visuals v2 ditampilkan dengan komponen existing; retry tidak dihitung. Hanya evaluated masuk antrean SDK attempts existing dengan UUID, mapping warna schema; score dan engine_version null karena tidak ada pada DTO, parser lokal diperluas hanya untuk engine v2. Hasil v2 dikecualikan dari aturan kelulusan/progress legacy 8/10, tanpa syarat lulus baru atau perubahan schema; metadata progress v2 belum dihitung sampai aturan produk disepakati. Beranda menampilkan hasil terakhir dari riwayat lokal akun. Level 2/3 dan mode demo mempertahankan alur lama. Validator API menolak response malformed, item tertukar dan retry yang mengandung skor. 413 Jest/43 suite lulus di worktree, tsc lulus di worktree dan workspace utama; Expo lint 0 error/8 warning lama. Tambahan satu tes native upload juga lulus (29 tes pada berkas target), memeriksa JWT serta hanya item_id/session_id tanpa user_id/target; total 414 tes unik telah lulus, dengan 413 pada regresi penuh sebelumnya dan satu tambahan pada tes target. Detector UI tidak menemukan pelanggaran. Aktivasi 18 berkas dengan pemeriksaan hash baseline (0 konflik); penolakan tulis sandbox pada sync.ts diselesaikan dengan eksekusi berizin tanpa menimpa perubahan lain. Bundle iOS workspace utama 200, memuat LevelOneList/LevelOnePractice, 7847817 byte, manifest username rekanwicara. Supabase asli dengan JWT akun uji: katalog 200 berisi 8 L1, seluruh 5 detail vokal 200, referensi tersedia dan tepat di default/level-1; signed URL dan HEAD video 5/5 HTTP 200, tanpa mengunduh isi video. Logout hanya sesi uji local 204. Tidak ada mutasi Cloud oleh tes fase ini. Tidak mengubah evaluator/CRUD/backend, schema, RLS, dependency atau 24 video Kata Penting; tidak commit/push/merge/deploy. Backend 750 pytest lulus pada fase sebelumnya, tidak diulang karena source Backend tidak berubah. Alur kamera, evaluasi ucapan manusia dan persistensi SDK di perangkat belum diuji agen; akurasi vokal/ASR masih perlu validasi nyata. |
| Expo Go login saat perekaman vokal | Operasional | Perbaiki manifest tanpa akun pada iPhone | Sabtu 14 Nov | server dan manifest terverifikasi; coba ulang di HP | Screenshot meminta Expo CLI login sebagai rekanwicara. CLI whoami sebenarnya sudah rekanwicara; Metro lama berjalan --offline sehingga manifest extra.expoGo.username null. Kode CLI installed mengabaikan resolusi akun saat EXPO_OFFLINE. Hanya proses Metro workspace dihentikan dan dijalankan ulang dengan --lan --port 8081, tanpa logout/login ulang, perubahan kode aplikasi, dependency atau backend. Manifest iOS terverifikasi HTTP 200, username rekanwicara, host Wi-Fi benar; bundle iOS 200 (7817008 byte). Pengguna perlu menekan Try again atau membuka ulang proyek; hasil di perangkat belum dikonfirmasi. Dokumentasi resmi: https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/. Tanpa commit/push/deploy. |
| Rekam lima vokal + evaluator v2 | FE/Backend | Perekaman A/I/U/E/O dan Wav2Vec2 ikut menentukan hasil akhir | Sabtu 14 Nov | kode dan tes lulus; perekaman/native dan validasi manusia menunggu | Pengguna mengganti audit dengan permintaan menyiapkan lima rekaman tutorial di Expo serta memilih ASR ikut menentukan skor. Layar tutorial existing kini membuka Vokal Level 1 (5), tetap dapat beralih ke 24 Kata Penting. Rekam kamera/mikrofon lalu otomatis upload setelah selesai; file lokal dipertahankan saat gagal, retry tersedia, sukses hanya setelah verifikasi dan cache dibersihkan. Grup produksi GET /v1/tutorials?group=level_1 memakai manifest terpisah level_one_tutorials.json; tanpa query tetap 24. POST upload existing menerima lima ID l1_a/i/u/e/o, whitelist operator/JWT, konversi H264/AAC, upsert:false dan verifikasi ukuran tetap. Bucket privat existing rekan-wicara-tutorials, folder default/level-1 dengan lima nama vokal; tidak mengunggah dummy atau mengubah schema/RLS/bucket/24 video. Registry baca v2 untuk lima vokal memakai path baru; video belum tersedia tetap videos:[] sesuai DTO existing. V2 menambahkan E/O tanpa mengaktifkan konten/evaluator v1; enam materi lama tetap sehingga katalog v2 berisi 8 L1 + 8 Kata Penting. Lima vokal memakai engine mediapipe_parselmouth_wav2vec2. MediaPipe mengukur bibir, Parselmouth mengukur kualitas/pitch/intensitas/formant; A/I/U mempertahankan aturan akustik existing. E/O memakai geometri existing dan ASR untuk suara, tanpa mengarang anchor formant E/O. ASR bebas tanpa target decoder, hanya satu jenis vokal yang sama termasuk pengulangan cocok; teks berbeda memengaruhi hasil akhir, kosong meminta retry. Hasil suara A/I/U yang terburuk antara akustik dan ASR, hasil akhir yang terburuk antara bibir/suara; Mendekati tetap L1. Missing pengukuran meminta retry dengan seluruh hasil null. WAV sementara dibersihkan termasuk error/timeout; transkripsi tidak keluar ke FE. MMM/AAA/pelan-ke-keras, L2/3, CRUD, attempts/progress tidak diubah. SPEC, kontrak draft, DTO Pydantic/TypeScript diselaraskan; tanpa dependency baru. 750 pytest dan 397 Jest lulus; tsc dan Ruff check/format 108 berkas lulus; Expo lint 0 error/8 warning lama dan satu deprecation pytest lama. 30 tes baru fusi vokal memakai seri fitur/ASR sintetis, bukan validasi manusia. Pengujian JWT Supabase asli: login 200, daftar perekam 200 dengan tepat 5 target dan 0 tersimpan, katalog 200 (8 L1/8 default), detail E/O 200 dan videos kosong, metadata kelima path 400 NoSuchKey. POST analyze kelima vokal melalui HTTP memakai media sintetis tanpa wajah: semuanya 200 retry, no_face + uncalibrated, hasil/lip/voice null, engine baru; JWT invalid 401. Waktu pemrosesan pertama 12198 ms, selanjutnya 318-351 ms; ASR dilewati saat gate wajah gagal. Logout sesi uji local 204. Wav2Vec2 lokal juga dieksekusi sungguhan pada WAV sintetis sementara: inferensi 2543.925 ms, total subprocess 26832 ms, teks kosong; ini bukti eksekusi komponen, bukan bukti akurasi vokal. Cold start mendekati timeout existing 30 detik; ambang tidak diubah. Metro status dan bundle iOS dari manifest 200 (7816031 byte), detector UI tidak menemukan pelanggaran; kamera, suara dan upload manusia di HP belum diuji agen. Backend dan Metro aktif pada konfigurasi Wi-Fi existing. Layar latihan pengguna existing masih memakai v1; migrasi layar tersebut ke v2 belum termasuk perubahan ini. Akurasi ASR vokal tunggal dan bentuk bibir E/O BELUM tervalidasi; rekaman manusia ada di laptop teman dan belum tersedia lokal. Tidak membaca data/, commit, push, merge atau deploy. |
| Uji CRUD manual Supabase Cloud | Backend | CRUD, Storage, RPC dan isolasi dua akun nyata setelah migrasi pengguna | Sabtu 14 Nov | 87 pemeriksaan Cloud lulus, 0 gagal/terhalang | Laporan tersanitasi docs/supabase/custom_words_cloud_test_results.json. FastAPI lokal kode terbaru memakai public key dan JWT dua akun permanent-email berbeda; tanpa mock untuk operasi diuji, tanpa service role, tanpa perubahan schema/policy/privilege Cloud. Login dan verifikasi kedua akun 200. RPC authenticated mencapai validasi action (422 PT422); anon ditolak 401/42501. Direct INSERT/UPDATE/DELETE custom_words ditolak 403/42501. Tanpa JWT atau JWT invalid 401; publikasi tanpa video lengkap ditolak API/RPC 422 dan rollback dibuktikan SELECT kosong. Empat MP4 H264/AAC sintetis berbeda, bukan rekaman kamera: KER/TAS/KERTAS dan satu pengganti KERTAS; upload berversi, info objek, signed URL dan download semuanya 200, ukuran dan checksum cocok. POST 201 published; GET daftar/detail/katalog/detail pembelajaran 200, urutan KER-TAS-KERTAS dan binding video benar, langsung masuk katalog pemilik tanpa evaluasi otomatis. SELECT Cloud membuktikan 1 kata, 2 suku kata, 3 video. Akun B mendapat 404 untuk GET/PATCH/DELETE kata A dan RPC save; daftar/katalog tidak memuat kata A, RLS SELECT ketiga tabel mengembalikan kosong. Info/sign video A oleh B 400 NoSuchKey; DELETE Storage oleh B mengembalikan 200 tetapi objek pemilik tetap ada (penolakan efektif RLS, bukan penghapusan berhasil). PATCH revisi salah 409; pengganti belum diunggah 422 dengan metadata/video aktif tetap. PATCH instruksi dan video valid 200, revision bertambah, cleanup_pending false, video lama baru hilang sesudah commit. DELETE stale revision 409, DELETE valid 200 deleted, GET sesudahnya 404. Verifikasi akhir SELECT dan Storage menunjukkan 0 kata, 0 suku kata, 0 video metadata dan 0 objek uji tersisa dari 4 objek; tanpa isu cleanup. Katalog tetap 6 Level 1 dan 8 default; 24/24 video default terbaca dan signed HEAD 200, metadata objek identik sebelum/sesudah, URL publik tanpa tanda tangan ditolak 400. GET /v1/items 200 dan JSON identik sebelum/sesudah; tidak menguji seluruh endpoint AI v1. Logout scope local kedua sesi uji 204, sesi perangkat lain tidak dicabut. Tidak mengubah app/, fitur AI, source Backend, dependency, schema atau policy; tanpa commit/push/deploy. Flag SECURITY DEFINER mengikuti informasi migrasi pengguna, tidak diinspeksi via SQL Cloud. Kamera native dan integrasi FE terhadap kontrak upload-before-save masih perlu diuji. |
| Audit CRUD manual Backend | Backend/SQL | Hardening migrasi Cloud berdasarkan constraint existing | Sabtu 14 Nov | source dan tes lokal lulus; Cloud belum diterapkan | Scope terbaru Backend only: tidak mengubah app/, Expo, TypeScript, UI, pipeline AI, v1 atau delapan Kata Penting. Proposal lama ditemukan menerima instruksi draft kosong, memakai path mutable, batas 80/100, belum menutup direct table write, serta reorder dengan posisi sementara. SQL final docs/supabase/custom_words_manual.proposed.sql hanya menambah status/revision/pending_video_paths, enum status dan satu RPC; tidak membuat ulang tabel/FK/unique index/RLS/Storage policy. DML client pada tiga tabel dicabut untuk menutup bypass published, SELECT/RLS tetap; RPC SECURITY DEFINER milik postgres, search_path kosong, EXECUTE authenticated saja, memeriksa JWT permanent-email dan parent UID pada semua action. No service key/GUC guard. Instruksi valid sejak INSERT pertama; draft baru transaction-local, hanya snapshot lengkap dan object metadata valid menjadi published. Batas Backend+RPC 30 huruf A-Z/a-z, 6 suku kata opsional, posisi unik 1..N. File baru memakai uid/words/word_uuid/word/recording_uuid.mp4 atau uid/words/word_uuid/syllables/syllable_uuid/recording_uuid.mp4; upload sebelum save dengan upsert:false, file aktif lama tidak ditimpa. Reorder mengganti child rows atomik dengan UUID/created_at dipertahankan dan berhenti bila ada dependent FK belum diaudit. Cleanup hanya pascacommit, queue durable, ack menolak NULL/object yang masih ada; file legacy yang masih dirujuk kata lain milik akun sama tidak dihapus. Save/DELETE stale revision ditolak; satu pemenang pada concurrent save. FastAPI api/v2/custom_words.py memeriksa path/material ID/keterbacaan Storage dengan JWT sebelum RPC, menolak staging draft lama dan mensyaratkan ID stabil pada create. Response DTO/error shape tetap, request menambah video_path dan siklus upload-before-save; tim FE perlu menyesuaikan tanpa perubahan FE oleh agen. Backend export fixture mempertahankan contoh historis FE dengan menghilangkan optional null dan status draft eksplisit, bukan menganggap staging masih valid. SPEC §5 diperbarui. 713 pytest lulus tanpa skip, termasuk 35 tes SQL nyata pada cluster PostgreSQL 18 lokal sementara dengan CHECK instruksi, FK, immediate UNIQUE position, partial indexes dan RLS metadata/Storage dua principal sintetis. Mencakup KERTAS/KER/TAS, edit/reorder/penggantian/hapus, ukuran/MIME/missing objects, batas 30/6, JWT invalid (HTTP mock), anonymous/nonemail RPC, direct DML/column grant/GUC bypass, rollback sesudah child delete, concurrency/revision, retry GC, migrasi idempotent dan 24 referensi default fixture tidak berubah. Ruff check/format 107 berkas lulus; deprecation Starlette/HTTPX lama satu warning. PostgreSQL child memakai env allowlist/loopback/temp cluster dan dihentikan; hambatan token/pipe Windows saat setup awal diperbaiki tanpa Cloud. Auth/Storage HTTP diuji mock; tidak mengklaim transaksi atau upload Supabase Cloud/native kamera berhasil. Tidak ada koneksi/migrasi Cloud, commit/push/deploy. Risiko: definer memerlukan review privilege/owner; Storage dan SQL bukan distributed transaction, caller harus melacak upload belum direferensikan dan merekonsiliasi timeout; policy Storage harus menerima path versi baru sebelum parent row ada, tidak diubah. Sumber kamera/immutability Storage tidak dibuktikan oleh metadata saja. SQL final siap ditinjau, bukan sudah diterapkan. |
| CRUD Kata Manual | Full stack | REST metadata, form dinamis dan rekaman kamera dengan satu Simpan Kata | Sabtu 14 Nov | kode/tes lulus; Cloud write menunggu review migrasi, tidak diterapkan | Branch phase-custom-words. Arahan terbaru membatalkan galeri/dependency baru serta alur publikasi manual: hanya tombol Simpan Kata, aktif setelah kata/instruksi/video L3 dan seluruh suku kata yang ditambahkan lengkap; tidak ada Simpan Draft/Publikasikan atau halaman publikasi. Internal draft lalu published tetap dipakai selama unggahan untuk konsistensi. FE src/customWords/ManualWords.tsx, VideoPreview.tsx, service.ts memakai komponen/theme, RecordPanel, ClipPreview, File dan Storage SDK existing; tombol masuk setelah PIN pada companion.tsx. Form tambah/edit/detail/hapus (konfirmasi), suku kata dinamis maksimal 100, UUID stabil, pemindahan posisi tanpa menukar video, preview/rekam ulang/batal/hapus video, izin kamera/mikrofon existing, validasi ukuran/MIME/header MP4/MOV, progres per rekaman, retry dan input lokal dipertahankan saat gagal. Signed URL diperbarui saat playback gagal/kedaluwarsa. Cache rekaman lokal dibersihkan setelah sukses/dibuang/unmount. Pergantian UID me-reset layar/PIN, mode demo tidak dapat membuka write manual. API client/types dan fixture generator diselaraskan. BE api/v2/custom_words.py menyediakan POST/GET list/GET detail/PATCH/DELETE serta POST cleanup; semua JWT non-anonim, pemilik dari Auth, tanpa service role untuk metadata/Storage. Seluruh pohon metadata disimpan via satu RPC SECURITY INVOKER, optimistic revision; draft dapat memiliki referensi video terencana sebelum SDK upload supaya tidak orphan, status siap pakai baru setelah object diverifikasi. Path baru uid/words/word_uuid/word.mp4 dan uid/words/word_uuid/syllables/syllable_uuid.mp4; binding legacy tetap per UUID dan tidak dimigrasikan otomatis. Hapus video lama memakai antrean durable; hapus kata menandai deleting dan baru menghapus metadata setelah Storage bersih, retry bila gagal. Daftar hanya metadata ringkas, tanpa membuka semua video. Katalog/detail custom hanya published+lengkap; manual memakai automatic_evaluation=false dan ditolak target AI tanpa mengubah pipeline. Sebelum migrasi pembacaan legacy tetap berfungsi. Schema aktual diperiksa read-only melalui OpenAPI Cloud: tiga tabel ada, status/revision/pending_video_paths dan RPC belum ada. Proposal docs/supabase/custom_words_manual.proposed.sql menambah hanya tiga kolom pada custom_words dan satu fungsi transaksi, menjaga tabel/data lama, tanpa bucket/policy baru; belum diterapkan sesuai larangan terbaru pengguna. SPEC §5 menggantikan write SDK metadata lama dengan REST tunggal; SDK tetap hanya Storage/Auth untuk fitur ini. 667 pytest (27 tambahan) dan 394 Jest (26 tambahan) lulus; tsc, Ruff check/format 106 berkas lulus; Expo lint 0 error/8 warning lama, deprecation Starlette/HTTPX lama. Tes baru mencakup KERTAS/KER/TAS, ID/posisi/video benar, kelengkapan, satu aksi Simpan Kata, retry upload/delete, konflik revisi, account/PIN isolation, tanpa JWT/sesi invalid, pemulihan signed URL dan penolakan AI manual; ini mock DB/Storage/SDK/kamera. Server lokal dimuat ulang, OpenAPI enam operasi CRUD terdaftar; Auth Supabase asli login 200, GET catalog 200 dengan 6 dasar/8 default, kp_tolong 200 dengan 3/3 available, tanpa/invalid JWT custom 401, v1/items 200. GET custom dengan JWT asli 503 SCHEMA_MIGRATION_REQUIRED, sesuai schema belum dimigrasi; tidak menjalankan create/update/delete, upload custom, RPC atau migrasi Cloud nyata. Logout hanya sesi uji scope local 204, helper dibersihkan tanpa menyimpan credential/JWT/URL bertanda tangan. Metro lokal aktif port 8081, bundle iOS HTTP 200 (8.668.129 byte); detector UI tidak menemukan pelanggaran. Native HP/visual/pemutaran/rekam nyata, SQL transaksi dan hak INSERT/UPDATE/DELETE Storage Cloud serta dua akun nyata belum diuji. Batas diketahui: PostgreSQL+Storage bertahap; upload yang sudah berhasil menjadi snapshot baru, bukan rollback seluruh snapshot; dua editor bersamaan pada path video mutable belum memiliki versioning/lease, gunakan satu editor per kata. Tidak membaca data/, mengubah default delapan kata, pipeline AI, schema/RLS Cloud, commit/push/deploy. |
| Uji ulang RLS video v2 | Verifikasi | Akses baca setelah pengguna memperbarui policy Supabase | Sabtu 14 Nov | berhasil untuk 24 video dan seluruh detail kata | Pengguna menyatakan telah mengubah RLS; diuji ulang ke Supabase asli tanpa mock atau perubahan kode aplikasi/policy oleh agen. Login dan verifikasi Auth akun pendamping 200. Bucket rekan-wicara-tutorials tetap privat menurut metadata operator read-only; seluruh akses object dan pembuatan signed URL menggunakan public key + JWT akun login, bukan service role. Seluruh 24 path manifest menghasilkan GET metadata 200 dengan ukuran positif, POST signed URL 200 (TTL 60 detik), dan HEAD signed URL 200 dengan content-type video; 24/24 tersedia dan dapat diakses, 0 gagal/hilang. Tidak mengunduh isi rekaman. HEAD URL publik tanpa tanda tangan ditolak 400; pembuatan signed URL memakai anon key tanpa sesi ditolak 400. GET /v2/catalog 200 berisi 6 dasar dan tepat 8 ID Kata Penting, semuanya automatic_evaluation=false, 0 custom pada akun uji. Seluruh 8 GET detail kata 200; urutan, instruksi dan referensi bucket/path sesuai manifest sumber, semua 24 referensi available=true; TOLONG TO-LONG-TOLONG, POLISI PO-LI-SI-POLISI, HAUS langsung kata utuh. Tanpa JWT 401, /v1/items 200. Ringkasan hasil diverifikasi dengan assert, logout hanya sesi uji scope local 204, helper dan hasil sementara dibersihkan. Credential/JWT/signed URL tidak disimpan atau ditampilkan. Hanya catatan progres diperbarui; tidak mengulang unit test/typecheck/lint karena kode produk tidak berubah. Tidak membaca data/, mengubah schema/RLS/object Storage, commit/push/deploy. Belum menguji pemutaran native di Expo Go atau hak tulis/ubah/hapus dan belum mengaudit SQL policy cloud; hasil akses anon hanya role tanpa sesi, bukan akun Auth anonim tersendiri. |
| Katalog Kata Penting + video v2 | Backend | Delapan panduan default, detail berurutan, binding 24 video privat | Sabtu 14 Nov | kode dan tes lulus; akses video akun terhalang RLS | Branch phase-important-word-catalog. Katalog v2 mengganti sembilan ringkasan lama dengan kp_tolong, kp_polisi, kp_api, kp_sakit, kp_obat, kp_alamat, kp_makan, kp_haus; enam materi L1 aktif dan custom lengkap milik akun tetap dipertahankan. Instruksi 113 langkah dari manifest tutorial existing bersumber dokumen Kata Penting; TO/LONG/TOLONG dan setiap bagian lain memakai ID/path tersendiri. HAUS level_2 kosong. Tambahan DTO automatic_evaluation, syllable_split, VideoReference.available diselaraskan Pydantic/TypeScript/fixture dan SPEC §5. Seluruh 24 ID panduan ditolak evaluator, pipeline tidak diubah. Video tidak terlihat/kosong tetap referensi tepat dengan available=false; tidak memakai video pengganti atau service role untuk data v2. 640 pytest, 368 Jest, tsc, Ruff check/format 104 berkas lulus; Expo lint 0 error/8 warning lama, satu deprecation Starlette/HTTPX lama. Auth asli login/user 200 non-anonim; backend GET catalog 200 (6 dasar, tepat 8 default, 0 custom), seluruh 8 detail kata 200 dengan urutan tepat, tanpa JWT 401, v1/items 200. Inventaris operator read-only: bucket rekan-wicara-tutorials privat, 24/24 path ada, tidak ada file fisik hilang. Namun GET info dan POST signed URL dengan JWT akun login seluruhnya 400 NoSuchKey: 0/24 dapat diakses akun; ini menunjukkan object tidak terlihat menurut RLS, bukan bukti file hilang. Backend merespons available=false untuk semua referensi, tanpa melewati pengamanan. Proposal SELECT policy dan query audit seluruh policy ada di docs/supabase/tutorial_default_read_policy.proposed.sql, BELUM diterapkan; perlu review/izin dan akses SQL Supabase. Write policy cloud belum dapat diaudit, tidak menguji tulis/hapus. Sesi uji logout scope local 204; credential/JWT/URL bertanda tangan tidak disimpan; helper sementara dibersihkan, data/ tidak dibaca. File v2.1 tetap belum ada: menggunakan klarifikasi acuan draft v2 + instruksi terbaru pengguna, bukan mengklaim identik v2.1. Draft menyebut O tetapi O masih nonaktif; enam materi aktif existing dipertahankan (termasuk MMM), evaluator O tidak diaktifkan. Schema cloud tidak memiliki status publikasi custom terpisah: kriteria kelengkapan existing dipertahankan tanpa migrasi. Isolasi custom diverifikasi tes sintetis; tidak ada custom akun uji untuk happy path live/dua akun. Pemutar native FE belum diuji/diubah. Tidak mengubah schema/RLS/cloud objects atau melakukan commit/push/deploy. |
| Uji integrasi Supabase asli v2 | Verifikasi | Sesi akun nyata dan endpoint v2 tanpa mock HTTP/pipeline | Sabtu 14 Nov | Auth/katalog/query/gerbang kualitas berhasil; video dan LLM masih terhalang | Memakai akun uji yang sebelumnya diberikan pengguna, email/password dimasukkan lewat getpass tanpa echo dan hanya di memori; JWT tidak disimpan/ditampilkan. Login Auth asli 200, /user memverifikasi akun non-anonim. Backend aktif: GET /v2/catalog 200 (6 dasar, 9 kata, 0 custom), GET /v2/items/l1_a 200 dengan videos kosong; GET /v2/words/l3_papa dan /v2/items/l2_pa 404 VIDEO_NOT_FOUND karena bucket/video default belum tersedia. POST /v2/instructions/generate dengan JWT sah 503 AI_UNAVAILABLE karena konfigurasi LLM kosong. Query authenticated limit=0 untuk progress, attempts, custom_words, custom_syllables+owner join dan custom_videos semuanya 200; membuktikan izin/sintaks query, bukan isolasi dua akun. POST /v2/analyze L1 A dan L3 PAPA memakai pola video sintetis+nada lokal, pipeline asli dan Auth asli: 200 retry/result null, masing-masing no_face+uncalibrated dan no_face+motion_missing. Tidak menguji akurasi ucapan/ASR penuh karena gerbang wajah memang menolak klip sintetis. GET katalog tanpa JWT 401. Logout hanya sesi uji (scope local) 204, tidak meminta logout semua sesi atau mengubah PIN. Tidak ada materi custom terpublikasi sehingga happy path custom tidak diuji live; tidak membuat akun/materi/file Storage dummy untuk mengisi kekosongan. Tidak mengakses data/ atau rekaman pengguna; media sintetis dan skrip sementara dibersihkan. Tidak mengubah schema/RLS/config/server aktif, commit/push/deploy; hasil dicatat di sini. |
| Backend API v2 | Backend | Katalog, detail, evaluator dan generator instruksi | Sabtu 14 Nov | implementasi/tes siap; integrasi layanan nyata belum lengkap | Branch phase-api-v2. Pengguna mengklarifikasi file acuan REKAN_WICARA_BE_FE_CONTRACT_V2_FINAL_DRAFT.md setelah v2.1 tidak ditemukan; prompt terbaru mengesampingkan multi-video/menu suku kata/status L1 lama, dan pengguna menetapkan lip_result/voice_result sebagai string hasil atau null. GET /v2/catalog, /v2/words/{word_id}, /v2/items/{item_id}, POST /v2/analyze dan /v2/instructions/generate terdaftar di OpenAPI. Auth /user diverifikasi memakai public key; DB/Storage selalu JWT pemanggil dan filter UID, tanpa service role untuk data v2. Custom hanya lengkap bila instruksi + tepat satu video terikat FK dengan object tersedia pada folder akun; posisi diurutkan dan PA–PA tetap dua langkah. Default memakai registry ID eksplisit content/default_videos.json, diverifikasi metadata; panduan delapan Kata Penting terpisah dari AI. V1 dipertahankan; helper verifikasi Auth dipakai ulang. L1 memakai evaluator MediaPipe/Parselmouth existing, L2/3 MediaPipe gerbang kualitas + Wav2Vec2 bebas/target otoritatif; tanpa transkripsi/visual L2/3, tanpa skor mock pada v2. Lip_result L2/3 null karena model existing belum menilai artikulasi per bunyi; tidak membuat skor palsu. Generator HTTP Chat Completions-compatible mengembalikan saran editable tanpa simpan DB; config/timeout/rate-limit provider/error/output tidak sesuai ditangani. 604 pytest (49 tambahan), 368 Jest, tsc, Ruff check/format 104 berkas lulus; lint 0 error/8 warning lama, satu deprecation Starlette/HTTPX lama. Fixture sintetik Pydantic→TypeScript baru diselaraskan. Backend lokal dimuat ulang; health/OpenAPI 200, lima rute v2 terdaftar, tanpa/invalid JWT 401 (Auth Supabase asli), v1/items 200. Uji 200 katalog/detail/evaluasi/generator memakai mocked Auth/DB/Storage/ASR/LLM; uji kualitas L1 memakai pipeline/model asli pada video sintetis. Metadata live: hanya bucket privat rekan-wicara-tutorials ada; default-videos belum ada (Storage mengembalikan 400 NoSuchBucket/statusCode404, ditangani). LLM_API_URL/KEY/MODEL belum dikonfigurasi, sehingga generator live belum diuji; default detail memerlukan upload video, O masih nonaktif, dan beberapa kata (APA/ABU/IBU/UBI) belum memiliki pemetaan suku kata vokal Level 2 sehingga INVALID_MATERIAL. Tidak menebak/mengganti ID Level 1. Model/venv MediaPipe dan ASR ada, tetapi akurasi ucapan dan isolasi dua akun nyata belum diuji pada fase ini. Schema/RLS/bucket tidak dibuat/diubah, tidak membaca data/, commit/push/deploy; hanya public key backend ditambahkan ke server/.env yang diabaikan Git. Contoh request/response dan batas implementasi di SPEC §5. |
| Verifikasi HTTP After Login | Verifikasi | Request ke server aktif dan validasi query metadata Supabase | Sabtu 14 Nov | server v1 berhasil; integrasi v2 belum tersedia | Atas permintaan pengguna dilakukan request HTTP nyata, tanpa mock respons: GET /v1/health 200 (mock_mode=false), GET /v1/items 200 berisi 24 entri dengan metadata valid. GET /v2/catalog, /v2/words/kp_tolong, /v2/items/l1_a semuanya 404; OpenAPI aktif mengonfirmasi nol rute /v2/. GET /v1/tutorials tanpa sesi 401 auth_required. Query Supabase memakai public anon key dan limit=0 (tanpa membaca baris pengguna/service role): kolom progress/attempts diterima 200 dengan array kosong; custom_words dan join custom_syllables→custom_words ditolak 401, kode 42501 pada role tanpa sesi. Ini bukan pengujian JWT pengguna atau bukti isolasi RLS antar akun. 25 tes logic Home pada 4 suite dijalankan ulang dan lulus. Tidak mengklaim Beranda v2 berhasil; kontrak v2.1 masih tidak tersedia. Tanpa perubahan kode/schema/data/Storage, restart layanan, commit/push/deploy. |
| After Login — fondasi data | App/logic | Mapping schema aktual, progres/aktivitas dan state per akun | Sabtu 14 Nov | bagian independen siap; integrasi Beranda belum selesai | Branch phase-after-login. Instruksi terbaru menetapkan REKAN_WICARA_BE_FE_CONTRACT_V2_1_VIDEO_DAN_KATA_PENTING.md sebagai sumber final, tetapi file itu tidak ada di repo; draft v2 tidak digunakan sebagai kontrak final. Desain visual Beranda juga belum tersedia; pengguna meminta lanjut hanya bagian independen. Ditambahkan src/home/mapping.ts, records.ts, resume.ts, useHomeRecords.ts: baca progress dan 10 attempts terbaru via SDK dengan filter pemilik, paginasi progres, nama custom lewat owner/parent join, retry tidak dihitung sebagai gagal, L2/3 tidak menampilkan Mendekati, hitung kelulusan dari metadata DB tanpa ambang baru, cursor AsyncStorage per UID, error/retry/session expired, refresh focus/foreground dan respons lama diabaikan saat akun berubah. Level legacy dipertahankan sampai kontrak migrasi tersedia. Penghapusan Auth owner turut membersihkan cursor lokal akun itu saja. Hook/service ini belum dipasang ke layar produk; tidak membuat atau mengarang UI/katalog/mock v2.1. Cloud diperiksa hanya metadata: profiles/progress/attempts dan custom_words/custom_syllables/custom_videos beserta kolom multi-video ada, sedangkan schema.sql repo masih lama; GET /v2/catalog pada server aktif 404. Tidak mengubah schema/RLS/Storage/evaluator/server. 368 Jest lulus (25 tambahan); 44 tes terdampak lulus lagi setelah penyesuaian kompatibilitas level, tsc lulus, lint 0 error/8 warning lama. Akses SDK pengguna nyata, UI HP, login→Beranda, bottom navigation dan alur kata belum terverifikasi/diintegrasikan; bergantung kontrak v2.1 dan desain visual. Tidak membaca rekaman, membuat dependency, commit/push/deploy. |
| Perbaikan navigation perekam | App | Hilangkan render error NavigationContainer saat membuka Rekam Tutorial | Jumat 13 Nov | diperbaiki dan direproduksi di tes navigator asli; HP menunggu reload | Hook @react-navigation/native membaca konteks berbeda dari Expo Router SDK 58. Menggunakan usePreventRemove dari expo-router dan repeat untuk melanjutkan aksi setelah konfirmasi buang rekaman; akses useNavigation legacy dihapus. Tes render dengan navigator Expo asli mereproduksi error pada kode lama lalu lulus sesudah perbaikan; uji back dengan rekaman belum diunggah memastikan tetap di layar hingga konfirmasi, lalu navigasi berlanjut dan cache dibersihkan. 343 Jest lulus; 9 tes terdampak lulus lagi setelah penataan deklarasi untuk lint; tsc lolos, lint 0 error/8 warning lama. Bundle iOS HTTP 200. Tanpa perubahan backend/dependency/kontrak API, commit/push/deploy. |
| Rekam tutorial ke Storage | App/backend | Rekam 24 target di Expo Go, pratinjau dan upload sesuai path default | Jumat 13 Nov | kode/tes siap; rekaman dan upload HP nyata belum dilakukan | Branch phase-tutorial-recording. Tombol Rekam Tutorial (24 video) di beranda dev, langkah sumber satu per satu, kamera 1080p dengan stop manual (batas 120 detik/50 MiB), preview dan upload eksplisit. Backend memverifikasi bearer Auth dan allowlist UID server; kosong ditolak. Konversi H.264/AAC MP4 tanpa pemotongan, path hanya dari manifest server/app/content/tutorials.json (24 ID, 8 kata + 16 suku kata, 113 langkah UI sumber), upload tanpa upsert; sukses hanya setelah ukuran objek diverifikasi. Tidak mengubah latihan, model AI, schema/RLS atau bucket. 555 pytest/Ruff, 341 Jest, tsc lolos; lint 0 error/8 warning lama, detektor UI kosong. Uji tambahan 7 tes layar tetap lulus setelah perbaikan lint. Bucket asli privat, batas 52428800 byte; metadata awal seluruh 24 path kosong. Backend health 200/mock false, endpoint tanpa sesi dan token invalid ditolak 401 (Auth asli), manifest Expo dan bundle iOS 200 dengan menu baru; service role tidak ada dalam bundle. Allowlist akun pengguna hanya di server/.env yang diabaikan Git. Upload nyata, mutu/kompatibilitas kamera native dan audit penuh policy Storage belum terverifikasi. Belum ada video dummy/rekaman pengguna yang diunggah; tidak mengakses data/, menambah dependency, commit/push/deploy. |
| PIN akun di HP | App | Sambungkan login dan pembuatan PIN pendamping | Jumat 13 Nov | kode/tes siap; PIN native menunggu input pengguna | Pengguna meminta membuat PIN baru pada akun sendiri setelah PIN legacy tidak terbaca. Branch phase-companion-pin-ui. Login existing disambungkan ke onboarding/pendamping; akun tanpa PIN lokal mendapat form PIN baru dua kali, disimpan SecureStore per UID. PIN existing tetap diverifikasi, tidak ditimpa. Tidak menanam UID/PIN/password pengguna dalam kode. 326 Jest lulus; pemeriksaan akhir 22 tes terdampak, tsc dan lint lolos (8 warning lama), bundle iOS HTTP 200 memuat layar baru. Native/SecureStore aktual tetap perlu pengguna login dan mengisi PIN di HP. Tanpa perubahan backend/schema/API/dependency, commit/push/deploy; perekam tutorial belum ditambahkan. |
| Produksi tutorial Kata Penting | Dokumentasi | Persiapan 24 video untuk 8 kata penting | Jumat 13 Nov | panduan/folder siap; belum direkam | Instruksi terbaru meminta langsung eksekusi persiapan tanpa konfirmasi. Branch phase-important-word-videos, docs/video_production/important_words berisi panduan, kartu 24 video, checklist kosong, manifest dan pemeriksaan sumber. Media direncanakan di media/important_words, folder kosong bertanda .gitkeep dengan ignore rekaman lokal. 8 kata lengkap + 16 potongan, 24 ID/nama unik; 113 langkah Bagian C sumber v4 disalin verbatim dan diperiksa. HAUS tetap utuh; dua A berbeda induk tetap terpisah. Tanpa perubahan aplikasi/backend/database/API/Supabase, video dummy, commit/push/deploy. Kualitas rekaman belum dapat diperiksa. |
| Auth live + nama register | Backend/logic | Register/login Supabase asli dan display_name | Jumat 13 Nov | register/login/profil/sesi nyata lulus; native dan recovery belum | Backend terbaru port 8000 aktif. Akun uji dibuat atas instruksi pengguna, konfirmasi email manual lalu login non-anonim berhasil. display_name dari metadata register dibuat di public.profiles saat sesi tersedia/login setelah konfirmasi, tanpa schema/trigger/RLS baru; profil existing dipertahankan. Refresh, restore storage Node terisolasi, logout, dan penolakan read anonim akun uji lulus. 318 Jest, tsc, lint 0 error/8 warning lama; backend terakhir 536 pytest/Ruff lolos. Password/token tidak disimpan dalam kode/log; akun uji dipertahankan. Redirect localhost:3000 tidak berjalan, tetapi konfirmasi terbukti berhasil. Rincian docs/supabase/AUTH.md. |
| Auth pendamping | Backend/logic | Supabase email/password, profil, sesi dan PIN per akun | Jumat 13 Nov | implementasi/tes lokal siap; Supabase nyata belum diuji | Instruksi terbaru meminta langsung implementasi tanpa UI/navigasi. Branch phase-companion-auth, memakai client/dependency dan schema existing. Login anonim otomatis dihentikan; profil/antrean/PIN diisolasi auth.uid(), data lama tidak dihapus/ditautkan. DELETE /v1/auth/account memverifikasi bearer ke Supabase lalu Admin Auth delete pemilik, service role hanya server. 536 pytest (15 baru), 315 Jest (30 baru), tsc/Ruff lolos; lint 0 error/8 warning lama. Mock-only, tanpa akun/email/delete nyata. UI login dan konfigurasi service role/SMTP live belum tersedia/diverifikasi. Rincian docs/supabase/AUTH.md; tanpa commit/push/merge/deploy. |
| Suku kata eksperimen | Riset | Tambahan PA dan MA di kedua layar eksperimen | Jumat 13 Nov | kode/tes siap; ucapan manusia belum diuji | Pengguna menyetujui penambahan dua target, teks UI serta perluasan enum kontrak. Target bersama/validator app, schemas/types/SPEC diselaraskan; inferensi bebas dan algoritma kecocokan tetap. 521 pytest (6 tambahan), 285 Jest (5 tambahan), tsc/Ruff lolos; lint 0 error/8 warning lama. Dua tes endpoint dan lima tes UI baru gagal sebelum implementasi lalu lulus. Backend direstart, health/LAN dan bundle iOS 200; bundle memuat PA/MA. Tanpa dependency/training/perubahan ambang/progres/Supabase, commit/push/tag. |
| Wav2Vec2 dinamis | Riset | CLI single/batch target bebas dan ground truth terpisah | Jumat 13 Nov | alat/tes siap; akurasi ucapan belum diukur | Branch phase-wav2vec2-eval, reuse checkpoint/venv dan loader PoC, greedy CTC CPU offline, satu load per evaluasi. Target hanya setelah inferensi, CSV tanpa path, input read-only, error/kosong terpisah. 515 pytest (22 baru), Ruff check/format 93 berkas lolos; satu warning lama. Model asli diuji dua nada sintetis dengan socket diblokir: satu load, teks kosong keduanya, input identik. Bukan bukti pembeda PA/BA. Tanpa dependency/API/frontend/scoring/Supabase baru atau akses data/. Tanpa commit/merge/push/tag/deploy. Panduan: docs/WAV2VEC2_POC.md. |
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

- Jumat 13 Nov (publikasi be/auth): pengguna meminta membuat branch be/auth dan push,
  menggantikan larangan commit/push sebelumnya untuk publikasi ini. Cakupan: logic Auth,
  tes/dokumentasi, serta eksperimen Wav2Vec2 dan PA/MA yang sudah diuji pada working tree.
  Tiga draf/catatan root tetap lokal. Tidak menyertakan .env, rekaman, model atau venv;
  pemeriksaan pola credential pada calon berkas tidak menemukan kecocokan. Tidak merge
  ke main atau mengubah tag submission. Verifikasi terakhir: 536 pytest, 318 Jest,
  TypeScript dan Ruff lolos; lint Expo 0 error/8 warning lama.

- Jumat 13 Nov (Auth live + display_name): pengguna meminta backend dijalankan dan tes
  Supabase asli memakai akun yang diberikan, lalu meminta payload register berisi nama.
  Register kini mengirim options.data.display_name; profile upsert memakai UID sesi dan
  ignoreDuplicates. Jika konfirmasi email diwajibkan, nama masuk metadata dahulu dan
  public.profiles dibuat pada login sesudah konfirmasi. Jika sesi langsung diberikan,
  profil dibuat saat register. Sinkronisasi antrean tidak lagi membuat placeholder
  profiles, sehingga tidak mendahului nama register; profil existing tidak ditimpa.
  Tanpa schema/trigger/policy/dependency baru. Tiga tes tambahan: metadata register,
  profil register langsung, dan error profil sesudah login; total 318 Jest, tsc dan lint
  lolos (8 warning lama). Pytest/Ruff backend terakhir 536/95 berkas lulus; backend tidak
  diubah pada tambahan nama. Backend terbaru direstart, health/OpenAPI 200, Auth route aktif.
  Tes live mengeksekusi source TS companion.ts dengan SDK Supabase terpasang, hanya batas
  native/UI diganti adapter. Password dimasukkan lewat console non-echo; sesi uji hanya
  di memori terisolasi, tanpa mencetak email/password/token atau menyimpan credential ke
  kode/log/Git. Register asli sukses dan identity baru tersedia; login sebelum konfirmasi
  ditolak email_not_confirmed. Pengguna membuka tautan; redirect localhost:3000 gagal
  karena server tujuan tidak ada, tetapi login setelahnya berhasil. Profile sesuai UID
  dan nama register, refresh session, restore client dari storage terisolasi, logout,
  serta tidak terbukanya profil akun uji ke client anonim terverifikasi. Backend menolak
  token tidak valid 401/auth_invalid melalui Supabase asli tanpa menghapus akun. Tidak
  menguji delete akun/reset password/PIN native secara live. Akun uji tetap disimpan;
  proses uji dihentikan setelah logout. Tidak mengubah konfigurasi redirect proyek,
  membaca akun lain, menghapus data lama, commit/push/merge/deploy atau membuat UI baru.

- Jumat 13 Nov (Auth pendamping): instruksi eksplisit terbaru meminta langsung implementasi
  menggantikan kebutuhan berhenti pada rencana untuk fase ini, dengan larangan perubahan
  UI/halaman/navigasi/schema/RLS/dependency. Memakai Supabase client existing untuk
  email/password, sesi persisten AsyncStorage/processLock/foreground refresh, profile
  create/read/update, email recovery + verifyOtp TokenHash, perubahan password/nonce.
  PIN tepat empat digit tersimpan SecureStore per UID, menolak overwrite serta PIN lama
  salah; operasi credential dan tulis PIN yang berbarengan ditolak. Provider mengikuti
  INITIAL_SESSION dan pergantian akun; callback/load/sync lama diabaikan, state anak
  direset hanya pada pergantian pemilik untuk melepas otorisasi PIN akun sebelumnya.
  Auto signInAnonymously dihapus; sinkronisasi memeriksa UID profil/tiap batch dan
  pembuatan profil tidak menimpa display_name. Tidak mengubah logika latihan/progres.
  Data legacy cw.profile/cw.companionPin dan akun anonim lama dibiarkan utuh, tidak
  dimigrasikan/ditautkan otomatis. Logout mempertahankan penyimpanan per akun.
  Penghapusan profil saja tidak disediakan karena RLS existing tidak punya DELETE;
  client meminta reauthentication password lalu DELETE /v1/auth/account. Endpoint
  memverifikasi JWT dengan Supabase /user, memakai ID terverifikasi untuk Admin Auth
  hard delete dan ON DELETE CASCADE existing; service role hanya server, response/error
  aman tanpa token/credential. SPEC/schema/types/client diselaraskan. Field server URL/
  service role sudah ada sebelumnya; contoh env diperjelas tanpa membaca/menulis .env.
  536 pytest, 315 Jest (27 suite), TypeScript/Ruff check/format 95 berkas lolos; lint 0
  error/8 warning lama, satu warning pytest Starlette/HTTPX lama. Semua auth diuji
  dengan mock dan data sintetis; tidak membuat akun nyata, mengirim email, menjalankan
  SQL, menghapus user nyata, atau deploy. SMTP/confirmation/redirect/RLS live belum
  diuji. Tanpa UI login, onboarding PIN baru perlu sesi yang disediakan pemanggil;
  rincian fungsi dan setup ada di docs/supabase/AUTH.md. Tidak commit/merge/push/tag.

- Jumat 13 Nov (suku kata di HP): setelah rencana disetujui, PA dan MA ditambahkan ke
  daftar bersama Uji Wav2Vec2/Uji Gabungan tanpa mengganti empat materi lama. UI memakai
  judul Latihan suku kata dan kata serta tombol Latih target ini/Pilih target lain.
  Nilai API lowercase pa/ma, label UI uppercase PA/MA; schema backend, tipe/validator
  app dan SPEC diselaraskan. Validator respons memakai daftar target app yang sama.
  Tidak mengubah decoder, checkpoint, bobot, durasi, gerbang MediaPipe, ambang atau
  algoritma Levenshtein. Karena aturan target pendek tetap berlaku, target PA yang
  terbaca MA mendapat Mendekati bila gerbang lulus, bukan Berhasil; ini bukan bukti
  pembeda bunyi atau skor ketepatan pelafalan. 521 pytest, 285 Jest, tsc/Ruff lolos;
  lint 0 error/8 warning lama, detektor TSX tidak menemukan pola yang diperiksa.
  Backend direstart pada 8000; OpenAPI aktif menerima pa/ma dan bundle iOS 8081
  merespons 200 dengan kedua pilihan baru. Tampilan/native dan ucapan PA/MA di HP
  tetap menunggu pengguna. HTTP model asli menerima kedua target pada video/nada
  sintetis: 200, teks kosong, Coba lagi/visual_gate; bukan bukti pengenalan PA/MA.
  Tidak menambah dependency, membaca data/, mengganti
  latihan utama/Level 3/progres/Supabase/Allosaurus atau commit/merge/push/tag/deploy.

- Jumat 13 Nov (Wav2Vec2 target dinamis): pengguna menyetujui implementasi setelah audit
  dan rencana. Ekstrak loader lokal dari PoC sambil mempertahankan infer(path), CLI JSON,
  endpoint dan seluruh perilaku aplikasi. CLI evaluasi terpisah memakai manifest CSV
  (trial_id,file,target; ground_truth/speaker_id opsional), tanpa menebak label dari nama
  berkas. Target/ground truth hanya dibandingkan setelah greedy CTC bebas; normalisasi
  hanya kapitalisasi dan spasi. Kecocokan teks bukan skor pelafalan. Ringkasan pengenalan
  memakai ground truth manusia; hasil error/kosong tetap masuk penyebut baris berlabel.
  Model dimuat sekali per evaluasi, tidak diulang saat gagal dimuat. Tidak menambah
  dependency, training atau mengubah API/ambang/frontend/Supabase/Allosaurus. Folder lokal
  eksperimen diabaikan Git, path tidak diekspor, data/ ditolak, CSV lama tidak ditimpa.
  515 pytest lolos, satu warning Starlette/HTTPX lama, Ruff check/format 93 berkas lolos.
  Uji asli offline/sintetis: dua WAV nada identik 2,5 detik dengan target PA/BA, load satu
  kali 25165,2 ms (termasuk impor), forward+decode 2668,206 dan 438,650 ms, teks kosong,
  input tidak berubah. Berjalan bersamaan dengan pytest, bukan benchmark latensi.
  CLI single asli juga sukses pada nada sintetis (765,103 ms); CLI PoC lama sukses
  dengan bentuk JSON kompatibel (755,284 ms). Kedua hasil tetap teks kosong.
  Belum ada ground truth ucapan manusia; belum dapat menyimpulkan kemampuan PA/BA/MA,
  perbandingan suku kata/kata atau kelayakan Level 2. Tidak commit/merge/push/tag/deploy.

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
