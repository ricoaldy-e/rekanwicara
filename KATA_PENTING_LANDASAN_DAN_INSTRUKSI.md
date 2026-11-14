# Kata Penting — Landasan, Pemotongan, dan Instruksi Pengucapan

Cermin Wicara · LOGICODIX 2026 · 13 November 2026 · **v4 (satu berkas)**
**Simpan di repo sebagai:** `docs/KATA_PENTING.md`

Sumber dan ID (W, S) berasal dari berkas `Riset_Cermin_Wicara_v2_13Nov2026.md`.

## Peta berkas ini (siapa memakai apa)

| Bagian | Isi | Dipakai oleh | Tampil di UI? |
|---|---|---|---|
| **A. Aturan tampilan** | Cara layar detail kata ditampilkan | Tim teknis | Tidak (aturan kerja) |
| **B. Daftar dan kaidah** | Delapan kata, pemotongan, kaidah, istilah | Tim teknis dan pemilik produk | Daftar kata dan pemotongan: ya |
| **C. Kata per kata** | Per kata: **Teks UI** (pemotongan, ringkas, langkah bernomor) lalu **Landasan** (sumber, kekuatan, catatan jujur) | Teks UI: tim teknis. Landasan: pemilik produk | **Hanya baris “Pemotongan”, baris “Ringkas”, dan kolom “Langkah (teks UI)”** |
| **D. Kartu bunyi** | Bantuan per bunyi | Tim teknis (opsional) | Opsional |
| **E. Landasan dan catatan** | Kode landasan, kata yang dilepas, sumber, keterbatasan, kalimat pitch | Pemilik produk | **Tidak** |

> **Untuk tim teknis:** salin ke UI **hanya** kolom “Langkah (teks UI)”, baris “Pemotongan”, dan baris “Ringkas”. **Kolom “Landasan” dan seluruh tabel “Landasan” dan Bagian E tidak boleh tampil di aplikasi.**

> **Baca dulu (pemilik produk).** Landasan kata menjelaskan **kenapa kata itu penting dalam komunikasi darurat**. Ia **bukan** bukti bahwa melatih ucapannya menolong orang tuli. Tidak ada satu pun sumber yang menganjurkan itu. Sumber khusus Tuli hampir seluruhnya menganjurkan kartu, tulisan, isyarat, atau teks. Karena itu aplikasi memosisikan latihan ini sebagai pelengkap, bukan pengganti.

---

# A. Aturan tampilan

1. **Statis dan offline.** Tanpa jaringan, tanpa penilaian mesin, tanpa penyimpanan data.
2. Setiap kata berlabel **“Tanpa penilaian otomatis”**.
3. Urutan di layar detail: nama kata → pemotongan → baris ringkas → **tiap potongan** (langkah bernomor) → **kata utuh** (langkah bernomor). Untuk kata satu suku kata (“haus”) hanya kata utuh.
4. Baris **Ringkas** boleh dibuka-tutup bila layar sempit.
5. Teks **tidak boleh** menyuruh “mendengarkan”. Semua petunjuk memakai penglihatan (cermin atau layar) dan rabaan.
6. Tanpa bunyi apa pun. Teks besar; satu langkah per baris.
7. Jangan menambahkan kata “normal”, “abnormal”, “gangguan”, “diagnosis”, atau klaim memperbaiki bicara. Jangan menulis kata “terapi” kecuali dalam penyangkalan.
8. Catatan kecil di bawah detail: “Petunjuk ini panduan umum untuk latihan. Berhenti bila tidak nyaman.”
9. ID usulan: `kp_<kata>` untuk kata, `kp_<kata>_<potongan>` untuk potongan.
10. **Jangan menampilkan** kode landasan (kolom “Landasan”), tabel “Landasan”, atau Bagian E.

---

# B. Daftar dan kaidah

## Delapan kata (semua kata tunggal)

| No | Kata | Pemotongan (suku kata) | Banyak potongan | Kemudahan* | Sumber | Kekuatan |
|---|---|---|---|---|---|---|
| 1 | Tolong | to-long | 2 | Sedang | S6, S7 | C/D |
| 2 | Polisi | po-li-si | 3 | Sedang | S5, S6 (+ S2 tidak langsung) | A (bukan Indonesia) dan D |
| 3 | Api | a-pi | 2 | **Mudah** | S1, S2, S4, S6 | A |
| 4 | Sakit | sa-kit | 2 | Sedang | S6, S7, S8, S10 | B |
| 5 | Obat | o-bat | 2 | **Mudah** | S4, S7 | A (bukan Indonesia) dan C/D |
| 6 | Alamat | a-la-mat | 3 | Mudah–sedang | S3, S4, S5, S8 (konsep lokasi) | A/B |
| 7 | Makan | ma-kan | 2 | Mudah–sedang | S7 | C/D |
| 8 | Haus | haus | 1 | Sedang | S7 | C/D |

\* **Kemudahan adalah analisis kami**, bukan temuan sumber. Dinilai dari jumlah suku kata, gugus konsonan, dan banyaknya bunyi lidah: Mudah = ≤ 2 suku kata dengan paling banyak satu bunyi lidah; Sedang = 1–3 suku kata dengan 2–3 bunyi lidah atau bunyi yang tidak terlihat; Sulit = ≥ 4 suku kata atau gugus konsonan.

Semua kata **tanpa penilaian otomatis** di versi MVP (pengecualian terbatas: “api” dapat menjadi materi latihan terukur bila lolos aturan aktivasi B1 di brief).

## Kaidah pemotongan (ejaan resmi: PUEBI/EYD)

| Kaidah | Isi | Contoh dari kaidah |
|---|---|---|
| (a) | Dua vokal berurutan dipenggal di antara keduanya. **Diftong ai, au, oi (dan ei di PUEBI) tidak dipenggal.** | bu-ah, ma-in, sa-at; au-la, sau-da-ra, am-boi |
| (b) | **Satu konsonan di antara dua vokal: dipenggal sebelum konsonan itu.** Berlaku juga untuk gabungan konsonan. | ba-pak, la-wan, de-ngan, ke-nyang |
| (c) | **Dua konsonan berurutan: dipenggal di antara keduanya.** | man-di, som-bong, swas-ta |
| (d) | Tiga konsonan atau lebih: dipenggal di antara konsonan pertama dan kedua. | in-fra, ben-trok |
| Gabungan konsonan | **kh, ng, ny, sy** adalah satu bunyi dan **tidak pernah diceraikan**. | bang-sa, makh-luk |

