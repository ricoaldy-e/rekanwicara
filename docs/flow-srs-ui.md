# Rekan Wicara — Flow & SRS UI (rev. 7, 13 Nov 2026 malam)

Pemilik dokumen: Rico (frontend). Backend/LLM/model: teman satu tim. Dokumen ini hanya mengatur **UI, alur layar, dan kontrak data yang UI butuhkan**. Tampilan visual tetap mengikuti `docs/design.md` v6 (Hutan Malam), kecuali yang disebut di bagian 10.

Penanda: **[TIM]** = diputuskan tim di brief. **[ASUMSI]** = tafsiran saya, perlu dikonfirmasi. **[BE]** = tanggung jawab teman (backend); UI hanya mengonsumsi.

---

## 0. Cara memakai dokumen ini

Untuk Claude Code: dokumen ini menggantikan alur produk lama (misi harian, Level 0–4) **untuk urusan alur dan isi layar**. Untuk tampilan, tetap `design.md`. Bila aturan lama di `CLAUDE.md`, `SPEC.md`, atau `PROGRESS.md` bertentangan dengan dokumen ini soal alur UI, dokumen ini menang, tetapi **laporkan** konfliknya. Konflik non-tampilan (privasi, klaim, etika, kontrak API) jangan diputuskan sendiri: tandai "perlu keputusan Rico".

---

## 1. Ringkasan perubahan terhadap versi sebelumnya

| Hal | Sebelum | Sesudah [TIM] |
|---|---|---|
| Struktur materi | Level 0–4 (bunyi, ekspresi, suku kata, kata, pasangan) | **Tiga level**: L1 vokal, L2 suku kata (anak dari kata L3), L3 kata |
| Misi harian | Ada (plan, langkah hari ini, StatTile) | **Dihapus untuk MVP** |
| Siapa mengatur isi | Tim saja | Tim (bawaan) + **Pendamping** (tambahan, CRUD) |
| Akses Pendamping | Tombol biasa | **Dilindungi PIN** |
| Autentikasi | Tidak ada | **Pendamping masuk/daftar** sebelum app dipakai |
| Status hasil | Sesuai / Mendekati / Belum sesuai di semua materi | **L1: Belum sesuai / Mendekati / Sesuai (tiga)**. **L2–L3: Belum sesuai / Sesuai (dua)** |
| Umpan balik | Satu petunjuk | **Umpan balik untuk setiap kesalahan**, tanpa teks hasil pengenalan kata |
| Grafik (segitiga vokal, gambar mulut) | Level lain ikut | **Hanya L1** |
| Pengaturan | Tersembunyi (tekan-lama 2 detik) | **Tab Pengaturan**: ganti PIN, keluar |
| Menu bawah | Ada di home | **Tetap terlihat** di semua layar utama |
| Teknologi | MediaPipe + Wav2Vec2 | L1: MediaPipe + Parselmouth. L2–L3: MediaPipe + Wav2Vec2 [BE] |

---

## 2. Peran

- **Pengguna Tuli**: berlatih. Tidak mengelola akun, tidak membuka area Pendamping.
- **Pendamping**: mendaftar/masuk, membuat PIN, menambah/mengubah/menghapus kata dan suku kata sendiri, mengganti PIN, keluar.

Layar autentikasi dan Pendamping ditulis untuk pembaca Pendamping (bahasa lugas). Layar latihan ditulis untuk pengguna Tuli (kalimat pendek, visual dulu, satu instruksi per layar, sesuai `design.md` §1).

---

## 3. Definisi level dan struktur materi

**Statis dan dinamis [TIM]**
- **Statis** = materi bawaan dari tim developer. Tidak bisa diubah atau dihapus oleh siapa pun di app.
- **Dinamis** = materi yang dibuat Pendamping. Bisa ditambah, diubah, dihapus (CRUD) lewat area Pendamping (dilindungi PIN).
- Di data cukup `source: 'default' | 'companion'` (§8). Tidak ada lagi arti "statis = bentuk mulut ditahan".

**Hubungan kata dan suku kata [TIM]**
- Kata (L3) adalah induk. Suku kata (L2) adalah anak dari satu kata.
- Pendamping membuat **kata dulu**, lalu **opsional** menambah suku kata untuk kata itu. Jumlah dibatasi: `MAX_SYLLABLES = 6` (usulan; satu konstanta di config, mudah diubah).
- Tidak ada suku kata yang berdiri sendiri tanpa kata. Bawaan: "ma", "pa" ada sebagai suku kata dari "mama" dan "papa".
- Kata tanpa suku kata: pengguna langsung ke L3.

| Level | Isi | Mesin [BE] | Materi | Respons |
|---|---|---|---|---|
| **L1 Vokal** | a, i, u, o; "a panjang"; suara pelan ke keras | MediaPipe + Parselmouth | Statis saja, terbatas. Video + teks dari tim | **Tiga status** + umpan balik + **segitiga vokal + gambar mulut** |
| **L2 Suku kata** | Suku kata milik sebuah kata: bawaan (ma, pa) atau dari Pendamping | MediaPipe + Wav2Vec2 | Statis (video + teks tim) atau dinamis (video + teks Pendamping) | **Dua status** + umpan balik. Tanpa grafik |
| **L3 Kata** | Kata lengkap: mama, papa, kata terlatih tim, kata Pendamping | MediaPipe + Wav2Vec2 | Sama seperti L2 | **Dua status** + umpan balik. Tanpa grafik |

## 4. Peta layar dan navigasi

Navigasi memakai bar bawah **tetap** (§5.2). Tiga tab:

```
[ Latihan ]   [ Pendamping ]   [ Pengaturan ]
```

Rute (usulan, expo-router; nama bisa disesuaikan dengan struktur yang ada):

```
/auth/masuk                   Masuk Pendamping
/auth/daftar                  Daftar Pendamping
/auth/buat-pin                Buat PIN (pertama kali)
/onboarding                   (yang sudah ada, setelah PIN)
/calibration                  (yang sudah ada)

(tabs)
 ├─ latihan/                 TAB 1 — stack sendiri; bar terlihat di semua layarnya KECUALI sesi latihan
 │   ├─ index                 Beranda: kartu Level 1 dan kartu "Level 2 dan 3 — Pilih kata"
 │   ├─ level-1               Daftar bunyi L1
 │   ├─ kata                  Pilih kata (langkah pertama untuk L2 dan L3)
 │   ├─ kata/[wordId]         Jalur kata: Level 2 (suku kata) → Level 3 (kata)
 │   └─ latihan/[itemId]      Lihat → Tiru → Kirim → Bandingkan
 ├─ pendamping/               TAB 2 — dikunci PIN
 │   ├─ pin                   Gerbang PIN
 │   ├─ index                 Daftar kata saya + kata bawaan (terkunci)
 │   ├─ kata/baru             Formulir kata baru
 │   └─ kata/[wordId]/ubah    Formulir ubah
 └─ pengaturan/               TAB 3 — dikunci PIN
     ├─ index                 Ganti PIN, Keluar
     └─ ganti-pin
```

