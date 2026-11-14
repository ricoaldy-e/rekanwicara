# FL-0 — Audit alur v2 (flow-srs-ui + kontrak FE final + design v6)

13 Nov 2026 · cabang `flow-v2` (dibuat dari `design` @ `5abb808`) · ditulis tanpa mengubah kode.

## Keputusan Rico (13 Nov 2026 malam)

FE dan BE dikerjakan **paralel**. FE tidak menunggu BE: semua langkah memakai tiruan berbentuk kontrak FE final, dan sambungan ke BE hanya mengganti sakelar, bukan layar. Rico menyetujui usulan di bagian c.3 dan e:
- K1: video contoh Pendamping adalah materi (bucket privat per akun, signed URL, persetujuan wajib). Rekaman latihan tetap dihapus. Teks Tentang/README diperbarui di FL-10.
- K2: teks kata boleh dikirim ke AI lewat BE, dengan pengungkapan di formulir dan catatan di `THIRD_PARTY.md`/README.
- K3: login anonim dimatikan di FL-7; riwayat anonim lama tidak dimigrasi.
- K5: dua sakelar, `EXPO_PUBLIC_USE_MOCK` dan `EXPO_PUBLIC_ANALYZE_API` (bawaan `v1`).
- K6: nama env tetap `EXPO_PUBLIC_API_URL`.
- K7: sesi Supabase tetap di AsyncStorage (batasan ditulis di README).
- K8, K11, K12, K13: sesuai usulan.
- K9: Getar tetap di Pengaturan (Q10).
- K10: kata Pendamping dengan `ANALYZE_API=v1` → catatan "Penilaian kata ini belum tersedia di server demo."; tidak ada hasil tiruan tanpa label.
- Dependensi: `expo-image-picker` boleh dipasang di FL-8.

Masih terbuka (urusan BE, tidak menghalangi FE): ejaan field hasil, `instruction_source`, id suku kata bawaan, tabel `custom_*` + bucket, batas video, dan apakah ada `flow-srs-ui.md` rev. 9.

## Baseline (sebelum langkah apa pun)

| Perintah (di `app/`) | Hasil |
|---|---|
| `npm test` (jest) | **28 suite, 296 tes, semua lulus.** Tidak ada tes yang merah sejak awal |
| `npm run typecheck` (`tsc --noEmit`) | **Lulus, tanpa galat** |
| `git status` | Hanya dua berkas belum dilacak: `docs/flow-srs-ui.md`, `docs/kontrak-fe-final.md` (dokumen acuan baru, belum dikomit) |

Yang **benar-benar sudah ada** menurut `git log` (bukan asumsi): UI-1 … UI-10, UI-11 (audit), **UI-12A (Playfair Display) dan UI-12B (cincin fokus)**, ditambah lima komit perbaikan pasca-audit (ikon/splash gelap, skala teks lebih kecil, judul practice, Pengaturan bisa dibuka dari Tentang, urutan home).
Catatan: `docs/PROGRESS.md` baris 469–472 masih menulis "Playfair dan cincin fokus tidak dikerjakan" dan "typecheck masih gagal". Dua kalimat itu **usang**: komit `1ed3a5a`, `b529864` ada, typecheck lulus. Perbaiki di FL-10.

---

## a. Ringkasan pemahaman (kata-kata saya)

**Produk berubah dari "misi harian bertingkat 0–4" menjadi "tiga level, dipilih lewat kata, dengan area Pendamping berakun".**

