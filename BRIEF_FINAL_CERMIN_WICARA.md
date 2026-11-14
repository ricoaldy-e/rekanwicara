# BRIEF FINAL — Cermin Wicara (MVP untuk dikumpulkan)

**Status:** FINAL v1 · 13 November 2026
**Simpan di repo sebagai:** `docs/BRIEF_FINAL.md`
**Kedudukan:** berlaku di atas `CLAUDE.md`, `SPEC.md`, dan `README.md` bila ada pertentangan.
**Untuk:** tim teknis (kode dan teknologi). Keputusan produk dan konten sudah final di dokumen ini.

---

## 0. Cara memakai brief ini

1. Brief ini adalah hasil akhir keputusan produk. **Landasan, riset, dan latar belakang sengaja tidak dimasukkan**; itu dipegang pemilik produk. Jangan membuka `docs/riset/` atau `KONDISI_PROYEK.md` untuk memutuskan isi produk.
2. Setiap pekerjaan punya ID. **A = wajib**, **B = sebaiknya** (hanya bila semua A selesai dan waktu cukup), **C = roadmap** (jangan dikerjakan).
3. Brief ini ditulis **tanpa membaca kode**. Nama berkas dan jalur dicari sendiri. Bila kode berbeda dari asumsi di sini, laporkan perbedaannya.
4. Bila sebuah butir tidak bisa dipenuhi tanpa melanggar **batas keras (§8)**, **berhenti dan laporkan opsinya**. Jangan menyimpang diam-diam dan jangan menambal.
5. Titik awal: HEAD `7b06448`; 493 tes server dan 280 tes app lulus; jalur utama stabil. Tujuan hari ini adalah **menyelesaikan dan mengunci**, bukan menambah kemampuan.

---

## 1. Produk dalam satu halaman

| Hal | Isi final |
|---|---|
| Nama | Cermin Wicara |
| Pernyataan posisi | Alat bantu latihan mengucapkan kata dan frasa penting, dengan umpan balik visual atas bentuk mulut dan suara. **Melengkapi**, tidak menggantikan: kartu komunikasi, tulisan, bahasa isyarat, guru, dan terapis. Berlatih bicara adalah pilihan pengguna. |
| Pengguna utama | Orang tuli atau kurang dengar yang **bisa membaca instruksi sederhana**, belum pernah mendapat latihan bicara teratur, dan **memilih sendiri** berlatih. Remaja dan dewasa. **Status: hipotesis, belum divalidasi** (jumlah dan kebutuhannya belum terbukti). |
| Pengguna sekunder | Pendamping (opsional): orang dewasa yang melihat ringkasan, melakukan Uji Dengar, dan membawa laporan ke guru atau terapis. |
| Bukan sasaran sekarang | Anak yang belum bisa membaca; orang yang tidak ingin berlatih bicara. |
| Bukan produk ini | Terapi, penilaian medis, alat keselamatan, alat kesehatan, pengganti kartu atau tulisan atau isyarat. |

### Empat pekerjaan yang ingin diselesaikan pengguna

| Kode | Pekerjaan | Dilayani oleh |
|---|---|---|
| J1 | "Aku ingin berlatih mengucapkan kata atau suku kata dan melihat apakah bentuk mulut dan suaraku sudah sesuai." | Latihan Level 0–3 (mesin) |
| J2 | "Aku ingin tahu apakah orang di dekatku mendengar ucapanku dengan jelas." | Uji Dengar (manusia) |
| J3 | "Aku ingin cara cepat memberi tahu orang bahwa aku tuli dan meminta mereka menulis." | Kartu Darurat |
| J4 | (Pendamping) "Aku ingin melihat ringkasan latihan dan membawanya ke guru atau terapis." | Mode Pendamping, laporan teks |

### Persona kerja (ilustrasi, **bukan** hasil riset pengguna)

Dimas, 19 tahun, tuli sejak lahir, membaca instruksi sederhana, belum pernah belajar bicara teratur, memakai HP setiap hari. Ia ingin keluarga, tetangga, dan petugas lebih paham beberapa kata penting yang ia ucapkan. Ia tidak ingin meninggalkan bahasa isyarat. Persona ini hanya untuk menguji apakah alur masuk akal; jangan dikutip sebagai data.

### Yang harus terlihat oleh penilai

1. Masalah dan pengguna jelas dan batas produk jujur.
2. Alur berjalan penuh tanpa bantuan developer.
3. Fitur AI yang tampil: **MediaPipe (bentuk bibir) dan Parselmouth (suara) dengan aturan berambang**.
4. Klaim sesuai angka uji internal; tidak ada yang berlebihan.
5. Repo rapi: satu versi bertag, dokumen konsisten, lisensi lengkap.

---

## 2. Keputusan yang sudah final