Layar pengembang yang sudah ada (dataset, allosaurus, wav2vec2, combined) tetap hanya muncul bila `DATASET_MODE`, tidak masuk bar.

---

## 5. Alur utama

### 5.1 Pertama kali membuka app

```
Splash (§9)
  → belum ada sesi?  → Masuk Pendamping ── belum punya akun ──> Daftar
                                        └─ berhasil ──────────> Buat PIN (pertama kali saja)
  → onboarding (ada)  → kalibrasi (ada)  → Beranda Latihan
  → sudah ada sesi    → Beranda Latihan
```

Catatan [ASUMSI]: "autentikasi dari pendamping" = Pendamping mendaftarkan akun di perangkat pengguna Tuli sekali, lalu pengguna Tuli memakai app tanpa masuk lagi. Daftar memakai username, email, dan kata sandi; masuk memakai email atau username + kata sandi [TIM]. Validasi klien: §7.1.1.

### 5.2 Menu bawah tetap [TIM]

- Terlihat di semua layar di dalam tiga tab, **kecuali sesi latihan** (lihat bawah).
- **Pengecualian [TIM]: bar disembunyikan di sesi latihan** (`latihan/[itemId]`, semua tahap: Lihat, Tiru, Kirim, Bandingkan). Sesi latihan layar penuh, fokus satu tugas. Bar muncul lagi di Jalur kata, daftar, dan Beranda.
- Tab Pendamping dan Pengaturan memunculkan gerbang PIN (§5.5).
- Detail visual: `design.md` §5.9 (kapsul, label selalu terlihat, 3 item).

### 5.3 Pengguna Tuli berlatih

**Pilih kata dulu, lalu suku kata, lalu kata [TIM]**

```
Beranda Latihan
 ├─ Kartu "Level 1 — Bunyi vokal"       ──> Daftar bunyi L1 ──> Latihan[bunyi]
 └─ Kartu "Level 2 dan 3 — Pilih kata"  ──> PILIH KATA ──> Jalur kata
```

```
PILIH KATA  (daftar: bawaan + dari Pendamping)
   │  pengguna memilih satu kata, mis. "mama"
   ▼
JALUR KATA "mama"
   ├─ kata punya suku kata?
   │     ya  → LEVEL 2: suku kata dari kata itu muncul (ma · ma)
   │           → latih satu per satu
   │           → LEVEL 3: kata yang dipilih ("mama") jadi latihan
   └─     tidak → langsung LEVEL 3: "mama"
```

Aturan:
- Pemilihan kata selalu **langkah pertama**. Suku kata tidak bisa dibuka lepas dari kata; tidak ada daftar suku kata tersendiri.
- Level 3 selalu memakai **kata yang sama** dengan yang dipilih untuk Level 2.
- Jalur kata menampilkan dua bagian berlabel jelas: "Level 2 · Suku kata" (kartu per suku kata dengan status) dan "Level 3 · Kata" (satu kartu). Langkah berikutnya diberi penanda "Berikutnya". Urutan disarankan, **tidak dikunci** (Q6): pengguna boleh langsung ke Level 3.
- Kata tanpa suku kata: bagian Level 2 tidak ditampilkan.
- Progres dicatat per latihan (suku kata atau kata) dan per level; ringkasan di kartu kata: "Level 2: 1 dari 2 sesuai · Level 3: belum".
- Beranda memakai **dua kartu**, bukan tiga, karena Level 2 dan 3 hanya bisa dimasuki lewat kata. Bila tim tetap ingin tiga kartu, kartu Level 2 dan Level 3 cukup membuka Pilih kata yang sama.

Tahap per latihan tetap: **Lihat** (video + teks instruksi) → **Tiru** (rekam) → **Kirim** → **Bandingkan** (hasil). Logika tidak diubah.

### 5.4 Hasil

Lihat §6.

### 5.5 Gerbang PIN Pendamping [TIM]

```
Tap tab Pendamping/Pengaturan
  → sesi Pendamping sedang terbuka?  ya → langsung masuk
  → tidak → layar PIN (papan angka)
        benar → masuk, sesi terbuka
        salah → pesan + hitung percobaan; setelah N kali salah → kunci sementara
```

- Sesi Pendamping berakhir saat: pengguna kembali ke tab Latihan, app masuk latar belakang, atau diam lebih dari T menit. **N dan T = Q4.**
- PIN untuk menutup akses pengguna Tuli ke area kelola, bukan sistem keamanan kuat. Jangan klaim sebaliknya di UI/README.
- Lupa PIN: butuh jalur pemulihan (Q3).

---

## 6. Tampilan hasil per level [TIM]

| Status | Dipakai di | Bentuk | Warna |
|---|---|---|---|
| **Sesuai** | L1, L2, L3 | lingkaran + centang | hijau (`success`) |
| **Mendekati** | **hanya L1** | segitiga + tanda ≈ | kuning (`#F2C14E`) |
| **Belum sesuai** | L1, L2, L3 | persegi + panah memutar | merah muda (`danger`) |

Tanpa skor angka. **Tanpa teks hasil pengenalan** ("kamu mengucapkan ...").

`StatusBadge` tetap mendukung tiga status. Di L2–L3 nilai "mendekati" tidak boleh muncul; bila BE terlanjur mengirimnya, UI memetakannya ke "Belum sesuai" dan mencatat peringatan di mode pengembang.

```
L1                                  L2 / L3
┌───────────────────────┐           ┌───────────────────────┐
│ Kartu target          │           │ Kata/suku kata target │
│  (gambar mulut + "a") │           │  (teks besar)         │
├───────────────────────┤           ├───────────────────────┤
│ [Bibir: 3 status]     │           │ [Bibir: 2 status]     │
│ [Suara: 3 status]     │           │ [Suara: 2 status]     │
├───────────────────────┤           ├───────────────────────┤
│ Umpan balik (per      │           │ Umpan balik (per      │
│ kesalahan)            │           │ kesalahan)            │
├───────────────────────┤           ├───────────────────────┤
│ Segitiga vokal        │           │ (tidak ada grafik)    │
│ Gambar mulut pengguna │           │                       │
├───────────────────────┤           ├───────────────────────┤
│ Disclaimer            │           │ Disclaimer            │
└───────────────────────┘           └───────────────────────┘
 [Ulangi] [Lihat contoh] [Selesai]   [Ulangi] [Lihat contoh] [Selesai]
```