**“Haus”:** karena “au” adalah diftong, “haus” dihitung **satu suku kata**, bukan ha-us. **“Tolong”:** pemotongan yang benar **to-long**, bukan to-lo-ng; “ng” satu bunyi dan tidak diceraikan.

## Istilah (boleh ditampilkan sebagai bantuan)

| Istilah | Artinya |
|---|---|
| Ketukan / tepukan | Satu tepukan telapak tangan untuk setiap suku kata. Dipakai untuk menjaga jumlah suku kata. |
| Getar | Rasa bergetar yang terasa di leher atau di sisi hidung saat bersuara. |
| Hembusan kecil | Embusan udara singkat yang bisa dirasakan di tangan yang dipegang di depan bibir. |
| Gusi | Bagian keras tepat di belakang gigi atas. |
| Langit-langit belakang | Atap mulut bagian belakang. |
| Suku kata tertutup | Suku kata yang diakhiri konsonan, misalnya “long”, “kit”, “bat”, “mat”, “kan”. |
| Diftong | Dua vokal yang diucapkan sebagai satu gerakan dalam satu suku kata, misalnya “au”. |

---

# C. Kata per kata

## 1. Tolong  `kp_tolong`

### Teks UI

**Pemotongan:** to-long

**Ringkas:** 2 tepukan: ujung lidah di gigi (t) → bibir bulat (o) → lidah di gusi (l) → bibir bulat (o) → suara lewat hidung (ng).

**Potongan “to”**  `kp_tolong_to`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Tempelkan ujung lidah di belakang gigi seri atas, siap untuk “t”. | J |
| 2 | Taruh satu tangan di depan mulut dan satu tangan di leher. | N |
| 3 | Lepas lidah dengan hembusan kecil; leher belum bergetar. | J·N |
| 4 | Segera bulatkan bibir dengan bukaan sedang dan bersuara “o”; rasakan getar di leher. | J·N |
| 5 | Gabungkan “t” dan “o” tanpa jeda, sebagai satu ketukan. | T |

**Potongan “long”**  `kp_tolong_long`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Naikkan ujung lidah ke gusi di belakang gigi atas, siap untuk “l”. | N |
| 2 | Mulai bersuara saat lidah masih menempel; rasakan getar di leher. | J·N |
| 3 | Turunkan lidah dan bulatkan bibir ke “o”. Di suku kata tertutup ini bentuknya sedikit lebih santai dan terbuka daripada “o” sendirian. | J |
| 4 | Naikkan bagian belakang lidah ke langit-langit belakang dan alirkan suara lewat hidung: ini bunyi “ng”. Rasakan getar di sisi hidung. | J·N |
| 5 | Tahan “ng” sebentar lalu berhenti; jangan menambahkan “g”. | J |
| 6 | Hitung semuanya sebagai satu ketukan. | T |

**Kata utuh “tolong”**

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Pecah kata menjadi dua bagian: to-long. Satu tepukan telapak tangan untuk tiap bagian. | T |
| 2 | Ucapkan “to”, lalu langsung “long” tanpa jeda panjang. | T |
| 3 | Jaga dua tepukan sama kuat; jangan melebih-lebihkan bentuk mulut. | T |
| 4 | Cek dengan tangan: hembusan kecil terasa hanya di awal (“t”); getar di leher terasa pada “o”, “l”, “o”, dan “ng”. | N |
| 5 | Ulangi tiga kali pelan, lalu tiga kali dengan kecepatan bicara biasa. | T |

### Landasan *(untuk pemilik produk; tidak tampil di UI)*

| Hal | Isi |
|---|---|
| Kategori | (a) minta bantuan · ID riset W2 |
| Pemotongan | **to-long** (kaidah b: “l” di antara dua vokal dipenggal sebelum “l”; “ng” tidak diceraikan) |
| Rincian bunyi | t-o / l-o-ng (5 bunyi; “ng” = 1 bunyi) |
| Potongan latihan | L1: o, ng (dengung) → L2: to, long → L3: tolong |
| Sudah ada di latihan terukur | Tidak ada (vokal “o” belum aktif) |
| Kemudahan | Sedang (2 suku kata; bunyi lidah t, l, ng) |
| Kenapa penting | Kata minta tolong paling dasar; pengguna alat komunikasi memintanya sebanyak 3 kali |
| Sumber | **Langsung:** S6 (memuat “Tolong!”), S7 (“Help”, 3 kali) |
| Kekuatan | C/D |
| Catatan jujur | **Dukungan paling lemah di daftar**: hanya 2 sumber, keduanya bukan tuli (S6 materi belajar bahasa, S7 satu tesis kecil dengan n=10 di Kanada). Dipertahankan atas pertimbangan tim, bukan karena bukti kuat. |

---

## 2. Polisi  `kp_polisi`

### Teks UI

**Pemotongan:** po-li-si

**Ringkas:** 3 tepukan: bibir rapat lepas (p) + bulat (o) → lidah di gusi (l) + senyum (i) → desis (s) + senyum (i).

**Potongan “po”**  `kp_polisi_po`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Rapatkan kedua bibir, siap untuk “p”. | J |
| 2 | Taruh satu tangan di depan bibir dan satu tangan di leher. | N |
| 3 | Lepas bibir dengan hembusan kecil; leher belum bergetar. | J·N |
| 4 | Segera bulatkan bibir dengan bukaan sedang dan bersuara “o”; rasakan getar di leher. | J·N |
| 5 | Satu ketukan. | T |

**Potongan “li”**  `kp_polisi_li`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Naikkan ujung lidah ke gusi di belakang gigi atas, siap untuk “l”. | N |
| 2 | Mulai bersuara saat lidah menempel; rasakan getar di leher. | J·N |
| 3 | Turunkan lidah sambil melebarkan bibir ke samping seperti tersenyum: “i”. | J |
| 4 | Satu ketukan. | T |

**Potongan “si”**  `kp_polisi_si`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Lebarkan bibir seperti tersenyum; gigi hampir rapat. | J |
| 2 | Dekatkan ujung lidah ke gusi belakang gigi atas dengan celah sempit. | J |
| 3 | Embuskan udara hingga terasa dingin di tangan depan mulut; leher belum bergetar. | N |
| 4 | Tanpa berhenti, mulai bersuara “i”; getar di leher mulai terasa. | N |
| 5 | Satu ketukan. | T |