1. **Siapa memakai apa.** Pendamping (orang tua/guru) mendaftar akun sekali di HP pengguna Tuli, membuat PIN 4 angka, lalu pengguna Tuli berlatih tanpa pernah masuk lagi. Area Pendamping dan Pengaturan tertutup PIN. PIN hanya pengunci tampilan, bukan keamanan.
2. **Tiga level.** L1 = bunyi vokal (a, i, u, o, "A panjang", "Pelan ke keras"; materi tim saja). L3 = kata. L2 = suku kata, **selalu anak dari satu kata**, tidak pernah berdiri sendiri. Pengguna selalu memilih kata dulu, lalu Jalur kata menampilkan "Level 2 · Suku kata" (bila ada) dan "Level 3 · Kata". Tidak ada kunci level, tidak ada syarat lulus, tidak ada misi harian.
3. **Materi bawaan vs Pendamping.** `source: 'default' | 'custom'`. Kata bawaan hanya-baca. Pendamping bisa menambah/mengubah/menghapus kata + 0–6 suku kata; tiap blok wajib teks, satu video, dan instruksi pelafalan (ketik sendiri atau "Buat dengan AI"; AI hanya mengusulkan teks, tidak pernah menyimpan otomatis).
4. **Hasil.** Dua indikator, Bibir dan Suara. L1: tiga status (Sesuai / Mendekati / Belum sesuai) + grafik (segitiga vokal, cermin bibir, kekerasan). L2–L3: dua status (Sesuai / Belum sesuai), tanpa grafik. Umpan balik = satu kalimat per indikator yang tidak Sesuai, maksimal dua, Bibir dulu; kalimat dari BE. Tanpa teks hasil pengenalan kata. `retry` = pesan + "Rekam ulang", tidak dicatat.
5. **Navigasi.** Bar bawah tetap tiga tab: Latihan, Pendamping, Pengaturan. Bar disembunyikan **hanya** di sesi latihan (Lihat → Tiru → Kirim → Bandingkan), yang punya tombol "Keluar latihan" + dialog bila sedang merekam/mengirim. Tekan-lama rahasia dihapus.
6. **Kontrak data.** Kontrak FE final menang atas kontrak BE v2 dan atas `flow-srs-ui.md` §8 bila berbeda: status `sesuai | mendekati | belum_sesuai`, field `lip_result / voice_result / lip_feedback / voice_feedback`, `visuals` hanya L1, katalog `level_1 + words`, detail kata `level_2 + level_3`, masuk **dengan email saja** (username = `display_name`, tidak unik), satu video per blok (`videos[0]`). Supabase SDK untuk auth/CRUD/Storage/progres; FastAPI v2 untuk katalog, analisis, instruksi AI. `EXPO_PUBLIC_USE_MOCK=true` membuat seluruh alur jalan dengan data tiruan.
7. **Tampilan** tetap design.md v6 (Hutan Malam), kecuali sketsa home (§6.2.1) dan Hasil (§6.2.3) yang digantikan flow §5.3 dan §6.

---

## b. Peta berkas

Nama berkas/rute dalam bahasa Inggris (CLAUDE.md "Konvensi"); judul layar dalam bahasa Indonesia. Usulan ini **mengubah nama rute di flow §4** (`/auth/masuk`, `latihan/…`) karena alasan konvensi dan karena mempertahankan URL lama mengurangi tautan yang pecah.

### Rute

| Sekarang | Sesudah | Catatan |
|---|---|---|
| `app/_layout.tsx` (Stack) | tetap Stack akar; tambah `(tabs)`, `auth/*`; hapus `home`, `companion`, `settings` dari daftar Stack | Provider tetap |
| `app/index.tsx` | gerbang: belum ada sesi → `/auth/sign-in`; belum PIN → `/auth/create-pin`; belum onboarding → `/onboarding`; selain itu `/home` | Selama FL-7 belum ada: perilaku lama |
| `app/home.tsx` | **pindah** ke `app/(tabs)/home/index.tsx` (Beranda dua kartu) | URL `/home` tetap, jadi `calibration.tsx` dan `index.tsx` tidak perlu diubah |
| — | `app/(tabs)/_layout.tsx` (Tabs + `tabBar` = `BottomBar`) | baru |
| — | `app/(tabs)/home/_layout.tsx` (Stack), `level-1.tsx`, `words/index.tsx`, `words/[wordId].tsx` | baru |
| `app/practice/[itemId].tsx` | **tetap di Stack akar** (di luar tabs) | Bar otomatis tersembunyi karena layar menutupi navigator tab (pola resmi expo-router: tabs bersarang di dalam Stack akar). Lebih sederhana dan lebih aman daripada menyembunyikan bar secara dinamis |
| `app/companion.tsx` | pindah ke `app/(tabs)/companion/index.tsx`; FL-2 memakai layar lama apa adanya; FL-8 menggantinya dengan daftar kata | URL `/companion` tetap |
| — | `app/(tabs)/companion/words/new.tsx`, `words/[wordId]/edit.tsx` | FL-8 |
| `app/settings.tsx` | pindah ke `app/(tabs)/settings/index.tsx`; `change-pin.tsx` baru | URL `/settings` tetap |
| `app/onboarding.tsx` | langkah PIN dibuang (PIN pindah ke `auth/create-pin`); tinggal 2 langkah | FL-6 |
| — | `app/auth/sign-in.tsx`, `sign-up.tsx`, `check-email.tsx`, `create-pin.tsx`, `forgot-pin.tsx` (S) | FL-6, FL-7 |
| `app/about.tsx`, `calibration.tsx`, `dataset/*`, `allosaurus`, `wav2vec2`, `combined` | tetap di Stack akar | `about` dapat tautan dari Beranda dan Pengaturan |