Aturan umpan balik:
- Setiap indikator yang **Belum sesuai** (semua level) atau **Mendekati** (L1) mendapat satu kalimat. Indikator **Sesuai** tidak mendapat kalimat.
- Maksimum dua kalimat, urut Bibir lalu Suara. Kalimat dari BE; UI hanya menampilkan.
- Kalau keduanya Sesuai, kartu umpan balik tidak dirender (Q8).
- Kata terlarang di teks UI: "normal", "abnormal", "gangguan", "diagnosis", "terapi", "penderita", "tunarungu".
- Disclaimer persis: "Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis."

## 7. Kebutuhan fungsional UI (SRS)

Format: ID — kebutuhan — kriteria penerimaan. Prioritas: **M** wajib MVP, **S** sebaiknya.

### 7.1 Autentikasi dan PIN
| ID | Kebutuhan | Kriteria | P |
|---|---|---|---|
| AUTH-1 | Layar Masuk dan Daftar Pendamping | Daftar: username, email, sandi, ulangi sandi. Masuk: email atau username + sandi. Validasi §7.1.1. Tombol tetap aktif; kolom yang salah ditandai saat dikirim | M |
| AUTH-2 | Sesi tersimpan | Setelah masuk, app berikutnya langsung ke Beranda | M |
| AUTH-3 | Buat PIN pertama kali | Papan angka khusus, dua langkah (buat → ulangi), tolak PIN mudah ditebak. Rinci di §7.7.2 | M |
| AUTH-4 | Gerbang PIN untuk tab Pendamping dan Pengaturan | §5.5 dan §7.7.2: masuk otomatis di digit terakhir, sisa percobaan terlihat, hitung mundur saat terkunci | M |
| AUTH-5 | Ganti PIN | PIN lama → PIN baru → ulangi; PIN baru harus berbeda dari lama; konfirmasi berhasil (§7.7.2) | M |
| AUTH-6 | Keluar | Dialog konfirmasi menyebut bahwa data lokal terhapus/tetap (Q5); setelah keluar kembali ke Masuk | M |
| AUTH-7 | Pemulihan PIN | Jalur "Lupa PIN" (Q3) | S |

**7.1.1 Validasi klien (Masuk dan Daftar)**

Aturan hidup di satu modul murni `src/forms/validators/auth.ts` dengan tes jest. Server tetap memvalidasi ulang [BE].

| Kolom | Aturan | Pesan (Indonesia) |
|---|---|---|
| Username | dipangkas spasi ujung; 3–20 karakter; diawali huruf; hanya huruf, angka, `.`, `_`; regex `^[A-Za-z][A-Za-z0-9._]{2,19}$` | kosong: "Isi username." · pendek: "Username minimal 3 karakter." · panjang: "Username maksimal 20 karakter." · awal: "Username harus diawali huruf." · karakter: "Gunakan huruf, angka, titik, atau garis bawah." |
| Email | dipangkas, diubah ke huruf kecil; maks 254; bentuk `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` (UI hanya cek bentuk) | kosong: "Isi email." · salah: "Email belum benar. Contoh: nama@email.com" |
| Kata sandi (Daftar) | 8–64 karakter; minimal satu huruf dan satu angka; tidak sama dengan username atau email; tidak berspasi di ujung | kosong: "Isi kata sandi." · pendek: "Kata sandi minimal 8 karakter." · panjang: "Kata sandi maksimal 64 karakter." · komposisi: "Kata sandi harus ada huruf dan angka." · sama: "Kata sandi tidak boleh sama dengan username atau email." |
| Ulangi sandi (Daftar) | sama persis | "Kata sandi tidak sama." |
| Masuk | identitas tidak kosong (berformat email bila ada `@`, selain itu berformat username); sandi tidak kosong. Aturan kekuatan sandi TIDAK dicek di Masuk | "Isi email atau username." · "Isi kata sandi." |

Perilaku:
- Validasi saat kolom ditinggalkan (setelah pernah disentuh) dan saat dikirim. Saat mengetik, hanya menghapus error yang sudah teratasi.
- Saat dikirim dan ada error: fokus ke kolom pertama yang salah dan umumkan ke pembaca layar ("Ada 2 isian yang perlu diperbaiki").
- Error = ikon + teks di bawah kolom + garis `danger`; tidak mengandalkan warna saja. Teks error mengikuti skala teks sistem.
- Tombol "Tampilkan sandi" berlabel dan berstatus (`accessibilityState`), bukan ikon mata tanpa nama.
- Atribut kolom: `autoComplete` (`username`, `email`, `new-password`, `current-password`), `textContentType`, `autoCapitalize="none"`, `returnKeyType="next"`; sandi `secureTextEntry`. Area sentuh ≥ 48 dp.
- Kirim: tombol menampilkan keadaan memuat dan mencegah kirim ganda.
- Galat server: `INVALID_CREDENTIALS` → pesan umum satu baris "Email/username atau kata sandi salah." (tidak menyebut mana yang salah). `USERNAME_TAKEN`/`EMAIL_TAKEN` → pesan di kolom terkait. `NETWORK` → banner + "Coba lagi".
- Kata sandi tidak masuk log, tidak masuk state yang disimpan, dan tidak ditampilkan di pesan. Penyimpanan token sesi: butuh penyimpanan aman; bila perlu dependensi baru (mis. `expo-secure-store`), **tanya Rico dulu**.

Tambahan Daftar (pola umum di §7.7):
- **Daftar periksa kata sandi** langsung di bawah kolom, diperbarui saat mengetik: "8 karakter atau lebih", "Ada huruf", "Ada angka". Tiap baris ikon (lingkaran kosong / centang) + teks, bukan warna saja. Ini panduan, bukan "ukuran kekuatan"; tidak ada klaim "sandi kuat".
- **Ketersediaan username** (S): saat kolom ditinggalkan dan formatnya valid, cek ke server; hasil "Username tersedia" (ikon + teks) atau "Username sudah dipakai." Bila gagal terhubung, diam saja dan biarkan server memutuskan saat kirim. Butuh endpoint [BE].
- **Persetujuan privasi** (usulan, Q18): kotak centang "Saya setuju dengan kebijakan privasi." berisi tautan ke layar kebijakan (di Tentang). Tanpa centang: "Centang persetujuan untuk melanjutkan."
- Setelah Daftar berhasil: langsung masuk, lalu Buat PIN.