**Kata utuh “polisi”**

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Pecah kata menjadi tiga bagian: po-li-si. Satu tepukan telapak tangan untuk tiap bagian. | T |
| 2 | Ucapkan “po”, “li”, “si” berurutan tanpa jeda panjang. | T |
| 3 | Bentuk mulut berganti: bibir rapat lalu bulat, lidah naik ke gusi lalu senyum, desis lalu senyum. | T |
| 4 | Cek dengan tangan: hembusan kecil di awal (“p”); getar di leher pada “o”, “l”, “i”; dingin di tangan pada “s” sebelum “i” terakhir. | N |
| 5 | Ulangi tiga kali pelan, lalu tiga kali dengan kecepatan bicara biasa. | T |

### Landasan *(untuk pemilik produk; tidak tampil di UI)*

| Hal | Isi |
|---|---|
| Kategori | (a) minta bantuan · ID riset W1 (dipecah) |
| Pemotongan | **po-li-si** (kaidah b dua kali) |
| Rincian bunyi | p-o / l-i / s-i (6 bunyi) |
| Potongan latihan | L1: o, i → L2: po, li, si → L3: polisi |
| Sudah ada di latihan terukur | Hanya vokal “i” |
| Kemudahan | Sedang (3 suku kata; bunyi lidah l, s) |
| Kenapa penting | Operator menanyakan layanan yang dibutuhkan; kejahatan termasuk jenis darurat yang ditangani 112 |
| Sumber | **Langsung:** S5, S6 (memuat “Polisi”). **Tidak langsung:** S2 (kejahatan sebagai jenis darurat) |
| Kekuatan | A (S5, bukan Indonesia) dan D (S6) |
| Catatan jujur | S6 hanya materi belajar bahasa. Tidak ada sumber khusus tuli yang menyebut kata ini sebagai ucapan. |

---

## 3. Api  `kp_api`

### Teks UI

**Pemotongan:** a-pi

**Ringkas:** 2 tepukan: mulut lebar (a) → bibir rapat lepas (p) + senyum (i).

**Potongan “a”**  `kp_api_a`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Buka mulut lebar, rahang turun. | J |
| 2 | Taruh telapak tangan di leher. | N |
| 3 | Bersuara “a” singkat dan rasakan getar di leher. | N |
| 4 | Satu ketukan. | T |

**Potongan “pi”**  `kp_api_pi`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Rapatkan kedua bibir. | J |
| 2 | Taruh satu tangan di depan bibir dan satu tangan di leher. | N |
| 3 | Lepas bibir dengan hembusan kecil dan pada saat yang sama lebarkan bibir ke samping seperti tersenyum untuk “i”. | J·N |
| 4 | Rasakan getar di leher mulai setelah bibir lepas. | N |
| 5 | Satu ketukan. | T |

**Kata utuh “api”**

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Pecah kata menjadi dua bagian: a-pi. Satu tepukan telapak tangan untuk tiap bagian. | T |
| 2 | Bentuk mulut berganti tiga kali: lebar (a) → rapat (p) → melebar seperti senyum (i). | T |
| 3 | Jangan menahan bibir rapat terlalu lama; langsung lepas ke “i”. | T |
| 4 | Cek dengan tangan: getar di leher pada “a”, berhenti sesaat saat bibir rapat, lalu mulai lagi pada “i”; hembusan kecil terasa saat bibir lepas. | N |
| 5 | Ulangi tiga kali pelan, lalu tiga kali dengan kecepatan bicara biasa. | T |

### Landasan *(untuk pemilik produk; tidak tampil di UI)*

| Hal | Isi |
|---|---|
| Kategori | (b) jenis bahaya · ID riset W4 |
| Pemotongan | **a-pi** (kaidah b: “p” di antara dua vokal dipenggal sebelum “p”) |
| Rincian bunyi | a / p-i (3 bunyi) |
| Potongan latihan | L1: a, i → L2: pi → L3: api |
| Sudah ada di latihan terukur | **Semua**: a, i, dan pi sudah menjadi materi aktif |
| Kemudahan | **Mudah** (2 suku kata; seluruh bunyinya vokal atau bunyi bibir) |
| Kenapa penting | Kebakaran adalah contoh pertama layanan 112 di Indonesia. Operator panduan Jepang menanyakan kebakaran atau medis. |
| Sumber | **Langsung:** S6 (“Api!”). **Langsung pada kategori kebakaran:** S1, S2, S4 |
| Kekuatan | A |
| Catatan jujur | S1 dan S2 sama-sama dari kementerian komunikasi, jadi “4 sumber” sedikit menggelembung. S4 resmi tetapi dari Jepang. S6 hanya materi belajar bahasa. **Dukungan terkuat di daftar dan satu-satunya kata yang bunyinya terukur penuh oleh mesin.** |

---

## 4. Sakit  `kp_sakit`

### Teks UI

**Pemotongan:** sa-kit

**Ringkas:** 2 tepukan: desis (s) + mulut lebar (a) → lidah belakang (k) + senyum (i) → lidah di gigi berhenti (t).

**Potongan “sa”**  `kp_sakit_sa`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Dekatkan ujung lidah ke gusi belakang gigi atas dengan celah sempit; gigi hampir rapat. | J |
| 2 | Embuskan udara hingga terasa dingin di tangan depan mulut; leher belum bergetar. | N |
| 3 | Tanpa berhenti, buka mulut lebar dan bersuara “a”; getar di leher mulai terasa. | N |
| 4 | Satu ketukan. | T |

**Potongan “kit”**  `kp_sakit_kit`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Naikkan bagian belakang lidah ke langit-langit belakang, siap untuk “k”. | J |
| 2 | Taruh satu tangan di depan mulut dan satu tangan di leher. | N |
| 3 | Lepas dengan hembusan kecil sambil melebarkan bibir ke samping untuk “i”. Di suku kata tertutup ini bentuknya sedikit lebih santai daripada “i” sendirian. | J |
| 4 | Akhiri dengan menempelkan ujung lidah di belakang gigi seri atas (“t”), lalu berhenti tanpa melepaskan hembusan. | J |
| 5 | Leher berhenti bergetar saat “t”. Satu ketukan. | N |

**Kata utuh “sakit”**

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Pecah kata menjadi dua bagian: sa-kit. Satu tepukan telapak tangan untuk tiap bagian. | T |
| 2 | Ucapkan “sa”, lalu langsung “kit” tanpa jeda panjang. | T |
| 3 | Cek dengan tangan: dingin di tangan pada “s”; hembusan kecil pada “k”; tidak ada hembusan di akhir (“t” berhenti). | N |
| 4 | Ulangi tiga kali pelan, lalu tiga kali dengan kecepatan bicara biasa. | T |