| # | Keputusan | Dampak pada pekerjaan |
|---|---|---|
| K1 | **Tag di commit terbaru** (`7b06448` ditambah perubahan brief ini), **eksperimen ucapan tetap di balik gerbang**. Syarat: gerbang mati secara bawaan; dokumen selaras; Allosaurus tercantum di `THIRD_PARTY.md`; tidak ada klaim akurasi untuk eksperimen; demo berjalan dengan `DEBUG=false`. Bila syarat tidak terpenuhi tepat waktu, laporkan agar pemilik repo memilih tag di `eb32532`. | A7, A8 |
| K2 | **Kata berlidah (tolong, sakit, dan seterusnya) tidak dinilai mesin** di MVP. Ia hadir sebagai daftar frasa di halaman Kartu Darurat. Latihan bersama pendengar adalah B3. | A4, B3 |
| K3 | **Jembatan Level 0–2 ke Level 3 hanya di presentasi**: tampilkan jalur per kata. **Tanpa gating baru**, tanpa mengubah aturan kemajuan. | B2 |
| K4 | **Sasaran dewasa yang bisa membaca.** Pendamping opsional. | A3 |
| K5 | **Bingkai: kata dan frasa penting + Kartu Darurat.** Bukan janji keselamatan. | A4, A5 |
| K6 | **Materi:** sembunyikan "ibu" dan "bumi". Level 3 berlabel "uji coba". | A2 |
| K7 | **Tidak berubah:** kontrak API, ambang (`thresholds.yaml`), logika kemajuan, skema Supabase, dependensi, pipeline server. | §8 |
| K8 | **Eksperimen ucapan (Wav2Vec2, Allosaurus, Uji Gabungan) bukan fitur demo** dan tidak diklaim. | A5, A7 |

---

## 3. Kata dan materi final

### 3.1 Jalur latihan terukur (dinilai mesin)

| Level | Materi aktif |
|---|---|
| 0 | Tahan "aaa"; Pelan lalu keras |
| 1 | a, i, u, "mmm" |
| 2 | ma, mi, mu, pa, pi, pu, ba, bi, bu |
| 3 ("Latihan lanjutan (uji coba)") | mama, papa, bibi, pipi, apa, ubi, **abu\*** |
| Disembunyikan | **ibu, bumi** (juga e dan o yang sudah nonaktif) |
| Sebaiknya ditambah (B1) | **api** |

\* **Aturan "abu".** "Abu" memuat unit "bu" yang sama dengan "ibu" dan "bumi" (penutupan /b/ sebelum "u" sering terlewat pada 15 fps). Periksa hasil per kata di data evaluasi. Bila kinerjanya setara "ibu"/"bumi", sembunyikan juga. **Bila tidak ada data per kata, biarkan aktif** (Level 3 sudah berlabel uji coba) tetapi **jangan dipakai di demo**. Kata demo yang aman: **mama, papa**.

**Jumlah materi aktif yang diharapkan:** 22 dengan "abu" aktif dan tanpa "api" (2 + 4 + 9 + 7); 23 bila "api" ditambah; 21 bila "abu" disembunyikan dan "api" tidak ditambah.

### 3.2 Kata Penting (daftar frasa; **tanpa penilaian mesin**)

| Frasa | Cara ucap |
|---|---|
| Tolong | to-long |
| Api | a-pi |
| Sakit | sa-kit |
| Saya tuli | sa-ya tu-li |
| Tolong tulis | to-long tu-lis |
| Ambulans | am-bu-lans |
| Polisi | po-li-si |

Tampil di halaman Kartu Darurat (§4, A4). Setiap frasa wajib berlabel **"Tanpa penilaian otomatis"**. Bila "api" juga aktif sebagai materi latihan, beri tanda bahwa ia ada di jalur latihan.

### 3.3 Aturan mengaktifkan "api" (B1)

"Api" = unit [a][pi], tersusun dari bunyi Tahap A yang sudah ada.
- Aktifkan **hanya bila** minimal satu penutur merekam "api" benar ≥ 3 kali **dan** sistem memberi hijau pada ≥ 2 dari 3 percobaan itu.
- Tidak perlu angka akurasi baru dan **jangan menambahkan angka untuk "api" ke `EVAL_REPORT.md`** tanpa evaluasi sungguhan.
- Video contoh tidak wajib. Cadangan teks + emoji + ilustrasi bibir sudah sah.

### 3.4 Jalur kata (B2, presentasi)

Untuk setiap kata Level 3, tampilkan jalur: **vokal Level 1 dalam kata → suku kata Level 2 dalam kata → kata**. Diturunkan dari isi `units` di `items.json`. Contoh: "api" → a → pi → api; "mama" → ma → mama.
Hanya tampilan pengelompokan. **Tanpa perubahan aturan buka-kunci dan kelulusan.**

---

## 4. Alur end-to-end final

```
Buka app pertama kali
 └─ Onboarding (3 langkah): penjelasan → persetujuan tunggal + peran → PIN pendamping (opsional, boleh dilewati)
     └─ Kalibrasi (opsional): diam, a, i, u
         └─ Beranda "Misi hari ini"
              ├─ Sesi hari ini / pilih materi → Latihan: Lihat → Tiru → Hasil → Ulangi
              ├─ Jalur kata (B2)
              ├─ Kartu Darurat: tab [Kartu] [Kata Penting]
              ├─ Mode Pendamping (PIN): ringkasan, Uji Dengar, laporan, pengaturan
              └─ Tentang
Pembukaan berikutnya: langsung ke Beranda.
Operator (tersembunyi): Pengaturan, profil demo, layar eksperimen (hanya build pengembangan).
```