### 7.2 Beranda dan navigasi
| ID | Kebutuhan | Kriteria | P |
|---|---|---|---|
| NAV-1 | Bar bawah tetap | Terlihat di semua layar dalam tiga tab, kecuali sesi latihan (§5.2). Di sesi latihan tersedia tombol kembali di header (NAV-6) | M |
| NAV-2 | Beranda = dua kartu | Kartu "Level 1 — Bunyi vokal" dan "Level 2 dan 3 — Pilih kata"; tiap kartu: ikon, nama, ringkasan progres "x dari N sesuai"; target sentuh ≥ 48 dp | M |
| NAV-3 | Tanpa misi harian | Hapus HeroCard misi, StatTile "langkah hari ini", `planSession` dari UI. Logika boleh dibiarkan bila tidak dipanggil | M |
| NAV-4 | Pengaturan tidak lagi tersembunyi | Hapus tekan-lama 2 detik; ganti dengan tab Pengaturan | M |
| NAV-5 | Kunci level | Aturan buka/kunci level = Q6. Bila ada kunci: ikon gembok + "Terkunci" + syarat satu kalimat | M |
| NAV-6 | Keluar dari sesi latihan | Header sesi: tombol kembali berlabel "Keluar latihan" (target ≥ 48 dp). Saat tahap Tiru/Kirim sedang berjalan, menekannya memunculkan dialog "Keluar dari latihan? Rekaman ini tidak disimpan." (Keluar / Lanjut). Di tahap Lihat dan Bandingkan keluar langsung. Tombol kembali sistem Android berperilaku sama | M |

### 7.3 Latihan
| ID | Kebutuhan | Kriteria | P |
|---|---|---|---|
| LAT-1 | Daftar bunyi L1 | Kartu per bunyi (a, i, u, o, a panjang, pelan→keras) dengan status terakhir | M |
| LAT-2 | Pilih kata | Semua kata dalam satu daftar, tiap kata berlabel "Bawaan" atau "Dari Pendamping" (ikon + teks) dan ringkasan progres. Tidak ada filter berdasarkan level. Daftar kosong untuk Pendamping disembunyikan | M |
| LAT-3 | Jalur kata | §5.3: bagian "Level 2 · Suku kata" (bila ada) lalu "Level 3 · Kata" (kata yang dipilih); status tiap latihan; penanda "Berikutnya"; tidak dikunci | M |
| LAT-4 | Tahap Lihat | Video + teks instruksi pelafalan; sumber (tim/Pendamping) tidak perlu dibedakan di layar | M |
| LAT-5 | Label sumber di Lihat | Chip kecil berteks "Bawaan" atau "Dari Pendamping"; video dan teks sumbernya disajikan sama | S |
| LAT-6 | Tahap Tiru/Kirim/Bandingkan | Tidak berubah dari yang ada, kecuali §6 | M |
| LAT-7 | Video gagal dimuat | Tampilkan teks instruksi saja + tombol "Coba lagi"; latihan tetap bisa jalan | M |

### 7.4 Hasil
| ID | Kebutuhan | Kriteria | P |
|---|---|---|---|
| HAS-1 | Status per level | L1 tiga status (termasuk Mendekati), L2–L3 dua status; `StatusBadge` menerima daftar status yang dipakai. Tes diperbarui | M |
| HAS-2 | Segitiga vokal dan gambar mulut hanya L1 | Komponen grafik tidak dirender di L2/L3 | M |
| HAS-3 | Umpan balik per kesalahan | §6; maks. dua kalimat | M |
| HAS-4 | Tanpa teks hasil pengenalan | Tidak ada elemen UI yang menampilkan kata hasil ASR | M |

### 7.5 Pendamping (CRUD)
| ID | Kebutuhan | Kriteria | P |
|---|---|---|---|
| PEN-1 | Daftar kata | "Kata saya" (bisa diubah/dihapus) dan "Kata bawaan" (ikon gembok, label "Bawaan", tanpa tombol ubah/hapus) | M |
| PEN-2 | Tambah kata | Formulir §7.5.1 | M |
| PEN-3 | Ubah kata | Formulir sama, terisi awal | M |
| PEN-4 | Hapus kata | Dialog konfirmasi menyebut nama kata dan bahwa suku katanya ikut terhapus; tidak ada hapus permanen tanpa konfirmasi | M |
| PEN-5 | Kata bawaan read-only | Tidak ada jalur UI untuk mengubah/menghapus; BE juga menolak [BE] | M |
| PEN-6 | Dampak ke progres | Bila kata dihapus, riwayat latihan kata itu: disembunyikan atau dihapus (Q7) | S |
| PEN-7 | Instruksi dengan AI | §7.5.2; bisa diisi AI lalu diedit, atau ditulis sendiri dari awal | M |
| PEN-8 | Kelengkapan | Tambah dan Ubah sama-sama mewajibkan teks, video, dan instruksi untuk kata dan tiap suku kata yang ada. Menghapus video tanpa menggantinya tidak membuat formulir valid | M |
| PEN-9 | Sumber instruksi | `instructionSource` ikut disimpan | S |

**7.5.1 Formulir kata**

Tiap blok (kata lengkap, dan tiap suku kata) punya **tiga bagian wajib**: teks (kata/suku kata), video, dan instruksi (dibuat dengan AI atau ditulis sendiri). Aturan ini sama untuk Tambah dan Ubah.

```
KATA
 Kata lengkap              [ text ]
 Video contoh              [ pilih/rekam ]  pratinjau
 Instruksi pelafalan       [ Buat dengan AI ]   ← mengisi kolom di bawah
                           [ textarea ]

SUKU KATA (opsional)       [ + Tambah suku kata ]  ← maksimal MAX_SYLLABLES (6)
 Suku kata 1               [ text ]            [Naik][Turun][Hapus]
   Video contoh            [ pilih/rekam ]  pratinjau
   Instruksi pelafalan     [ Buat dengan AI ]
                           [ textarea ]
 Suku kata 2 ...

 [ ] Persetujuan video
 [ Simpan ]  [ Batal ]
```

Pendamping boleh **mengetik instruksi sendiri dari awal**, atau menekan "Buat dengan AI" lalu mengedit hasilnya. Detail AI: §7.5.2.