### Landasan *(untuk pemilik produk; tidak tampil di UI)*

| Hal | Isi |
|---|---|
| Kategori | (c) kondisi tubuh · ID riset W8 |
| Pemotongan | **sa-kit** (kaidah b: “k” di antara dua vokal dipenggal sebelum “k”) |
| Rincian bunyi | s-a / k-i-t (5 bunyi) |
| Potongan latihan | L1: a, i → L2: sa, kit → L3: sakit |
| Sudah ada di latihan terukur | Hanya vokal a dan i |
| Kemudahan | Sedang (2 suku kata; bunyi lidah s, k, t) |
| Kenapa penting | Kata yang paling sering diminta. Petugas perlu lokasi dan tingkat nyeri. |
| Sumber | **Langsung:** S6 (“Saya sakit.”), S7 (“Pain” 6 kali, “Sick” 4 kali), S8 (lokasi nyeri), S10 (“Where is your pain?”) |
| Kekuatan | B (S8) |
| Catatan jujur | Sumber menekankan lokasi dan tingkat nyeri, **bukan kata tunggal**. S8 dan S10 menyampaikannya lewat ikon dan tunjuk, bukan ucapan. |

---

## 5. Obat  `kp_obat`

### Teks UI

**Pemotongan:** o-bat

**Ringkas:** 2 tepukan: bibir bulat (o) → bibir rapat bersuara lepas (b) + mulut lebar (a) → lidah di gigi berhenti (t).

**Potongan “o”**  `kp_obat_o`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Bulatkan bibir dengan bukaan sedang, rahang turun sedikit. | J |
| 2 | Taruh telapak tangan di leher. | N |
| 3 | Bersuara “o” singkat dan rasakan getar di leher. | N |
| 4 | Satu ketukan. | T |

**Potongan “bat”**  `kp_obat_bat`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Rapatkan kedua bibir dan taruh satu tangan di leher. | J·N |
| 2 | Mulai bersuara saat bibir masih rapat: getar di leher terasa. | N |
| 3 | Lepas bibir dengan lembut dan buka mulut lebar untuk “a”. | T |
| 4 | Akhiri dengan menempelkan ujung lidah di belakang gigi seri atas (“t”), lalu berhenti tanpa hembusan. | J |
| 5 | Satu ketukan. | T |

**Kata utuh “obat”**

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Pecah kata menjadi dua bagian: o-bat. Satu tepukan telapak tangan untuk tiap bagian. | T |
| 2 | Bentuk mulut berganti: bulat (o) → rapat (b) → lebar (a) → lidah menempel di gigi dan berhenti (t). | T |
| 3 | Cek dengan tangan: getar di leher terus terasa dari “o” sampai “a”, termasuk saat bibir rapat (“b”); tidak ada hembusan di akhir. | N |
| 4 | Ulangi tiga kali pelan, lalu tiga kali dengan kecepatan bicara biasa. | T |

### Landasan *(untuk pemilik produk; tidak tampil di UI)*

| Hal | Isi |
|---|---|
| Kategori | (c) kondisi tubuh · ID riset W15 |
| Pemotongan | **o-bat** (kaidah b: “b” di antara “o” dan “a” dipenggal sebelum “b”) |
| Rincian bunyi | o / b-a-t (4 bunyi) |
| Potongan latihan | L1: o, a → L2: o, bat → L3: obat |
| Sudah ada di latihan terukur | Sebagian: “ba” dan vokal “a” ada; “bat” = “ba” + bunyi /t/ akhir; vokal “o” belum aktif |
| Kemudahan | **Mudah** (2 suku kata; satu bunyi lidah di akhir; bunyi “b” terlihat di bibir) |
| Kenapa penting | Petugas dan operator perlu tahu pengobatan yang sedang dijalani; kata yang diminta pengguna alat komunikasi |
| Sumber | **S4** (daftar informasi untuk petugas: “pengobatan saat ini”), **S7** (“Medicine”) |
| Kekuatan | A (S4, resmi tetapi bukan Indonesia dan bukan tuli) dan C/D (S7) |
| Catatan jujur | Konteks sumbernya adalah **informasi yang disiapkan untuk petugas**, bukan seruan minta tolong. S4 memakai kata “pengobatan”, bukan “obat” tunggal. Hanya dua sumber, keduanya bukan tuli. |

---

## 6. Alamat  `kp_alamat`

### Teks UI

**Pemotongan:** a-la-mat

**Ringkas:** 3 tepukan: mulut lebar (a) → lidah di gusi (l) + mulut lebar (a) → bibir rapat lewat hidung (m) + mulut lebar (a) → lidah di gigi berhenti (t).

**Potongan “a”**  `kp_alamat_a`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Buka mulut lebar, rahang turun. | J |
| 2 | Taruh telapak tangan di leher. | N |
| 3 | Bersuara “a” singkat dan rasakan getar di leher. | N |
| 4 | Satu ketukan. | T |

**Potongan “la”**  `kp_alamat_la`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Naikkan ujung lidah ke gusi belakang gigi atas, siap untuk “l”. | N |
| 2 | Mulai bersuara saat lidah menempel; rasakan getar di leher. | J·N |
| 3 | Turunkan lidah dan buka mulut lebar untuk “a”. | J |
| 4 | Satu ketukan. | T |

**Potongan “mat”**  `kp_alamat_mat`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Rapatkan kedua bibir; taruh satu jari di sisi hidung dan satu tangan di leher. | J·N |
| 2 | Bersuara “m” dengan bibir rapat: udara keluar lewat hidung; rasakan getar di sisi hidung. | J·N |
| 3 | Buka mulut lebar untuk “a”; udara kini keluar lewat mulut. | J |
| 4 | Akhiri dengan menempelkan ujung lidah di belakang gigi seri atas (“t”), lalu berhenti tanpa hembusan. | J |
| 5 | Satu ketukan. | T |

**Kata utuh “alamat”**

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Pecah kata menjadi tiga bagian: a-la-mat. Satu tepukan telapak tangan untuk tiap bagian. | T |
| 2 | Mulut terbuka lebar pada setiap “a”; di antaranya lidah naik ke gusi (“l”) dan bibir merapat (“m”). | T |
| 3 | Cek dengan tangan: getar di leher hampir terus-menerus; getar di sisi hidung terasa pada “m”; tidak ada hembusan di akhir. | N |
| 4 | Ulangi tiga kali pelan, lalu tiga kali dengan kecepatan bicara biasa. | T |