### Halaman dan perilaku final

| Halaman | Perilaku final | Perubahan dari kondisi sekarang | Kriteria terima |
|---|---|---|---|
| **Onboarding** | (1) Penjelasan: apa, bukan apa, pilihan, ada Kartu Darurat. (2) **Satu persetujuan** + pilih peran: "18 tahun atau lebih" atau "orang tua/wali dari pengguna di bawah 18 tahun"; catat versi teks dan waktu di profil lokal. (3) PIN pendamping **opsional**. | Dua persetujuan terpisah (pengguna dan pendamping) diganti satu persetujuan + peran. PIN boleh dilewati. | Bisa selesai tanpa PIN. Mode Pendamping tanpa PIN menawarkan pembuatan PIN lebih dulu. Teks sesuai Lampiran A. Ada tes. **Tanpa mengubah skema Supabase.** |
| **Kalibrasi** | 4 langkah × 3 detik, **opsional**; teks menyebut hasil lebih tepat bila dikalibrasi. | Hanya teks. | Tetap bisa dilewati. |
| **Beranda** | Misi hari ini, daftar materi per level, banner kalibrasi, **tautan Kartu Darurat**, Mode Pendamping, Tentang. Level 3 berjudul "Latihan lanjutan (uji coba)" dengan catatan. | "Ibu"/"bumi" hilang. Judul Level 3. Tautan Kartu Darurat. | Daftar sesuai §3.1. Sesi harian dan "Buka semua materi" **tidak** memunculkan materi tersembunyi. |
| **Latihan** | Lihat (video contoh bila ada; bila tidak, teks besar + emoji + ilustrasi bibir) → Tiru → Hasil → Ulangi. | Tidak berubah. Cadangan tanpa video dianggap sah. | Tidak ada regresi. |
| **Hasil** | Dua lencana, satu petunjuk, Peta Vokal, Cermin Bibir, grafik (Level 0), label "perkiraan sistem". Level 3 menambah catatan "Penilaian kata: uji coba." | Satu baris catatan di Level 3. | Catatan tampil hanya di Level 3. |
| **Jalur kata** (B2) | Lihat §3.4. | Baru, presentasi saja. | Aturan kemajuan tidak berubah. |
| **Kartu Darurat** (A4) | Layar statis, **offline**, tanpa jaringan dan tanpa penyimpanan data. Dua tab. **Kartu:** pilih "Saya Tuli" atau "Saya Kurang Dengar"; teks besar; tiga tombol ikon ("Saya butuh": Ambulans, Polisi, Pemadam Kebakaran) yang bila ditekan menampilkan teks besar "SAYA BUTUH …"; label kecil "Contoh prototipe…" (§A.7). **Kata Penting:** daftar §3.2. | **Baru.** | Terbuka dalam mode pesawat. Teks ≥ ukuran besar tema. Tanpa bunyi. Warna + ikon + teks. Label prototipe dikendalikan **satu konstanta** (`CARD_REVIEWED`, bawaan `false`). |
| **Mode Pendamping** | PIN, ringkasan 7 hari, Uji Dengar, laporan teks, pengaturan sesi. | Teks Uji Dengar menyebutnya **pengamatan**. Setelan "Level 3 lulus setelah satu Uji Dengar jelas" **mati secara bawaan** (periksa default). | Default mati. PIN tidak diklaim sebagai pengamanan kuat. |
| **Tentang** | Untuk apa, untuk siapa, yang bukan, privasi, batasan, versi. | Teks baru (§A.9). | Tidak ada frasa terlarang (§7). |
| **Pengaturan (tersembunyi)** | URL server, profil demo, tombol eksperimen hanya di build pengembangan. | Tidak berubah. | Tombol eksperimen tidak tampil di alur demo. |
| **Dataset / eksperimen** | Mati atau tergerbang. | Tidak berubah. | Tidak ada di alur demo. |

---

## 5. Mekanisme: siapa menilai apa

| Aspek | Siapa atau apa yang menilai | Yang boleh dikatakan |
|---|---|---|
| Bibir rapat, vokal a/i/u, suara saat bibir rapat | Mesin (MediaPipe + Parselmouth + aturan berambang) | "Perkiraan sistem untuk latihan." Angka uji internal boleh dikutip apa adanya (§7). |
| Status kata Level 3 | Mesin, **uji coba** | "Penilaian kata masih tahap uji coba dan bisa keliru." |
| Kata Penting (berlidah) | **Tidak dinilai.** Latihan dengan contoh cara ucap; pendengar manusia (B3). | "Tanpa penilaian otomatis." |
| Uji Dengar | Pendamping atau orang di dekat pengguna (manusia) | "Pengamatan." Bukan ukuran kejelasan bagi orang lain; orang yang akrab cenderung lebih mudah memahami. |
| Kemajuan | Aturan latihan rancangan tim | Ditulis sebagai **aturan latihan**, bukan "terbukti". |
| Eksperimen ucapan | Wav2Vec2 (teks yang terbaca), Allosaurus, Uji Gabungan | "Prototipe, belum divalidasi." "Berhasil" hanya berarti teks yang terbaca cocok dengan target. |

