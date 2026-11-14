# SPEC — Cermin Wicara MVP (v1)

Dokumen ini adalah acuan teknis untuk Claude Code dan tim. Semua angka ambang di sini adalah
**nilai awal** yang disetel ulang dari data (fase A6) dan disimpan di `server/app/config/thresholds.yaml`.

---

## §1 Produk dan batas

- Pengguna: penyandang Tuli/gangguan pendengaran yang memilih berlatih bicara.
- Pendamping: orang tua/keluarga/guru. Memantau lewat Mode Pendamping (PIN), bukan akun terpisah.
- Posisi: alat bantu latihan mandiri di antara pertemuan dengan guru/terapis. Bukan diagnosis.
- Skor = indikator latihan (perkiraan sistem). Aplikasi selalu menampilkan label itu.

## §2 Metode belajar

Siklus satu percobaan: **Lihat** (video model + garis bibir target) → **Tiru** (rekam 2–3 detik)
→ **Bandingkan** (hasil muncul SETELAH mencoba) → **Ulangi**.

| Level | Isi | Status MVP |
|---|---|---|
| 0 | Suara: tahan "aaa", pelan lalu keras | Wajib |
| 1 | Bunyi terisolasi: a, i, u, mmm (e, o bonus) | Wajib |
| 2 | Suku kata: ma mi mu pa pi pu ba bi bu | Wajib |
| 3 | Kata (lihat §3) | Wajib |
| 4 | Pasangan minimal | Bonus |

Setiap materi naik level sendiri-sendiri (lihat §8.4).

## §3 Materi (sumber: `server/app/content/items.json`)

Notasi unit: suku kata atau vokal. Setiap unit tersusun dari fon: `C:m`, `C:p`, `C:b`, `V:a`, `V:i`, `V:u`, `V:e`, `V:o`.

| item_id | level | teks | unit (suku kata) | prioritas |
|---|---|---|---|---|
| l0_hold_a | 0 | Tahan "aaa" | [a] (nilai durasi) | wajib |
| l0_soft_loud | 0 | Pelan lalu keras | [a, a] (nilai selisih kekerasan) | wajib |
| l1_a | 1 | a | [a] | wajib |
| l1_i | 1 | i | [i] | wajib |
| l1_u | 1 | u | [u] | wajib |
| l1_m | 1 | mmm | [m_hum] | wajib |
| l1_e | 1 | e | [e] | bonus |
| l1_o | 1 | o | [o] | bonus |
| l2_ma … l2_bu | 2 | ma, mi, mu, pa, pi, pu, ba, bi, bu | [ma] … [bu] | wajib |
| l3_mama | 3 | mama | [ma, ma] | wajib |
| l3_papa | 3 | papa | [pa, pa] | wajib |
| l3_bibi | 3 | bibi | [bi, bi] | wajib |
| l3_pipi | 3 | pipi | [pi, pi] | wajib |
| l3_apa | 3 | apa | [a, pa] | wajib |
| l3_abu | 3 | abu | [a, bu] | wajib |
| l3_ibu | 3 | ibu | [i, bu] | wajib |
| l3_ubi | 3 | ubi | [u, bi] | wajib |
| l3_bumi | 3 | bumi | [bu, mi] | wajib |
| l3_mau | 3 | mau | [ma, u] | bonus |
| l3_bau | 3 | bau | [ba, u] | bonus |
| l3_boba | 3 | boba | [bo, ba] | bonus |

Level 4 (bonus): pasangan `mama–papa`, `bau–mau`, `pipi–bibi`, `abu–ibu`, `papa–pipi`.

Bentuk `items.json` (contoh satu entri):
```json
{"item_id":"l3_mama","level":3,"text":"mama","units":["ma","ma"],
 "priority":"required","emoji":"👩","active":true}
```
- Makna kata ditampilkan dengan emoji + teks (tanpa berkas gambar). Kata tanpa emoji yang cocok cukup teks.
  Saran: mama 👩, papa 👨, ibu 👩‍👧, bumi 🌍, ubi 🍠, boba 🧋, mau 🙋, bau 👃, apa ❓; bibi, pipi, abu cukup teks.
- Video model tidak dibundel di app: disajikan server lewat `GET /v1/model-video/{item_id}` (lihat §5).
Validasi saat memuat: setiap unit harus tersusun dari fon Tahap A. Materi yang melanggar ditolak.

## §4 Arsitektur

```
HP (Expo Go)                          Laptop (FastAPI)
expo-camera rekam mp4 (video+audio) ─▶ /v1/analyze
                                        1 media: ffprobe offset, ffmpeg → wav 16k mono + frame 15 fps 480p
                                        2 quality (K1)
                                        3a lips: MediaPipe Face Landmarker (VIDEO mode)
                                        3b audio: Parselmouth
                                        4 segment: unit/suku kata
                                        5 rules + hints → JSON
                                        6 hapus semua berkas sementara
◀───────────────────────────────────── hasil JSON
app simpan ringkasan → Supabase
```

Environment server (`server/.env`): `HOST`, `PORT`, `MOCK_MODE` (true/false), `DATASET_MODE`,
`DEBUG`, `DATA_DIR` (default `../data`), `SCORER_MODE` (MVP: selalu `rules`), `ENGINE_VERSION`.

## §5 Kontrak API v1 dan v2 (sumber kebenaran)

Semua endpoint di bawah prefix `/v1`. Upload memakai `multipart/form-data`.

### API v2 — implementasi 14 November 2026

Acuan dibaca dari `REKAN_WICARA_BE_FE_CONTRACT_V2_FINAL_DRAFT.md`, sesuai klarifikasi
pengguna. File bernama v2.1 belum tersedia. Instruksi terbaru pengguna mengesampingkan
bagian draft yang bertentangan: satu video per kata/suku kata, katalog tanpa menu suku
kata, delapan Kata Penting berupa panduan tanpa penilaian otomatis, Level 1 memiliki tiga hasil, serta
`lip_result`/`voice_result` berupa string hasil atau null. Ini bukan klaim draft lama identik v2.1.

Semua request v2 membutuhkan `Authorization: Bearer <Supabase access token>`.
Server memverifikasi akun email non-anonim melalui Auth `/user`. Database dan Storage
diakses memakai `SUPABASE_ANON_KEY` + JWT pemanggil, sehingga RLS tetap berlaku;
UID filter selalu berasal dari hasil verifikasi, bukan form/query. Tidak memakai service
role untuk akses data v2. Semua rute berikut terdaftar juga saat `DEBUG=false`.

| Method/path | Request | Response 200 |
|---|---|---|
| GET `/v2/catalog` | tanpa body | `{level_1: [{id,text,instruction,videos}], words: [{id,text,source,has_level_2,automatic_evaluation}]}` |
| GET `/v2/words/{word_id}` | ID default atau `custom_word:<uuid>` | `{id,text,source,syllable_split,automatic_evaluation,level_2:[{id,text,position,instruction,videos}],level_3:{instruction,videos}}` |
| GET `/v2/items/{item_id}` | detail langsung L1/L2/L3 | `{id,level,text,instruction,videos,automatic_evaluation}` |
| POST `/v2/analyze` | multipart `file`, `item_id`, `session_id` | format evaluasi di bawah |
| POST `/v2/instructions/generate` | JSON `{type:"word"|"syllable",text,parent_word?}` | `{instruction:string}` |

`videos` berisi referensi `{bucket,path,position,available}`; tidak berisi URL publik atau
kredensial. FE meminta signed URL melalui Supabase SDK saat video dibuka, bukan saat
login. Materi Level 1 dan detail kata lama memakai registry eksplisit `server/app/content/default_videos.json`
berdasarkan ID materi; file diverifikasi dengan metadata Storage. Registry bukan bukti
file sudah diunggah. Custom terikat `custom_videos.word_id XOR syllable_id` dan wajib
berada di folder pemilik. Satu materi custom harus memiliki instruksi nonkosong dan
tepat satu video yang tersedia; semua suku kata harus lengkap, posisi positif/unik,
dan diurutkan sesuai `position`. Dua PA tetap dua langkah walaupun ID sama.
Tidak mengubah status publikasi/schema atau menyimpan hasil generator.

Video L1 default boleh `[]` saat belum tersedia. Detail kata/suku kata lama dan custom membutuhkan
video: bila tidak ada, `404 VIDEO_NOT_FOUND`. Kata dengan suku kata yang belum memiliki
ID Level 2 yang tersedia (misalnya bagian A pada APA) menghasilkan `422 INVALID_MATERIAL`,
tidak diam-diam memakai ID Level 1 dengan evaluator berbeda. E/O kini didukung khusus
pada v2 sesuai keputusan perekaman dan evaluasi lima vokal; v1 tetap mempertahankan status nonaktif E/O. Custom terpisah
tetap mengikuti kepemilikan dan validasi kelengkapan.

