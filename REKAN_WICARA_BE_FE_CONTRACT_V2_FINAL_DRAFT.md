# Rekan Wicara — Kontrak Integrasi Backend & Frontend (v2)

**Status:** Draft siap disepakati BE–FE — **kontrak target, bukan klaim seluruh endpoint sudah diimplementasikan**.  
**Tanggal:** 13 November 2026  
**Cakupan:** Autentikasi, katalog awal, detail kata/suku kata, PIN Mode Pendamping, CRUD materi, tutorial multi-video, generate instruksi AI, evaluasi Level 1–3, dan progres MVP.  
**Di luar cakupan:** Misi harian, XP/streak, leaderboard, diagnosis medis, perubahan tampilan yang tidak terkait data.

> **Prinsip:** Satu akun Supabase Auth digunakan bersama oleh satu pendamping dan satu pengguna Tuli. Pendamping login dengan email/password. Pengguna Tuli tidak punya akun terpisah. Mode Pendamping dilindungi PIN perangkat (bukan role server). Materi default hanya-baca; materi custom hanya untuk akun pemiliknya.

---

## 1. Pembagian sistem dan aturan umum

| Bagian | Implementasi / pemilik | Tanggung jawab |
|---|---|---|
| Login, register, logout, sesi | **Supabase Auth SDK** (FE; konfigurasi BE) | Identitas dan JWT |
| PIN Mode Pendamping | **Expo SecureStore** (FE) | Pengunci tampilan lokal per akun |
| Baca katalog & detail kata | **FastAPI v2** (BE) | Menggabungkan materi default + materi custom sesuai JWT |
| Buat/edit/hapus custom kata, suku kata, video | **Supabase SDK + Storage** (FE, aturan RLS BE) | CRUD, upload, hapus file, kepemilikan |
| Generate instruksi pelafalan | **FastAPI v2** (BE) | Memanggil LLM dengan API key di BE; hanya mengembalikan saran teks |
| Evaluasi percobaan pelafalan | **FastAPI v2** (BE) | MediaPipe + Parselmouth (L1); MediaPipe + Wav2Vec2 (L2–3) |
| Riwayat/progres | **Supabase SDK** (FE, aturan penyimpanan BE–FE) | Menyimpan ringkasan latihan per akun |

### Header & identitas

**Untuk FastAPI setelah login:**

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
Accept: application/json
```

Untuk `POST /v2/instructions/generate`, tambah `Content-Type: application/json`. Untuk `POST /v2/analyze`, gunakan `multipart/form-data` (boundary dikelola library upload, jangan set manual). API **wajib memvalidasi JWT Supabase**, tidak mempercayai `user_id` kiriman FE.

**Untuk Supabase Auth / Database / Storage:** gunakan Supabase JS SDK. SDK menangani `apikey` (publishable key), token, serta header yang relevan. **Service-role key dan API key LLM tidak boleh ditaruh di aplikasi Expo.**

### Konvensi ID dan enum

```ts
type Level = 1 | 2 | 3;
type Source = 'default' | 'custom';
type Result = 'sesuai' | 'belum_sesuai';
type EvaluationStatus = 'evaluated' | 'retry';
// ID default tetap seperti kode lama: l1_a, l2_pa, l3_papa, l0_hold_a, ...
// ID custom: custom_word:<uuid> atau custom_syllable:<uuid>
```

**Level 0 lama dipetakan ke Level 1 produk.** `l0_hold_a` dan `l0_soft_loud` boleh tetap menjadi ID internal demi kompatibilitas, tetapi UI, katalog v2, dan evaluasi v2 menampilkan `level=1`. `l1_a`, `l1_i`, `l1_u`, `l1_o` juga Level 1. ID internal lama jangan diganti sepihak.

---

## 2. Alur setelah aplikasi dibuka

```text
Aplikasi dibuka
  ├─ Sesi valid? Tidak → Register / Login Pendamping
  │   └─ Jika wajib konfirmasi email, verifikasi dahulu
  └─ Sesi valid → Ambil profil + GET /v2/catalog
                    ├─ Tampilkan Level 1 di beranda
                    ├─ Tampilkan latihan suku kata default Level 2
                    └─ Tampilkan daftar kata default + custom
                         └─ Pilih kata → GET /v2/words/{word_id}
                              ├─ level_2 berisi item → latihan berurutan → Level 3
                              └─ level_2 = [] → langsung Level 3