**Aturan kemajuan (TIDAK DIUBAH):** lulus bila ≥ 8 hijau dari 10 percobaan terakhir di ≥ 2 sesi; ulasan 1/3/7/14 hari; macet bila < 40% hijau pada 3 sesi; pola berblok lalu acak; umpan balik berkurang hanya di Level 3 acak.

**Fakta uji internal yang harus konsisten di semua teks** (tiga penutur dewasa pendengar, anggota tim, satu jenis HP, ruang tenang, pengujian leave-one-speaker-out): bibir rapat 56/60, suara saat bibir rapat 43/50, vokal a/i/u 19/23 (target 85% belum tercapai), status kata 12/22 (target 80% belum tercapai).

---

## 6. Pekerjaan dan kriteria terima

### A — Wajib (tanpa semua ini, jangan membuat tag)

| ID | Pekerjaan | Kriteria terima |
|---|---|---|
| **A1** | **Uji perangkat demo.** Pasang Expo Go SDK 58 (Android bila itu perangkat demo), login Expo yang sama dengan CLI, perbarui IP di `app/.env` atau lewat Pengaturan, izinkan port 8000. Jalankan skenario Lampiran B. **Dikerjakan di HP yang akan dipakai demo.** | Skenario B lolos tanpa crash. "Mama benar" dan "mama salah" menghasilkan hasil berbeda. "Wajah keluar bingkai" menghasilkan "ulangi", bukan skor. Waktu hasil dicatat dari ≥ 10 percobaan (p50 dan p90). Bug Android yang kecil diperbaiki; sisanya dicatat dengan tingkat keparahan. **Jangan mengubah ambang untuk Android**; bila hasil berbeda, catat sebagai batasan. Hasil ditulis di `docs/I1_CHECKLIST.md`. |
| **A2** | **Materi dan label (K6).** Sembunyikan "ibu" dan "bumi" dari sisi pengguna. Terapkan aturan "abu" (§3.1). Beri Level 3 judul "Latihan lanjutan (uji coba)" + catatan. Sesuaikan tes dan teks yang menyebut jumlah materi. | **PENTING:** pemrosesan data yang sudah direkam **tidak boleh rusak**. Periksa dulu cara item `active:false` (contoh e dan o) ditangani oleh `/v1/analyze`, `/v1/dataset/upload`, `/labeler`, `ml/dataset/process.py`, dan `ml/eval`. Klip "ibu" dan "bumi" di `data/raw` harus tetap bisa diproses ulang. **Bila `active:false` membuatnya ditolak, berhenti dan tanyakan opsi** (misalnya field `hidden`) sebelum mengubah. Jumlah materi di Beranda sesuai §3.1. |
| **A3** | **Onboarding (K4).** Satu persetujuan + peran; PIN opsional; catat versi dan waktu persetujuan di profil lokal; teks sesuai Lampiran A.1–A.3. | Lihat tabel halaman. Tes untuk: selesai tanpa PIN, Mode Pendamping tanpa PIN, persetujuan wajib dicentang, peran wajib dipilih. |
| **A4** | **Kartu Darurat (K2, K5).** Dua tab sesuai tabel halaman dan Lampiran A.7–A.8. Tautan dari Beranda dan dari Tentang. | Offline. Tidak ada permintaan jaringan. Konstanta `CARD_REVIEWED=false` menampilkan label prototipe; `true` menyembunyikannya. Tes render untuk kedua varian ("Saya Tuli", "Saya Kurang Dengar") dan pemilihan layanan. |
| **A5** | **Teks pengguna dan klaim.** Audit seluruh UI, `README.md`, `docs/MODEL_CARD.md`, layar Tentang, laporan Mode Pendamping, dan `CLAUDE.md` terhadap daftar §7. Terapkan teks Lampiran A. Update teks Uji Dengar. Pastikan setelan "Level 3 lulus setelah Uji Dengar" mati secara bawaan. | `grep` tanpa hasil untuk frasa terlarang (§7), dilampirkan di laporan. Validator konten yang ada tetap lulus. **Jangan menulis kata "diagnosis" di UI meski dalam negasi**; pakai "penilaian medis atau klinis". |
| **A6** | **Privasi: penghapusan rekaman.** Periksa jalur penghapusan file rekaman di HP setelah: selesai kirim, ulang, keluar layar, kamera ditutup saat merekam. Perbaiki jalur yang bocor. | Bila **terbukti** terhapus di semua jalur, teks persetujuan boleh menulis "salinan di HP juga dihapus". **Bila tidak terbukti**, pakai kalimat cadangan di Lampiran A.2 ("dirancang untuk dihapus"). Catat hasil di laporan. |
| **A7** | **Dokumen selaras.** Perbarui: `README.md` (sasaran, posisi, jalur utama vs eksperimen, cara pakai tiga langkah, batasan termasuk kebutuhan server di jaringan yang sama); `docs/MODEL_CARD.md` (sasaran, batasan, status eksperimen belum divalidasi, latensi 6–7 detik di atas target 5 detik, catatan lisensi); `CONTEXT.md` (nama remote yang benar `matasuara`, angka tes, status Wav2Vec2); `CLAUDE.md` (ganti "Wav2Vec2 ditunda" dengan "eksperimen tergerbang"; tambahkan bagian "Keputusan produk final" 12 baris yang menunjuk `docs/BRIEF_FINAL.md`); `docs/SUBMISSION_CHECKLIST.md` (angka tes terbaru); **`docs/THIRD_PARTY.md` (tambahkan Allosaurus: GPL-3.0, tidak dibundel ke submission; Wav2Vec2 checkpoint komunitas, Apache-2.0 menurut model card)**; `docs/PROGRESS.md` dan `docs/NEXT_STEPS.md`. | Tidak ada dokumen yang bertentangan satu sama lain atau dengan brief ini. Satu commit dokumen terpisah. |
| **A8** | **Verifikasi dan persiapan tag.** Jalankan: `pytest -q`, `ruff check` dan `ruff format --check`, Jest (ulangi sekali bila tes pertama `companion` timeout), `tsc --noEmit`, `expo lint`, `expo-doctor@1.21.6` (catat 19/20 atau 20/20 apa adanya). Cek endpoint eksperimen **404** pada `DEBUG=false`. Cek tidak ada sisa direktori sementara dan log tanpa nama berkas. **Siapkan** perintah tag dan hash commit rekomendasi di laporan. | Semua tes lulus; angka dicatat. **Jangan membuat tag dan jangan `push`**; itu keputusan pemilik repo. |