Perekaman lima tutorial vokal menggunakan `GET /v1/tutorials?group=level_1` dan upload
existing `POST /v1/tutorials/{item_id}/video`. Daftar tanpa query tetap 24 Kata Penting.
Manifest `server/app/content/level_one_tutorials.json` terpisah dari manifest Kata Penting;
TutorialItem menambah kind vowel dan level 1. Operator memakai JWT akun pada allowlist
existing; kredensial operator Storage hanya ada pada backend. Kelima video menggunakan
bucket privat existing rekan-wicara-tutorials dan path default/level-1/{a,i,u,e,o}.mp4.
Tidak membuat bucket/policy baru dan tidak memakai video Kata Penting sebagai pengganti.
FE otomatis mengunggah setelah perekaman selesai, mempertahankan clip untuk retry bila
gagal, dan membersihkan cache setelah verifikasi. Upload existing memakai upsert:false,
bukan menimpa file aktif. Rekam ulang sebelum upload tetap tersedia; penggantian file
yang sudah ada memerlukan proses operator tersendiri. Tidak ada upload galeri.

Integrasi FE Level 1: Beranda akun login membaca katalog v2, menyatukan materi l0_*
sebagai Level 1 dan tidak menduplikasi grup Level 0/1 lama. Kembali ke Beranda memuat ulang
katalog agar video hasil perekaman terbaru terbaca. Klik materi membuka detail v2,
signed URL melalui SDK saat diputar, rekam -> POST v2/analyze -> hasil -> Ulangi/Selesai.
Sesi diperiksa sebelum/sesudah operasi dan state lama dibuang saat UID berganti.
Hanya evaluated masuk antrean attempts existing, retry tidak dihitung. Mapping tiga
hasil ke hijau/kuning/merah mengikuti schema. Score dan engine_version yang tidak
disediakan v2 disimpan null; parser lokal mempertahankan null untuk engine v2.
Antrean SDK tetap UUID-idempotent dan terisolasi UID. Hasil v2 tidak dimasukkan ke aturan
kelulusan/progress legacy 8/10; tidak membuat syarat lulus baru sebelum keputusan produk.
Selesai berarti menutup latihan, bukan otomatis lulus. Tampilan terakhir per materi
menggunakan riwayat lokal akun. Layar Level 2/3 legacy tetap pada alur sebelumnya.

#### Katalog Kata Penting dan video — pembaruan 14 November 2026

Perubahan DTO berikut diselaraskan di Pydantic, tipe TypeScript, dan fixture kontrak;
merupakan tambahan sesuai permintaan pengguna, bukan kutipan file v2.1 yang belum tersedia.
Tidak mengubah API v1, schema, policy Storage, atau evaluator.

Katalog v2 kini memiliki delapan materi Level 1 (`l1_a`, `l1_i`, `l1_u`, `l1_e`, `l1_o`, `l1_m`,
`l0_hold_a`, `l0_soft_loud`) dan mengganti sembilan ringkasan kata default lama dengan:

| ID | Kata | `syllable_split` | Tahapan Level 2 |
|---|---|---|---|
| `kp_tolong` | TOLONG | `to-long` | TO, LONG |
| `kp_polisi` | POLISI | `po-li-si` | PO, LI, SI |
| `kp_api` | API | `a-pi` | A, PI |
| `kp_sakit` | SAKIT | `sa-kit` | SA, KIT |
| `kp_obat` | OBAT | `o-bat` | O, BAT |
| `kp_alamat` | ALAMAT | `a-la-mat` | A, LA, MAT |
| `kp_makan` | MAKAN | `ma-kan` | MA, KAN |
| `kp_haus` | HAUS | `haus` | `[]` (langsung kata utuh) |

Keputusan terbaru 14 November menambahkan E dan O khusus v2; enam materi existing tetap
dipertahankan. Registry v1 tidak diaktifkan ulang. Kelima vokal memiliki evaluator v2
khusus sebagaimana dijelaskan di bawah; MMM, A panjang dan pelan-ke-keras tidak berubah.

Seluruh Kata Penting memiliki `source: "default"` dan `automatic_evaluation: false`.
Instruksi merupakan langkah UI dari dokumen sumber, disalin melalui manifest yang sudah
ada `server/app/content/tutorials.json`; tidak menyertakan landasan riset. Instruksi kata
utuh dan videonya berada pada `level_3`; setiap suku kata memiliki ID terpisah
`kp_<kata>_<suku>`, `position` mulai 1, instruksi, dan tepat satu referensi video.
Contoh urutan TOLONG: `kp_tolong_to`, `kp_tolong_long`, lalu `kp_tolong`.
Bagian A dalam API dan ALAMAT memiliki ID dan video berbeda.

Bucket privat yang digunakan adalah `rekan-wicara-tutorials`. Delapan video kata utuh
berada di `default/words/<kata>.mp4`; 16 video suku kata berada di
`default/syllables/<kata>/<posisi-dua-digit>-<suku>.mp4`.
`VideoReference.position` adalah urutan video dalam satu materi (selalu 1), sedangkan
`level_2[].position` adalah urutan suku kata dalam kata. Katalog tidak mengunduh atau
menandatangani video Kata Penting; pemeriksaan metadata dilakukan saat detail dibuka.

Jika suatu video panduan tidak ditemukan/tidak terlihat oleh RLS/kosong, detail tetap HTTP 200 dengan instruksi,
path yang diharapkan, dan `available: false`. FE harus menampilkan kondisi video belum
tersedia dan tidak meminta signed URL untuk referensi tersebut. Jika pemeriksaan akses
Storage ditolak secara eksplisit (403) atau layanan gagal, server mengembalikan
`503 STORAGE_UNAVAILABLE`, bukan menganggap file ada. Respons Storage `NoSuchKey`
juga dapat menyembunyikan object yang tidak boleh dibaca; `available: false` bukan
bukti file fisik hilang. Server tidak melewati RLS untuk membedakannya.
Untuk `available: true`, FE memakai `supabase.storage.from(bucket).createSignedUrl(path, expiresIn)`
dengan sesi akun login saat video dibuka; URL tidak disimpan sebagai metadata permanen.

FE harus menggunakan `automatic_evaluation: false` untuk alur panduan tanpa mengirim
rekaman ke `/v2/analyze`; server juga menolak seluruh ID Kata Penting sebagai target
evaluasi. Nilai default flag pada materi lama/custom adalah true; `syllable_split`
pada detail lama/custom adalah null. Penyesuaian UI/alur latihan tidak termasuk tahap ini.
Ringkasan custom tetap terisolasi per pemilik dan hanya muncul setelah instruksi dan
seluruh video lengkap. Schema yang tersedia belum memiliki status publikasi tersendiri;
kelengkapan tetap menjadi kriteria yang sudah digunakan, tanpa menebak kolom baru.

#### Kata Manual - audit Backend, satu Simpan Kata (14 November 2026)

Fase ini Backend only: tidak mengubah app/, Expo, TypeScript, atau UI. Response DTO
existing tetap. Kontrak request dan siklus simpan berikut menggantikan staging lama.
UI tetap satu Simpan Kata, tanpa publikasi manual atau galeri. Tim FE menangani kamera
serta upload SDK; Backend menerima referensi rekaman dan mengelola metadata/JWT.

| Method/path | Input | Response |
|---|---|---|
| POST `/v2/custom-words` | snapshot lengkap, UUID stabil dan path rekaman yang sudah diunggah | 201 `CustomWordDetail` |
| GET `/v2/custom-words` | tanpa body | `{words:CustomWordSummary[],max_upload_mb,max_duration_s}` |
| GET `/v2/custom-words/{uuid}` | UUID pemilik | `CustomWordDetail` |
| PATCH `/v2/custom-words/{uuid}` | snapshot lengkap, wajib revisi terakhir | `CustomWordDetail` |
| DELETE `/v2/custom-words/{uuid}?revision=N` | revisi terakhir, termasuk retry deleting | `{id,status:"deleted"|"cleanup_pending"}` |
| POST `/v2/custom-words/{uuid}/cleanup` | retry endpoint existing | `CustomWordDetail` |

Detail tetap `{id,word,instruction,status,revision,video,syllables,cleanup_pending}`;
video null atau `{bucket,path,position:1,available}`. Ringkasan tetap
`{id,word,status,revision,syllable_count,cleanup_pending}`. Error tetap
`{detail:{code,message}}`. JWT email non-anonim diverifikasi; UID berasal dari Auth,
bukan body atau PIN. Default kp_* bukan UUID custom yang dapat diedit.