### Data dan state

| Sekarang | Sesudah |
|---|---|
| `src/api/client.ts` (v1, tanpa Bearer) | tetap untuk v1. Klien v2 baru `src/api/v2.ts` (fetch + Bearer + galat) — dipakai bila BE siap |
| `src/api/types.ts` (v1) | tambah bagian **v2** (tipe kontrak FE §4–§5). Tipe v1 tetap |
| `src/state/content.tsx` (`/v1/items`) | tetap untuk kesehatan server + kalibrasi; katalog baru lewat `src/data/catalog.ts` + `useCatalog` |
| — | `src/data/mappers.ts` (DTO → `PracticeItem`; v1 `AnalyzeResponse` → `AnalyzeResult` v2; `mendekati`→`belum_sesuai` di L2–L3; status v2 ↔ `hijau/kuning/merah` untuk penyimpanan) |
| — | `src/data/analyze.ts` (pilih v1 / v2 / mock), `src/data/words.ts`, `src/data/media.ts`, `src/data/progress.ts`, `src/auth/*`, `src/pin/pinStore.ts`, `src/mock/*` |
| `src/state/progression.ts`, `homeStats.ts`, `content/levels.ts` | **tidak dipanggil lagi dari UI**; dibiarkan (NAV-3 "logika boleh dibiarkan") agar tes lamanya tetap hijau. Hapus setelah submission |
| `src/user/storage.ts` (`cw.companionPin`) | diganti `src/pin/pinStore.ts` (`rw.companionPin:<uid>`, hitungan salah) |
| `src/data/supabase.ts` (login **anonim**) | jadi klien bersama; login anonim dimatikan saat FL-7 (lihat c/K3) |

### Komponen

| Tetap dipakai | Berubah | Baru | Tidak dipakai lagi di UI |
|---|---|---|---|
| `BigButton`, `Card`, `InfoNote`, `Screen`, `StepHeader`, `ProgressBar`, `CheckRow`, `UploadStatus`, `LipIllustration`, `StatusIcon`, `Title/Body`, `RecordPanel`, `ModelVideo` | `BottomBar` (dipakai sebagai `tabBar`), `StatusBadge` (tipe status v2), `ResultView` (per level), `LevelTile` (kartu Beranda), `ModelVideo` (menerima `PracticeItem`) | `TextField`, `PasswordField`, `Checkbox`, `FormBanner`, `Snackbar`, `ConfirmDialog`, `PinPad`, `PinDots`, `VideoField`, `SyllableRow`, `SourceChip` ("Bawaan"/"Dari Pendamping"), `FeedbackCard` | `HeroCard` (misi), `StatTile`, `ProgressRing` (boleh dipakai ulang untuk "x dari N"), `StageBadge`, `OptionGroup` (hanya companion lama) |

### Tes

Lihat bagian d.

---

## c. Konflik

### c.1 design.md v6 vs flow-srs-ui (tampilan) — usulan penyesuaian dokumen