### B — Sebaiknya (hanya setelah semua A selesai dan waktu cukup)

| ID | Pekerjaan | Kriteria terima |
|---|---|---|
| B1 | Materi "api" (§3.3) | Aturan aktivasi terpenuhi; jumlah materi dan tes diperbarui |
| B2 | Jalur kata (§3.4) | Presentasi saja; aturan kemajuan tidak berubah |
| B3 | **Latih bersama pendengar** untuk Kata Penting: tombol di detail frasa → frasa tampil besar → pengguna mengucap → pendengar menekan "Jelas" atau "Belum jelas" → disimpan lokal dan tampil di ringkasan Mode Pendamping. **Tanpa kamera, mikrofon, atau rekaman.** | **Periksa kelayakan dulu**: bila perlu mengubah skema Supabase, aturan kemajuan, atau kontrak API, **lewati** (jatuh ke daftar statis). Pakai ulang komponen Uji Dengar bila memungkinkan. |
| B4 | Pangkas kalimat petunjuk yang lebih dari 8 kata menjadi ≤ 8 kata dengan makna sama, tanpa mengubah `hint_id`; ubah `hints.json` server dan salinan app bersamaan | Tes sinkron salinan tetap lulus |
| B5 | Selaraskan target eksperimen `combined` (Tolong, Saya Tuli, Hai, Makan) dengan §3.2 (tolong, saya tuli, tolong tulis, api, sakit; hapus "Hai" dan "Makan") | **Hanya bila tes hijau dan cepat.** Menyentuh `SPEC §5`, `schemas.py`, `types.ts`, fixture, dan tes pengunci. Bila tidak sempat, **cukup catat di dokumen bahwa daftar target eksperimen bersifat sementara.** |

### C — Roadmap (jangan dikerjakan)

Jalur kata dengan gating; latihan kata bebas dengan penilaian mesin; validasi eksperimen ucapan dengan penutur tuli; video isyarat; pengingat harian; APK dan `eas.json`; hosting server; pilot dengan mitra; TalkBack/VoiceOver penuh; cabang usia yang terverifikasi; ukuran hasil pilot (frekuensi latihan per minggu, hasil Uji Dengar per kata, laporan diri tentang keyakinan berbicara).

---

## 7. Aturan klaim dan teks

### Diizinkan
- "Alat bantu latihan", "umpan balik visual atas bentuk mulut dan suara", "hasil perkiraan sistem untuk latihan".
- "Melengkapi kartu, tulisan, dan bahasa isyarat." "Berlatih bicara adalah pilihan."
- Angka uji internal persis seperti di §5, **selalu bersama batasannya** (tiga penutur dewasa pendengar, satu jenis HP, ruang tenang; belum diuji pada penutur tuli atau anak).
- "Dirancang untuk", "uji coba", "prototipe", "rencana pilot bersama mitra".
- Menyebut Level 3 dan eksperimen sebagai uji coba atau prototipe.