Batas kata dan teks suku kata: 1-30 huruf A-Z/a-z, tanpa angka/spasi/tanda baca.
Instruksi wajib nonkosong setelah trim, maksimal 8.000 karakter, termasuk pada INSERT
internal pertama. Maksimal 6 suku kata; Level 2 boleh kosong. ID unik dan posisi 1..N
harus unik/berurutan. Setiap material aktif membutuhkan tepat satu video tersendiri.
PATCH mengganti snapshot pohon; bagian yang tidak disertakan berarti dihapus.

Tambahan request: `video_path` pada kata dan setiap suku kata. Path rekaman baru:

- `<auth.uid()>/words/<word_uuid>/word/<recording_uuid>.mp4`
- `<auth.uid()>/words/<word_uuid>/syllables/<syllable_uuid>/<recording_uuid>.mp4`

Buat UUID versi baru pada setiap penggantian, upload dengan SDK `upsert:false`, bucket
privat rekan-wicara-tutorials dan MIME video/mp4. Setelah semua upload berhasil, kirim
satu POST/PATCH lengkap. POST membutuhkan UUID kata dari client untuk path dan retry
stabil. PATCH boleh menghilangkan video_path untuk mempertahankan binding material
existing; binding legacy tidak ditimpa/dipindahkan otomatis. Boolean video lama tetap
diterima (default true), tetapi false ditolak pada snapshot aktif. Status default
published; request staging status:draft ditolak 422. Published ditetapkan server setelah
validasi, bukan dipercaya dari client. Tidak ada endpoint publikasi manual.

Contoh request, UUID sintetis, <uid> diganti akun login:

```json
{
  "id": "33333333-3333-4333-8333-333333333333",
  "word": "KERTAS",
  "instruction": "Ucapkan KERTAS.",
  "video_path": "<uid>/words/33333333-3333-4333-8333-333333333333/word/77777777-7777-4777-8777-777777777777.mp4",
  "syllables": [
    {"id":"44444444-4444-4444-8444-444444444444","text":"KER","position":1,"instruction":"Ucapkan KER.","video_path":"<uid>/words/33333333-3333-4333-8333-333333333333/syllables/44444444-4444-4444-8444-444444444444/88888888-8888-4888-8888-888888888888.mp4"},
    {"id":"55555555-5555-4555-8555-555555555555","text":"TAS","position":2,"instruction":"Ucapkan TAS.","video_path":"<uid>/words/33333333-3333-4333-8333-333333333333/syllables/55555555-5555-4555-8555-555555555555/99999999-9999-4999-8999-999999999999.mp4"}
  ]
}
```

FastAPI memeriksa keterbacaan object dengan JWT akun sebelum write. RPC mengunci parent,
memeriksa revisi, kepemilikan, batas materi, instruksi, path/UUID, ukuran positif dan
MIME Storage. Seluruh metadata tiga tabel disimpan dalam satu transaksi. Draft baru
hanya sementara di dalam transaksi; instruksi sudah sah pada INSERT pertama. Kegagalan
termasuk sesudah sebagian SQL berjalan me-rollback semua metadata. File/referensi aktif
lama tidak ditimpa; file lama baru masuk pending_video_paths setelah commit berhasil.
File legacy yang masih dirujuk kata lain milik akun yang sama tidak dimasukkan ke
antrean hapus, termasuk saat menghapus kata; tidak mengorbankan materi lain.

Reorder mempertahankan UNIQUE(word_id,position): child rows diganti secara atomik dengan
UUID/created_at yang dipertahankan, tanpa posisi sementara di luar batas. Proposal
berhenti bila ada FK dependent tambahan yang belum diaudit. Tidak membuat ulang tabel,
FK, partial unique index atau ownership policy existing.

Cleanup memakai Storage API JWT pemilik, memverifikasi object sudah tidak ada, lalu
mengakui antrean. RPC mengecek metadata Storage lagi sebelum ack. Cleanup gagal
menghasilkan cleanup_pending dan dapat dicoba ulang. Path pending tidak boleh diaktifkan
kembali sehingga cleanup tidak menghapus referensi aktif. DELETE menandai deleting,
menyelesaikan cleanup, baru menghapus metadata. Revisi stale selalu 409.

Perubahan database yang diusulkan: tiga kolom custom_words.status, revision,
pending_video_paths; constraint enum status baru; RPC manage_custom_word; pencabutan
INSERT/UPDATE/DELETE/TRUNCATE client pada tiga tabel. SELECT dan RLS ownership tetap.
Migrasi berhenti bila inherited write grants masih memberi akses. RPC SECURITY DEFINER
milik postgres diperlukan setelah revoke, dengan search_path kosong dan EXECUTE hanya
untuk authenticated. Semua cabang memeriksa JWT/UID parent eksplisit: RLS tidak otomatis
memfilter operasi dalam fungsi definer. Tidak memakai service role key, role baru,
policy baru atau guard custom GUC yang dapat dipalsukan.

Dampak FE: response DTO kompatibel, tetapi prepare-draft -> upload ke path aktif ->
publish tidak kompatibel dan sengaja ditolak. Tim FE perlu mengirim video_path,
membatasi 30 huruf/6 suku kata, mengisi semua instruksi, mengunggah versi baru dahulu,
lalu satu save. SDK tidak boleh menulis tabel metadata langsung. Tidak ada file FE
diubah pada fase ini; fixture serializer FE existing merupakan contoh historis,
bukan bukti staging lama masih dapat dipakai.

Risiko sebelum penerapan:

- PostgreSQL dan Storage bukan distributed transaction. Client harus melacak upload
  versi baru yang belum berhasil direferensikan untuk retry/cleanup. Pada timeout
  ambigu, GET UUID yang sama dan cocokkan referensi sebelum menghapus file; jangan
  menghapus upload yang ternyata telah di-commit.
- Policy Storage existing harus mengizinkan prefix versi baru milik akun sebelum row
  kata dibuat. Jika policy INSERT mensyaratkan parent sudah ada, alur ini memerlukan
  penyesuaian yang harus ditinjau tersendiri. Proposal
  tidak mengubah policy atau 24 video default. Policy UPDATE yang masih mengizinkan
  overwrite tidak menjadi immutable oleh RPC; client wajib memakai UUID versi baru
  dan upsert:false. Enforcement immutable di Storage memerlukan review policy terpisah.
- Backend memvalidasi metadata/MIME/keterikatan object, bukan membuktikan sumber kamera
  secara kriptografis. UI kamera-only tetap tanggung jawab FE; tidak ada endpoint galeri.
- Penerapan mengambil lock (timeout 5 detik). Jadwalkan backup/review sebelum penerapan.
  Data legacy tidak dihapus; yang tidak lengkap/di luar batas tetap menjadi draft.

Tes SQL menjalankan proposal exact di cluster PostgreSQL lokal sementara dengan fixture
CHECK instruksi wajib, FK, RLS dua principal sintetis, immediate unique position, dan
partial unique indexes. Jalankan pytest -q tests/test_manual_words_sql.py dari server/.
Binary dicari melalui REKAN_POSTGRES_BIN, PATH, atau PostgreSQL 18 Windows. Jika tidak
ada binary, tes di-skip, tidak pernah dialihkan ke Cloud. Hasil lokal tidak menggantikan
uji Supabase Auth/Storage nyata setelah persetujuan. SQL final untuk ditinjau:
docs/supabase/custom_words_manual.proposed.sql. Migrasi Cloud belum dijalankan.

Contoh hasil Level 3 (ilustrasi struktur, bukan hasil uji ucapan manusia):

```json
{"status":"evaluated","item_id":"l3_papa","level":3,"result":"sesuai","lip_result":null,"voice_result":"sesuai","feedback":{"code":"MATCHED","message":"Ucapan sesuai target."},"quality_flags":[],"visuals":null,"engine":"mediapipe_wav2vec2","processing_ms":12}
```