- Semua isian wajib kecuali yang tertulis "(opsional)" [TIM #4]. Tanda `*` di sketsa hanya penanda di dokumen ini; di UI wajib tidak diberi tanda, opsional diberi teks "(opsional)". Aturan tiap kolom: §7.7.3.
- Pola validasi, pesan, dan keadaan kolom: §7.7 (berlaku untuk semua formulir).
- Batas ukuran/durasi video, format, dan unggah: [BE] menentukan; UI menampilkan progres unggah dan error yang bisa diulang.
- Jangan simpan setengah jadi: tombol Simpan aktif hanya bila semua wajib terisi; keluar dengan isian belum disimpan → dialog "Buang perubahan?".

**7.5.2 Instruksi dengan AI**

Prinsip: AI hanya **mengusulkan teks**. Pendamping selalu meninjau dan memutuskan. Hasil AI tidak pernah tersimpan otomatis; baru tersimpan saat Pendamping menekan Simpan.

| Aspek | Aturan |
|---|---|
| Tombol | Secondary berikon + teks "Buat dengan AI", satu per blok (kata dan tiap suku kata). Satu tekan mengisi kolom **instruksi pelafalan** |
| Syarat | Teks kata/suku kata harus valid (§7.7.3). Bila kosong/salah: tombol tetap aktif, lalu error di kolom teks "Isi kata dulu untuk membuat instruksi." dan fokus pindah ke sana. Untuk suku kata, kata induk ikut dikirim sebagai konteks (mis. "ma" pada "mama") |
| Pengungkapan data | Teks bantu di bawah tombol: "Kata yang kamu tulis dikirim ke layanan AI untuk membuat instruksi. Video tidak dikirim." Hanya teks yang dikirim [BE harus menjamin] |
| Sudah ada isi | Dialog "Ganti instruksi yang sudah ditulis?" (Ganti / Batal). Setelah diganti, tautan "Kembalikan teks sebelumnya" tersedia selama formulir terbuka (satu tingkat) |
| Memuat | Tombol berubah "Membuat instruksi…" dengan indikator, kolom instruksi sementara baca-saja, tombol "Batal". Pembaca layar diberi tahu "Sedang membuat instruksi" |
| Berhasil | Kolom terisi, fokus pindah ke kolom itu, pengumuman "Instruksi terisi. Periksa sebelum menyimpan." Tombol berubah menjadi "Buat ulang" |
| Label | Selama teks belum diedit: baris kecil ikon + teks "Dibuat dengan AI. Periksa dan ubah bila perlu." Setelah Pendamping mengedit, label hilang (menjadi tulisan Pendamping) |
| Gagal | Pesan di bawah tombol, ikon + teks: "Instruksi belum bisa dibuat. Tulis sendiri atau coba lagi." + tombol "Coba lagi". Batas waktu 20 detik. Tanpa koneksi: "Tidak ada koneksi. Tulis sendiri atau coba lagi nanti." Terlalu sering: "Terlalu banyak permintaan. Coba lagi sebentar lagi." Isian lain tidak terganggu |
| Validasi hasil | Hasil melewati aturan kolom biasa (10–500 karakter). Bila melebihi, error biasa muncul dan Pendamping memperbaiki |
| Peringatan | Satu kalimat tetap di formulir: "Instruksi dari AI bisa keliru dan bukan saran klinis. Periksa sebelum menyimpan." |
| Mode Ubah | Tombol tersedia juga di Ubah. Kata bawaan tidak punya formulir sehingga tidak ada tombol AI |
| Sumber instruksi | Dicatat per materi: `ai` (belum diedit), `ai_edited`, `manual`. Dikirim ke BE saat Simpan |
| Tampilan ke pengguna Tuli | Bila `instructionSource = 'ai'` (belum diedit), tahap Lihat menampilkan satu baris kecil "Instruksi dibuat dengan bantuan AI" (Q21) |
| Etika | Penggunaan AI untuk membuat instruksi dicatat di dokumentasi lomba (bagian penggunaan AI) |

### 7.6 Pengaturan
| ID | Kebutuhan | Kriteria | P |
|---|---|---|---|
| SET-1 | Hanya Ganti PIN dan Keluar [TIM #11] | Sakelar Getar/Reduce Motion dari `design.md` UI-10 tetap ada **bila sudah jadi**; tambahkan di sini (Q10) | M |
| SET-2 | Dilindungi PIN | §5.5 | M |

---

### 7.7 Pola formulir dan validasi (berlaku untuk SEMUA kolom di app)

Tujuan: terasa seperti app profesional pada umumnya: jelas, tidak menghukum, tidak kehilangan isian.

**7.7.1 Pola umum**

| Aspek | Aturan |
|---|---|
| Label | Selalu terlihat di atas kolom. Placeholder hanya contoh isi, bukan pengganti label |
| Wajib/opsional | Semua wajib kecuali yang berlabel "(opsional)". Satu kalimat di atas formulir panjang: "Semua isian wajib diisi kecuali yang bertanda opsional." |
| Teks bantu | Satu baris di bawah kolom berisi aturan/contoh, terlihat sebelum pengguna salah. Saat error, pesan error menggantikan teks bantu |
| Kapan memvalidasi | Saat kolom ditinggalkan (setelah pernah disentuh) dan saat dikirim. Saat mengetik: hanya menghapus error yang sudah teratasi (jangan memarahi saat belum selesai mengetik) |
| Normalisasi otomatis | Pangkas spasi ujung; ganti spasi ganda dengan satu; email huruf kecil. Tidak menghapus karakter diam-diam, kecuali kolom angka (PIN hanya menerima digit) |
| Batas panjang | `maxLength` dan penghitung "123 / 500" hanya muncul saat ≥ 80% terisi |
| Papan ketik | Jenis sesuai isi (email, angka), `returnKeyType="next"` memindahkan fokus, kolom terakhir "Selesai" mengirim. Formulir menggulir agar kolom aktif dan tombol Simpan tidak tertutup papan ketik |
| Menempel | Selalu boleh, termasuk kata sandi. Isi otomatis pengelola sandi didukung |
| Keadaan kolom | Normal · fokus (garis `focus` 3 dp) · terisi · error (garis `danger` + ikon + teks) · nonaktif · baca saja. Tidak ada keadaan yang hanya dibedakan warna |
| Kirim | Tombol tetap aktif (kecuali sedang memuat). Ada error → fokus ke kolom pertama yang salah, umumkan "Ada N isian yang perlu diperbaiki". Memuat → tombol berubah jadi keadaan memuat, cegah kirim ganda |
| Galat formulir | Banner di atas formulir (ikon + teks) dengan tombol "Coba lagi". **Isian tidak boleh hilang** saat gagal |
| Berhasil | Pesan teks singkat (snackbar) yang bertahan ≥ 5 detik, bisa dibaca pembaca layar, tidak menutup tombol penting |
| Keluar saat belum disimpan | Ada perubahan → dialog "Buang perubahan?" (Buang / Lanjut mengisi), juga untuk tombol kembali sistem. Tidak ada perubahan → keluar langsung |
| Isian bertahan | Memutar layar, membuka pemilih video, atau izin kamera tidak mengosongkan formulir (state di induk) |
| Aksesibilitas | Label terhubung ke kolom; teks bantu sebagai `accessibilityHint`; error diumumkan (`accessibilityLiveRegion="polite"` di Android, `AccessibilityInfo.announceForAccessibility` di iOS); target ≥ 48 dp; kolom tumbuh, tidak memotong teks pada skala 200%; kontras garis kolom ≥ 3:1 (periksa ulang saat implementasi) |
| Bahasa pesan | Indonesia baku sederhana, kalimat pendek, menyebut tindakan ("Isi username."), tidak menyalahkan, tanpa istilah teknis dan tanpa kata terlarang (§6) |

**7.7.2 PIN (papan angka khusus, bukan papan ketik sistem)**

| Aspek | Aturan |
|---|---|
| Komponen | `PinPad` (tombol 0–9 dan Hapus, tiap tombol ≥ 64 dp, label "Angka 5", "Hapus") dan `PinDots` (4 titik; satu elemen aksesibilitas "2 dari 4 angka terisi", tidak membacakan digit) |
| Masuk | Otomatis diperiksa saat digit ke-4 terisi; tanpa tombol OK. Layar satu instruksi: "Masukkan PIN Pendamping" |
| Salah | Titik dikosongkan, getar error (mengikuti sakelar Getar), pesan ikon + teks "PIN salah. Sisa 4 percobaan." Tanpa animasi goyang bila Reduce Motion aktif |
| Terkunci | Setelah N salah (Q4): papan angka nonaktif, "Terlalu banyak percobaan. Coba lagi dalam 30 detik." dengan hitung mundur terlihat. Penghitung disimpan lokal, tidak reset saat app ditutup |
| Buat PIN | Langkah 1 "Buat PIN 4 angka" → langkah 2 "Ulangi PIN". Tidak cocok: "PIN tidak sama. Ulangi dari awal." kembali ke langkah 1 |
| PIN lemah | Tolak semua angka sama (0000), urutan naik/turun (1234, 4321): "PIN terlalu mudah ditebak. Pilih angka lain." |
| Ganti PIN | PIN lama → PIN baru → ulangi. Baru sama dengan lama: "PIN baru harus berbeda dari PIN lama." Berhasil: pesan teks "PIN diganti." |
| Lupa PIN | Tautan teks "Lupa PIN?" (≥ 48 dp) → verifikasi kata sandi akun → buat PIN baru (Q3) |
| Keamanan | PIN tidak ditampilkan, tidak masuk log, tidak ada tombol "tampilkan". PIN adalah pintu keluar-masuk mode, bukan sistem keamanan kuat; jangan diklaim sebaliknya |

**7.7.3 Formulir Kata dan Suku kata**

| Kolom | Aturan | Pesan |
|---|---|---|
| Kata lengkap | Pangkas; 1–30 karakter; huruf (A–Z), boleh satu spasi atau tanda hubung di antara huruf; regex `^[A-Za-z]+([ -][A-Za-z]+)*$`; disimpan huruf kecil; tidak boleh sama (tanpa peka huruf) dengan kata lain milik Pendamping atau kata bawaan | kosong: "Isi kata yang akan dilatih." · karakter: "Gunakan huruf saja. Spasi atau tanda hubung boleh di antara huruf." · panjang: "Maksimal 30 karakter." · duplikat: "Kata ini sudah ada." |
| Suku kata (tiap baris) | Pangkas; 1–10 huruf, tanpa spasi; wajib bila barisnya ditambahkan; boleh sama dengan baris lain (mis. ma, ma) | kosong: "Isi suku kata atau hapus baris ini." · karakter: "Suku kata hanya huruf, tanpa spasi." · panjang: "Maksimal 10 huruf." |
| Kecocokan | Gabungan suku kata dibandingkan dengan kata (tanpa spasi/hubung). Tidak cocok = **peringatan**, bukan penghalang, karena ada pengecualian ejaan | "Gabungan suku kata (“ma-ma”) berbeda dari kata (“mama”). Periksa lagi, atau lanjut bila sudah benar." |
| Jumlah suku kata | 0 sampai `MAX_SYLLABLES` (6). Tombol "Tambah suku kata" nonaktif saat penuh dengan teks "Maksimal 6 suku kata" | — |
| Urutan | Nomor "Suku kata 1, 2, …". Pindah dengan tombol Naik/Turun berlabel (bukan hanya seret, karena seret tidak ramah aksesibilitas) | — |
| Hapus baris suku kata | Bila sudah ada isi atau video, minta konfirmasi singkat | "Hapus suku kata ini?" |
| Instruksi pelafalan | 10–500 karakter, teks panjang, penghitung mendekati batas. Teks bantu: "Jelaskan posisi bibir, lidah, dan rahang saat mengucapkannya." Contoh isi di placeholder. Diisi AI atau ditulis sendiri | kosong: "Isi instruksi pelafalan atau buat dengan AI." · pendek: "Tulis minimal 10 karakter agar jelas." · panjang: "Maksimal 500 karakter." |
| Video | Format MP4/MOV; durasi dan ukuran maksimum dibaca dari `VIDEO_LIMITS` (nilai awal 30 detik dan 50 MB, ditentukan [BE]). Sumber: rekam atau galeri. Ada pratinjau, Ganti, Hapus | format: "Format belum didukung. Gunakan MP4 atau MOV." · besar: "Video terlalu besar (62 MB). Maksimal 50 MB." · panjang: "Video terlalu panjang. Maksimal 30 detik." · kosong: "Pilih atau rekam video contoh." |
| Izin kamera/galeri ditolak | Penjelasan satu kalimat + tombol "Buka pengaturan" | "Izin kamera dibutuhkan untuk merekam video. Buka pengaturan untuk mengizinkan." |
| Unggah | Dimulai saat Simpan (usulan; konfirmasi [BE]). Progres per video dalam persen teks + bar, tombol Batalkan | gagal: "Unggah gagal. Periksa koneksi lalu coba lagi." |
| Persetujuan | Kotak centang wajib sekali per penyimpanan: "Saya memastikan orang di video setuju videonya dipakai untuk latihan di aplikasi ini." | "Centang persetujuan untuk menyimpan." |
| Hapus kata | Dialog: "Hapus “mama” dan 2 suku katanya? Ini tidak bisa dibatalkan." Tombol Batal (fokus awal) dan Hapus (gaya `danger`, ikon + teks). Opsi (S): "Urungkan" 5 detik setelah hapus bila BE mendukung penghapusan tunda | — |
| Simpan sukses | Kembali ke daftar, snackbar "Kata “mama” disimpan." | — |

**7.7.4 Komponen dan kode**
- Komponen bersama: `TextField` (label, teks bantu, error, penghitung, opsional), `PasswordField` (tampilkan/sembunyikan berlabel), `Checkbox` (label, error), `FormBanner`, `Snackbar`, `ConfirmDialog`, `PinPad`, `PinDots`, `VideoField`, `SyllableRow`.
- Satu hook ringan `useFormState` buatan sendiri (nilai, tersentuh, error, dirty, submit). Tanpa pustaka formulir baru kecuali Rico setuju.
- Semua aturan di `src/forms/validators/` (auth, word, pin, video) sebagai fungsi murni. Tes jest per aturan: batas bawah, batas atas, satu di luar batas, hanya spasi, spasi ganda, huruf besar/kecil, karakter non-ASCII dan emoji, teks tempelan panjang.
- Semua teks pesan terkumpul di satu berkas (`src/forms/messages.ts`) agar mudah ditinjau dan diubah.
- Tes komponen: error muncul saat blur dan saat kirim, hilang saat diperbaiki; fokus pindah ke kolom pertama yang salah; dialog "Buang perubahan?" muncul hanya bila ada perubahan.

## 8. Data yang dibutuhkan UI dari backend (diusulkan, minta teman konfirmasi)

Dipakai UI untuk membuat data tiruan di `src/mock/` sampai BE siap. Teman bebas mengubah bentuknya; yang penting kita sepakat.

```ts
type Source = 'default' | 'companion'      // default = read-only
type Material = {
  videoUrl: string
  instructionText: string                  // instruksi pelafalan (deskripsi)
  instructionSource: 'ai' | 'ai_edited' | 'manual'   // asal instruksi
  durationMs?: number
}
type Syllable = { id: string; text: string; material: Material }
type Word = {
  id: string; text: string; source: Source
  material: Material                       // materi kata lengkap (L3)
  syllables: Syllable[]                    // 0..MAX_SYLLABLES; [] = langsung L3
}
type VowelItem = { id: 'a'|'i'|'u'|'o'|'a_panjang'|'pelan_keras'; material: Material }

type Result =
  | { level: 1
      bibir: 'sesuai'|'mendekati'|'belum'
      suara: 'sesuai'|'mendekati'|'belum'
      feedback: string[]                   // 0–2 kalimat
      vowelTriangle: unknown; lipImage: unknown }
  | { level: 2 | 3
      bibir: 'sesuai'|'belum'
      suara: 'sesuai'|'belum'
      feedback: string[] }                 // tanpa grafik, tanpa teks ASR

// Auth
register({ username, email, password }) -> sesi | galat
login({ identifier /* email atau username */, password }) -> sesi | galat
galat: USERNAME_TAKEN | EMAIL_TAKEN | INVALID_CREDENTIALS | NETWORK | SERVER
// Instruksi AI (hanya teks yang dikirim)
generateInstruction({ text, parentWord? }) -> { instructionText } | galat
galat: TIMEOUT | RATE_LIMIT | NETWORK | SERVER
```

Hal yang perlu teman jawab: bentuk sebenarnya; batas ukuran dan durasi video; apakah `feedback` dibuat BE atau dari tabel kalimat; apakah username unik tanpa peka huruf besar/kecil; apakah ada "lupa sandi" (di luar MVP bila tidak).

## 9. Persyaratan tampilan khusus yang baru

1. **Splash dan layar pertama** [TIM UI #2]: kata "Rekan Wicara" harus satu warna jelas di atas latar gelap, **tidak bercampur putih**.
   - Latar splash `#08110B` (semua platform, termasuk Android 12 splash API dan `userInterfaceStyle: dark`).
   - Wordmark berkas PNG **transparan** (tanpa kotak putih, tanpa anti-alias putih di tepi), warna tunggal krem `#FAFCF9` atau hijau hero `#3A5A46` sesuai keputusan; cek bukan gambar JPEG atau PNG berlatar putih.
   - Layar JS pertama (saat memuat font/sesi) memakai `background` yang sama, tanpa kilatan putih.
   - Header "Rekan Wicara" di beranda memakai `fontFamily.display` warna `text`.
   - Periksa: `app.json` (`splash`, `android.adaptiveIcon.backgroundColor`, plugin `expo-splash-screen`), aset di `assets/`.
2. **Bar bawah tetap** [TIM UI #1]: terlihat di semua layar utama, disembunyikan di sesi latihan (§5.2, NAV-1, NAV-6).

---

## 10. Dampak ke `design.md` v6 dan kode yang ada

| Bagian | Perubahan |
|---|---|
| `design.md` §3.1 status | Kuning/"Mendekati" tetap dipakai, tetapi hanya di L1. `ResultView` memilih dua atau tiga status menurut level |
| `design.md` §5.7 StatTile/ProgressRing | Misi harian hilang → StatTile tak dipakai di Beranda. Boleh dipakai ulang untuk progres per level (opsional) |
| `design.md` §5.8 LevelTile | Dipakai untuk **tiga** kartu level di Beranda |
| `design.md` §5.9 BottomBar | Tiga item: Latihan, Pendamping, Pengaturan. Pindah dari "per layar" jadi **layout tab**. Pakai `Tabs` expo-router agar tetap |
| `design.md` §6.2.1 sketsa Home | Ganti dengan §5.3 dokumen ini |
| `design.md` §6.2.3 sketsa Hasil | Ganti dengan §6 dokumen ini |
| Komponen baru | `PinPad`, `PinDots`, `VideoField` (pilih/rekam + pratinjau), `WordForm`, `SyllableFields`, `DialogConfirm`, `LockBadge` ("Bawaan"), `TextField`, `PasswordField`, `Checkbox`, `FormBanner`, `Snackbar`, `SyllableRow` (lihat §7.7.4), `Chip` (sumber: Bawaan / Dari Pendamping) |
| Kode yang berubah | `LEVEL_NAMES`/`groupByLevel` (Level 0–4 → L1–L3), `home.tsx` (hapus misi), `ResultView` (grafik bersyarat per level; tiga status di L1, dua di L2–L3), `settings.tsx` (isi baru), `companion.tsx` (diganti fungsi Pendamping; Q11), rute baru |
| Tes yang pecah | Tes home (misi, tombol Mode Pendamping/Tentang), ResultView (grafik bersyarat, hint), tes langkah harian, tes settings. Tes StatusBadge tiga status tetap berlaku |

---

## 11. Aturan lintas-layar (tetap dari design.md)

Teks tidak miring; target sentuh ≥ 48 dp; kontras 4,5:1; status = bentuk + label + warna; satu instruksi per layar; tanpa bayangan; teks mengikuti skala sistem sampai 200%; Reduce Motion; istilah "teman Tuli"; tidak mengklaim "teruji pengguna" atau "ramah Tuli" sebagai bukti.

Tambahan karena ada video dari Pendamping:
- Video tanpa suara otomatis diputar? Pakai tombol putar yang jelas (jangan autoplay bersuara).
- Video harus punya alternatif teks (instruksi) — sudah diwajibkan di formulir.
- Pendamping merekam wajah orang: tampilkan satu kalimat persetujuan sebelum mengunggah (Q12, etika 10%).

---

## 12. Keputusan dan pertanyaan terbuka

**Sudah diputuskan**

| # | Keputusan |
|---|---|
| Q1 | Daftar: username, email, kata sandi. Masuk: email atau username + kata sandi. Validasi klien: §7.1.1 |
| Q9 | Suku kata per kata dibatasi `MAX_SYLLABLES = 6` (usulan; ubah di satu konstanta) |
| Q12 | Satu kalimat persetujuan di formulir unggah video Pendamping |
| Q13 | Tidak ada "Suku kata umum" mandiri. Suku kata selalu anak dari sebuah kata (§3) |
| Q19 | Satu kolom instruksi: **instruksi pelafalan** (disebut "deskripsi") saja. Kolom "pengucapan" dihapus |
| Q23 | Menyimpan tanpa meninjau hasil AI diperbolehkan; peringatan §7.5.2 tetap tampil |
| — | Bar bawah tetap di semua layar utama; **disembunyikan di sesi latihan** |
| — | Statis = materi bawaan tim; dinamis = materi Pendamping (CRUD) |
| — | L1: tiga status. L2–L3: dua status |

**Masih terbuka**

| # | Pertanyaan | Usulan saya |
|---|---|---|
| Q2 | Panjang PIN? | 4 digit |
| Q3 | Lupa PIN? | Verifikasi dengan kata sandi akun, lalu buat PIN baru |
| Q4 | Batas salah PIN (N) dan waktu diam sesi (T)? | N = 5, kunci 30 detik; T = 5 menit |
| Q5 | Keluar: data latihan lokal dihapus atau dipertahankan? | Dipertahankan di akun; dialog menyebutkan |
| Q6 | L2/L3 terkunci sampai L1 selesai? | Tidak dikunci untuk MVP |
| Q7 | Kata dihapus: riwayat latihannya? | Disembunyikan dari progres |
| Q8 | Umpan balik saat Sesuai? | Kosong |
| Q10 | Sakelar Getar dan Reduce Motion masuk Pengaturan? | Ya |
| Q11 | Layar `/companion` lama? | Dibuang; digantikan tab Pendamping |
| Q14 | "A panjang" dan "pelan ke keras" dua item L1 terpisah? | Ya |
| Q15 | "Lupa kata sandi"? | Di luar MVP; tulis di README sebagai batasan |
| Q16 | CRUD hanya oleh Pendamping (lewat PIN), bukan pengguna Tuli? | Ya |
| Q17 | Ambang "Mendekati" di L1: siapa menentukan? | BE; UI hanya menampilkan |
| Q18 | Kotak centang persetujuan privasi di Daftar? | Ya, satu kalimat + tautan ke kebijakan di Tentang |
| Q20 | Batas video (durasi, ukuran, format) dan apakah unggah saat Simpan? | [BE] menentukan; UI membaca dari `VIDEO_LIMITS` |
| Q21 | Pengguna Tuli diberi tahu bila instruksi dibuat AI dan belum diedit? | Ya, satu baris kecil di tahap Lihat |
| Q22 | Model AI: kemungkinan Gemini. Batas permintaan? Hanya teks yang dikirim? Kunci API di server? | [BE] menjawab. Kunci API tidak boleh ada di app; app memanggil endpoint BE, BE memanggil Gemini |

## 13. Urutan kerja UI (usulan, model/effort belum diuji)

Dikerjakan di cabang baru dari `ui-hutan-malam`. Satu langkah satu sesi, satu commit, tes hijau sebelum lanjut.

| Langkah | Isi | Model | Effort | Mode |
|---|---|---|---|---|
| FL-0 | Audit: baca dokumen ini + kode, tulis `docs/redesign/flow-audit.md` (berkas yang berubah, tes yang pecah, konflik). Tanpa ubah kode | Opus | high | Plan |
| FL-1 | Splash + layar pertama tidak bercampur putih (§9.1) | Sonnet | low | biasa |
| FL-2 | Layout tab tetap (3 tab) + sembunyikan bar di sesi latihan | Sonnet | high | Plan |
| FL-3 | Hapus misi harian dari UI; Beranda = dua kartu (Level 1; Level 2 dan 3 → Pilih kata); ganti `LEVEL_NAMES` | Opus | high | Plan |
| FL-4 | Hasil bersyarat per level (L1 tiga status + grafik; L2–L3 dua status, tanpa grafik) + umpan balik per kesalahan | Sonnet | high | biasa |
| FL-5 | Daftar kata + jalur kata (data tiruan) | Sonnet | medium | biasa |
| FL-5b | Komponen formulir bersama + `src/forms/validators` + `messages.ts` + tes (§7.7.4). **Dikerjakan sebelum FL-6, FL-7, FL-8** | Sonnet | high | Plan |
| FL-6 | PIN: `PinPad`/`PinDots`, gerbang, buat/ganti PIN, kunci sementara (§7.7.2) | Sonnet | high | Plan |
| FL-7 | Autentikasi: Masuk/Daftar memakai komponen FL-5b + validator auth + tes (data tiruan) | Sonnet | high | biasa |
| FL-8 | CRUD Pendamping: daftar, formulir kata + suku kata (maks 6), persetujuan video, hapus (instruksi manual dulu) | Opus | high | Plan |
| FL-8b | Tombol "Buat dengan AI" (§7.5.2) dengan data tiruan: memuat, berhasil, gagal, ganti isi, kembalikan, label | Sonnet | high | Plan |
| FL-9 | Pengaturan baru (Ganti PIN, Keluar, Getar) | Sonnet | medium | biasa |
| FL-10 | Pemeriksaan akhir + PROGRESS.md | Opus | high | biasa |

Pembagian kerja dengan teman: UI memakai **data tiruan** (modul `src/mock/`) berbentuk §8 sampai BE siap, supaya tidak saling menunggu. Saat BE siap, ganti pemanggil data, bukan layar.

Prioritas bila waktu habis: FL-1, FL-2, FL-3, FL-4 dulu (alur utama Tuli), lalu FL-6/FL-8 (Pendamping), terakhir FL-5/FL-7/FL-9 yang bisa disederhanakan.