### Dilarang (di UI, README, model card, dan teks lain)
- "terapi", "mengobati", "menyembuhkan", "memperbaiki bicara", "meningkatkan kejelasan bicara" **sebagai klaim**. Penyangkalan seperti "bukan terapi" atau "bukan pengganti guru atau terapis" boleh.
- "terbukti", "valid", atau "akurat" tanpa angka dan batasan.
- "keselamatan", "penyelamat", "agar kamu ditolong", dan janji bahwa ucapan akan dipahami orang lain.
- "siap rilis", "siap pakai publik" (yang benar: uji coba terbatas dengan server di jaringan yang sama). "Pertama" atau "satu-satunya".
- "AI menilai pelafalan seakurat terapis" atau sejenisnya.
- "Wav2Vec2" atau "Allosaurus" sebagai penilai pelafalan yang tervalidasi.
- Kata "normal", "abnormal", "gangguan", "diagnosis" di UI atau API (validator konten sudah menolaknya).
- Klaim penghapusan rekaman di HP bila A6 belum membuktikan.
- Klaim "umpan balik dikurangi bertahap", dosis latihan, atau kriteria lulus sebagai sesuatu yang terbukti. Tulis sebagai aturan latihan rancangan tim.

**Cara memeriksa:** `grep -rniE` pada UI dan dokumen untuk frasa di atas; gunakan batas kata untuk "terapi" (`\bterapi\b`) agar "terapis" tidak ikut. Lampirkan hasilnya di laporan.

---

## 8. Aturan kerja

### Batas keras (jangan diubah, jangan dilanggar)
- Kontrak API (`SPEC §5`), ambang di `thresholds.yaml`, logika `progression.ts`, skema Supabase, pipeline server, dan dependensi utama.
- Tidak menambah dependensi, layar baru di luar §4, atau model.
- Tidak ada isyarat bunyi; status selalu **warna + ikon + teks**; semua modul tersedia di Expo Go.
- Tidak ada `git push`, tidak ada tag, tidak mengubah remote. **Keputusan itu pada pemilik repo.**
- Tidak ada rekaman, nama berkas, atau path di log.
- Tidak mengubah `server/requirements.txt` (torch dan transformers hanya di `ml/`).

### Perlu persetujuan sebelum dikerjakan
Perubahan yang menyentuh kontrak API, ambang, aturan kemajuan, skema; penambahan dependensi; refactor besar; apa pun di luar daftar A dan B.

### Urutan kerja
1. **Paralel:** A1 dimulai sekarang oleh manusia di HP demo (agar bug perangkat ketahuan lebih awal), sementara agen mengerjakan A2 → A3 → A4 → A5 → A6.
2. Bila A2–A6 selesai dan waktu cukup: B1, B2, B3, B4, B5 berurutan. Berhenti di mana saja bila waktu habis.
3. A7 → A8 selalu terakhir. **Mulailah A7 dan A8 paling lambat ketika sisa waktu menyentuh ±3 jam sebelum kunci fitur.**
4. Satu pekerjaan, satu commit: `final <ID>: <ringkas>`. Tes yang relevan dijalankan sebelum commit.

### Aturan potong
- Bila satu butir A terhambat lebih dari 45 menit, laporkan dan lanjut ke butir berikutnya.
- Jangan menambah pekerjaan baru. Ide baru dicatat di `docs/NEXT_STEPS.md` sebagai roadmap.
- Dalam ±3 jam terakhir sebelum kunci: hanya verifikasi dan perbaikan bug yang terlihat saat demo.

---

## 9. Rilis dan konfigurasi demo

| Hal | Nilai |
|---|---|
| `server/.env` | `MOCK_MODE=false`, `DATASET_MODE=false`, `DEBUG=false` |
| `app/.env` | `EXPO_PUBLIC_DATASET_MODE=false`; `EXPO_PUBLIC_API_URL` = IP laptop saat ini |
| Supabase | **Kosong** (sinkron nonaktif, app tetap penuh) **atau** terkonfigurasi dan sudah diuji. Jangan setengah-setengah. |
| Video contoh | 16 berkas `data/model_videos/{item_id}.mp4` disalin lewat flashdisk bila ada; bila tidak, cadangan teks + ilustrasi dianggap sah |
| Pemanasan | Satu percobaan sebelum demo (request pertama ±5 detik) |
| Kebersihan repo | Tidak ada `.env`, `data/`, model besar, atau venv di repo |
| Berkas riset dan `KONDISI_PROYEK.md` | **Biarkan di luar commit** sampai pemilik repo memutuskan |
| Tag | Disiapkan (hash dan perintah di laporan), **dijalankan oleh pemilik repo** |

---

## 10. Di luar lingkup (jangan dikerjakan)

Mengubah arah menjadi aplikasi membaca; menilai konsonan lidah dengan mesin di alur utama; memvalidasi atau menyetel eksperimen ucapan; melatih atau fine-tuning model; mengganti teknologi; isyarat sebagai kondisi awal atau pengenalan isyarat; anak sebagai sasaran utama; kata darurat yang dipilih per pengguna; gating per kata; hosting atau akun pengguna; pengingat; APK.

---

## 11. Asumsi dan hal yang belum diketahui

- Brief ditulis tanpa membaca kode. Nama berkas, komponen, dan default setelan harus diverifikasi: terutama **default setelan "Level 3 lulus setelah Uji Dengar"**, **cara `active:false` ditangani di pipeline data**, dan **bagaimana PIN dibuat dan diperiksa** (untuk A3).
- Hasil per kata Level 3 mungkin tidak ada di `EVAL_REPORT.md`. Bila tidak ada, jangan mengarang; ikuti aturan "abu" (§3.1).
- Perangkat demo belum ditetapkan. A1 harus dijalankan di perangkat yang benar-benar dipakai.
- Teks Kartu Darurat **belum ditinjau penutur tuli**. Karena itu label prototipe wajib sampai pemilik produk mengubah konstanta.
- Kontak untuk permintaan penghapusan data (`<KONTAK TIM>`) diisi pemilik produk.