Lima vokal Level 1 A/I/U/E/O kini memakai MediaPipe, Parselmouth dan Wav2Vec2 dengan
`engine: "mediapipe_parselmouth_wav2vec2"`, atas pilihan pengguna agar ASR ikut menentukan
hasil akhir. MediaPipe mengukur geometri bibir; Parselmouth mengukur pitch, intensitas
dan formant. A/I/U tetap menggunakan aturan formant existing, sedangkan E/O belum
memiliki acuan formant personal: sinyal akustik dipakai untuk kelayakan/visual saja,
tanpa mengarang skor akustik E/O. Geometri E/O memakai konfigurasi bibir existing.
Transkripsi bebas dinormalisasi tanpa target pada decoder. Hanya satu jenis vokal yang
sesuai target (termasuk pengulangan seperti AAA atau A A) dianggap cocok. Teks berbeda
menghasilkan suara belum_sesuai; teks kosong meminta retry. Hasil suara A/I/U merupakan
yang terburuk antara akustik dan ASR; hasil akhir yang terburuk antara bibir dan suara.
Keluaran tetap `sesuai|mendekati|belum_sesuai`. Missing formant/geometri meminta retry
dengan hasil dan indikator null, bukan dianggap salah. Model gagal/timeout mengembalikan
503/504. WAV ASR berada dalam direktori sementara dan dihapus termasuk ketika gagal.
Transkripsi mentah tidak dikirim ke FE. Keandalan ASR pada vokal tunggal BELUM tervalidasi
dengan rekaman manusia; kecocokan teks bukan bukti akurasi pengukuran pelafalan.
Materi MMM, A panjang, pelan-ke-keras tetap memakai evaluator MediaPipe/Parselmouth lama.
Level 0 lama dipetakan ke
Level 1 produk, tanpa mengubah ID/v1. Pada latihan suara saja `lip_result` dapat null.
Level 2/3 memakai gerak/visibilitas wajah MediaPipe sebagai gerbang kualitas, lalu
Wav2Vec2 bebas dan perbandingan teks target otoritatif yang dinormalisasi. Hanya kecocokan
tepat menghasilkan `sesuai`; selain itu `belum_sesuai`. Transkripsi mentah tidak dikirim.
Gerbang gerak bukan penilai ketepatan bibir per bunyi, sehingga `lip_result` L2/3 null;
tidak membuat nilai bibir palsu. Keterbatasan ini perlu dipahami FE. `visuals` L2/3 selalu
null. Saat kualitas tidak cukup/teks ASR kosong: `status:"retry"`, ketiga hasil null.
`MOCK_MODE` tidak menghasilkan skor contoh pada v2. Hasil tidak disimpan otomatis;
semua media sementara dibersihkan pada sukses/error.

Generator memakai endpoint HTTPS Chat Completions-compatible yang dikonfigurasi melalui
`LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL` di backend. Tanpa konfigurasi, respons
`503 AI_UNAVAILABLE`, bukan teks dummy. Batas waktu/token/panjang output di thresholds.yaml.
Hasil harus JSON dengan string instruction, selesai sepenuhnya, dan lolos pemeriksaan
teks dasar; pendamping tetap perlu meninjau kelayakannya. Tidak membaca video atau
menyimpan/menerbitkan materi. `429 GENERATION_RATE_LIMITED`, `504 INFERENCE_TIMEOUT`
dan kegagalan penyedia dipetakan tanpa meneruskan pesan/kredensial penyedia.

Contoh request (isi token hanya di terminal lokal; jangan menyimpannya ke repo/log):

```powershell
$headers = @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" }
Invoke-RestMethod http://localhost:8000/v2/catalog -Headers $headers
Invoke-RestMethod http://localhost:8000/v2/words/kp_tolong -Headers $headers
curl.exe -H "Authorization: Bearer $env:SUPABASE_ACCESS_TOKEN" -F "file=@clip.mp4" -F "item_id=l3_papa" -F "session_id=session-1" http://localhost:8000/v2/analyze
$body = @{ type = 'syllable'; text = 'PA'; parent_word = 'PAPA' } | ConvertTo-Json
Invoke-RestMethod http://localhost:8000/v2/instructions/generate -Method Post -Headers $headers -ContentType 'application/json' -Body $body
```

Error tetap `{detail:{code,message}}`: 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404
`ITEM_NOT_FOUND|VIDEO_NOT_FOUND`, 422 `INVALID_INPUT|INVALID_MATERIAL|INVALID_MEDIA`,
413/415 validasi media, 429 batas generator, 503 layanan/model belum tersedia, 504 timeout.
Semua endpoint dan perilaku v1 di bawah tetap berlaku selama migrasi.

### GET /v1/health
`{"status":"ok","engine_version":"0.1.0","scorer_mode":"rules","mock_mode":false}`

### DELETE /v1/auth/account

Header wajib `Authorization: Bearer <access_token>` dari sesi Supabase Auth pendamping.
Tidak menerima ID akun sebagai parameter. Server memverifikasi token melalui Supabase
`GET /auth/v1/user`, menolak akun anonim, lalu memakai service role key **khusus server**
untuk `DELETE /auth/v1/admin/users/{verified_user_id}` (hard delete). Foreign key schema
yang sudah ada menghapus profil/attempt/progress/listen_checks milik akun itu melalui
ON DELETE CASCADE; tidak ada perubahan tabel/RLS/policy. Penghapusan hanya atas permintaan
eksplisit pengguna, bukan saat logout atau pergantian akun. Respons 200:
`{"status":"deleted"}`. Client meminta password untuk reauthentication sebelum memanggil
endpoint, lalu membersihkan sesi dan penyimpanan lokal akun yang dihapus.

Error berformat standar §5: 401 `auth_required`/`auth_invalid`, 403 `companion_required`,
502 `account_delete_failed`, 503 `auth_not_configured`/`auth_unavailable`. Tidak meneruskan
pesan upstream, token, password atau kunci. `SUPABASE_URL` HTTPS dan
`SUPABASE_SERVICE_ROLE_KEY` disimpan di server/.env; jika kosong endpoint gagal tertutup.
Tidak mengubah autentikasi atau kontrak endpoint latihan yang sudah ada.

### GET /v1/items
Daftar materi aktif dari `items.json`.

### POST /v1/calibrate
Field: `file` (mp4), `user_id`, `step` ∈ `rest | vowel_a | vowel_i | vowel_u`.
```json
{"status":"ok","step":"vowel_a","quality_flags":[],"saved":true,
 "calibration_complete":false,"engine_version":"0.1.0"}
```
`status:"retry"` bila ada flag kualitas; `saved:false`.

### POST /v1/analyze
Field: `file` (mp4), `user_id`, `item_id`, `session_id`.
```json
{
  "status": "ok",
  "quality_flags": [],
  "item_id": "l3_mama",
  "level": 3,
  "overall": "merah",
  "score": 0.5,
  "indicators": {"bibir": "hijau", "suara": "merah"},
  "units": [
    {"index":0,"target":"ma","start_ms":120,"end_ms":520,
     "bibir":"hijau","suara":"hijau","status":"hijau","reason_code":null},
    {"index":1,"target":"ma","start_ms":520,"end_ms":980,
     "bibir":"hijau","suara":"merah","status":"merah","reason_code":"closure_voicing_expected"}
  ],
  "hint_id": "m_voicing",
  "visuals": {
    "vowel_point": {"f1": 720, "f2": 1300},
    "vowel_anchors": {"a": {"f1":780,"f2":1350}, "i": {"f1":320,"f2":2300}, "u": {"f1":350,"f2":900}},
    "lip_contour": {"points": [[0.41,0.62],[0.45,0.60]]},
    "loudness": {"t_ms": [0,10,20], "db": [42.1,55.3,61.0]}
  },
  "scorer": "rules",
  "engine_version": "0.1.0",
  "processing_ms": 2140
}
```
- `overall`, `bibir`, `suara`, `status` ∈ `hijau | kuning | merah`. Untuk Level 0, `bibir` = `null`.
- Bila `status:"retry"`: `overall`, `score`, `units` = null; `hint_id` = kode `retry_*` pertama.
- `visuals` boleh berisi `null` per kunci bila tidak relevan.
- `reason_code` lihat §6.9.

### POST /v1/dataset/upload (hanya bila `DATASET_MODE=true`)
Field: `file`, `purpose` (`dataset` | `model_video`), `speaker_id`, `item_id`, `rep` (int),
`intended_error` (string, `none` bila tidak ada), `condition` (`quiet` | `noisy`), `session_id`.
- `purpose=dataset`: simpan ke `DATA_DIR/raw/{speaker_id}/{item_id}__r{rep}__{intended_error}__{condition}.mp4`
  dan tambahkan baris ke `DATA_DIR/raw/metadata.csv`.
- `purpose=model_video`: simpan (timpa) ke `DATA_DIR/model_videos/{item_id}.mp4`, tidak masuk metadata.
Respons: `{"status":"ok","clip_id":"..."}`.

### GET /v1/model-video/{item_id}
Mengirim berkas `DATA_DIR/model_videos/{item_id}.mp4` (video/mp4). 404 bila belum ada; app lalu
menampilkan teks + ilustrasi bibir saja.