### Landasan *(untuk pemilik produk; tidak tampil di UI)*

| Hal | Isi |
|---|---|
| Kategori | (e) informasi untuk penolong · ID riset W19 (konsep lokasi) |
| Pemotongan | **a-la-mat** (kaidah b dua kali: “l” dan “m” masing-masing di antara dua vokal) |
| Rincian bunyi | a / l-a / m-a-t (6 bunyi) |
| Potongan latihan | L1: a → L2: la, mat → L3: alamat |
| Sudah ada di latihan terukur | Sebagian: “a” dan “ma” ada; “mat” = “ma” + bunyi /t/ akhir; “la” belum ada |
| Kemudahan | Mudah–sedang (3 suku kata dengan vokal “a” dominan; bunyi lidah l, t; “m” terlihat di bibir) |
| Kenapa penting | Operator selalu menanyakan lokasi kejadian |
| Sumber | **Konsep lokasi:** S3 (Indonesia), S4, S5, S8 |
| Kekuatan | A/B |
| Catatan jujur | **Sumber memakai “lokasi” dan “di mana”, bukan “alamat”.** “Alamat” dipilih kami karena lebih mudah diucapkan daripada “lokasi” (lo-ka-si). Mengucapkan kata “alamat” **tidak menyampaikan alamat sebenarnya**; kebutuhan nyata adalah menyebut alamat sendiri, yang berbeda tiap pengguna dan masuk roadmap. |

---

## 7. Makan  `kp_makan`

### Teks UI

**Pemotongan:** ma-kan

**Ringkas:** 2 tepukan: bibir rapat lewat hidung (m) + mulut lebar (a) → lidah belakang (k) + mulut lebar (a) + lidah di gigi lewat hidung (n).

**Potongan “ma”**  `kp_makan_ma`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Rapatkan kedua bibir; taruh satu jari di sisi hidung dan satu tangan di leher. | J·N |
| 2 | Bersuara “m” dengan bibir rapat: udara keluar lewat hidung; getar terasa di sisi hidung. | J·N |
| 3 | Buka mulut lebar untuk “a”; udara keluar lewat mulut. | J |
| 4 | Satu ketukan. | T |

**Potongan “kan”**  `kp_makan_kan`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Naikkan bagian belakang lidah ke langit-langit belakang, siap untuk “k”. | J |
| 2 | Taruh satu tangan di depan mulut. | N |
| 3 | Lepas dengan hembusan kecil dan segera buka mulut lebar untuk “a”. | J·N |
| 4 | Akhiri dengan menempelkan ujung lidah di belakang gigi seri atas dan alirkan suara lewat hidung (“n”); rasakan getar di sisi hidung. | J·N |
| 5 | Satu ketukan. | T |

**Kata utuh “makan”**

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Pecah kata menjadi dua bagian: ma-kan. Satu tepukan telapak tangan untuk tiap bagian. | T |
| 2 | Ucapkan “ma”, lalu langsung “kan” tanpa jeda panjang. | T |
| 3 | Bentuk mulut berganti: bibir rapat → lebar (a) → lidah belakang naik (k) → lebar (a) → lidah menempel di gigi (n). | T |
| 4 | Cek dengan tangan: getar di sisi hidung terasa pada “m” dan pada “n” di akhir; hembusan kecil terasa pada “k”. | N |
| 5 | Ulangi tiga kali pelan, lalu tiga kali dengan kecepatan bicara biasa. | T |

### Landasan *(untuk pemilik produk; tidak tampil di UI)*

| Hal | Isi |
|---|---|
| Kategori | (g) kebutuhan dasar · ID riset W25 |
| Pemotongan | **ma-kan** (kaidah b: “k” di antara dua vokal dipenggal sebelum “k”) |
| Rincian bunyi | m-a / k-a-n (5 bunyi) |
| Potongan latihan | L1: a, mmm → L2: ma, kan → L3: makan |
| Sudah ada di latihan terukur | Sebagian: “a”, “mmm”, dan “ma” sudah menjadi materi aktif; “kan” belum ada |
| Kemudahan | Mudah–sedang (2 suku kata; satu bunyi bibir; bunyi lidah k, n) |
| Kenapa penting | Kebutuhan dasar; diminta pengguna alat komunikasi (“Eat” 2 kali, “Hungry” 2 kali) |
| Sumber | **Langsung:** S7 saja (diterjemahkan dari “Eat” dan “Hungry”) |
| Kekuatan | C/D |
| Catatan jujur | **Hanya satu sumber lemah**, bukan tuli, konteks Kanada. Kategorinya kebutuhan dasar, **bukan darurat**. Dipilih atas permintaan tim karena mudah dilatih dan bermakna sehari-hari. |

---

## 8. Haus  `kp_haus`

### Teks UI

**Pemotongan:** haus

**Ringkas:** 1 tepukan: napas hangat (h) → mulut lebar (a) → bibir membulat menutup (u) → desis (s), semuanya satu gerakan.

Satu suku kata; tidak ada potongan.

**Kata utuh “haus”**

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Taruh satu tangan di depan mulut dan satu tangan di leher. | N |
| 2 | Buka mulut lebar dan embuskan napas hangat dari tenggorokan (“h”); rasakan hangat di tangan, leher belum bergetar. | J·N |
| 3 | Tanpa berhenti, mulai bersuara “a”; getar di leher mulai terasa. | N |
| 4 | Sambil terus bersuara, bulatkan dan dekatkan bibir menuju “u”: “au” adalah satu gerakan mulus, bukan dua bunyi terpisah. | J |
| 5 | Lanjutkan tanpa jeda ke “s”: dekatkan ujung lidah ke gusi dengan celah sempit; getar berhenti dan udara dingin terasa di tangan. | J·N |
| 6 | Hitung semuanya sebagai satu ketukan (satu suku kata menurut ejaan; diftong “au” tidak dipenggal). | J |
| 7 | Ulangi tiga kali pelan, lalu tiga kali dengan kecepatan bicara biasa. | T |

### Landasan *(untuk pemilik produk; tidak tampil di UI)*