| design.md | flow / kontrak | Usulan |
|---|---|---|
| §0 dan §6.2.1: tekan-lama "Misi hari ini" 2 detik **harus tetap ada** | NAV-4: dihapus, diganti tab Pengaturan | Ikuti flow. Ubah §0 dan §6.2.1 design.md |
| §6.2.1 sketsa home: `HeroCard` misi, 3 `StatTile`, `LevelTile` Level 0–4, daftar langkah | NAV-2/NAV-3: dua kartu, tanpa misi | Ganti sketsa §6.2.1 dengan dua kartu. `HeroCard` tidak dipakai lagi (atau dipakai untuk kartu "Level 2 dan 3 — Pilih kata"; keputusan tampilan, bukan logika) |
| §5.8 `LevelTile` Level 0–4, ikon per level | flow §10: "LevelTile untuk **tiga** kartu level" — bertentangan dengan NAV-2 "dua kartu" di dokumen yang sama | Pakai **dua** kartu (NAV-2 dan §5.3 lebih rinci). Perbaiki baris §10 flow |
| §5.7 StatTile/ProgressRing (misi) | tidak dipakai | Opsional: `ProgressRing` di kartu Beranda untuk "x dari N sesuai" |
| §5.9 BottomBar: Latihan, Pendamping, **Tentang**; hanya di `home`; Latihan aktif tidak berpindah | Latihan, Pendamping, **Pengaturan**; di semua layar tab | Ubah §5.9. Tentang dipindah: tautan di bawah Beranda **dan** di Pengaturan (privasi harus bisa dibaca tanpa PIN, lihat AUTH-1 tautan kebijakan) |
| §3.1/§5.3 tiga status di semua materi | dua status di L2–L3 | `StatusBadge` tetap mendukung tiga; `ResultView` memilih. Tambah satu kalimat di §5.3 |
| §6.1/§6.2.3 Hasil: satu petunjuk dari `hint_id`; mode `overall`/`hidden` | umpan balik per indikator (≤ 2); tidak ada mode `overall`/`hidden` | Ganti §6.2.3 dengan flow §6. Kartu umpan balik memakai pola `hero` yang sama |
| §6 tabel layar: `companion` (ringkasan mingguan, Uji Dengar, laporan) | Q11: dibuang, diganti CRUD kata | Ubah tabel §6 |
| §8 Getar: "bisa dimatikan" oleh pengguna | Getar ada di Pengaturan yang **dikunci PIN** | Lihat K9 |
| §11: "bentuk kapsul selain tombol dan bar bawah" dilarang | `SourceChip` | Chip memakai `radius.tile`, bukan kapsul |
| §9 lapisan kamera | `VideoField` merekam video Pendamping | Pakai kamera sistem dari pemilih video (tidak menyentuh `RecordPanel`) |

### c.2 Antar dokumen baru (kontrak FE menang, kecuali ditandai)

| Hal | flow-srs-ui | kontrak FE final | Dipakai |
|---|---|---|---|
| Versi | rev. 7 | "menyatukan … flow-srs-ui rev. 9" | Berkas yang ada adalah rev. 7. **Rico: apakah ada rev. 9 yang belum disalin?** |
| Jumlah keputusan | — | baris 4: "**lima** poin di bagian 1"; tabelnya **tujuh** | Anggap tujuh |
| Masuk | email **atau** username (§5.1, AUTH-1, §7.1.1, Q1) | **email saja**; username tidak unik | Email saja. Validator Masuk: email. Pesan: "Email atau kata sandi salah." Cek ketersediaan username (S) **dibuang** |
| Sumber | `'companion'` | `'custom'` | `'custom'` |
| Status | `'belum'` | `'belum_sesuai'` | `'belum_sesuai'` |
| Bentuk hasil | `feedback: string[]`, `vowelTriangle`, `lipImage` | `lip_feedback`, `voice_feedback`, `visuals` | kontrak |
| Material | `instructionText`, `videoUrl` | `instruction`, `videos: VideoRef[]`, signed URL | kontrak |
| L1 "a panjang", "pelan keras" | id `a_panjang`, `pelan_keras` | `l0_hold_a`, `l0_soft_loud` (ditampilkan sebagai L1) | kontrak; cocok dengan id v1 server |
| Cabang awal | §13: dari `ui-hutan-malam` | — | Cabang itu tidak ada; keadaan UI ada di `design`. `flow-v2` dibuat dari `design` |
| Env URL API | — | `EXPO_PUBLIC_API_BASE_URL` | Kode memakai `EXPO_PUBLIC_API_URL` (lihat K6) |
| Hapus kata tunda | §7.7.3 "Urungkan" 5 detik (S) | tidak disebut | Lewati |
| Galat AI 429 | §7.5.2 pesan + "Coba lagi" | §9: tombol AI **dinonaktifkan sementara** dengan alasan | kontrak §9 |