### Mode mock
Bila `MOCK_MODE=true`, `/analyze` dan `/calibrate` mengembalikan contoh valid tanpa analisis.
Query `?mock=hijau|kuning|merah|retry` memilih variasi.

### POST /v1/experiments/allosaurus (eksperimen, hanya `DEBUG=true`)

Field multipart: `file` (video MP4/MOV dengan audio, mengikuti batas ukuran upload).
Respons: `status: "success"`, `model: "uni2005"`, `phonetic_prediction: string`,
`inference_ms: number` (hingga milidetik pecahan, nonnegatif dan finite).
String prediksi mentah, termasuk string kosong, dipertahankan tanpa koreksi atau skor.
Decoder dibatasi ke inventaris eksperimen `ml/config/indonesian_phones.txt` (32 bunyi),
bukan seluruh inventaris universal. Inventaris mencakup bunyi c/j (`tʃ`/`dʒ`) serta bunyi
umum Indonesia dan serapan; ini bukan klaim cakupan semua dialek. Semua token harus tersedia
di model; inventaris yang hilang/tidak valid menyebabkan error, tanpa fallback universal.
App menampilkan padanan huruf bunyi (ng, ny, sy, kh, c, j); IPA `j` menjadi huruf y.
Huruf e/o menggabungkan beberapa variasi bunyi; `ʔ` ditampilkan sebagai "henti glotal".
Token tak dikenal ditandai "bunyi lain", tidak dihapus. String IPA asli tersedia lewat
Lihat detail. Ini penyederhanaan tampilan, bukan transkripsi ejaan kata atau skor pelafalan.
Waktu hanya mencakup inferensi CLI, tidak termasuk upload, konversi, atau pemuatan model.

Server mengekstrak audio WAV PCM 16-bit mono dengan sample rate/batas durasi dari thresholds.yaml,
tanpa frame atau MediaPipe. Decode dibatasi sampai satu sampel melewati batas durasi untuk
menolak klip berlebih lewat validasi CLI; tidak mengembalikan prediksi dari klip yang dipotong.
CLI dijalankan sebagai subprocess memakai `ml/.venv`, tanpa Torch pada venv backend.
Upload dan WAV sementara dibersihkan pada sukses maupun error. Tidak menulis ke dataset/Supabase.
Endpoint tidak tersedia (404) saat `DEBUG=false`; tidak mengubah `/analyze`, `/calibrate`, atau scoring.

Error mengikuti format §5: 413/415 validasi upload; 422 video/audio tidak dapat dibaca, tidak
memiliki audio (`audio_missing`), durasi/format WAV tidak sesuai, atau konversi timeout
(`media_timeout`); 503 alat media, venv/model belum siap (`allosaurus_unavailable`), hasil CLI
tidak valid (`allosaurus_invalid_result`), atau berkas sementara gagal (`media_unavailable`);
504 inferensi timeout (`allosaurus_timeout`). Tidak meneruskan path, stderr, atau traceback CLI.

### Produksi tutorial default (13 Nov, terpisah dari latihan)

`GET /v1/tutorials` dan `POST /v1/tutorials/{item_id}/video` memerlukan bearer Supabase
Auth akun email dan UID pada `TUTORIAL_UPLOADER_IDS` server (JSON array; kosong = ditolak).
Tidak mengubah daftar materi, skor, progres, dataset, schema, bucket atau policy Storage.
Service role hanya di server. `item_id` wajib salah satu 24 target dalam
`server/app/content/tutorials.json`, manifest produksi yang memuat langkah UI dari sumber.

GET mengembalikan `{items, max_duration_s, max_upload_mb}`; setiap item memiliki
`item_id, word, target, kind` (`word`/`syllable`), `level` (3/2), `position` (null/1-based),
`bucket, storage_path, steps, present`. `present` hanya hasil pemeriksaan Storage, bukan
persetujuan mutu rekaman. Tidak mengembalikan kredensial atau URL publik.

POST menerima multipart `file`, MP4/MOV dengan gambar dan audio. Batas terpisah di
`thresholds.yaml`: 50 MiB, 120 detik, konversi maksimal 180 detik. Seluruh demonstrasi
dikonversi ke H.264/AAC MP4 tanpa pemotongan; berkas sementara dibersihkan saat sukses/error.
Bucket yang sudah ada: `rekan-wicara-tutorials`; path tetap
`default/words/{word}.mp4` atau `default/syllables/{word}/{position:02}-{syllable}.mp4`.
Tidak menerima path dari klien dan tidak menimpa objek yang ada (409 `tutorial_exists`).
Respons sukses hanya setelah info Storage memverifikasi ukuran:
`{status:"verified", item_id, bucket, storage_path, size_bytes}`.
Error mengikuti §5: 401 sesi tidak valid, 403 akun di luar daftar perekam, 404 target
tidak dikenal, 413 ukuran, 415 format, 422 media/durasi, 502 upload/verifikasi,
503 konfigurasi/Auth/Storage/alat media. Setelah respons terputus, periksa daftar
sebelum mencoba ulang. Akses baca langsung dan policy RLS Storage masih perlu audit terpisah;
endpoint produksi ini bukan bukti policy Storage telah diperketat.

### POST /v1/experiments/wav2vec2 (eksperimen, hanya `DEBUG=true`)

Field multipart: `file` (video MP4/MOV dengan audio, batas upload yang sama).
Respons:

```json
{"status":"success","model":"Wikidepia/wav2vec2-xls-r-300m-indonesian","transcription":"tolong","inference_ms":664.0}
```

Contoh di atas ilustrasi kontrak, bukan hasil pengukuran akurasi. `transcription` adalah
teks asli hasil greedy CTC bebas (termasuk kosong), tanpa koreksi, kamus target, atau model
bahasa tambahan. `inference_ms` finite dan nonnegatif, hanya forward model dan decoding;
tidak mencakup pemuatan model, persiapan audio, upload, atau konversi.

Model tetap pada revisi `8a9d507f0804f8e5fca07b17214b2c0266ba7491`, CPU, `eval` dan
`inference_mode`; dimuat lokal sekali per subprocess lewat `ml/wav2vec2/.venv`.
Inferensi tidak mengunduh model; setup terpisah memverifikasi SHA-256 bobot.
Pengamanan `weights_only=True` dipertahankan. Venv dan dependency backend tidak diubah.
Validasi WAV, batas durasi/sample rate dari thresholds.yaml, konversi audio tanpa frame,
dan pembersihan sementara sama seperti eksperimen Allosaurus di atas.

Error mengikuti format §5: 413/415 validasi upload; 422 media/audio/format/durasi tidak
sesuai atau konversi timeout; 503 alat media/temp tidak tersedia, model/venv belum siap
(`wav2vec2_unavailable`) atau hasil tidak valid (`wav2vec2_invalid_result`);
504 inferensi timeout (`wav2vec2_timeout`). Tidak meneruskan stderr, path, atau traceback.
Endpoint tidak didaftarkan saat `DEBUG=false` dan tidak bergantung pada `MOCK_MODE`.

Layar pengembangan menawarkan Tolong / Saya Tuli / Hai / Makan / PA / MA. Target dipilih dan dikunci
sebelum merekam, tidak dikirim sebagai prompt ke model. App hanya membandingkan teks
setelah mengabaikan kapitalisasi, tanda baca, dan spasi berulang; tidak melakukan fuzzy
matching atau koreksi kata. Hasil mentah tetap ditampilkan. Kecocokan teks bukan skor
pelafalan. Tidak mengubah Level 3, kelulusan, riwayat/Supabase, scorer rules, atau roadmap
scorer §7. Kualitas pada ucapan pengguna Tuli belum tervalidasi.

### POST /v1/experiments/combined (eksperimen, hanya `DEBUG=true`)

Revisi 13 November: MediaPipe memeriksa indikasi berbicara, Wav2Vec2 menjadi sumber
transkripsi untuk kategori teks. Parselmouth tidak dijalankan pada endpoint ini.
Pipeline utama `/analyze` untuk materi lama tetap terpisah.

Multipart: `file` (MP4/MOV dengan audio, batas upload yang sama) dan `target`, salah satu
`tolong`, `saya tuli`, `hai`, `makan`, `pa`, `ma`. Target dikunci sebelum merekam dan hanya dipakai
untuk pembandingan sesudah inferensi; tidak diberikan kepada decoder Wav2Vec2.