Mode Pendamping (dari navigasi aplikasi)
  └─ Verifikasi PIN → Kelola kata custom / instruksi / video
```

**Tidak ada misi harian.** Hanya latihan dan progres Level 1, Level 2, Level 3.

---

## 3. Autentikasi — Supabase Auth SDK

### 3.1 Register pendamping

**SDK:** `supabase.auth.signUp(...)`  
**Tidak perlu endpoint FastAPI baru.**

**Request (parameter SDK):**

```json
{
  "email": "pendamping@example.com",
  "password": "PasswordRahasia123",
  "options": {
    "data": { "display_name": "Budi" }
  }
}
```

**Data penting dalam response SDK:**

```json
{
  "user": { "id": "USER_UUID", "email": "pendamping@example.com" },
  "session": null
}
```

`session` dapat `null` jika konfirmasi email diaktifkan; jika tidak, sesi bisa langsung tersedia. `display_name` di Auth metadata **tidak otomatis** membuat row `public.profiles`: siapkan upsert profil setelah login atau mekanisme DB yang aman.

### 3.2 Login pendamping

**SDK:** `supabase.auth.signInWithPassword(...)`

**Request:**

```json
{ "email": "pendamping@example.com", "password": "PasswordRahasia123" }
```

**Data penting dalam response SDK:**

```json
{
  "user": { "id": "USER_UUID", "email": "pendamping@example.com" },
  "session": {
    "access_token": "SUPABASE_ACCESS_TOKEN",
    "refresh_token": "REFRESH_TOKEN",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

Angka waktu hanya ilustrasi. FE mengambil token terkini dari sesi SDK; token tidak ditulis ke log.

### 3.3 Sesi, profil, logout

| Operasi | Pemanggilan |
|---|---|
| Sesi tersimpan saat app dibuka | `supabase.auth.getSession()` dan dengarkan `onAuthStateChange()` |
| Informasi user terverifikasi jika dibutuhkan | `supabase.auth.getUser()` |
| Profil | `supabase.from('profiles').select(...).eq('user_id', user.id)` |
| Logout | `supabase.auth.signOut()`; reset state & cache akun sebelumnya |
| Lupa kata sandi | `supabase.auth.resetPasswordForEmail(email)`; konfigurasi redirect aplikasi |

**Aturan:** Setelah sesi valid, FE meminta katalog dengan `Authorization: Bearer <access_token>`. Perubahan/logout akun harus menghapus data custom dan progres yang sebelumnya di-cache di FE.

---

## 4. PIN Mode Pendamping

Tidak ada endpoint HTTP untuk PIN dalam MVP; semua langkah dilakukan di FE.

| Aktivitas | Input | Respons UI |
|---|---|---|
| Buat PIN pertama kali | `pin` (4 digit), `confirm_pin` | Tersimpan hanya pada akun dan perangkat ini |
| Buka Mode Pendamping | `pin` | `unlocked=true` pada state UI jika cocok; jika salah tetap terkunci |
| Ubah PIN | `old_pin`, `new_pin`, `confirm_pin` | PIN baru disimpan pada akun aktif |
| Lupa PIN | Reautentikasi akun sebelum reset lokal | Buat PIN baru; tidak ada PIN server untuk dipulihkan |

- Simpan dengan **Expo SecureStore** menggunakan key per akun, misalnya `rw.companionPin:<auth.uid()>`; jangan memakai satu key global.
- PIN harus tepat 4 angka; batasi percobaan berulang; kunci ulang setelah keluar dari Mode Pendamping / app restart.
- **Batas keamanan penting:** PIN hanyalah pengunci antarmuka. Karena pengguna Tuli dan pendamping berbagi satu sesi Auth, PIN **tidak membatasi secara kriptografis hak tulis Supabase**. RLS hanya dapat memastikan isolasi *antar akun*. Jika suatu saat dibutuhkan otorisasi pendamping pada server, desain akun/role harus diubah.

---

## 5. Ambil katalog setelah login — disepakati

### `GET /v2/catalog`

**Header:** `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`, `Accept: application/json`  
**Body:** tidak ada.  
**Response:** `200 OK`.

```json
{
  "level_1": [
    {
      "id": "l1_a",
      "text": "A",
      "instruction": "Buka mulut dan ucapkan A",
      "videos": [
        { "bucket": "default-videos", "path": "level-1/a.mp4", "position": 1 }
      ]
    },
    {
      "id": "l1_i",
      "text": "I",
      "instruction": "Lebarkan bibir dan ucapkan I",
      "videos": []
    }
  ],
  "default_syllables": [
    { "id": "l2_ma", "text": "MA" },
    { "id": "l2_pa", "text": "PA" },
    { "id": "l2_ba", "text": "BA" }
  ],
  "words": [
    { "id": "l3_papa", "text": "PAPA", "source": "default", "has_level_2": true },
    { "id": "custom_word:UUID_TOLONG", "text": "TOLONG", "source": "custom", "has_level_2": true },
    { "id": "custom_word:UUID_MINUM", "text": "MINUM", "source": "custom", "has_level_2": false }
  ]
}
```

**Aturan hasil:**

1. `level_1` berisi materi dasar yang tampil setelah login. Materi produk: A, I, U, O, A panjang, pelan→keras; materi MMM dari katalog lama tetap dipertahankan bila diputuskan sebagai latihan dasar tambahan. Untuk A panjang/pelan→keras, ID lama `l0_hold_a`, `l0_soft_loud` boleh dipakai. Contoh JSON hanya subset, bukan daftar lengkap.
2. `default_syllables`: daftar suku kata latihan bawaan. Tiga video yang *terdaftar di kode* adalah MA, PA, BA; keberadaan file aktual harus diverifikasi.
3. `words`: gabungan kata default + **custom milik akun login**. Berbeda akun → berbeda custom, materi default sama.
4. `has_level_2` menunjukkan apakah kata mempunyai urutan latihan suku kata. **Jangan menebak dari ejaan kata.**
5. Video default yang belum tersedia dapat memberikan `videos: []` sebagai fallback; jangan mengirim URL file yang tidak ada. Materi custom belum lengkap **jangan tampil untuk pengguna Tuli**.
6. `videos[].bucket` dan `videos[].path` adalah referensi Storage, **bukan URL publik**. FE memperoleh URL terotorisasi/signed URL ketika memutar video.

**Materi default tercatat di kode (`app/src/dataset/modelVideos.ts`):**

| Kelompok | Entri terdaftar |
|---|---|
| Bunyi dasar | A, I, U, MMM |
| Suku kata | MA, PA, BA |
| Kata lengkap | MAMA, PAPA, BIBI, PIPI, APA, ABU, IBU, UBI, BUMI |

Total **16 entri model video**, belum menjamin 16 file benar-benar ada. Semua video default yang akan digunakan saat deploy direncanakan masuk ke bucket `default-videos`, tidak disalin per akun.

---

## 6. Pilih kata → detail tahapan — disepakati

### `GET /v2/words/{word_id}`

**Header:** sama dengan `GET /v2/catalog`.  
**Body:** tidak ada.  
**`word_id`:** contoh `l3_papa` atau `custom_word:<uuid>` (URL-encode bila perlu).

**Response default `PAPA` (200):**

```json
{
  "id": "l3_papa",
  "text": "PAPA",
  "source": "default",
  "level_2": [
    {
      "id": "l2_pa",
      "text": "PA",
      "position": 1,
      "instruction": "Ucapkan PA",
      "videos": [{ "bucket": "default-videos", "path": "level-2/pa.mp4", "position": 1 }]
    },
    {
      "id": "l2_pa",
      "text": "PA",
      "position": 2,
      "instruction": "Ulangi PA",
      "videos": [{ "bucket": "default-videos", "path": "level-2/pa.mp4", "position": 1 }]
    }
  ],
  "level_3": {
    "instruction": "Ucapkan PAPA secara lengkap",
    "videos": [{ "bucket": "default-videos", "path": "level-3/papa.mp4", "position": 1 }]
  }
}
```

**Jika pendamping tidak membuat suku kata (contoh `MINUM`):**

```json
{
  "id": "custom_word:UUID_MINUM",
  "text": "MINUM",
  "source": "custom",
  "level_2": [],
  "level_3": {
    "instruction": "Ucapkan MINUM",
    "videos": [
      { "bucket": "rekan-wicara-tutorials", "path": "USER_UUID/words/WORD_UUID/video.mp4", "position": 1 }
    ]
  }
}
```

**Aturan FE:** `level_2.length > 0` → mulai dari suku kata urutan `position` lalu Level 3; `level_2.length === 0` → langsung Level 3. Dua langkah `PA` boleh memiliki ID materi sama tetapi `position` berbeda; urutan tidak boleh dihapus. `404` untuk item tidak ada atau bukan milik akun.

### `GET /v2/items/{item_id}` — detail latihan langsung (tambahan kecil)

Jika pengguna memilih suku kata **MA/PA/BA langsung dari `default_syllables`** tanpa memilih kata induk, FE membutuhkan detail instruksi dan video. Endpoint ini menggunakan header GET yang sama; tidak ada body.

**Response contoh:**

```json
{
  "id": "l2_ma",
  "level": 2,
  "text": "MA",
  "instruction": "Ucapkan MA sesuai contoh.",
  "videos": [
    { "bucket": "default-videos", "path": "level-2/ma.mp4", "position": 1 }
  ]
}
```

Jika FE hanya membuka Level 2 dari detail kata, endpoint ini **tidak perlu dipanggil**. `GET /v2/words/{word_id}` tetap menjadi kontrak utama alur pilihan kata yang disepakati.

---

## 7. Mode Pendamping — form materi manual + AI (BARU)

### 7.1 Flow formulir

```text
Pendamping buka mode (PIN)
  → Tambah Kata
     1. Input KATA LENGKAP (wajib), contoh KERTAS
     2. Input INSTRUKSI KATA (wajib)
        ├─ Ketik sendiri, atau
        └─ Klik "Generate by AI" → saran otomatis mengisi textarea
           → tetap bebas diedit/ditimpa manual
     3. Tambah 1+ VIDEO TUTORIAL KATA (wajib)
     4. Tambah suku kata Level 2? (OPSIONAL)
        └─ Untuk setiap suku kata (contoh KER, TAS):
           - Input teks suku kata (wajib)
           - Input instruksi manual / generate AI (wajib)
           - Tambah 1+ video tutorial (wajib)
           - Atur urutan (position)
     5. Simpan ketika semua input yang diwajibkan sudah lengkap
  → Kata custom masuk katalog belajar pengguna Tuli
```

**Contoh bentuk data formulir FE sebelum upload (bukan HTTP payload):**

```json
{
  "word": "KERTAS",
  "instruction": "Ucapkan KERTAS perlahan sesuai video.",
  "videos": [{ "local_uri": "file:///.../kertas.mp4" }],
  "syllables": [
    {
      "syllable": "KER",
      "position": 1,
      "instruction": "Latih bunyi KER sesuai video.",
      "videos": [{ "local_uri": "file:///.../ker.mp4" }]
    },
    {
      "syllable": "TAS",
      "position": 2,
      "instruction": "Latih bunyi TAS sesuai video.",
      "videos": [{ "local_uri": "file:///.../tas.mp4" }]
    }
  ]
}
```

FE mengubah `local_uri` menjadi path Storage setelah upload, lalu menyimpan metadata di tabel `custom_videos`. Kolom database kata lengkap bernama `word` (bukan `text` seperti DTO katalog); kolom suku kata bernama `syllable`.

**Instruksi AI bukan teks final yang tidak bisa diubah.** Ia hanya mengisi textarea biasa. Pendamping dapat menulis sendiri dari awal, klik generate lalu mengedit, atau mengabaikan hasil AI. Saat edit, dapat mengulangi generate tanpa mengubah database sebelum menekan Simpan.

**Aturan validasi final:**

| Materi | Wajib | Opsional |
|---|---|---|
| Kata lengkap (L3) | `word`, `instruction`, **≥1 video tutorial** | Jumlah video >1 |
| Suku kata (L2) jika ada | `syllable`, `position`, `instruction`, **≥1 video tutorial per suku kata** | Jumlah video >1 |
| Suku kata secara keseluruhan | Tidak ada — `level_2=[]` diperbolehkan | 0, 1, 2, ... suku kata |

**Saat edit:** minimal satu video tetap harus tersedia pada setiap materi; tidak perlu upload video baru jika video lama masih dipertahankan. Jika menghapus video terakhir, FE menolak penyimpanan sampai diganti. Generate AI **tidak wajib**; instruksi manual setara validnya.

### 7.2 Generate instruksi dari AI

**Endpoint baru:** `POST /v2/instructions/generate`  
**Header:** `Authorization: Bearer <token>`, `Content-Type: application/json`.  
**Hanya pengguna login; dipanggil dari form Mode Pendamping.**

**Request kata lengkap:**

```json
{ "type": "word", "text": "KERTAS" }
```

**Request suku kata:**

```json
{ "type": "syllable", "text": "KER", "parent_word": "KERTAS" }
```

- `type`: enum `word | syllable` (wajib).
- `text`: teks yang ingin dibuat instruksinya (wajib, nonkosong).
- `parent_word`: kata lengkap sebagai konteks jika suku kata (opsional pada backend; **FE mengirim jika ada**).
- Tidak perlu mengirim file video ke generator teks; jika kelak ingin instruksi AI berbasis video, itu kontrak dan fitur terpisah.

**Response 200:**

```json
{
  "instruction": "Rapatkan dan gerakkan lidah sesuai contoh video, lalu ucapkan KERTAS perlahan."
}
```

String di atas **contoh bentuk respons**, bukan rekomendasi artikulasi yang sudah diverifikasi. BE harus menghasilkan instruksi sederhana dalam Bahasa Indonesia, tidak membuat klaim terapeutik, dan tidak mengarang pengamatan dari video yang belum dianalisis. FE mengisi field instruksi dengan `instruction` **setelah pengguna menekan Generate**, lalu pengguna bebas edit. Tidak ada auto-save atau auto-publish.

**Jika AI error / timeout:** tampilkan pesan dan pertahankan isi textarea sebelumnya. Pendamping tetap bisa menulis instruksi manual. API key penyedia AI hanya ada di BE, bukan dalam Expo.

**Potensi konflik ketik:** jika user sudah mengetik dan hasil AI baru datang belakangan, FE jangan diam-diam menimpa teks terbaru; tampilkan pilihan gunakan hasil AI atau batalkan.

### 7.3 CRUD kata dan suku kata (Supabase SDK)

Tetap mengikuti arsitektur yang sudah disepakati: **FE melakukan CRUD menggunakan Supabase SDK langsung, bukan membuat endpoint FastAPI CRUD duplikat**. BE menjamin RLS dan schema.

| Operasi FE | Tabel | Input minimum |
|---|---|---|
| Buat kata | `custom_words.insert` | `{ user_id: auth.uid(), word, instruction }` |
| Edit kata | `custom_words.update(...).eq('id', uuid)` | `{ word?, instruction? }` |
| Hapus kata | `custom_words.delete().eq('id', uuid)` | `id` kata custom pemilik |
| Buat suku kata | `custom_syllables.insert` | `{ word_id, syllable, position, instruction }` |
| Edit suku kata | `custom_syllables.update(...).eq('id', uuid)` | `{ syllable?, position?, instruction? }` |
| Hapus suku kata | `custom_syllables.delete().eq('id', uuid)` | `id` suku kata custom pemilik |
| Simpan metadata video | `custom_videos.insert` | `{ word_id XOR syllable_id, storage_path, sort_order }` |
| Ganti urutan video | `custom_videos.update` | `{ sort_order }` |
| Hapus metadata video | `custom_videos.delete` | `id` video yang dimiliki |

**Batas:** baris default bukan baris `custom_words` dan **tidak dapat dimodifikasi dengan operasi custom**. Endpoint read default bersifat read-only; RLS mencegah mengubah custom milik akun lain.

**Penting untuk integrasi schema:** SQL lama `custom_words` dan `custom_syllables` sempat memiliki kolom `video_path`. Target baru menggunakan tabel `custom_videos` untuk banyak video. **Verifikasi Cloud sudah menjalankan migration multi-video** sebelum FE memanggil operasi di atas. `position` pada `custom_syllables` adalah urutan suku kata; `sort_order` di `custom_videos` dipetakan menjadi properti respons `videos[].position` agar sesuai kontrak baca yang disetujui.

### 7.4 Upload & akses video

| Video | Bucket private (nama kontrak) | Siapa boleh membaca | Siapa boleh menulis |
|---|---|---|---|
| Materi default | `default-videos` | Semua akun login | Operator/admin proyek lewat proses aman, **bukan pendamping** |
| Materi custom | `rekan-wicara-tutorials` | Akun pemilik | Akun pemilik |

- File video tutorial disimpan di Storage, **bukan blob di PostgreSQL**. Simpan `storage_path` di `custom_videos`, bukan URL sementara.
- File custom memakai folder awal `<auth.uid()>/...`; FE upload ke Storage, lalu menyimpan metadata. Atur/validasi ukuran, MIME, dan durasi sesuai kebijakan upload yang diputuskan tim (schema bucket sebelumnya mengusulkan maksimum 50 MiB/file).
- Saat save multi-step, FE melakukan validasi semua field, mengunggah video, membuat kata/suku kata, lalu membuat metadata video. Jika salah satu tahap gagal, tampilkan error dan lakukan kompensasi/pembersihan file/baris parsial. **Operasi berantai via SDK tidak otomatis atomik.** BE hanya boleh memasukkan materi custom ke katalog belajar jika semua kata/suku kata yang diperlukan memiliki instruksi + minimal satu file video yang benar-benar ada.
- Saat delete kata, FK `ON DELETE CASCADE` dapat menghapus baris suku kata dan metadata video, **tetapi tidak menghapus object Storage**. FE harus mengambil daftar path sebelum delete dan membersihkannya; siapkan retry cleanup jika gagal.
- `createSignedUrl(path, expiresIn)` atau download terotorisasi untuk playback. Jangan simpan signed URL ke DB.
- **Keterbatasan schema saat ini:** validasi minimal satu video di aplikasi + pengecekan katalog belum sama dengan *constraint* transaksional database; jika butuh jaminan mutlak di setiap tahap, diperlukan RPC/transaksi server atau status publikasi. Ini pilihan implementasi berikutnya, bukan diasumsikan sudah tersedia.

---

## 8. Kontrak evaluasi pelafalan (BARU)

### `POST /v2/analyze` — multipart/form-data

**Header:** `Authorization: Bearer <token>`.  
**Fields form-data:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `file` | Video MP4/MOV dengan audio | Ya | Rekaman percobaan dari kamera + mikrofon, **bukan video tutorial** |
| `item_id` | string | Ya | ID item dari katalog atau detail kata |
| `session_id` | string | Ya | UUID/ID sesi latihan yang dibuat FE |

Tidak perlu mengirim `user_id` atau target teks sebagai sumber kepercayaan. BE memverifikasi JWT, memastikan item valid dan milik user bila custom, mengambil target dari sumber otoritatif, baru menjalankan evaluator.

**Response Level 2 / 3 (HTTP 200):**

```json
{
  "status": "evaluated",
  "item_id": "l2_pa",
  "level": 2,
  "result": "belum_sesuai",
  "feedback": {
    "code": "pronunciation_not_matched",
    "message": "Coba ulangi pengucapannya secara perlahan."
  },
  "quality_flags": [],
  "visuals": null,
  "engine": "mediapipe_wav2vec2",
  "processing_ms": 2100
}
```

**Response Level 1 (HTTP 200, format visual khusus L1):**

```json
{
  "status": "evaluated",
  "item_id": "l1_a",
  "level": 1,
  "result": "sesuai",
  "feedback": { "code": "matched", "message": "Sesuai, bagus!" },
  "quality_flags": [],
  "visuals": {
    "vowel_point": { "f1": 720, "f2": 1300 },
    "vowel_anchors": {
      "a": { "f1": 780, "f2": 1350 },
      "i": { "f1": 320, "f2": 2300 },
      "u": { "f1": 350, "f2": 900 }
    },
    "lip_contour": { "points": [[0.41, 0.62], [0.45, 0.60]] },
    "loudness": null
  },
  "engine": "mediapipe_parselmouth",
  "processing_ms": 2100
}
```

**Response bila rekaman tidak layak dievaluasi:**

```json
{
  "status": "retry",
  "item_id": "l2_pa",
  "level": 2,
  "result": null,
  "feedback": { "code": "no_face", "message": "Wajah belum terlihat jelas. Coba rekam lagi." },
  "quality_flags": ["no_face"],
  "visuals": null,
  "engine": "mediapipe_wav2vec2",
  "processing_ms": 600
}
```

**Aturan wajib:**

1. **Level 1:** MediaPipe + Parselmouth. BE boleh mengirim data numerik untuk segitiga vokal, gambar/garis mulut, atau loudness yang relevan; FE merender visualisasi **hanya untuk Level 1** (tidak semua latihan L1 wajib memiliki semua visual).
2. **Level 2 & 3:** MediaPipe + Wav2Vec2; `visuals: null` **selalu**. Tidak menampilkan segitiga vokal atau gambar mulut hasil MediaPipe.
3. FE menampilkan **`Sesuai`** atau **`Belum Sesuai`** dengan teks arahan. **Jangan tampilkan transkripsi Wav2Vec2 mentah** atau kata yang model dengar sebagai feedback pengguna.
4. `retry` adalah kualitas rekaman tidak cukup / komponen tidak dapat menilai, **bukan kesalahan pengucapan**. FE menampilkan instruksi rekam ulang, tidak menganggap `Belum Sesuai`.
5. Pesan perbaikan yang spesifik hanya boleh keluar jika didukung sinyal evaluasi yang nyata. Wav2Vec2 bebas tidak otomatis bisa menentukan detail kesalahan fonetik; jangan menjanjikan akurasi klinis.
6. Video/audio percobaan digunakan sementara dan dibersihkan sesudah diproses; **tidak disimpan** sebagai video tutorial.
7. `/v1/analyze` yang ada sekarang masih memakai `hijau/kuning/merah`. v2 membutuhkan adapter/aturan evaluator baru, bukan sekadar mengganti string label. BE dan FE harus menguji hasil secara bersama.

---

## 9. Progres/misi MVP

**MVP hanya Level 1, Level 2, Level 3.** Tidak ada endpoint/fitur *daily mission*, streak, XP, atau leaderboard.

- Data yang sudah ada: `public.attempts`, `public.progress` dengan RLS `user_id = auth.uid()`.
- FE menyimpan percobaan hanya bila `status='evaluated'`. `retry` tidak dihitung sebagai jawaban salah.
- Mapping **sementara agar tidak melanggar CHECK constraint lama** untuk `attempts`: `result='sesuai'` → `status='ok', overall='hijau'`; `result='belum_sesuai'` → `status='ok', overall='merah'`. BE–FE boleh mengubah mapping melalui migration yang eksplisit; **jangan menyimpan string `sesuai` ke `overall` lama**.
- `item_id` tetap `l1_a`, `l2_pa`, `l3_papa`, `custom_syllable:<uuid>`, `custom_word:<uuid>`. `level` yang disimpan untuk produk baru: 1/2/3; item `l0_*` perlu mapping ke 1 secara konsisten.
- Progres tetap berdasarkan item. Untuk kata dengan dua langkah `PA`, `position` hanya urutan dalam lesson; progres item lama belum membedakan posisi bila ID materinya sama.
- **Belum disepakati:** berapa kali `sesuai` untuk lulus, dan apakah Level 1 wajib diselesaikan sebelum lanjut. FE tidak boleh meng-hardcode syarat kelulusan/penguncian sebelum keputusan dibuat.

---

## 10. Kontrak error

**FastAPI** menggunakan satu format error agar FE bisa membuat handler terpusat:

```json
{
  "detail": {
    "code": "INVALID_MATERIAL",
    "message": "Lengkapi instruksi dan minimal satu video untuk setiap materi."
  }
}
```

| HTTP | `code` contoh | Perlakuan FE |
|---|---|---|
| 400/422 | `INVALID_INPUT`, `INVALID_MATERIAL` | Perbaiki form, pertahankan input |
| 401 | `UNAUTHENTICATED` | Refresh sesi / login ulang |
| 403 | `FORBIDDEN` | Jangan tampilkan/mutasi item akun lain |
| 404 | `ITEM_NOT_FOUND`, `VIDEO_NOT_FOUND` | Tampilkan materi tidak ditemukan |
| 413/415 | `FILE_TOO_LARGE`, `UNSUPPORTED_MEDIA` | Kompres atau pilih video lain |
| 429 | `GENERATION_RATE_LIMITED` | Nonaktifkan generate sementara; teks manual tetap bisa |
| 503/504 | `AI_UNAVAILABLE`, `INFERENCE_TIMEOUT` | Pertahankan instruksi, tampilkan retry; jangan beri nilai salah |

Error dari **Supabase Auth/DB/Storage** mengikuti format SDK Supabase, bukan format `detail` FastAPI. FE memetakan error tersebut ke pesan Indonesia.

---

## 11. Checklist acceptance test FE–BE

- [ ] Register/login pendamping berhasil; sesi tersimpan; katalog hanya tersedia setelah JWT valid.
- [ ] Setelah login beranda menampilkan seluruh Level 1 yang tersedia, daftar MA/PA/BA, dan kata default + custom akun aktif.
- [ ] Dua akun berbeda mendapat materi default sama, tetapi custom/progres terisolasi.
- [ ] Pilih kata dengan `level_2=[]` langsung membuka Level 3.
- [ ] Pilih kata dengan dua suku kata menjalankan urutan yang sesuai posisi.
- [ ] PIN salah menolak akses UI Mode Pendamping; PIN per akun tidak tertukar.
- [ ] Pendamping bisa membuat kata `KERTAS` dengan instruksi manual, ≥1 video, tanpa suku kata.
- [ ] Pendamping bisa membuat kata `KERTAS` dengan suku kata `KER`, `TAS`, masing-masing instruksi dan ≥1 video.
- [ ] Tombol Generate AI pada kata dan suku kata mengisi textarea; bisa diedit; tidak otomatis menyimpan.
- [ ] Jika generate AI gagal, teks manual tetap aman dan form masih bisa disimpan.
- [ ] Edit instruksi/video/urutan custom diperbolehkan; menghapus video terakhir ditolak sebelum simpan.
- [ ] Edit/hapus materi default tidak tersedia dan tidak dapat dilakukan via aturan backend/DB.
- [ ] Storage video default hanya-baca untuk pendamping; video custom hanya bisa diakses pemilik.
- [ ] Evaluasi Level 1 menampilkan hasil + visual L1 yang relevan; Level 2/3 tidak menampilkan visual mulut/segitiga.
- [ ] Evaluasi mengeluarkan `sesuai` / `belum_sesuai`; kegagalan kualitas rekaman menjadi `retry` dan tidak dihitung salah.
- [ ] Tidak ada menu/backend daily mission pada MVP.

---

## 12. Hal yang belum boleh diasumsikan selesai

1. **Schema Cloud:** pastikan `custom_words`, `custom_syllables`, `custom_videos`, RLS, bucket `default-videos` dan `rekan-wicara-tutorials` benar-benar tersedia. `docs/supabase/schema.sql` repo lama masih berbeda dari rencana v2.
2. **Default video:** daftar 16 item ditemukan pada kode, tetapi lokasi file, isi, instruksi, dan upload ke Storage belum diverifikasi. Materi O, A panjang, pelan→keras membutuhkan kelengkapan konten sesuai flow.
3. **Penilaian v2:** model dan pipeline Level 2/3 harus diintegrasikan dan divalidasi; keberadaan endpoint eksperimen Wav2Vec2 saja belum membuktikan kesiapan skor `sesuai`.
4. **Aturan progres:** kelulusan dan prasyarat antarleveI belum ditentukan; kontrak ini mengunci bentuk data dan operasi lain terlebih dahulu.
5. **CRUD multi-step:** operasi langsung via SDK tidak atomik. Bila wajib transaksi satu klik, sepakati RPC/endpoint transaksi sebelum produksi.

### Tambahan UI (bukan payload API)

- Bottom navigation tetap muncul pada halaman utama setelah login; halaman splash, login, dan rekam dapat memakai ketentuan FE yang konsisten.
- Wordmark **Rekan Wicara** harus kontras dengan latar putih.
- Pengguna Tuli hanya melihat label **Sesuai**, **Belum Sesuai**, atau instruksi **Rekam ulang** untuk kondisi `retry`.

**Aturan perubahan:** Ubah contoh JSON, DTO FE, model Pydantic BE, dan fixture mock secara bersamaan. Jangan mengubah nama field sepihak. Pertahankan endpoint v1 selama migrasi ke v2 belum selesai.