### c.3 Konflik non-tampilan — **perlu keputusan Rico**

| # | Kutipan | Masalah | Usulan saya |
|---|---|---|---|
| **K1** | CLAUDE.md: "Rekaman produk (bukan dataset) dihapus segera setelah dianalisis" · "Dataset rekaman … tidak pernah diunggah ke layanan cloud publik" · `about.tsx`: "Supabase menyimpan hasil dan progres, **tanpa video atau audio**." | Kontrak §6: video wajah Pendamping/orang lain **disimpan** di Supabase Storage | Bedakan "rekaman latihan" (tetap dihapus) dari "video contoh Pendamping" (materi, disimpan di bucket privat per akun, signed URL, dengan persetujuan Q12). Teks Tentang dan README **wajib** diubah sebelum submission; kalimat lama menjadi tidak benar bila FL-8 jalan dengan Supabase sungguhan |
| **K2** | flow §7.5.2 + Q22: teks dikirim ke layanan AI (kemungkinan Gemini) · CLAUDE.md "Stack" tidak menyebut LLM | Pihak ketiga baru menerima data pengguna (teks kata) | Boleh, dengan pengungkapan di formulir (sudah di flow) + catat di `THIRD_PARTY.md`, README, dan bagian penggunaan AI dokumen lomba. Kunci di BE saja |
| **K3** | `src/data/supabase.ts`: `signInAnonymously()` bila belum ada pengguna · kontrak §3: email + sandi | Dua model identitas. Bila FL-7 jalan, login anonim harus dimatikan, dan riwayat lama milik pengguna anonim tidak pindah ke akun | Matikan login anonim di FL-7; riwayat anonim lama di HP demo tidak dimigrasi (data uji). Butuh konfirmasi |
| **K4** | CLAUDE.md: "Kontrak API di SPEC §5 adalah sumber kebenaran" · `types.ts`: "Change only together with SPEC §5" · aturan 6: "Tanya dulu sebelum … mengubah kontrak API" | Kontrak FE final adalah kontrak baru yang tidak tercermin di SPEC §5 | Tambahkan tipe v2 **di samping** v1 (tidak mengubah v1). Tambah satu paragraf di SPEC §5: "v2 diatur `docs/kontrak-fe-final.md`". Rico setuju? |
| **K5** | kontrak §2: "`USE_MOCK=true` mengganti seluruh `src/api` dan `src/data` dengan `src/mock`" · prompt: "unggahan ke /v1/analyze … tidak boleh rusak" | Bila analisis ikut tiruan, demo tidak lagi menganalisis rekaman sungguhan. Server lokal **belum punya `/v2`** (dicek: hanya `server/app/api/v1`) | Dua sakelar: `EXPO_PUBLIC_USE_MOCK` (katalog, auth, CRUD, AI, progres) dan `EXPO_PUBLIC_ANALYZE_API = v1 \| v2 \| mock` (bawaan `v1`). Id materi bawaan tiruan dipilih **sama dengan id v1** (`l1_a`, `l0_hold_a`, `l2_ma`, `l3_mama` …) sehingga v1 bisa menilainya |
| **K6** | kontrak §2: `EXPO_PUBLIC_API_BASE_URL` | Kode, `.env.example`, README memakai `EXPO_PUBLIC_API_URL` | Tetap `EXPO_PUBLIC_API_URL`; ubah satu baris di kontrak FE |
| **K7** | flow §7.1.1: "Penyimpanan token sesi: butuh penyimpanan aman" | Kode sekarang menyimpan sesi Supabase di AsyncStorage (pola resmi Supabase untuk React Native). SecureStore punya batas ukuran nilai (dokumentasi Expo memperingatkan nilai besar; sesi Supabase biasanya besar) **[perlu dicek di dokumentasi resmi sebelum memutuskan]**. Penyimpanan terenkripsi = dependensi tambahan | MVP: tetap AsyncStorage (sudah ada, tanpa dependensi baru); tulis sebagai batasan |
| **K8** | SPEC §8.4: umpan balik dikurangi (`hidden`/`overall`), kunci materi, Uji Dengar, laporan mingguan, sesi menit | flow + kontrak §8: tanpa kunci, tanpa misi, `/companion` lama dibuang | UI berhenti memakai semuanya; logika dibiarkan, tidak dipanggil. README/MODEL_CARD jangan lagi menyebut fitur itu |
| **K9** | design.md §2.1: "Getar … bisa dimatikan" | Getar di Pengaturan yang dikunci PIN: pengguna Tuli tidak bisa mematikan getar sendiri | Tetap di Pengaturan (Q10), tetapi pertimbangkan Getar di luar PIN. Keputusan Rico |
| **K10** | Analisis kata Pendamping | v1 hanya bisa menilai id yang ada di `items.json` server. Kata Pendamping (`custom_word:*`, `TOLONG`) **tidak bisa dinilai** sampai `/v2` ada | Dengan `ANALYZE_API=v1`: tombol rekam kata Pendamping diganti catatan "Penilaian kata ini belum tersedia" **atau** hasil tiruan diberi label jelas "Hasil contoh, bukan analisis rekaman". Tidak boleh menampilkan hasil tiruan tanpa label (design §2.9 "Jujur") |
| **K11** | CLAUDE.md "Cakupan MVP: Level 0–3, … konsonan m, p, b" · `about.tsx`: "Materi mencakup vokal a, i, u dan konsonan m, p, b" | Struktur L1–L3 + kata Pendamping bebas | Ubah teks Tentang/README di FL-10 sesuai yang benar-benar jalan |
| **K12** | AUTH-6/Q5: Keluar → data lokal? | kontrak §3: `signOut()` lalu **hapus cache akun** | Ikuti kontrak; dialog menyebut "Riwayat latihan tetap tersimpan di akun." (hanya benar bila sinkron Supabase menyala) |
| **K13** | flow Q18: persetujuan privasi di Daftar | Akun berisi email = data pribadi baru | Ya, kotak centang + tautan ke Tentang |