| Field respons | Kontrak |
|---|---|
| `status` | `complete` bila semua komponen berjalan, `partial` bila ada komponen gagal; bukan status kelulusan. |
| `target` | Target kanonis; app menolak respons untuk target berbeda. |
| `feedback` | `outcome`: `berhasil`, `mendekati`, `coba_lagi`, atau null jika proses gagal; `reason` seperti di bawah. |
| `asr` | Respons Wav2Vec2 asli di atas, termasuk teks kosong, atau kegagalan komponen. |
| `audio` | `status: ok`, `duration_ms`, `active_ms` (integer nonnegatif), `warnings`: `silent`/`too_short`; atau kegagalan komponen. Pemeriksaan RMS NumPy, bukan skor suara. |
| `visual` | `status: ok`, `n_frames`, `face_frames`, `motion_steps` (integer nonnegatif), `gate`: `passed`/`retry`, `warnings`: `no_face`/`face_off_frame`/`motion_missing`, `lip_contour` (LipContour atau null); atau kegagalan komponen. |
| `timings` | `media_ms`, `audio_ms`, `visual_ms`, `asr_ms`: integer nonnegatif; ASR mencakup startup/pemuatan subprocess. |
| `processing_ms` | Integer nonnegatif, total server termasuk konversi dan cleanup, tanpa upload HP. |

Urutan feedback: komponen gagal -> outcome null dengan `component_unavailable`;
audio senyap/singkat -> `coba_lagi` dengan `silent_audio`/`short_audio`;
MediaPipe tidak lulus -> `coba_lagi` dengan `visual_gate`; teks kosong -> `coba_lagi`
dengan `empty_text`; teks cocok -> `berhasil`/`matched`; dekat -> `mendekati`/`near_match`;
sisanya `coba_lagi`/`different_text`. Hanya berhasil berarti kedua pemeriksaan lulus.
Kegagalan teknis tidak dihitung sebagai ucapan salah. Prediksi mentah tetap ditampilkan.

Perapian teks memakai Unicode NFC, casefold, tanda baca menjadi spasi dan peringkasan spasi.
Levenshtein menghitung minimum penambahan/penghapusan/penggantian karakter, tanpa daftar
variasi salah ucap. Untuk target panjang, kemiripan = `1 - distance / max(panjang_target,
panjang_teks)`; untuk target pendek, batas jumlah edit. Ambang awal dalam experiments YAML:
`near_similarity_min=0.75`, `short_target_max_chars=3`, `short_near_max_edits=1`.
Mendekati berarti teks mendekati target, bukan persentase ketepatan pelafalan.

Audio diperiksa pada frame 20 ms dengan RMS minimal 0.005 dan total aktif minimal 200 ms.
Gerak bibir dihitung pada waktu audio aktif (toleransi 100 ms), memperhitungkan offset AV.
Jarak bibir dinormalisasi terhadap skala mata dan disaring median. Minimal dua perubahan
antar-frame bersebelahan sebesar 0.015, serta rentang perubahan minimal 0.04; celah/lebar
bibir keduanya dipertimbangkan. Frame tanpa wajah dan gerak di luar audio aktif tidak
meluluskan. Keterlihatan wajah memakai ambang kualitas lama. Semua nilai baru berada di
thresholds.yaml dan masih heuristik awal. Ini bukan verifikasi identitas, liveness atau
bukti sumber suara. Kontur satu cuplikan hanya pendamping; gate memakai rangkaian frame.

Kegagalan komponen: `status: unavailable` dan `code` salah satu `audio_analysis_failed`,
`face_model_missing`, `face_analysis_failed`, `wav2vec2_unavailable`, `wav2vec2_timeout`,
`wav2vec2_invalid_result`. HTTP tetap 200 untuk partial, feedback null, hasil lain tetap
tersedia tanpa angka/teks pengganti. Error HTTP: 413/415 upload tidak sesuai; 422 target,
media/audio atau durasi tidak sesuai; 503 alat media/temp tidak tersedia.

Satu upload dan satu konversi; decode dibatasi satu sampel melewati durasi maksimum lalu
WAV divalidasi untuk menolak audio berlebih. Wav2Vec2 tetap CPU lokal/offline,
weights_only=True, timeout experiments.combined_asr_timeout_s (30 detik). Tanpa dependency
baru. Upload, WAV dan frame sementara dibersihkan pada semua jalur; tidak meneruskan
path/stderr/traceback. Tidak mengubah kelulusan/progres/Supabase atau `/analyze`.

App menampilkan warna + ikon + teks untuk tiga hasil latihan. Proses gagal menampilkan
Penilaian belum tersedia tanpa status latihan. Waktu kirim+proses diukur dari callback
rekaman sampai respons. Fixture sintetis bersama: app/test-fixtures/contract/combined.json,
divalidasi pytest dan validator TypeScript.

## §6 Pipeline server

### §6.1 Media
- `ffprobe`: baca `start_time` stream video dan audio; simpan selisihnya (`av_offset_ms`) untuk menyelaraskan waktu.
- `ffmpeg`: audio → WAV mono 16 kHz; video → frame 15 fps, tinggi 480 px (frame rate dinormalkan).
- Durasi maksimal 4 detik (potong bila lebih). Semua berkas di direktori sementara yang dihapus di `finally`.

### §6.2 Kualitas rekaman (K1)
| flag | kondisi awal |
|---|---|
| `no_face` | wajah terdeteksi < 90% frame |
| `face_off_frame` | lebar wajah < 25% lebar frame, atau titik mulut di luar frame |
| `too_quiet` | puncak intensitas < noise_floor + 10 dB |
| `too_noisy` | (median intensitas ucapan − noise_floor) < 15 dB |
| `clipping` | > 1% sampel |amplitudo| ≥ 0,99 |
| `too_short` | durasi ucapan < 0,2 s |

noise_floor: dari kalibrasi bila ada; bila tidak, persentil ke-10 intensitas klip.

### §6.3 Kalibrasi (K2) — `DATA_DIR/calibration/{user_id}.json`, angka saja
- `rest`: median fitur bibir 3 detik diam (termasuk `mouth_width_rest`), noise_floor.
- `vowel_a|i|u`: median F1, F2, dan fitur bibir di 50% tengah ucapan.
- Jangkar diperbarui: median dari 10 percobaan terakhir berstatus hijau untuk vokal itu.
- Tanpa kalibrasi: pakai nilai default populasi di `thresholds.yaml` dan tambahkan `"uncalibrated"` ke `quality_flags` (bukan penyebab retry).

### §6.4 Fitur bibir (MediaPipe Face Landmarker, `output_face_blendshapes=True`, `num_faces=1`, mode VIDEO)
Per frame:
- `jaw_open` = blendshape jawOpen − nilai rest.
- `lip_gap_ratio` = jarak titik 13 (bibir atas dalam) ke 14 (bibir bawah dalam) ÷ `mouth_width_rest`.
- `lip_width_ratio` = jarak sudut mulut 61 ke 291 ÷ `mouth_width_rest`.
- `rounding` = max(mouthPucker, mouthFunnel) − nilai rest.
- `closed` = `lip_gap_ratio` < 0,05 (silang-cek dengan mouthClose).
- Normalisasi cadangan bila belum kalibrasi: jarak sudut mata luar 33–263.
- Haluskan dengan median filter 3 frame.
- `lip_contour`: ±20 titik garis luar bibir dari frame tengah unit terakhir, dinormalkan 0–1 terhadap kotak mulut.
- **Verifikasi indeks landmark dengan menggambar titiknya di frame contoh sebelum dipakai.**

### §6.5 Fitur suara (Parselmouth, langkah 10 ms)
- Intensitas: `to_intensity()`.
- Nada dan bersuara: `to_pitch(time_step=0.01, pitch_floor=75, pitch_ceiling=600)`; frame bersuara = F0 terdefinisi.
- Formant: `to_formant_burg(time_step=0.01, max_number_of_formants=5, maximum_formant=5500)`.
- Nilai vokal: median F1, F2 di 50% tengah segmen vokal yang bersuara.

### §6.6 Segmentasi
1. Wilayah ucapan: intensitas > noise_floor + 10 dB; ambil rentang terpanjang, toleransi celah 100 ms.
2. Penutupan bibir: `closed` berturut-turut ≥ 80 ms (≥ 2 frame).
3. Ciri penutupan: `closure_ms`, `voiced_ratio` (proporsi frame audio bersuara selama tertutup, setelah koreksi `av_offset_ms`), `closure_db`.
4. Batas suku kata: awal setiap penutupan, kecuali penutupan pertama bila kata diawali konsonan.
   Contoh `apa` = [a | pa]: batas di awal penutupan /p/. `mama` = [ma | ma]: batas di awal penutupan kedua.
