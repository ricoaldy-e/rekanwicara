# Rekan Wicara — Kontrak FE Final (v1)

13 Nov 2026 · Pemilik: Rico (FE). Menyatukan: `REKAN_WICARA_BE_FE_CONTRACT_V2` + `flow-srs-ui.md` rev. 9. BE sudah menyatakan mengikuti keputusan FE di bagian 1.
Bila dokumen ini bertentangan dengan kontrak BE v2, **dokumen ini menang** untuk lima poin di bagian 1. Selebihnya kontrak BE v2 berlaku.

Aturan perubahan (dari kontrak BE): ubah contoh JSON, tipe FE, model Pydantic BE, dan data tiruan **bersamaan**. Jangan mengubah nama field sepihak.

---

## 1. Keputusan final (menimpa kontrak BE v2)

| # | Keputusan |
|---|---|
| 1 | **Level 1: tiga status** `sesuai`, `mendekati`, `belum_sesuai`. **Level 2–3: dua status** `sesuai`, `belum_sesuai`. Ambang "mendekati" ditentukan BE |
| 2 | **Dua indikator**: Bibir dan Suara, masing-masing punya hasil dan satu kalimat umpan balik. `result` tetap ada sebagai ringkasan |
| 3 | **Suku kata tidak berdiri sendiri.** Tidak ada `default_syllables` di katalog dan FE tidak memakai `GET /v2/items/{id}`. Kata bawaan wajib punya `level_2` terisi bila punya suku kata |
| 4 | **Username = `display_name`.** Daftar: username, email, password. Masuk: email + password saja. Username tidak unik dan bukan identitas masuk |
| 5 | **Satu video per kata dan satu per suku kata.** Contoh "tolong": 3 video (tolong, to, long). FE hanya mengirim dan memutar `videos[0]` |
| 6 | `instruction_source` (`ai` \| `ai_edited` \| `manual`) **opsional**. Bila kolom belum ada, FE jalan tanpa label AI untuk pengguna Tuli |
| 7 | Wordmark "Rekan Wicara" terang di atas latar gelap, tidak bercampur putih (menggantikan kalimat "latar putih" di kontrak BE) |

---

## 2. Pembagian dan konfigurasi

| Bagian | Dipakai FE |
|---|---|
| Login, daftar, keluar, sesi | Supabase Auth SDK |
| PIN Pendamping | Expo SecureStore, key `rw.companionPin:<auth.uid()>` |
| Katalog, detail kata, instruksi AI, analisis | FastAPI v2 + header `Authorization: Bearer <access_token>` |
| CRUD kata, suku kata, video, progres | Supabase SDK + Storage |

Variabel lingkungan FE (publik): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (kunci publishable), `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_USE_MOCK`.
**Tidak boleh ada** service-role key atau kunci LLM di app.

Dependensi baru yang kemungkinan dibutuhkan (**Claude Code wajib bertanya dulu sebelum memasang**): `@supabase/supabase-js`, `expo-secure-store`, pustaka pemutar video, dan pemilih video dari galeri. Bila belum disetujui, pakai data tiruan.

Struktur kode FE:

```
src/api/client.ts        fetch + Bearer + parsing galat FastAPI
src/api/catalog.ts       getCatalog(), getWord(id)
src/api/instructions.ts  generateInstruction()
src/api/analyze.ts       analyze()
src/auth/supabase.ts     klien Supabase, sesi
src/pin/pinStore.ts      PIN per akun (SecureStore) + hitungan salah
src/data/mappers.ts      DTO BE/DB -> tipe UI (satu tempat)
src/data/media.ts        signed URL, unggah, hapus Storage
src/data/words.ts        CRUD Supabase (kata, suku kata, video)
src/data/progress.ts     simpan/baca attempts & progress
src/mock/*               data tiruan berbentuk sama dengan bagian 4
```

`EXPO_PUBLIC_USE_MOCK=true` mengganti seluruh `src/api` dan `src/data` dengan `src/mock`, tanpa mengubah layar.

---

## 3. Autentikasi dan PIN