### c.4 Aturan lama yang tidak lagi mengikat (dilaporkan, tidak diikuti)

- CLAUDE.md "Cakupan MVP Level 0–3 … Level 4 bonus" → tiga level baru.
- CLAUDE.md "Demo: … laptop server di Wi-Fi yang sama" tetap berlaku; v2/Supabase menambah ketergantungan internet.
- CLAUDE.md "Wav2Vec2 DITUNDA, jangan pasang torch" vs flow §3 "L2–L3: MediaPipe + Wav2Vec2 [BE]" → urusan BE, tidak disentuh.
- design.md §0 "Pertahankan testID dan accessibilityLabel" → dipertahankan **yang masih berlaku**; `mission`, `mission-start`, `mission-needs-help`, `stage-*`, `result-overall`, `result-hidden` hilang bersama fiturnya.
- design.md §6.2.1 "testID `calibration-banner`, `home-error`, `item-<id>`" → dipertahankan di Beranda/daftar baru.
- PROGRESS.md "Alur rekam sampai hasil berfungsi lebih penting" → tetap (aturan mundur).

---

## d. Tes yang akan pecah

| Tes | Langkah | Alasan | Tindakan |
|---|---|---|---|
| `home.test.tsx` (4 tes) | FL-3 | Misi, tombol Mode Pendamping/Tentang di kaki, tekan-lama, ubin Level 0–4 hilang | Tulis ulang untuk dua kartu + tautan Tentang + `calibration-banner` + `home-error` |
| `companion.test.tsx` (9 tes) | FL-8 (FL-2 hanya memindahkan berkas → ubah path impor) | Layar lama dibuang (Q11) | Hapus; ganti tes daftar/form kata |
| `ResultView.test.tsx` (≈12 tes) | FL-4 | Masukan berubah ke `AnalyzeResult` v2; mode `overall`/`hidden` hilang; petunjuk `hint_id` → umpan balik per indikator; Level 0 → L1 | Tulis ulang; pertahankan uji disclaimer, kata klinis, alternatif teks grafik, retry |
| `ModelVideo.test.tsx` | FL-4 | Masukan `Item` v1 → `PracticeItem` | Ubah fixture; uji fallback teks + "Coba lagi" (LAT-7) |
| `onboarding.test.tsx` (3 tes PIN) | FL-6 | Langkah PIN pindah ke `auth/create-pin` | Hapus 3 tes PIN; tambah tes `create-pin` |
| `demo.test.tsx` | FL-6 | Memalsukan `savePin` dari `user/storage` | Arahkan ke `pinStore` |
| `StatusBadge.test.tsx`, `haptics.test.ts` | FL-4 | Bila `Status` badge berganti ke `sesuai/mendekati/belum_sesuai` | Ubah nilai uji; perilaku sama |
| `about.test.tsx` | FL-10 | Bila teks batas/privasi diubah (K1, K11) | Sesuaikan teks |
| `calibration.test.tsx` | — | `router.replace('/home')` tetap sah karena URL `/home` dipertahankan | Tidak berubah (cek) |
| `progression.test.ts`, `homeStats.test.ts`, `content.test.ts` (`groupByLevel`) | — | Logika tidak dipanggil UI lagi tetapi tidak dihapus | Tetap hijau |
| `sync.test.ts`, `user.test.ts` | FL-7 | Bila login anonim dimatikan / `ensureUser` berubah | Sesuaikan uji `ensureUser` |