5. Bila jumlah penutupan ≠ jumlah konsonan di templat: cadangan = lembah intensitas terdalam sebanyak (jumlah unit − 1); tandai unit tanpa penutupan sebagai `closure_missing`.

### §6.7 Aturan penilaian (scorer `rules`)
Status: hijau bila semua syarat terpenuhi; kuning bila nilai dalam 15% dari ambang; merah selain itu.

Level 0:
- `l0_hold_a`: durasi bersuara tanpa putus ≥ 3,0 s (kuning ≥ 2,55 s).
- `l0_soft_loud`: selisih median intensitas bagian kedua − bagian pertama ≥ 6 dB (kuning 5–6 dB).
  Bagian dipisah oleh jeda terpanjang; bila tidak ada jeda, bagi dua.

Vokal (bibir; suara relatif terhadap jangkar pengguna):
| vokal | bibir hijau | suara hijau |
|---|---|---|
| a | jaw_open ≥ 0,40 | F1 ≥ max(F1_i, F1_u) + 100 Hz |
| i | lip_width_ratio ≥ 1,05 dan rounding < 0,20 | F2 ≥ F2_u + 300 Hz |
| u | rounding ≥ 0,35 dan lip_width_ratio ≤ 0,95 | F2 ≤ F2_i − 300 Hz |
| e (bonus) | jaw_open 0,15–0,40, lip_width_ratio ≥ 1,0 | F2 di antara jangkar i dan u, lebih dekat ke i |
| o (bonus) | rounding ≥ 0,25, jaw_open 0,15–0,40 | F2 rendah, F1 > F1_u |

`m_hum`: bibir rapat ≥ 80% durasi ucapan; voiced_ratio ≥ 0,7 dan durasi ≥ 0,5 s.

Konsonan bibir (dalam suku kata):
| fon | bibir | suara saat tertutup |
|---|---|---|
| p | penutupan ≥ 80 ms lalu terbuka | voiced_ratio < 0,3 (kuning < 0,4) |
| b | penutupan ≥ 80 ms lalu terbuka | voiced_ratio ≥ 0,5 (kuning ≥ 0,4) |
| m | penutupan ≥ 80 ms lalu terbuka | voiced_ratio ≥ 0,5; bonus: closure_ms ≥ 100 dan closure_db ≥ noise_floor + 15 |

Satu unit suku kata = konsonan + vokal. Bibir unit = terburuk dari bibir konsonan dan bibir vokal; Suara unit = terburuk dari suara konsonan dan suara vokal.

### §6.8 Status dan skor
- Status unit = terburuk dari Bibir dan Suara.
- `score` = (hijau + 0,5 × kuning) ÷ jumlah unit.
- `overall`: hijau bila semua hijau; merah bila ada merah; selain itu kuning.
- `indicators.bibir`/`suara` = terburuk di semua unit.

### §6.9 reason_code → hint_id
| reason_code | hint_id |
|---|---|
| `l0_duration_short` | `l0_duration_short` |
| `l0_loudness_flat` | `l0_loudness_flat` |
| `vowel_open_low` (a) | `a_open` |
| `vowel_spread_low` (i) | `i_spread` |
| `vowel_round_low` (u) | `u_round` |
| `vowel_acoustic_mismatch` | hint bibir vokal target (a_open / i_spread / u_round) |
| `closure_missing` | `closure_missing` |
| `closure_voicing_expected` (m) | `m_voicing` |
| `closure_voicing_expected` (b) | `b_voicing` |
| `closure_voicing_unexpected` (p) | `p_silent` |
| `hum_open` | `closure_missing` |
| `hum_short` | `m_voicing` |

Prioritas memilih SATU petunjuk: (1) flag kualitas → `retry_*`; (2) unit merah pertama, lalu kuning pertama;
(3) dalam satu unit, masalah bibir sebelum suara; (4) semua hijau → `ok_good`.
Kalimat petunjuk ada di `server/app/content/hints.json` (salinan juga di app). Lihat §13.

## §7 Scorer Wav2Vec2 — DITUNDA ke roadmap

**Tidak dikerjakan di MVP**: data hanya ±80 klip dari 3 orang, terlalu sedikit untuk melatih pengklasifikasi. `SCORER_MODE` di MVP selalu `rules`. Rancangan di bawah disimpan untuk tahap lanjutan bersama mitra (data dari banyak penutur).

- Model awal: `facebook/wav2vec2-base`, dibekukan. Uji embedding lapisan 4–9 (mean-pool di wilayah ucapan unit); pilih lewat validasi.
- Pengklasifikasi: StandardScaler + LogisticRegression multinomial (bandingkan dengan MLP kecil bila sempat).
- Kelas: `a i u m_hum ma mi mu pa pi pu ba bi bu` + `other` (na, ta, da, ka, sa, la, diam, batuk, bising). Bonus: `e o bo`.
- Data latih: unit dari rekaman Level 1–2 dan unit hasil segmentasi kata Level 3.
- Validasi silang per penutur (GroupKFold); uji akhir pada penutur yang disisihkan.
- Keputusan untuk target T: hijau bila top-1 = T dan p(T) ≥ θ_hijau (awal 0,6); kuning bila T di top-2 atau p(T) ≥ θ_kuning (awal 0,35); merah selain itu.
- Pemetaan kebingungan → reason_code: target m/b diprediksi p → `closure_voicing_expected`; target p diprediksi m/b → `closure_voicing_unexpected`; vokal tertukar → `vowel_acoustic_mismatch`; `other` → `closure_missing` (untuk unit berkonsonan) atau `vowel_acoustic_mismatch`.
- `SCORER_MODE=hybrid`: indikator Suara untuk unit Level 1–3 dari Wav2Vec2; Level 0 dan Bibir tetap dari aturan.
- Artefak: `server/models/w2v_clf.joblib` + `w2v_meta.json` (lapisan, kelas, θ, versi).

## §8 Aplikasi

### §8.1 Layar
- `onboarding`: penjelasan alat bantu (bukan pengganti guru/terapis), persetujuan pengguna/pendamping, buat PIN pendamping.
- `calibration`: 4 langkah (rest 3 s, a, i, u) dengan instruksi visual dan gambar.
- `home`: misi hari ini, daftar level dan materi beserta statusnya (terkunci / berlatih / lulus / ulasan).
- `practice/[itemId]`: Lihat → Tiru → Bandingkan → Ulangi. Video model diputar dari `GET /v1/model-video/{item_id}`;
  bila 404, tampilkan teks besar + ilustrasi bibir SVG.
- Ilustrasi bentuk bibir (rileks, /a/ terbuka, /i/ melebar, /u/ membulat, rapat) dan posisi wajah dalam oval
  digambar sebagai komponen SVG sederhana di app, tanpa berkas gambar dari luar.
- `companion` (PIN): ringkasan mingguan, Uji Dengar (opsional), pengaturan durasi sesi, bagikan laporan teks.
- `dataset` (tersembunyi, hanya bila `EXPO_PUBLIC_DATASET_MODE=true`): lihat §10.

### §8.2 Perekaman
- expo-camera kamera depan, mode video, satu file mp4 dengan audio. Durasi default 2,5 s (Level 0: 4 s).
- Bingkai oval sebagai panduan posisi wajah. Hitung mundur visual 3-2-1 + getar. Indikator merekam yang jelas.
- Upload dengan indikator progres; bila gagal jaringan, tawarkan coba lagi.

### §8.3 Tampilan hasil
- Dua indikator (Bibir, Suara): warna + ikon + teks (Sesuai / Mendekati / Belum sesuai).
- Satu kalimat petunjuk dari `hint_id`.
- Peta Vokal (SVG): segitiga jangkar a–i–u pengguna + titik percobaan (sumbu: F2 horizontal terbalik, F1 vertikal ke bawah).
- Cermin Bibir (SVG): garis bibir pengguna vs garis target dari video model.
- Level 0: grafik kekerasan suara sederhana.
- Label kecil: "Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis."

### §8.4 Logika kemajuan (TypeScript murni, dites)
- Naik level per materi: ≥ 8 dari 10 percobaan terakhir berstatus hijau, tersebar di ≥ 2 sesi. Percobaan `retry` tidak dihitung.
- Level 3: bila Uji Dengar diaktifkan pendamping, butuh juga ≥ 1 Uji Dengar "jelas".
- Pola: berblok di awal; acak setelah akurasi ≥ 80%.
- Pengurangan umpan balik: Level 0 grafik + hasil; Level 1–2 indikator + petunjuk tiap percobaan; Level 3 status keseluruhan tiap 2 percobaan (mesin tetap menilai semua).
- Ulasan berjarak: hari ke-1, 3, 7, 14 setelah lulus.
- Macet: < 40% hijau selama 3 sesi → turunkan satu level atau ganti materi; tampilkan saran ke pendamping untuk berkonsultasi dengan guru/terapis.
- Sesi ±10 menit: pemanasan Level 0 → ulasan → inti → tantangan acak → ringkasan.