- Daftar: `supabase.auth.signUp({ email, password, options: { data: { display_name: <username> } } })`. Setelah login pertama, upsert baris `profiles`.
- Bila `session = null`: layar **Cek email** (AUTH-8). Masuk: `signInWithPassword({ email, password })`.
- Sesi: `getSession()` saat buka app dan `onAuthStateChange()`. Keluar: `signOut()` lalu hapus cache akun (katalog, custom, progres).
- Galat Supabase mengikuti format SDK, dipetakan ke pesan Indonesia (`flow-srs-ui.md` §7.1.1).
- Validasi klien: `src/forms/validators/auth.ts` (username 3–20, email, sandi 8–64 huruf+angka).
- **PIN**: 4 digit; buat dua kali; tolak PIN mudah ditebak; simpan per akun; percobaan salah dibatasi (nilai awal 5 kali, kunci 30 detik, disimpan lokal); sesi Pendamping berakhir saat kembali ke tab Latihan, app ke latar belakang, atau diam 5 menit. Lupa PIN = verifikasi ulang kata sandi akun, lalu buat PIN baru. PIN hanya pengunci tampilan, bukan keamanan kriptografis; jangan diklaim lain.

---

## 4. Tipe FE dan bentuk data

```ts
type Level = 1 | 2 | 3
type Source = 'default' | 'custom'
type Status = 'sesuai' | 'mendekati' | 'belum_sesuai'   // mendekati hanya L1
type VideoRef = { bucket: string; path: string; position: number }

type CatalogDTO = {
  level_1: Array<{ id: string; text: string; instruction: string; videos: VideoRef[] }>
  words: Array<{ id: string; text: string; source: Source; has_level_2: boolean }>
}

type WordDTO = {
  id: string; text: string; source: Source
  level_2: Array<{ id: string; text: string; position: number; instruction: string; videos: VideoRef[] }>
  level_3: { instruction: string; videos: VideoRef[] }
}
```

Tipe UI (hasil `mappers.ts`):