| Hal | Isi |
|---|---|
| Kategori | (g) kebutuhan dasar · ID riset W24 |
| Pemotongan | **haus** (diftong “au” tidak dipenggal, sehingga “haus” adalah **satu suku kata**) |
| Rincian bunyi | h + au + s (3 bunyi; “au” = 1 gerakan) |
| Potongan latihan | L1: a, u → L3: haus (satu suku kata; tiga gerakan dalam satu ketukan: h → au → s) |
| Sudah ada di latihan terukur | Hanya vokal a dan u |
| Kemudahan | Sedang (1 suku kata, tetapi bunyi “h” dan “s” tidak terlihat dan ada diftong) |
| Kenapa penting | Kebutuhan dasar; diminta pengguna alat komunikasi (“Thirsty” 2 kali, “Drink” 3 kali) |
| Sumber | **Langsung:** S7 saja (diterjemahkan dari “Thirsty” dan “Drink”) |
| Kekuatan | C/D |
| Catatan jujur | **Hanya satu sumber lemah**, bukan tuli, konteks Kanada. Kategorinya kebutuhan dasar, **bukan darurat**. Dipilih atas permintaan tim karena mudah dilatih dan bermakna sehari-hari. |

---

# D. Kartu bunyi (bantuan; opsional ditampilkan)

Bunyi-bunyi yang membentuk kedelapan kata. Dipakai ulang di langkah suku kata dan kata utuh di Bagian C.

### Vokal “a”  `kp_bunyi_a`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Lihat cermin atau layar: buka mulut lebar, rahang turun, bibir tidak membulat dan tidak melebar. | J |
| 2 | Taruh telapak tangan di leher, tepat di bawah dagu. | N |
| 3 | Keluarkan suara panjang “aaa” dan rasakan getar di leher. | N |
| 4 | Tahan sekitar 2 detik, lalu berhenti. | T |

### Vokal “i”  `kp_bunyi_i`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Lihat cermin atau layar: lebarkan bibir ke samping seperti tersenyum, rahang hampir menutup, gigi atas dan bawah hampir bertemu. | J |
| 2 | Taruh telapak tangan di leher. | N |
| 3 | Keluarkan suara panjang “iii” dan rasakan getar di leher. | N |
| 4 | Tahan sekitar 2 detik, lalu berhenti. | T |

### Vokal “u”  `kp_bunyi_u`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Lihat cermin atau layar: bulatkan bibir dan majukan seperti meniup lilin kecil; bukaan kecil, rahang hampir menutup. | J |
| 2 | Taruh telapak tangan di leher. | N |
| 3 | Keluarkan suara panjang “uuu” dan rasakan getar di leher. | N |
| 4 | Tahan sekitar 2 detik, lalu berhenti. | T |

### Vokal “o”  `kp_bunyi_o`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Lihat cermin atau layar: bulatkan bibir dengan bukaan sedang, lebih terbuka daripada saat “u”; rahang turun sedikit. | J |
| 2 | Taruh telapak tangan di leher. | N |
| 3 | Keluarkan suara panjang “ooo” dan rasakan getar di leher. | N |
| 4 | Di suku kata tertutup seperti “long”, bentuk bibir sedikit lebih santai dan terbuka daripada “o” sendirian. | J |

### Diftong “au” (satu gerakan)  `kp_bunyi_au`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Mulai dengan bentuk “a”: mulut terbuka lebar. | J |
| 2 | Sambil terus bersuara, gerakkan bibir membulat dan mendekat menuju bentuk “u”. | J |
| 3 | Lakukan sebagai satu gerakan mulus tanpa berhenti di tengah; hitung sebagai satu ketukan. | J |
| 4 | Rasakan getar di leher selama gerakan. | N |

### Konsonan “p”  `kp_bunyi_p`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Rapatkan kedua bibir. | J |
| 2 | Taruh satu tangan di depan bibir dan satu tangan di leher. | N |
| 3 | Lepas bibir dengan hembusan kecil yang terasa di tangan depan bibir; jangan terlalu keras. | J |
| 4 | Di leher tidak ada getar saat bibir terlepas. | N |

### Konsonan “b”  `kp_bunyi_b`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Rapatkan kedua bibir. | J |
| 2 | Taruh satu tangan di leher. | N |
| 3 | Mulai bersuara saat bibir masih rapat: getar di leher sudah terasa sebelum bibir lepas. | N |
| 4 | Lepas bibir dengan lembut. | T |

### Konsonan “m”  `kp_bunyi_m`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Rapatkan kedua bibir. | J |
| 2 | Taruh satu jari di sisi hidung dan satu tangan di leher. | N |
| 3 | Bersuara dengan bibir tetap rapat: udara keluar lewat hidung, bukan lewat mulut. | J |
| 4 | Rasakan getar di sisi hidung dan di leher. | N |

### Konsonan “t”  `kp_bunyi_t`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Tempelkan ujung lidah di bagian belakang gigi seri atas. | J |
| 2 | Taruh satu tangan di depan mulut dan satu tangan di leher. | N |
| 3 | Lepas lidah dengan hembusan kecil; leher tidak bergetar saat lepas. | J·N |
| 4 | Di akhir suku kata (mis. “sakit”, “obat”, “alamat”): tempelkan lidah lalu berhenti, tanpa melepaskan hembusan. | J |

### Konsonan “l”  `kp_bunyi_l`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Naikkan ujung lidah ke gusi, yaitu bagian keras tepat di belakang gigi atas. | N |
| 2 | Bersuara sambil lidah menempel: udara mengalir lewat sisi lidah. | J |
| 3 | Rasakan getar di leher; tidak ada hembusan di tangan depan mulut. | N |

### Konsonan “s”  `kp_bunyi_s`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Dekatkan ujung lidah ke gusi belakang gigi atas dengan celah sempit (jangan menempel); gigi hampir rapat. | J |
| 2 | Taruh satu tangan di depan mulut dan satu tangan di leher. | N |
| 3 | Embuskan udara terus-menerus sampai terasa dingin di tangan. | N |
| 4 | Leher tidak bergetar. | N |

### Konsonan “k”  `kp_bunyi_k`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Naikkan bagian belakang lidah sampai menyentuh langit-langit di bagian belakang mulut. | J |
| 2 | Taruh satu tangan di depan mulut dan satu tangan di leher. | N |
| 3 | Lepas dengan hembusan kecil; leher tidak bergetar saat lepas. | J·N |

### Konsonan “n”  `kp_bunyi_n`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Tempelkan ujung lidah seperti pada “t”; mulut tertutup oleh lidah. | J |
| 2 | Taruh satu jari di sisi hidung dan satu tangan di leher. | N |
| 3 | Bersuara: udara keluar lewat hidung. | J |
| 4 | Rasakan getar di sisi hidung dan di leher. | N |