---

## e. Dependensi

Dicek di `app/package.json`:

| Paket | Status | Dipakai untuk |
|---|---|---|
| `@supabase/supabase-js` ^2.119 | **sudah terpasang** | Auth, CRUD, Storage, progres |
| `expo-secure-store` ~58.0.3 | **sudah terpasang** + plugin di `app.json` | PIN per akun |
| `expo-video` ~58.0.14 | **sudah terpasang** | Pemutar video (`ModelVideo`) dan pratinjau `VideoField` |
| `react-native-url-polyfill` | sudah terpasang | Supabase di RN |
| `@react-navigation/native` ^7 | sudah terpasang | `usePreventRemove` untuk dialog "Keluar latihan"/"Buang perubahan?" **[cek dokumentasi React Navigation 7 sebelum memakai]** |
| **`expo-image-picker`** | **BELUM terpasang — satu-satunya dependensi baru** | Pilih video dari galeri dan rekam video dengan kamera sistem (FL-8). Dokumentasi Expo SDK 58 (dicek lewat Context7): `launchImageLibraryAsync({ mediaTypes: ['videos'] })`, aset berisi `uri`, `fileSize`, `mimeType`; plugin `expo-image-picker` di `app.json`. Field `duration` aset dan opsi `videoMaxDuration` **belum saya lihat di dokumentasi**; periksa sebelum menulis validasi durasi. Pemasangan: `npx expo install expo-image-picker` |
| (opsional) penyimpanan sesi terenkripsi | tidak diusulkan | Lihat K7 |

**Pertanyaan untuk Rico**
1. Boleh memasang `expo-image-picker` (FL-8)? Tanpa itu, FL-8 hanya bisa dengan video tiruan.
2. Setuju dua sakelar `EXPO_PUBLIC_USE_MOCK` + `EXPO_PUBLIC_ANALYZE_API` (K5) dan nama `EXPO_PUBLIC_API_URL` tetap (K6)?
3. Ada `flow-srs-ui.md` rev. 9? Berkas di repo rev. 7.
4. K1, K3, K9, K10 di atas.
5. Tabel Supabase `custom_words`, `custom_syllables`, `custom_videos`, bucket `rekan-wicara-tutorials`: sudah ada di proyek Supabase? `docs/supabase/schema.sql` hanya punya `profiles`, `attempts`, `progress`, `listen_checks`.