```ts
type PracticeItem = {
  key: string            // `${itemId}#${position}` untuk langkah, itemId untuk progres
  itemId: string
  level: Level
  text: string
  instruction: string
  video?: VideoRef       // videos[0]; undefined = hanya teks instruksi
  position?: number
}
```

Aturan: `level_1` = daftar bunyi L1. `words` = Pilih kata. `has_level_2 = false` atau `level_2 = []` → Jalur kata langsung ke Level 3. Dua langkah dengan `itemId` sama (mis. PA, PA) berbeda `position`; **status progres ditampilkan per `itemId` unik**.
Item `l0_*` ditampilkan sebagai Level 1.

### Contoh data tiruan

```json
// src/mock/catalog.json
{
  "level_1": [
    { "id": "l1_a", "text": "A", "instruction": "Buka mulut lebar dan ucapkan A.", "videos": [] },
    { "id": "l1_i", "text": "I", "instruction": "Lebarkan bibir dan ucapkan I.", "videos": [] },
    { "id": "l1_u", "text": "U", "instruction": "Bulatkan bibir dan ucapkan U.", "videos": [] },
    { "id": "l1_o", "text": "O", "instruction": "Bulatkan bibir agak terbuka dan ucapkan O.", "videos": [] },
    { "id": "l0_hold_a", "text": "A panjang", "instruction": "Tahan bunyi A beberapa detik.", "videos": [] },
    { "id": "l0_soft_loud", "text": "Pelan ke keras", "instruction": "Mulai pelan, lalu makin keras.", "videos": [] }
  ],
  "words": [
    { "id": "l3_mama", "text": "MAMA", "source": "default", "has_level_2": true },
    { "id": "l3_papa", "text": "PAPA", "source": "default", "has_level_2": true },
    { "id": "custom_word:11111111-1111-1111-1111-111111111111", "text": "TOLONG", "source": "custom", "has_level_2": true },
    { "id": "custom_word:22222222-2222-2222-2222-222222222222", "text": "MINUM", "source": "custom", "has_level_2": false }
  ]
}
```

`words/l3_papa`: lihat contoh kontrak BE §6 (dua langkah PA). `words/custom_word:1111…`: `level_2` = [`TO` position 1, `LONG` position 2], `level_3` = "Ucapkan TOLONG perlahan." `words/custom_word:2222…`: `level_2 = []`.

---

## 5. Evaluasi: `POST /v2/analyze` (bentuk final)

Request `multipart/form-data`: `file` (MP4/MOV dengan audio), `item_id`, `session_id` (UUID dari FE). Header Bearer. Jangan set `Content-Type` manual.

Response (selalu 200; kegagalan kualitas = `status: "retry"`):

```ts
type AnalyzeResponse = {
  status: 'evaluated' | 'retry'
  item_id: string
  level: Level
  result: Status | null                 // ringkasan; null saat retry
  lip_result: Status | null             // Bibir
  voice_result: Status | null           // Suara
  lip_feedback: string | null           // satu kalimat, bila bibir belum sesuai/mendekati
  voice_feedback: string | null         // satu kalimat, bila suara belum sesuai/mendekati
  feedback: { code: string; message: string }   // ringkasan atau alasan retry
  quality_flags: string[]               // mis. 'no_face'
  visuals: null | {                     // hanya Level 1
    vowel_point: { f1: number; f2: number } | null
    vowel_anchors: Record<'a'|'i'|'u', { f1: number; f2: number }> | null
    lip_contour: { points: [number, number][] } | null
    loudness: unknown | null
  }
  engine: string
  processing_ms: number
}
```

Aturan:
1. `mendekati` hanya boleh muncul di `level = 1`. Bila datang di L2/L3, FE memetakannya ke `belum_sesuai` dan mencatat peringatan di mode pengembang.
2. Level 2–3: `visuals = null`. Level 1: gambar segitiga dan mulut hanya dari `visuals`, boleh sebagian `null`.
3. `retry`: tampilkan `feedback.message` dan tombol "Rekam ulang". Tanpa lencana, tidak disimpan ke progres, tidak dihitung salah.
4. Tidak menampilkan transkripsi atau kata hasil model.
5. UI memetakan `lip_result` ke lencana Bibir dan `voice_result` ke lencana Suara; `lip_feedback` dan `voice_feedback` ke kartu umpan balik (maks dua kalimat, Bibir dulu). Kedua indikator `sesuai` → kartu umpan balik tidak dirender.
6. Rekaman percobaan tidak disimpan oleh FE di luar proses unggah ini dan dihapus dari perangkat setelah hasil diterima atau pengguna keluar.

---

## 6. Materi Pendamping (Supabase SDK)

Tepat satu video per blok. Aturan wajib (Tambah dan Ubah): kata → teks, instruksi, 1 video; tiap suku kata yang ada → teks, `position`, instruksi, 1 video. Tanpa suku kata diperbolehkan.

Urutan simpan (tidak atomik, dengan kompensasi):
1. Validasi semua kolom (aturan di `flow-srs-ui.md` §7.7.3).
2. Unggah video ke `rekan-wicara-tutorials/<auth.uid()>/words/<wordId>/…`. Simpan daftar path yang sudah terunggah.
3. `custom_words.insert` → `custom_syllables.insert` → `custom_videos.insert` (tepat satu per materi; `sort_order = 1`).
4. Gagal di tahap mana pun: hapus baris dan file yang sudah dibuat pada percobaan ini, tampilkan galat, **pertahankan seluruh isian**, tawarkan "Coba lagi".
5. Berhasil: kembali ke daftar, snackbar "Kata “…” disimpan."

Ubah video: unggah file baru → perbarui `custom_videos` → **setelah berhasil** hapus file lama di Storage. Hapus kata: ambil semua `storage_path` dulu, `delete` baris (cascade), lalu hapus file; bila hapus file gagal, simpan antrean ulang lokal. Kata "belum lengkap" hasil kegagalan tampil di daftar Pendamping dengan status "Belum lengkap" (lanjutkan atau hapus) dan **tidak** muncul untuk pengguna Tuli.

Pemutaran: `createSignedUrl(path, expiresIn)` saat dibutuhkan; jangan simpan URL; bila gagal/kedaluwarsa minta ulang sekali, lalu tampilkan teks instruksi saja dengan tombol "Coba lagi".
Batas unggah awal: MP4/MOV, 50 MiB (sesuai skema bucket); durasi maksimum 30 detik (nilai FE, bisa diubah di `VIDEO_LIMITS`).

---

## 7. Instruksi AI: `POST /v2/instructions/generate`

```json
{ "type": "word", "text": "TOLONG" }
{ "type": "syllable", "text": "TO", "parent_word": "TOLONG" }
→ 200 { "instruction": "…" }
```

**Isi `instruction` adalah langkah-langkah, satu langkah per baris (`\n`)**: 1–5 langkah, tiap langkah 5–120 karakter, total maksimal 500. Brief lengkap untuk LLM: `docs/AI_INSTRUCTION_BRIEF.md`. FE mengisi kolom **instruksi pelafalan** (satu kolom per langkah) dan tidak menyimpan otomatis. Perilaku tombol, timeout 20 detik, dan pesan: `flow-srs-ui.md` §7.5.2. Kolom dikunci selama memuat, jadi hasil tidak menimpa ketikan baru.

---

## 8. Progres (`attempts`, `progress`)

- Simpan hanya bila `status = 'evaluated'`. `retry` tidak disimpan.
- Pemetaan ke kolom `overall` lama: `sesuai → hijau`, `mendekati → kuning`, `belum_sesuai → merah`. `status` = `ok`. **Konfirmasi BE bahwa CHECK menerima `kuning`** (di `/v1` nilai itu sudah ada).
- `level` yang disimpan 1/2/3 (item `l0_*` → 1). `item_id` seperti di katalog.
- Ringkasan di UI: "x dari N sesuai" per kartu, dihitung dari status terbaik per `itemId` unik.
- **Tidak ada** syarat lulus atau penguncian level. FE tidak boleh menulis aturan semacam itu sampai tim memutuskan.

---

## 9. Peta galat

| Sumber | Kode | Perlakuan UI |
|---|---|---|
| FastAPI 401 | `UNAUTHENTICATED` | Segarkan sesi sekali; gagal → layar Masuk |
| FastAPI 400/422 | `INVALID_INPUT`, `INVALID_MATERIAL` | Tampilkan pesan, pertahankan isian |
| FastAPI 403/404 | `FORBIDDEN`, `ITEM_NOT_FOUND`, `VIDEO_NOT_FOUND` | "Materi tidak ditemukan." kembali ke daftar |
| FastAPI 413/415 | `FILE_TOO_LARGE`, `UNSUPPORTED_MEDIA` | "Video terlalu besar / format belum didukung." |
| FastAPI 429 | `GENERATION_RATE_LIMITED` | Tombol AI dinonaktifkan sementara dengan teks alasan; ketik manual tetap bisa |
| FastAPI 503/504 | `AI_UNAVAILABLE`, `INFERENCE_TIMEOUT` | Bagi AI: pesan + "Coba lagi". Bagi analisis: "Penilaian belum bisa dilakukan. Coba lagi." (bukan hasil salah) |
| Supabase Auth/DB/Storage | format SDK | Dipetakan di `mappers`/`client`, pesan Indonesia |
| Jaringan | — | Banner "Tidak ada koneksi" + "Coba lagi"; isian aman |

---

## 10. Kriteria selesai FE

- [ ] Dengan `USE_MOCK=true` seluruh alur jalan: Masuk (tiruan) → Beranda → Pilih kata → Level 2 → Level 3 → Hasil, termasuk `retry`.
- [ ] Hasil L1 menampilkan tiga status dan grafik; L2–L3 dua status tanpa grafik.
- [ ] Bar bawah tampil di semua layar utama dan tersembunyi di sesi latihan.
- [ ] Pendamping: tambah kata tanpa suku kata, kata dengan suku kata, ubah, hapus; kata bawaan tidak punya jalur ubah/hapus.
- [ ] Tombol AI: berhasil, gagal, ganti isi, kembalikan teks.
- [ ] PIN: buat, masuk, salah, terkunci, ganti.
- [ ] Mengganti `USE_MOCK=false` tidak mengubah satu pun layar.
- [ ] Tes jest untuk validator, pemetaan DTO, dan aturan status per level.

## 11. Masih terbuka

- Nama field `lip_result`, `voice_result`, `lip_feedback`, `voice_feedback` mengikuti permintaan FE; **BE konfirmasi ejaan akhirnya**.
- Kolom `instruction_source` ada atau tidak (opsional).
- CHECK `attempts.overall` menerima `kuning`.
- Batas PIN (5 kali, 30 detik, idle 5 menit) dan batas durasi video 30 detik adalah nilai awal FE.
- Isi video bawaan (O, A panjang, pelan→keras) belum ada; tampil teks instruksi saja sampai ada.