---

## 12. Format laporan akhir

1. Ringkasan per ID: selesai, sebagian, atau dilewati, **dengan alasan**.
2. Berkas yang diubah dan hash commit.
3. Hasil verifikasi (angka tes, `expo-doctor`, `grep` frasa terlarang, cek 404 eksperimen).
4. Hasil A1: perangkat, hasil skenario, p50/p90, bug dan statusnya.
5. Hasil A6: apakah penghapusan di HP terbukti.
6. Daftar hal yang tidak bisa dipenuhi dan alasannya.
7. Hash commit rekomendasi untuk tag dan perintahnya (**tidak dijalankan**).
8. Hal yang perlu keputusan pemilik produk.

---

## Lampiran A — Teks UI final

> Ganti `<KONTAK TIM>` dengan kontak sebenarnya. Teks berikut sudah menghindari kata yang ditolak validator.

### A.1 Onboarding, langkah 1: "Selamat datang di Cermin Wicara"
- Berlatih mengucapkan kata-kata penting, dengan umpan balik yang bisa kamu lihat.
- Cara kerja: **Lihat contoh → Tiru → Lihat hasil → Ulangi.**
- Aplikasi menilai bentuk mulut dan suaramu untuk beberapa bunyi dan kata. Hasilnya perkiraan untuk latihan.
- Ini bukan terapi dan bukan penilaian medis. Aplikasi tidak menggantikan guru, terapis, tulisan, kartu, atau bahasa isyarat.
- Berlatih bicara adalah pilihanmu. Kamu boleh berhenti kapan saja.
- Ada juga **Kartu Darurat** untuk menunjukkan cara berkomunikasi denganmu.
- Tombol: **Lanjut**

### A.2 Onboarding, langkah 2: "Sebelum mulai"
- Pilih satu: ◯ **Saya berusia 18 tahun atau lebih.** ◯ **Saya orang tua atau wali dari pengguna yang berusia di bawah 18 tahun.**
- Saat berlatih, kamera dan mikrofon merekam wajah dan suara selama 2–4 detik. Rekaman dikirim ke server aplikasi untuk dianalisis, lalu dihapus. Yang tersimpan hanya angka hasil latihan. Aplikasi tidak mengenali siapa dirimu dari wajah.
- **Kalimat penghapusan di HP.** Bila A6 membuktikannya: "Salinan di HP juga dihapus." Bila belum: "Salinan sementara di HP dirancang untuk dihapus setelah dikirim."
- Wajah dan suara termasuk data pribadi. Kamu bisa berhenti kapan saja dan meminta data latihanmu dihapus lewat `<KONTAK TIM>`.
- ☐ **Saya mengerti dan setuju rekaman dipakai seperti di atas.**
- Tombol **Setuju dan lanjut** aktif hanya bila peran dipilih dan kotak dicentang.

### A.3 Onboarding, langkah 3: "PIN pendamping (opsional)"
- Orang dewasa yang mendampingimu bisa melihat ringkasan latihan dengan PIN ini. Kamu boleh melewati langkah ini dan membuatnya nanti.
- Catatan kecil: PIN ini hanya pembatas sederhana, bukan pengamanan kuat.
- Tombol: **Buat PIN** · **Lewati**

### A.4 Beranda
- Kartu menu: **Kartu Darurat** — "Tunjukkan ke orang di sekitarmu."
- Judul Level 3: **Latihan lanjutan (uji coba)**. Catatan: "Penilaian kata masih tahap uji coba dan bisa keliru."

### A.5 Hasil, khusus Level 3
- "Penilaian kata: uji coba."

### A.6 Uji Dengar (Mode Pendamping)
- "Uji Dengar adalah pengamatan oleh pendamping. Orang yang akrab denganmu cenderung lebih mudah memahami ucapanmu, jadi hasilnya bukan ukuran seberapa jelas ucapanmu bagi orang lain."

### A.7 Kartu Darurat, tab Kartu
- Judul: **Kartu Darurat** · "Tunjukkan layar ini kepada orang di sekitarmu."
- Pilihan: **[Saya Tuli]** · **[Saya Kurang Dengar]**
- **Varian Saya Tuli:**
  - **SAYA TULI**
  - Mohon **TULIS** atau **KETIK** di HP. ✍️ 📱
  - Saya mungkin tidak bisa membaca bibir. Jangan berteriak.
- **Varian Saya Kurang Dengar:**
  - **SAYA KURANG DENGAR**
  - Mohon **TULIS** atau **KETIK** di HP. ✍️ 📱
  - Bicara pelan dan jelas, hadap saya. Mohon buka masker.