### Konsonan “ng” (satu bunyi)  `kp_bunyi_ng`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Naikkan bagian belakang lidah ke langit-langit belakang, seperti pada “k”, tetapi sambil bersuara. | J |
| 2 | Taruh satu jari di sisi hidung dan satu tangan di leher. | N |
| 3 | Alirkan suara lewat hidung dan rasakan getar di sisi hidung dan di leher. | N |
| 4 | “Ng” adalah satu bunyi: jangan menambahkan “g” sesudahnya. | J |

### Konsonan “h”  `kp_bunyi_h`

| No | Langkah (teks UI) | Landasan |
|---|---|---|
| 1 | Buka mulut sedikit. | T |
| 2 | Taruh satu tangan di depan mulut dan satu tangan di leher. | N |
| 3 | Embuskan napas hangat dari tenggorokan, seperti mengembunkan kaca. | J·T |
| 4 | Rasakan hangat di tangan; leher tidak bergetar. | N |

---

# E. Landasan dan catatan *(untuk pemilik produk; tidak tampil di UI)*

## Perubahan v3 dan v4

| Perubahan | Isi |
|---|---|
| **Tidak ada lagi frasa dua kata** | “Saya tuli” dan “Tolong tulis” dilepas. Diganti **Makan** dan **Haus**. Pesan “Saya tuli” dan “Mohon tulis” tetap ada sebagai **teks di Kartu Darurat**. |
| **Langkah pengucapan** | Setiap potongan dan kata utuh punya langkah bernomor, ditambah kartu bunyi. |
| **v4: satu berkas** | Berkas “Kata Penting dan Landasan” dan “Instruksi Pengucapan” digabung. |
| Tetap dari v2 | Ambulans dan Pemadam kebakaran dilepas; Obat dan Alamat masuk. Tombol Ambulans, Polisi, Pemadam Kebakaran tetap ada di Kartu Darurat (untuk ditunjuk). |

> **Trade-off yang harus diketahui.** Dua frasa yang dilepas adalah dua butir dengan dukungan **terkuat** di riset (masing-masing 4 sumber). Penggantinya (Makan, Haus) hanya didukung **satu sumber lemah (S7)** dan termasuk kebutuhan dasar, bukan darurat. Akibatnya **empat dari delapan kata kini berlandasan lemah** (Tolong, Obat, Makan, Haus). Pesan identitas komunikasi tidak hilang, tetapi pindah ke Kartu Darurat sebagai teks, yang memang sesuai dengan anjuran sumber (kartu, bukan ucapan).

## Landasan langkah pengucapan

Setiap langkah di kolom “Landasan” diberi kode:

| Kode | Arti | Sumber |
|---|---|---|
| **J** | **Fakta bunyi bahasa Indonesia**: tempat dan cara membentuk bunyi; /p t k/ tidak diikuti embusan keras dan tidak dilepas di akhir suku kata; /t/ di gigi; vokal sedikit lebih terbuka di suku kata tertutup; “au” sebagai diftong | Soderberg dan Olson (2008), “Indonesian”, *Journal of the International Phonetic Association* 38(2), https://www.cambridge.org/core/journals/journal-of-the-international-phonetic-association/article/indonesian/AE405481B94A4E0B7234A8BBE9C6F5FD ; ejaan: lihat “Kaidah pemenggalan” di bawah |
| **N** | **Petunjuk visual dan rabaan untuk pembelajar tuli**: tangan di leher untuk getar, jari di sisi hidung untuk bunyi hidung, tangan di depan mulut untuk aliran udara, cermin atau video untuk bentuk bibir, rabaan posisi lidah (gusi di belakang gigi) | NTID/RIT, panduan untuk pengajar siswa tuli: https://www.rit.edu/ntid/slpros/instruction/articulation/distinctive dan https://www.rit.edu/ntid/slpros/instruction/articulation/linking |
| **T** | **Tafsiran kami**: urutan langkah, ketukan, jumlah pengulangan, dan penjelasan bahasa sehari-hari. Tidak ada bukti khusus yang kami temukan. | — |

Latar belakang yang lebih lemah (tingkat D, catatan pelatihan guru): melatih bicara dari **bunyi ke suku kata ke kata** dan memakai petunjuk visual, rabaan, dan gerak bersama-sama, https://www.thespecialteacher.in/tag/paper-no-5/ dan https://my.dev.vanderbilt.edu/bireleylanguageacquisition/?p=19.

## Kata yang dilepas

| Kata | Pemotongan (kaidah) | Alasan dilepas |
|---|---|---|
| Saya tuli | sa-ya tu-li | **Dua kata** (permintaan v3: hanya satu kata per butir). Dukungan kuat (S8, S9, S12, S13), tetapi semua sumber menyajikannya sebagai kartu, bukan ucapan. **Tetap ada sebagai teks “SAYA TULI” di Kartu Darurat.** |
| Tolong tulis | to-long tu-lis | **Dua kata.** Dukungan kuat (S9, S11, S12, S13); inti anjurannya tulisan. **Tetap ada sebagai teks “Mohon TULIS atau KETIK di HP” di Kartu Darurat.** |
| Ambulans | am-bu-lans (kaidah c untuk “mb”; gugus “ns” di akhir) | 3 suku kata dengan gugus konsonan mb dan ns. Dukungan langsung hanya dari S4 dan S5 (resmi, bukan Indonesia). |
| Pemadam kebakaran | pe-ma-dam ke-ba-ka-ran | 7 suku kata dengan banyak bunyi lidah. Dukungan langsung hanya dari satu sumber resmi non-Indonesia (S5). |

Ambulans, Polisi, dan Pemadam Kebakaran tetap menjadi **tombol penunjuk** di Kartu Darurat.

## Pengganti yang dipertimbangkan tetapi tidak dipilih

| Kata | Pemotongan | Landasan | Kenapa tidak dipilih |
|---|---|---|---|
| Nama | na-ma | W20: S4 (resmi, bukan Indonesia) | Hanya 1 sumber; informasi identitas, bukan seruan |
| Lokasi | lo-ka-si | W19: S3, S4, S5, S8 | Persis seperti kata di sumber, tetapi lebih sulit daripada “alamat” |
| Minum | mi-num | W24: S7 saja (C/D) | Sama lemahnya dengan Haus dan Makan; dapat menggantikan “Haus” bila perlu |
| Ya / Tidak | ya · ti-dak | W23: S7, S10 | S10 memperingatkan orang tuli bisa menjawab “ya” untuk menyenangkan penanya |
| Dokter | dok-ter (kaidah c) | W3: S7 saja | 1 sumber lemah; gugus “kt” dan bunyi “r” |