---

## f. Yang belum bisa jalan tanpa BE, dan cara tiruannya

| Bagian | Butuh BE | Tiruan (`EXPO_PUBLIC_USE_MOCK=true`) |
|---|---|---|
| Katalog `GET /v2/catalog`, `GET /v2/words/{id}` | FastAPI v2 | `src/mock/catalog.json` (persis kontrak §4) + `src/mock/words/*.json`; kata Pendamping tiruan dibaca dari penyimpanan tiruan (AsyncStorage, kunci `rw.mock.customWords`) agar CRUD tiruan terlihat di Pilih kata |
| Analisis `POST /v2/analyze` | FastAPI v2 | `ANALYZE_API=v1`: unggah ke `/v1/analyze` (perilaku sekarang) + `mappers.fromV1()`; `ANALYZE_API=mock`: hasil tiruan berputar (sesuai / mendekati / belum / retry) dengan label "Hasil contoh" |
| Instruksi AI `POST /v2/instructions/generate` | FastAPI v2 + kunci LLM di BE | `src/mock/instructions.ts`: tunda 1,5 detik, teks templat; kata khusus memicu galat (`gagal` → 503, `banyak` → 429, `lambat` → timeout) agar semua keadaan bisa diuji |
| Auth (daftar, masuk, keluar, sesi) | Proyek Supabase dengan Email auth | `src/mock/auth.ts`: akun di AsyncStorage, sandi **tidak** disimpan (cukup terima apa pun yang lolos validator, kecuali `salah@contoh.id` → `INVALID_CREDENTIALS`); `uid = 'mock-user'` |
| CRUD kata + Storage | Tabel + bucket + RLS | `src/mock/words.ts` di AsyncStorage; video = `uri` lokal hasil pemilih (tidak diunggah); progres unggah disimulasikan |
| Progres (`attempts`, `progress`) | CHECK `overall` menerima `kuning` (kontrak §11) | Simpan lokal di profil yang ada (`profile.attempts`) — sudah ada sekarang |
| PIN | — (lokal) | Tidak perlu tiruan; SecureStore jalan di Expo Go |

Aturan: layar hanya mengimpor dari `src/data/*`, `src/auth/*`, `src/pin/*`; pemilihan tiruan/sungguhan hanya di satu berkas (`src/data/source.ts`). Mengganti `USE_MOCK=false` tidak menyentuh layar (kontrak §10).

---

## g. Risiko terbesar

1. **Waktu.** 12 langkah adalah pekerjaan beberapa hari, bukan satu malam. Jalur A (FL-D → FL-5 + FL-10) sudah cukup untuk alur Tuli lengkap; Pendamping (B/C) kemungkinan besar tidak selesai. Lebih baik alur Tuli jalan rapi daripada semua setengah jadi.
2. **Merusak alur rekam → hasil** di FL-4 (practice beralih dari `Item` v1 ke `PracticeItem` + adapter hasil). Mitigasi: FL-D menyiapkan adapter dengan tes dulu; FL-4 tidak menyentuh `RecordPanel`, `useUpload`, `localFile`.
3. **Klaim tidak jujur.** Hasil tiruan, kata Pendamping yang tidak bisa dinilai v1, teks privasi "tanpa video" (K1, K10). Mitigasi: label "Hasil contoh"; FL-10 memeriksa semua teks klaim.
4. **Struktur navigasi** (tabs bersarang): rute yang salah bisa membuat layar kosong di Expo Go yang tidak ditangkap jest. Mitigasi: URL `/home`, `/companion`, `/settings` dipertahankan; Rico cek di HP setelah FL-2.
5. **Typed routes.** `experiments.typedRoutes` aktif; rute baru membuat `tsc` gagal sampai `.expo/types/router.d.ts` dibuat ulang (`npx expo start` sekali). Pernah terjadi (PROGRESS.md). Setiap langkah yang menambah rute harus menjalankan `npx expo start` sekali sebelum `npm run typecheck`, atau mencatatnya.
6. **BE belum ada** (`/v2` tidak ada di server lokal). Semua langkah Pendamping/Auth hanya teruji dengan tiruan.