- **Saya butuh:** 🚑 **AMBULANS** · 👮 **POLISI** · 🚒 **PEMADAM KEBAKARAN**. Menekan salah satu menampilkan teks besar "SAYA BUTUH …" (satu pilihan aktif sekaligus).
- Saya bisa menunjuk atau menulis jawaban.
- Label kecil di bawah (tampil selama `CARD_REVIEWED=false`): **"Contoh prototipe. Belum ditinjau penutur tuli. Tidak menggantikan layanan darurat resmi."**
- **Jangan** menampilkan nomor telepon darurat di kartu.

### A.8 Kartu Darurat, tab Kata Penting
- Judul: **Kata penting untuk dilatih**
- Catatan: "Tanpa penilaian otomatis. Latih bersama orang di dekatmu."
- Daftar: lihat §3.2 (frasa + cara ucap). Setiap baris berlabel "Tanpa penilaian otomatis".
- (B3) Tombol di detail frasa: **Latih bersama pendengar**.

### A.9 Tentang
- **Untuk apa:** alat bantu latihan mengucapkan kata dan frasa penting, dengan umpan balik visual atas bentuk mulut dan suara.
- **Untuk siapa:** orang tuli atau kurang dengar yang bisa membaca instruksi sederhana dan memilih berlatih bicara. Pendamping opsional.
- **Yang bukan:** bukan terapi, bukan penilaian medis, bukan alat keselamatan. Tidak menggantikan guru, terapis, tulisan, kartu, atau bahasa isyarat.
- **Privasi:** rekaman dihapus setelah dianalisis; yang tersimpan hanya angka hasil latihan (kalimat penghapusan di HP mengikuti A6).
- **Batasan:** hasil uji internal memakai tiga penutur dewasa yang mendengar, satu jenis HP, dan ruang tenang. Belum diuji pada penutur tuli atau anak. Penilaian kata masih uji coba. Fitur eksperimen ucapan, bila tampil, adalah prototipe yang belum divalidasi. Saat ini aplikasi membutuhkan server latihan di jaringan yang sama. *(Perbarui kalimat "satu jenis HP" sesuai hasil A1.)*
- Versi aplikasi dan versi mesin server.

### A.10 `README.md`, bagian "Untuk siapa"
> Cermin Wicara adalah alat bantu latihan mengucapkan kata dan frasa penting untuk orang tuli atau kurang dengar yang bisa membaca instruksi sederhana dan memilih berlatih bicara. Aplikasi memberi umpan balik visual atas bentuk mulut dan suara, dan melengkapi (bukan menggantikan) kartu komunikasi, tulisan, bahasa isyarat, guru, dan terapis. Hasil uji internal memakai tiga penutur dewasa yang mendengar; aplikasi belum diuji pada penutur tuli atau anak. Saat ini aplikasi berjalan dengan server di laptop pada jaringan yang sama.

---

## Lampiran B — Skenario uji penerimaan

Jalankan dengan profil baru, server `DEBUG=false`, di perangkat demo.

| # | Langkah | Hasil yang diharapkan |
|---|---|---|
| 1 | Buka app pertama kali | Onboarding 3 langkah muncul |
| 2 | Pilih peran, centang persetujuan, **lewati PIN** | Masuk ke Kalibrasi tanpa error |
| 3 | Lewati atau jalani kalibrasi | Masuk ke Beranda |
| 4 | Periksa Beranda | Materi sesuai §3.1; tidak ada "ibu"/"bumi"; Level 3 berlabel uji coba; kartu Kartu Darurat ada |
| 5 | Latih "a", lalu "ma" | Hasil tampil; satu petunjuk |
| 6 | Latih "mama" benar, lalu "mama" dengan suara ditahan saat bibir rapat (terdengar "papa") | Hasil berbeda; yang salah menampilkan petunjuk |
| 7 | Rekam dengan wajah keluar bingkai | "Ulangi", tanpa skor, tidak dihitung |
| 8 | Buka Kartu Darurat dalam **mode pesawat** | Terbuka; kedua varian dan pilihan layanan berfungsi; label prototipe tampil |
| 9 | Buka Mode Pendamping tanpa PIN | Ditawari membuat PIN; setelah itu ringkasan, Uji Dengar, dan laporan terbuka |
| 10 | Buka Tentang | Teks sesuai §A.9; tidak ada frasa terlarang |
| 11 | Matikan server, coba latihan | Pesan jaringan yang jelas; tidak crash |
| 12 | Periksa endpoint eksperimen dengan `DEBUG=false` | **404**; layar eksperimen tidak ada di alur demo |
| 13 | Periksa cache app setelah beberapa percobaan dan keluar layar | Tidak ada sisa berkas rekaman |
| 14 | `grep` frasa terlarang (§7) | Tidak ada temuan |

---

## Tanggung jawab di luar tim teknis (dipegang pemilik produk)

Teks final bila ada perubahan; tinjauan Kartu Darurat oleh penutur tuli (lalu mengubah `CARD_REVIEWED`); kontak penghapusan data; keputusan perangkat demo; keputusan commit berkas riset; menjalankan tag dan `push`; mencabut token Expo lama; pesan ke panitia; video demo; submission; pitch deck.