## Sumber

### Landasan kata

| Kode | Sumber | Kekuatan | URL |
|---|---|---|---|
| S1 | Permenkominfo 10/2016, layanan 112 (Indonesia) | A | https://jdih.komdigi.go.id/produk_hukum/unduh-abstrak/278 |
| S2 | Siaran pers Komdigi, jenis darurat 112 (Mar 2025, Indonesia) | A | https://infopublik.id/kategori/siaran-pers/912067/siaran-pers-kurangi-risiko-bencana-saat-lebaran-komdigi-siagakan-layanan-darurat-112-dan-ews |
| S3 | Kemenkes, 119 via SATUSEHAT Mobile (Okt 2024, Indonesia) | A | https://kemkes.go.id/id/akses-darurat-medis-119-kini-bisa-melalui-satusehat-mobile |
| S4 | FDMA Jepang, panduan layanan ambulans bahasa Indonesia (bukan tuli) | A (resmi, bukan Indonesia) | https://www.fdma.go.jp/publication/portal/items/portal001_fryer_indonesian.pdf |
| S5 | ACMA Australia, poster Triple Zero bahasa Indonesia (bukan tuli) | A (resmi, bukan Indonesia) | https://www.acma.gov.au/sites/default/files/2019-12/indonesian-poster-triplezero.pdf |
| S6 | LangMedia, frasa darurat bahasa Indonesia (materi belajar bahasa) | D | https://www.langmedia.fivecolleges.edu/resources/indonesia/basic-communications/emergencies |
| S7 | Thankappan (2013), kosakata medis dan darurat pengguna alat komunikasi dengan cerebral palsy, n=10, Kanada (bukan tuli) | C/D | https://openresearch.ocadu.ca/id/eprint/162/1/MRP%202013%20-%20Sherly%20Thankappan.pdf |
| S8 | Massachusetts Emergency Services Card (MCDHH), kartu ikon Tuli/HH | B | https://www.mass.gov/info-details/emergency-services-card |
| S10 | UConn UCEDD, flipbook komunikasi petugas darurat (2020, AS) | D | https://uconnucedd.media.uconn.edu/wp-content/uploads/sites/3346/2021/08/Final-Communication-Flipbook-revised-2_13_2020.pdf |

### Kaidah pemenggalan

| Sumber | Dipakai untuk | URL |
|---|---|---|
| Pedoman Umum Ejaan Bahasa Indonesia, pemenggalan kata dan gabungan huruf konsonan (kh, ng, ny, sy) | Kaidah (a)–(d) dan aturan gabungan konsonan | https://id.wikisource.org/wiki/Pedoman_Umum_Ejaan_Bahasa_Indonesia_yang_Disempurnakan/Bab_I |
| Makalah yang mengutip aturan PUEBI (termasuk diftong ai, au, ei, oi) | Penegasan kaidah PUEBI | https://core.ac.uk/download/235045759.pdf |
| IndonesianPod101, “Survival Phrases 46: Help” (contoh “to-long”, “po-li-si”) | Contoh pemotongan pada pengajaran bahasa | https://www.indonesianpod101.com/lesson/survival-phrases-46-help |

Skala kekuatan: **A** = tinjauan sistematis, RCT, statistik atau pedoman resmi nasional · **B** = studi terkontrol non-acak, survei besar, pedoman profesi · **C** = pilot, seri kasus, n<30 · **D** = opini, skripsi atau tesis, berita, situs vendor.

## Keterbatasan

**Landasan kata**
1. Sumber resmi Indonesia hanya memberi jenis darurat dan meminta penelepon menjelaskan kondisi. Daftar kata baku, pedoman komunikasi darurat khusus tuli, dan daftar isyarat darurat BISINDO atau SIBI **tidak ditemukan**.
2. **Empat kata berlandasan lemah**: Tolong (S6, S7), Obat (S4 hanya sebagai “pengobatan”, S7), Makan dan Haus (S7 saja, kebutuhan dasar).
3. “Alamat” adalah pilihan kata kami; sumber memakai “lokasi”.
4. Bukti mana yang lebih dipahami penolong, kata tunggal atau frasa, dari penutur tuli **tidak ditemukan**.
5. **Daftar ini daftar awal dari tim, belum divalidasi pengguna tuli.**

**Langkah pengucapan**
1. Panduan NTID ditujukan bagi **pengajar** siswa tuli. Memakainya sebagai petunjuk tertulis untuk berlatih sendiri adalah **tafsiran kami**.
2. **Tidak ditemukan bukti bahwa petunjuk tertulis seperti ini memperbaiki ucapan tanpa pengajar.** Satu-satunya bukti terkait di riset adalah satu kasus dewasa tuli (n=1) dengan isyarat taktil-visual yang membantu /g/ dan /ga/ (hanya abstrak).
3. Gerak lidah tidak terlihat dari luar, sehingga petunjuk untuk lidah bergantung pada rabaan dan aliran udara. Hasilnya tidak dijamin sama pada semua orang (analisis kami).
4. Langkah mengikuti pelafalan baku; variasi daerah ada.
5. Langkah ini **tanpa penilaian otomatis** dan tidak dijanjikan memperbaiki kejelasan bicara.
6. **Belum ditinjau ahli.** Disarankan satu guru bina wicara membaca minimal dua kata (mis. “tolong” dan “haus”) sebelum dipakai.

## Catatan teknis untuk tim kode

- Item bonus **“mau”** dan **“bau”** di SPEC dipecah `[ma, u]` dan `[ba, u]`, padahal menurut kaidah “au” adalah diftong yang tidak dipenggal (satu suku kata). Tidak berpengaruh pada materi aktif; perbaiki bila diaktifkan.
- Suku kata tertutup (long, kit, bat, mat, kan) dan kata “haus” tidak ada di model unit penilaian mesin, jadi seluruh kata di daftar ini dilatih **tanpa penilaian otomatis**.

## Kalimat aman untuk pitch

> “Kata dipilih dari komponen yang paling sering muncul pada panduan komunikasi darurat (nama layanan, api, nyeri, pengobatan, lokasi) dan kebutuhan dasar (makan, haus). Daftar ini awal dan belum divalidasi pengguna tuli. Petunjuk pengucapan memakai petunjuk visual dan rabaan yang lazim dalam pengajaran bicara untuk siswa tuli, dan belum terbukti memperbaiki ucapan. Latihan ini melengkapi kartu dan tulisan, bukan menggantikannya.”