### §8.5 Aksesibilitas
Tanpa isyarat suara; teks besar; kontras tinggi; ikon + teks; tombol besar; animasi seperlunya; semua instruksi bergambar.

## §9 Supabase
Tabel (RLS aktif, sesi email/password pendamping; `user_id = auth.uid()`):
- `profiles(user_id uuid pk, display_name text, created_at)`
- `attempts(id uuid pk, user_id, session_id, item_id, level int, status text, overall text, score real, indicators jsonb, hint_id text, scorer text, engine_version text, created_at)`
- `progress(user_id, item_id, stage text, last_10 jsonb, sessions_count int, passed_at timestamptz, next_review_at timestamptz, pk(user_id,item_id))`
- `listen_checks(id, user_id, item_id, result text, created_at)`
Tidak ada video/audio di Supabase. App punya antrean lokal (AsyncStorage) bila offline, sinkron saat online.

Autentikasi pendamping: register/login/logout email/password melalui client Supabase yang
sudah ada. Sesi persisten di AsyncStorage, refresh di foreground, listener INITIAL_SESSION/
SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED memperbarui state akun tanpa menambah UI/navigasi.
Login anonim otomatis dihentikan. Akun/profil/PIN lama tidak dihapus atau diimpor otomatis.
Profil/antrean baru disimpan per auth.uid(); signed-out memakai ruang lokal terpisah yang
tidak disinkronkan ke akun berikutnya. PIN empat angka disimpan per akun di SecureStore;
pembuatan menolak penimpaan PIN yang sudah ada, perubahan wajib memverifikasi PIN saat ini.
CRUD profil memakai kolom existing `user_id, display_name, created_at`; penghapusan adalah
penghapusan akun Auth di atas, karena policy existing tidak mengizinkan DELETE profil.
Register menerima nama melalui options.data.display_name Supabase Auth. Public profiles
dibuat saat register jika sesi tersedia, atau pada login pertama setelah konfirmasi
email; tanpa sesi, RLS tetap menolak penulisan profil. Nama existing tidak ditimpa saat
login, dan sinkronisasi antrean tidak membuat profil placeholder. Tidak menambah trigger.
Reset password melalui email/token recovery lalu updateUser; secure password change
mendukung reauthentication nonce. Rincian fungsi, setup dan batas UI di
`docs/supabase/AUTH.md`.

## §10 Dataset (versi tim 3 orang, maksimal 100 video)

Data **tidak dipakai untuk melatih model**. Penilaian memakai MediaPipe (model pralatih) + Parselmouth + aturan.
Data hanya dipakai untuk (1) menyetel ambang di `thresholds.yaml` dan (2) menguji kesepakatan dengan penilaian manusia.

### §10.1 Perekam
3 anggota tim, kode `P1`, `P2`, `P3`. Persetujuan cukup berupa kesepakatan tim yang dicatat di MODEL_CARD.md.

### §10.2 Skrip sesi per orang (27 klip, ±6 menit)
| blok | isi | ulangan | klip |
|---|---|---|---|
| A | l0_hold_a, l0_soft_loud | 1 | 2 |
| B | a, i, u | 2 | 6 |
| C | mmm | 1 | 1 |
| D | ma, pa, ba, mi, pi, bu | 1 | 6 |
| E | mama, papa, bibi, apa, ibu, bumi | 1 | 6 |
| F | kesalahan disengaja (§10.3) | 1 | 4 |
| G | klip buruk: wajah keluar bingkai, ruangan bising | 1 | 2 |
| | **total** | | **27** |
3 orang × 27 = 81 klip. Urutan di dalam blok diacak.

### §10.3 Kesalahan disengaja dan label otomatis
| intended_error | instruksi | label otomatis |
|---|---|---|
| `mama_as_papa` | Ucapkan "mama" tapi tahan suara saat bibir rapat | kedua unit: bibir ok, suara salah |
| `u_flat_lips` | Ucapkan "u" dengan bibir datar | unit 1: bibir salah |
| `a_narrow` | Ucapkan "a" dengan mulut hampir tertutup | unit 1: bibir salah |
| `mama_no_closure` | Ucapkan "mama" tanpa merapatkan bibir | kedua unit: bibir salah |
| `bad_face` (blok G) | Geser wajah keluar bingkai | harus `retry` (no_face / face_off_frame) |
| `bad_noise` (blok G) | Ucapkan "a" dengan musik atau kipas keras | harus `retry` (too_noisy) atau tetap dinilai bila suara jelas |
Klip lain: label otomatis "semua unit ok". Saat merekam, tekan **ulang** bila salah ucap.

### §10.4 Video model (16 video, 1 orang, ±5 menit)
l1_a, l1_i, l1_u, l1_m, l2_ma, l2_pa, l2_ba, dan 9 kata wajib Level 3. Materi lain (Level 0, suku kata lain,
kata bonus) memakai teks + ilustrasi bibir SVG. Total video: 81 + 16 = 97.

### §10.5 Metadata dan label
`data/raw/metadata.csv`: `clip_id, speaker_id, item_id, rep, intended_error, condition, session_id, recorded_at, device`.
Cek label: setiap klip dinilai oleh **2 anggota yang bukan perekamnya** (masing-masing ±54 klip, ±5 menit) di `/labeler`.
Berkas: `data/labels/labels_{annotator}.csv` dengan kolom `clip_id, annotator, matches_request, heard_label, lips_wrong, quality_ok, notes`.

### §10.6 Pembagian: leave-one-speaker-out (LOSO)
Setel ambang memakai 2 orang, uji pada 1 orang sisanya; ulangi 3 kali sehingga setiap orang pernah menjadi penguji.
Laporkan rata-rata dan hasil per putaran. Ambang final disetel dari ketiga orang. Tidak ada augmentasi (tidak ada training).

## §11 Evaluasi (fase A6)
| metrik | target |
|---|---|
| kesepakatan deteksi bibir rapat | ≥ 90% |
| kesepakatan vokal a/i/u | ≥ 85% |
| kesepakatan senyap vs bersuara saat rapat | ≥ 80% |
| kesepakatan status kata (hijau vs bukan) | ≥ 80% |
| Cohen's kappa per kemampuan | dilaporkan |
| klip buruk tertangkap K1 | semua yang disengaja |
| klip layak salah ditolak | < 10% |
| waktu respons p90 | ≤ 5 s |
Evaluasi memakai LOSO (§10.6). Data kecil: satu klip ≈ 3–4% pada setiap putaran, jadi laporkan jumlah klip di samping setiap persentase dan sebut hasilnya sebagai bukti awal. Laporan: `docs/EVAL_REPORT.md`.

## §12 Privasi
Rekaman produk dihapus setelah analisis. Tidak ada media di log. Dataset hanya di `data/` lokal dengan
persetujuan tertulis; dihapus setelah lomba kecuali penutur setuju disimpan. Kalibrasi hanya angka.

## §13 Pustaka petunjuk (`hints.json`, draf, ditinjau ahli)
| hint_id | kalimat |
|---|---|
| ok_good | Bagus! Coba sekali lagi tanpa melihat layar. |
| l0_duration_short | Tahan suaranya sedikit lebih lama. |
| l0_loudness_flat | Bedakan lagi: pertama pelan, lalu keras. |
| a_open | Buka mulut lebih lebar. |
| i_spread | Tarik sudut bibir ke samping, seperti tersenyum. |
| u_round | Bulatkan dan majukan bibir, seperti meniup. |
| closure_missing | Rapatkan kedua bibir dulu, baru buka. |
| m_voicing | Saat bibir rapat, biarkan suara keluar lewat hidung. Rasakan getaran di hidung. |
| p_silent | Saat bibir rapat, tahan sebentar tanpa suara, lalu lepaskan. |
| b_voicing | Saat bibir rapat, suara tetap berbunyi, lalu lepaskan bibir. |
| retry_no_face | Wajah belum terlihat. Posisikan wajah di dalam bingkai. |
| retry_off_frame | Dekatkan wajah dan letakkan di tengah. |
| retry_quiet | Suara belum terdeteksi. Coba bersuara lebih jelas. |
| retry_noisy | Ruangan terlalu bising. Coba di tempat yang lebih tenang. |
| retry_clipping | Suara terlalu keras di mikrofon. Jauhkan HP sedikit. |
| retry_short | Ucapannya terlalu singkat. Coba lagi. |
