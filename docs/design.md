# DESIGN.md — Rekan Wicara

Versi 7.1 · 14 Nov 2026 (disesuaikan dengan Figma setelah implementasi FG-1 sampai FG-12; catatan per langkah di `docs/PROGRESS.md`) · Berlaku untuk `app/` (Expo, React Native, TypeScript strict, expo-router)

Dokumen ini mengatur **tampilan dan teks**. Perilaku produk mengikuti `docs/SPEC.md` (kontrak API di SPEC §5) dan alur layar mengikuti `docs/flow-srs-ui.md`. Bagian yang sengaja berbeda dari flow ditandai **[BEDA DARI FLOW]** dan butuh keputusan Rico (bagian 12).

## Sumber kebenaran visual

File Figma `C5mdKAfFngxd8dz1BvAZrO`, halaman **"Rekan Wicara · UI Final"** (36 layar, komponen di kiri kanvas: "Komponen" dan "Komponen · Interaksi"). Bila dokumen ini dan Figma berbeda, Figma yang menang untuk tampilan; perbarui dokumen ini.

## Arah gaya

Gelap, tenang, dan rapi, dengan rasa iPhone. Latar dan kartu **abu arang netral** (bukan hijau-hitam). **Hijau hutan hanya di kartu hero dan permukaan sejenis (3.2).** **Koral hanya di tab aktif dan cincin kemajuan.** Tombol utama krem. Kartu dipisahkan oleh selisih warna kecil **ditambah garis tepi tipis 1 dp**. Judul layar memakai serif Playfair Display Bold (tanpa miring); semua teks lain memakai Inter. Tanpa bayangan. Kotak dikurangi: bagian dipisah oleh ruang kosong, daftar dikelompokkan dalam satu kartu dengan pemisah tipis.

Inspirasi: aplikasi kebugaran "VibeMove" (Dribbble). Diambil: struktur, suasana, hierarki. **Tidak** diambil: maskot dan ilustrasi karakter, foto, teks miring (mengubah cara kata terbaca), navigasi tanpa label, teks di bawah 15, chip streak. Tidak ada kode atau aset yang disalin.

Versi 7 menggantikan versi 6 ("Hutan Malam" serba hijau). Dipertahankan: nama "Rekan Wicara", batas produk di `CLAUDE.md`, aturan tiga status, prinsip visual dulu.

## 0. Cara memakai (untuk agen)

- Baca seluruhnya sebelum mengubah UI, lalu buka Figma untuk layar yang disentuh.
- **Tata letak dan gaya boleh dirombak; logika dan data tidak.** Jangan mengubah state data, alur data, panggilan API, aturan progresi, dan rute tanpa persetujuan.
- **Pertahankan `testID` dan `accessibilityLabel`** yang ada. Tes yang memang harus berubah dicatat di `docs/PROGRESS.md`.
- Semua warna, ukuran, jarak, radius, dan font berasal dari `app/src/theme/index.ts`. Tidak ada hex atau ukuran literal di layar/komponen. Nilai baru ditambahkan sebagai token.
- Komponen bersama ada di `app/src/components/`. Pakai ulang sebelum membuat baru.
- **Font Inter disetujui** (paket `@expo-google-fonts/inter`, pola pemuatan sama dengan Playfair; bila gagal, kembali ke font sistem). Selain itu **tanpa dependensi baru** tanpa bertanya.
- Jangan membuat teks lebih kecil dari 15 dan target sentuh di bawah 48 dp.
- Kasus tak tercakup: pilih yang lebih sederhana, lebih datar, lebih kontras. Catat di `docs/PROGRESS.md`.
- Bagian **[BELUM DIVERIFIKASI]** belum diuji; jangan menyebutnya "teruji" di README, model card, atau video.

## 1. Produk dan nama

Alat latihan bicara untuk teman Tuli yang memilih berlatih. Umpan balik pendengaran diganti umpan balik visual. Alur: rekam video wajah dan suara 2–3 detik → dua indikator (**Bibir**, **Suara**) + umpan balik. Alat bantu latihan, bukan pengganti terapis wicara.

- Nama: **Rekan Wicara** (dua kata). Slug, folder, bundle id: `rekanwicara`.
- Status: **Sesuai**, **Mendekati** (hanya Level 1), **Belum sesuai** (kode API: hijau, kuning, merah). Tanpa skor angka.
- "Cermin bibir" dan "Peta vokal" adalah nama grafik di hasil.

## 2. Prinsip

1. **Visual dulu.** Tidak ada informasi yang hanya lewat suara. Getar pelengkap dan bisa dimatikan. Umpan balik "Suara" memakai pembanding visual (3.3 dan 6.5), bukan kata yang merujuk pendengaran saja.
2. **Satu instruksi per layar.** Kalimat pendek, kata umum, ikon + teks.
3. **Warna tidak pernah membawa makna sendirian.** Status = bentuk ikon + label + warna.
4. **Kontras** teks minimal 4,5:1; garis dan ikon komponen minimal 3:1.
5. **Target sentuh minimal 48 dp** (tombol utama 52). Jarak antar target minimal 12 dp. Ikon tanpa label tidak boleh menjadi satu-satunya penanda aksi.
6. **Teks mengikuti pengaturan sistem.** Tata letak tidak pecah di skala 200%.
7. **Satu tombol primer (krem) per layar.**
8. **Tanpa bayangan.** Bisa ditekan terlihat dari bentuk: kapsul, `›`, garis tepi, atau ikon.
9. **Jujur.** UI tidak mengklaim hal yang tidak dilakukan app, dan tidak menampilkan angka tanpa sumber data.
10. **Alur rekam sampai hasil lebih penting daripada kerapian.**
11. **Aksi berbahaya tidak menjadi pilihan utama.** Di konfirmasi, pilihan aman (Batal, Lanjut berlatih) selalu tombol krem di atas; aksi merusak (Hapus, Keluar) tombol merah di bawah (5.12).

## 3. Token (sumber: `app/src/theme/index.ts`)

### 3.1 Warna

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `background` | `#141414` | latar layar |
| `surface` | `#262626` | kartu, ubin, daftar, tombol kembali |
| `surfaceRaised` | `#323232` | ubin dalam kartu, saat ditekan, nonaktif |
| `hairline` | `#424242` | garis tepi kartu (1 dp), pemisah daftar |
| `border` | `#8E8E8E` | garis kontrol: kolom isian, tombol sekunder |
| `text` | `#F7F7F4` | teks utama |
| `textMuted` | `#ABABA7` | teks pendukung |
| `primary` / `onPrimary` | `#F7F7F4` / `#141414` | tombol utama |
| `primaryPressed` | `#D6D6D2` | tombol utama ditekan |
| `hero` | `#41604F` | satu-satunya permukaan hijau (kartu hero, avatar, logo) |
| `onHero` / `onHeroMuted` | `#FAFAF7` / `#E6EEE8` | teks di atas hero |
| `accent` / `onAccent` | `#E8693F` / `#141414` | tab aktif dan cincin kemajuan saja |
| `danger` / `dangerPressed` | `#FF8FA3` / `#E57990` | status Belum sesuai, tombol hapus, galat |
| `success` | `#7FD1A0` | status Sesuai, sakelar aktif, centang |
| `warning` | `#F2C14E` | status Mendekati |
| `focus` | `#FFB300` | cincin fokus |
| `infoBg` / `warningBg` | `#2C2C2C` / `#33232A` | catatan |
| `segment` | `#636366` | cadangan segmented control |
| `overlay.background` | `#000000` | lapisan kamera |
| `overlay.record` | `#C62828` | indikator rekam |

Kontras yang dihitung (rumus WCAG, 14 Nov 2026):
- `text` di `background` 17,16 · di `surface` 14,10 · di `surfaceRaised` 11,95.
- `textMuted` di `background` 8,00 · di `surface` 6,57 · di `surfaceRaised` 5,56.
- `onHero` di `hero` 6,67 · `onHeroMuted` di `hero` 5,90.
- `onPrimary` di `primary` 17,16 · `onPrimary` di `accent` 5,72 · di `danger` 8,52.
- `border` di `background` 5,62 · di `surface` 4,62 · di `surfaceRaised` 3,91.
- `success` di `surface` 8,31 · `warning` 9,02 · `danger` 7,00. Di `surfaceRaised`: 7,04 / 7,64 / 5,93.
- `focus` di `background` 10,26.
- **Selisih permukaan sengaja kecil:** `surface` ke `background` 1,22; `surfaceRaised` ke `surface` 1,18; `hairline` ke `surface` 1,51. Pemisah kartu bergantung pada garis tepi `hairline`, bukan pada selisih fill saja. Garis `hairline` dan trek cincin bersifat dekoratif; informasi dibawa teks dan angka.
- `hero` ke `background` hanya 2,64: hero adalah permukaan, bukan kontrol.

### 3.2 Aturan warna

- `hero` untuk kartu hero (Beranda), kartu petunjuk (Hasil), kartu privasi (onboarding), avatar, ubin logo, serta chip dan garis kartu penanda "Berikutnya" (Jalur kata). Tidak untuk tombol atau status.
- `accent` hanya untuk penanda tab aktif (lingkaran di belakang ikon) dan cincin kemajuan (termasuk cincin tahap yang sedang berjalan di Menganalisis). Tidak untuk tombol, teks, atau status. Alasan: dekat dengan merah muda `danger`.
- `danger` penuh dipakai untuk badge status, tombol hapus/keluar (5.12), dan galat; tidak untuk dekorasi.
- Warna status tidak dipakai untuk tombol selain tombol berbahaya, kartu utama, atau dekorasi.
- Teks di atas `hero` memakai `onHero` atau `onHeroMuted`; jangan `textMuted`.
- Maksimal empat warna berbeda per layar di luar warna status.
- Hanya tema gelap pada versi ini.

### 3.3 Ukuran

| Kelompok | Token → nilai |
|---|---|
| Teks | `small` 15 · `body` 16 (baris 24) · `label` 16 · `large` 20 · `title` 24 · `titleLarge` 28 · `display` 34 · `hero` 56 (kata target layar dataset, khusus tim) |
| Ikon (`iconSize`) | chip 18 · field 20 · base 22 · button 24 · option 26 · note 28 · add 32 · status 34 · gate 48 |
| Jarak | 4 / 8 / 12 / 16 / 20 / 24 / 32 |
| Radius | `tile` 14 · `card` 20 · `sheet` 28 (sudut atas bottom sheet) · `dialog` 24 · `pill` 999 |
| Sentuh | `touchTarget` 48 · tombol utama 52 · tombol sekunder 48 · kunci PIN 76 |
| Garis | `hairline` 1 · kontrol 1 (semua state kolom isian, termasuk fokus) · cincin 4 (40 dp) |

Jarak antar kelompok 24, di dalam kelompok 8–12. Gutter layar 20 (Beranda, Hasil, daftar); 24 di Masuk, Daftar, dan onboarding. Token tata letak ada di `src/theme` (`layout`, `entry`, `session`, `result`, `wordList`, `pathCard`, `companion`).

## 4. Tipografi

- **Serif (Playfair Display Bold 700), hanya untuk:** nama pengguna dan wordmark di header, judul layar (28), judul hero (28), kata target besar (display 34), huruf di ubin (20 atau 24), teks di ubin langkah Jalur kata (24). Tanpa miring.
- **Sans (Inter, bobot 400 dan 700), untuk semua lainnya:** judul bagian (`label`, 16 Bold, dengan tautan kanan bila perlu), isi, tombol, label, angka, status.
- Hanya Inter 400 dan 700 yang dimuat: teks yang di Figma bertanda "Semi Bold" (segmented control) dirender Bold.
- Bila Inter atau Playfair gagal dimuat, kembali ke font sistem dan serif sistem; app tetap jalan.

| Gaya | Ukuran | Bobot | Dipakai untuk |
|---|---|---|---|
| display | 34 | 700 serif | kata target besar |
| titleLarge | 28 | 700 serif | judul layar, judul hero |
| title | 24 | 700 serif | judul kartu hasil, nama |
| serif 20 | 20 | 700 serif | sapaan, wordmark, huruf ubin |
| large | 20 | 700 | judul dialog, nama materi |
| label | 16 | 700 | judul bagian, teks tombol, label status |
| body | 16 (baris 24) | 400 | instruksi, penjelasan |
| small | 15 (baris 22) | 400 / 700 | keterangan, label kolom, disclaimer |

- **Tidak ada teks di bawah 15.** Tanpa miring di mana pun. Teks kapital semua hanya untuk lencana "MEREKAM".
- `allowFontScaling` aktif; `maxFontSizeMultiplier={2}` pada teks di tombol, badge, ubin, dan bar bawah.
- Angka hitung mundur di lapisan kamera 140 dp, bobot 700, di tengah oval (diukur dari bentuk huruf, bukan kotak teks); selama merekam angka menampilkan sisa detik.

## 5. Komponen

Di Figma semua komponen di bawah ada di "Komponen" dan "Komponen · Interaksi" (ikon, Button, Field, LevelTile, StatusBadge, BottomBar, Logo). Yang belum menjadi komponen Figma ditandai.

### 5.1 Button
Kapsul (`pill`), tinggi 52 (utama, berbahaya) atau 48 (sekunder). Ikon garis 24 dp di kiri label (opsional), jarak ikon-label 10, padding horizontal 24. Tiga tipe × tiga state:

| Tipe | Normal | Ditekan | Nonaktif |
|---|---|---|---|
| `primary` | isi `primary`, teks `onPrimary` | isi `primaryPressed` | isi `surfaceRaised`, teks `textMuted` |
| `secondary` | transparan, garis 2 dp `border`, teks `text` | isi `surfaceRaised` | isi `surfaceRaised`, teks `textMuted`, tanpa garis |
| `danger` | isi `danger`, teks dan ikon `onPrimary` | isi `dangerPressed` | seperti nonaktif lain |

- Ditekan: isi berubah (bukan hanya skala); skala 0,98 selama 100 ms bila Reduce Motion mati.
- Nonaktif menampilkan alasannya dengan teks di dekatnya; tanpa opacity.
- Aksi dipicu saat jari dilepas. Satu tombol primer per layar.
- Properti komponen: Label (teks), Ikon (tukar), Tampilkan ikon (boolean).

### 5.2 Tombol kembali
Kapsul tinggi 48, padding kiri 12 dan kanan 18, jarak 6: ikon chevron 22 di kiri dan **keterangan tujuan di dalam kapsul** (`body` 16 Regular) ("‹ Latihan", "‹ Keluar latihan", "‹ Pengaturan"). Isi `surface`, garis `hairline`. Keterangan menyebut tujuan, bukan sekadar "Kembali", kecuali tujuan tidak jelas. Di sesi latihan tulisannya "Keluar latihan". Di Figma ada sebagai frame "Back" (belum komponen).

### 5.3 Card, HeroCard, grup daftar
- **Card:** isi `surface`, garis `hairline` 1 dp, `card` 20, padding bawaan 16 (di Figma bervariasi per kartu: 12 untuk baris ikon, 14 untuk kartu bibir, 16 untuk kartu isian; ikuti Figma per layar). Card yang bisa ditekan: tambah `›` atau ikon, tinggi minimal 48, isi `surfaceRaised` saat ditekan.
- **HeroCard:** isi `hero`, tanpa garis, padding 20, `card` 20. Teks `onHero`/`onHeroMuted`. Satu tombol primer di dalamnya. Dipakai di Beranda saja. Boleh memuat ilustrasi bibir garis krem (5.9).
- **Grup daftar (gaya iOS):** satu Card berisi baris-baris tanpa kotak masing-masing; antar baris pemisah `hairline` 1 dp yang menjorok sejajar teks (56 dp). Dipakai untuk daftar bunyi Level 1, daftar kata, aktivitas, kata Pendamping, pengaturan. Hindari kartu per baris. **[Belum komponen Figma.]**
- Judul bagian: teks `label` 16 Bold di atas grup, jarak 12.

### 5.4 StatusBadge
**Tanpa wadah, tanpa latar, tanpa batang.** Simbol kecil berwarna + label teks `text` bobot 700.

| Status | Simbol | Warna simbol | Label |
|---|---|---|---|
| sesuai | lingkaran penuh + centang | `success` | Sesuai |
| mendekati | lingkaran setengah terisi | `warning` | Mendekati |
| belum sesuai | lingkaran garis + panah ulang | `danger` | Belum sesuai |

- Simbol 18 dp (ukuran `md`, teks 15/20, jarak 6) atau 26 dp (`lg`, di Hasil, teks 16/22, jarak 10; Figma), label Bold. Warna, simbol, dan label selalu muncul bersama. Di kartu indikator Hasil, "Bibir"/"Suara" menjadi label terpisah di atas badge dan badge hanya memuat status.
- "Belum dicoba": lingkaran kosong abu + teks `textMuted`.
- Tiga simbol berbeda lewat isi, bukan hanya warna. Dua indikator (Bibir, Suara) berdiri sendiri; jangan digabung kecuali mode `overall`.
- Di L2–L3, "mendekati" tidak boleh muncul; UI memetakannya ke "Belum sesuai". **[BEDA DARI design v6 §5.3: bentuk ikon lama (persegi, segitiga) diganti.]**

### 5.5 Kolom isian (Field)
Label selalu di atas (`small` 15 Bold). Jarak label, kotak, dan teks bantu 6. Kotak tinggi 56, `tile` 14, padding 16, isi `surface`, **garis 1 dp di semua state**. Teks bantu `small` `textMuted` di bawah.

| State | Garis |
|---|---|
| default / terisi | 1 dp `border` |
| fokus | 1 dp `focus` |
| galat | 1 dp `danger` + ikon 18 + pesan `danger` (pesan menggantikan teks bantu) |
| nonaktif | 1 dp `hairline`, isi `surfaceRaised`, teks `textMuted` |

Area teks panjang tinggi 104. Tombol "Tampilkan" di kolom sandi berlabel teks, bukan ikon mata saja. Properti komponen: Label, Nilai, Bantuan.

### 5.6 Kunci PIN dan titik PIN
Papan angka khusus bergaya layar kunci iPhone: kunci **lingkaran 76 dp**, isi `surface`, tanpa garis tepi, angka 30 dp Regular, jarak 14 vertikal dan 28 horizontal, 3 kolom. Kunci "Hapus" berikon 22 + label 15 Bold, tanpa isi sampai ditekan. Empat titik 22 dp, jarak 20 (isi `primary` bila terisi, cincin 2,5 dp `border` bila kosong). Pesan salah dan terkunci: ikon + teks di bawah titik. PIN tidak pernah ditampilkan.

### 5.7 Segmented control
Untuk filter pendek (mis. Semua kata / Bawaan / Pendamping). Wadah `surface` + garis `hairline`, `tile` 12, padding 4. Segmen terpilih: isi `primary`, teks `onPrimary` 700. Segmen lain: teks `text` penuh. Tinggi segmen 40 di dalam wadah 48; teks 15, jarak antar segmen 2, radius segmen 9. Nama aksesibilitas: grup radio, tiap segmen radio dengan state terpilih.

### 5.8 Sakelar
Gaya iOS: 51 × 31, trek `success` saat aktif dan `surfaceRaised` saat mati, ibu jari putih 27. Status ditulis juga ("Aktif" / "Mati") di samping.

### 5.9 Ilustrasi bibir (LipIllustration) dan logo
- **LipIllustration:** gambar tetap dari Figma (halaman "Rekan Wicara · UI Final", frame "Ilustrasi bibir": LipIllustration/a, /i, /u, /e, /o, /closed; 130 × 82), tersimpan sebagai jalur SVG di `src/results/lipArt.ts`. **Level 1: vokal a, i, u, e, o** (dan bibir rapat untuk langkah diam di Kalibrasi); tampil di sesi latihan, Hasil, kartu hero Beranda, dan Kalibrasi. Level 2–3 tidak memakai gambar bibir: video contoh dari backend, atau teks suku kata dan instruksi. Garis luar `text` 2,6 dp, bukaan mulut berisi `background` dengan garis `textMuted`; di hero garis `onHero`, garis bukaan `onHeroMuted`, isi `hero`. Tanpa gambar AI. **[Bentuk "i", "u", "e", "o" baru digambar tim; belum ditinjau ahli.]** Grafik "Cermin bibir" tetap memakai cincin 20 titik dari `lipShapes.ts` agar sebanding dengan kontur server.
- **Logo:** "Logo/Mark" dari Figma: ubin hijau membulat berisi bibir garis krem dan gelombang suara koral. Aset PNG berkanal alfa `app/assets/images/logo-mark.png` (diekspor dari Figma, tidak digambar ulang), dipakai lewat komponen `LogoMark` di Splash, Selamat datang, dan Masuk. **Di header Beranda hanya teks "Rekan Wicara"**, tanpa logo. Aset punya tepi transparan ±4%. Kemiripan dengan logo lain belum diperiksa.

### 5.10 LevelTile dan StatTile
- **LevelTile:** dua ubin sebaris, lebar mengisi dan tinggi minimal 132 (di Figma 167 × 132): ikon 28 di kiri atas, di bawahnya "Level n" (`small` muted) dan nama materi (`large` Bold). Isi `surface` + `hairline`; ditekan `surfaceRaised`. Properti: Level, Judul, Ikon.
- **StatTile (progres):** isi `surface` + `hairline`, `card` 20, padding 12–14. Cincin 40 dp (garis 4, isi `accent`, trek `hairline`) dengan ikon 20 dp di tengahnya; di kanan nilai (`label` 16 Bold, mis. "2 / 6") dan satuan (`small` muted, mis. "vokal sesuai"). Rata kiri. Tanpa tile yang angkanya tidak punya sumber data.

### 5.11 BottomBar
Kapsul `surface` melayang 16 dp dari tepi, tinggi 80, tiga item: **Latihan**, **Pendamping**, **Pengaturan**. Ikon di atas label yang selalu terlihat. Aktif: lingkaran `accent` 40 dp di belakang ikon (`onAccent`), label `text` Bold. Tidak aktif: ikon dan label `textMuted` (Regular). Padding 8, ikon 22, jarak ikon-label 2, tanpa garis tepi. Terlihat di semua layar tab; **disembunyikan di sesi latihan dan Hasil**. **[BEDA DARI v6 §5.9: tinggi 80 dan lingkaran 40 agar label 15 dp muat; spec lama 64 dan 48 tidak muat.]**

### 5.12 Konfirmasi (dialog) dan bottom sheet
- Semua konfirmasi (Keluar dari latihan, Hapus kata, Keluar dari akun) memakai **kartu dialog di tengah layar**: lebar layar dikurangi 24 di tiap sisi (342 pada 390), `dialog` 24, isi `surface` + garis `hairline` 1 dp (Figma), padding 24 atas dan 20 samping dan bawah, di atas lapisan gelap. Judul `large` Bold (tanpa ikon di judul), pesan `body` muted, tombol bertumpuk. Bottom sheet (`sheet` 28, pegangan 40 × 5) dicadangkan untuk pilihan, bukan konfirmasi.
- **Urutan tombol: pilihan aman dulu.** Tombol krem penuh = pilihan aman ("Batal", "Lanjut berlatih"); di bawahnya tombol `danger` penuh dengan ikon + teks ("Hapus kata", "Keluar"). Fokus awal pada pilihan aman. Bila dialog tidak berbahaya, tombol konfirmasi berupa tombol sekunder, supaya hanya ada satu tombol krem.
- Pesan menyebut akibatnya ("Rekaman ini belum disimpan dan akan dibuang."). Tombol kembali sistem Android menutup dialog tanpa melakukan aksi.

### 5.13 InfoNote, ProgressBar, CheckRow, StepHeader
`InfoNote` netral berlatar `infoBg`; nada peringatan berlatar `warningBg` dengan ikon + teks. `ProgressBar` trek `surfaceRaised` isi `text`. Langkah memakai batang bersegmen (tinggi 6) + teks "Langkah n dari N". CheckRow: kotak 28 radius 8, isi `primary` + centang bila dipilih, garis 2 dp `border` bila tidak; barisnya tanpa kartu (onboarding membungkus tiap baris dalam kartu `surface` + `hairline`).

### 5.14 Panel rekam
Kamera `overlay.background`, bingkai `card` 20 dengan garis `border` 2 dp. Oval panduan 150 × 200 di tengah: putus-putus `text` 3 dp saat menunggu, garis penuh `danger` saat merekam. Menunggu: keterangan "Posisikan wajah di dalam oval" di dalam panel; angka hitung mundur 3-2-1 di tengah oval. Merekam: lencana "MEREKAM" (titik putih 10, isi `surface` + `hairline`, kiri atas), angka 140 dp di tengah oval (sisa detik), batang waktu 6 dp di dasar panel (isi `text`), tombol "Merekam…" nonaktif dan keterangan "Tahan bunyi sampai hitungan selesai." di bawahnya. Keadaan merekam terlihat sepanjang rekaman.
- **Lencana "Cahaya cukup" (Figma) belum ada di app.** Pemeriksaan pencahayaan dilakukan server, bukan di HP, jadi lencana itu akan mengklaim pemeriksaan yang tidak dilakukan (prinsip 9). Dipasang hanya bila ada cek pencahayaan nyata di sisi klien.

## 6. Layar

Semua tab punya bar bawah. Frame Figma 390 × 844; layar panjang menggulir.

### 6.1 Beranda (`home`)
Urutan: header (avatar inisial 44 di `hero`, "Halo," kecil, nama pengguna serif 20; wordmark "Rekan Wicara" serif 20 muted di kanan) → **HeroCard "Lanjutkan latihan"** (materi berikutnya yang belum sesuai: judul 28 serif, keterangan level dan status, ilustrasi bibir, tombol primer "Lanjutkan") → "Pilih level" + dua LevelTile (Level 1 · Bunyi vokal; Level 2 dan 3 · Pilih kata) → "Kemajuanmu" + dua StatTile (vokal sesuai, kata sesuai) → "Aktivitas terakhir" (grup daftar: ubin huruf, judul, keterangan, badge, tanpa `›` bila baris tidak membuka layar).
- **[BEDA DARI FLOW §NAV-2/NAV-3]:** hero "Lanjutkan" bukan misi harian; flow menghapus hero misi. Butuh keputusan Rico.
- Hero memakai `nextItem()` (`src/data/progress.ts`): materi pertama menurut urutan katalog (Level 1, lalu kata) yang belum Sesuai. Tanpa riwayat, tampil keadaan pengguna baru (6.2); bila semua Sesuai, hero tidak tampil. Nama dari `displayName` akun (bila kosong "Teman"). "Aktivitas terakhir": satu baris per materi, terbaru dulu, maksimal 3. Judul aktivitas Level 2 "Suku kata “ma”" (riwayat tidak menyimpan kata induknya).
- Banner kalibrasi, catatan demo/mock/galat, kartu "Tentang aplikasi" dan tombol Dataset tetap ada di bawah isi utama (tidak digambar di Figma).

### 6.2 Beranda pengguna baru
Keadaan setelah kalibrasi, sebelum latihan pertama. HeroCard "Latihan pertamamu: Vokal “a”" + tombol "Mulai latihan pertama"; grup **Langkah awal (1 dari 3)**: kalibrasi (centang hijau), latih bunyi “a” (nomor, berikutnya), pilih kata pertama (keterangan "Berikutnya" tanpa perkiraan waktu, karena tidak ada sumber datanya); Pilih level; "Kemajuanmu" berisi cincin putus-putus + "Belum ada latihan. Kemajuanmu tampil di sini setelah latihan pertama." Tanpa angka 0 atau tile kosong.

### 6.3 Daftar bunyi, Pilih kata, Jalur kata
- **Level 1:** judul, banner kemajuan "Kemajuan vokal" (cincin 44), grup "Pilih Bunyi Latihan" (ubin huruf serif 24, "Vokal “a”", keterangan statis per materi bawaan seperti "Bibir terbuka", badge di kanan atau "Belum dicoba"; tanpa `›`).
- **Pilih kata:** keterangan, segmented control (Semua kata / Bawaan / Pendamping), grup daftar kata. Tiap baris: ubin huruf, kata huruf kecil (`large`) dengan status terbaik di kanan (atau "Belum dicoba"), "Suku kata: ma · ma", chip sumber ("Bawaan" ikon kunci, "Dari Pendamping" ikon orang), dan `›`. Filter hanya menyaring tampilan. Hitungan "Level 2: x dari y sesuai" tidak tampil, hanya ada di nama aksesibilitas baris.
- **Jalur kata:** judul kata (display, huruf kecil) + chip sumber; "Urutan hanya saran."; "Level 2 · Suku kata" lalu "Level 3 · Kata" (20 Bold); satu kartu per langkah (ubin berisi teks, "Suku kata n" atau "Kata utuh", status, `›`); kartu "Berikutnya" berchip hijau dan garis `hero`; urutan tidak dikunci.

### 6.4 Sesi latihan
Tanpa bar bawah, header Stack disembunyikan. Header di isi layar (`SessionHeader`): kapsul "Keluar latihan" + "Langkah n dari 4" + batang bersegmen 6 dp + judul serif 28 "Ucapkan “a”" (huruf kecil). Empat langkah: Lihat, Tiru (termasuk merekam), Menganalisis, Hasil.
- **Lihat:** kartu video (media 200 dp + ilustrasi bibir sebagai cadangan; tombol "Putar contoh" hanya bila video tersedia), "Cara mengucapkan" + teks instruksi, tombol primer "Mulai rekam" menempel di bawah.
- **Tiru:** panel rekam (5.14), "Rekam (3 detik)", "Lihat contoh lagi" (disembunyikan saat merekam). Tanpa kata target besar; judul sudah memuatnya.
- **Menganalisis:** batang kemajuan unggahan, tiga tahap (terkirim, menilai bibir, menilai suara), catatan "Rekaman dihapus setelah dianalisis…", tombol "Batalkan" (membatalkan unggahan, menghapus rekaman, kembali ke Tiru). Hanya unggahan yang punya sinyal nyata; tahap bibir dan suara bersifat indikatif karena server tidak melaporkan tahap.
- **Keluar:** masih dialog sistem (`Alert`), belum dialog 5.12 (mengubah mekanisme keluar; lihat D12).

### 6.5 Hasil
Tanpa bar bawah. **Tombol aksi menempel di bawah layar** (Ulangi primer; Lihat contoh dan Selesai sekunder berdampingan) dengan garis `hairline` di atasnya; konten menggulir di belakangnya. Judul tahap "Bandingkan". Isi: kartu target (Level 1: ilustrasi bibir 110 + "Bentuk bibir target" + "Vokal “a”"; Level 2–3: "Suku kata target"/"Kata target" + kata serif 34 huruf kecil) → dua kartu indikator (label Bibir/Suara + badge `lg`) → kartu petunjuk `hero` (hanya bila ada indikator belum sesuai/mendekati; maksimal dua kalimat; tidak dirender bila semua sesuai) → grafik **hanya Level 1**: Peta vokal, Cermin bibir (target garis putus `textMuted`, pengguna garis tebal `text`), **Kekerasan suara** (hanya dirender bila respons memuat data kekerasan; hanya garis pengguna, lihat D3) → disclaimer persis: "Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis."
- Keadaan lain: semua sesuai (tanpa kartu petunjuk), rekaman tidak dihitung (InfoNote peringatan + "Rekam ulang").
- **Kartu "Kekerasan suara" versi Figma (batang Target + batang Kamu + "di bawah zona target") butuh nilai target kekerasan dari backend** yang belum ada di kontrak API. Sampai ada, kartu hanya berisi garis kekerasan pengguna dari `visuals.loudness`, tanpa batang target dan tanpa kalimat zona. **[D3 terbuka]**
- Label tombol "Lihat contoh" (nama aksesibilitas tetap "Lihat contoh lagi").

### 6.6 Pendamping
- **Gerbang PIN:** judul "Masukkan PIN Pendamping", titik, pesan (salah: "PIN salah. Sisa 4 percobaan."; terkunci: hitung mundur, kunci nonaktif), papan angka, "Lupa PIN?".
- **Daftar kata:** judul serif "Pendamping", pengantar, "Ketuk kata untuk mengubah atau menghapus.", tombol "Tambah kata", grup "Kata saya" (baris: ubin huruf, kata huruf kecil, "n suku kata" atau "Tanpa suku kata", tanda "Belum lengkap" bila perlu, `›`; ketuk membuka layar Ubah), grup "Kata bawaan" (ikon kunci + "Bawaan", tanpa aksi), "Kunci kembali" (perilaku lama, tidak digambar di Figma).
- **Kata baru / Ubah kata:** formulir (kata, video, instruksi + "Buat dengan AI", suku kata, persetujuan, Simpan, Batal). Layar **Ubah kata** punya tombol "Hapus kata" di bawah formulir (Figma: kapsul `surface` + `hairline` (radius penuh seperti tombol lain), ikon tong sampah + teks `danger`, bukan tombol merah penuh), yang membuka konfirmasi 5.12 bertombol Hapus merah. Hapus tidak ditaruh di tiap baris daftar. **[FG-17]** Header buatan sendiri (Stack disembunyikan): kapsul "Daftar kata", judul serif "Kata baru" atau "Ubah kata", keterangan; video contoh sebagai kartu (ubin 64, nama berkas, "0:03 · 2,1 MB") dengan tombol Ganti dari galeri dan Hapus video sebaris; tiap suku kata satu kartu `surface` + `hairline` dengan ringkasan video satu baris dan tombol Naik, Turun, Hapus sebaris (varian `compact`: ikon 18, teks 15); Simpan dan Batal tanpa ikon. Pratinjau video muted tetap ada untuk video kata, tidak untuk suku kata. Teks bantu "Huruf saja. Spasi atau tanda hubung boleh di antara huruf." dipertahankan karena sesuai aturan sebenarnya (Figma menulis "Maksimal 30 karakter").

### 6.7 Pengaturan
**[BEDA DARI FLOW §SET-2]:** tab Pengaturan **tidak dikunci PIN**. Getar (sakelar) dan Tentang terbuka untuk semua; **Ganti PIN** (ikon kunci, "Meminta PIN Pendamping") dan **Keluar** meminta PIN. Alasan: Getar adalah preferensi pengguna Tuli dan satu-satunya umpan balik non-visual. Isi: judul serif, kartu akun (avatar 48, nama tampilan, email; hanya bila ada sesi), grup Umum (Getar + "Aktif"/"Mati" + sakelar), catatan ukuran teks dan gerak, grup Akun dan aplikasi (Ganti PIN "Meminta PIN Pendamping" + ikon kunci, Tentang Rekan Wicara), tombol sekunder "Keluar" (membuka layar `/settings/sign-out` yang meminta PIN, lalu konfirmasi), catatan siapa yang meminta PIN, versi dari `app.json`. Bagian operator demo (alamat server, mode demo) tetap di bawah.

### 6.8 Tentang, autentikasi, onboarding, kalibrasi
Mengikuti `flow-srs-ui.md` kecuali yang tertulis di sini. Tentang: deskripsi, catatan batas, privasi, versi (grup daftar).
- **Splash:** native (logo 120 di atas `background`) lalu animasi pembuka `SplashIntro` (FG-13, sekali per peluncuran, ±2,5 detik): logo muncul di posisi logo native, naik ke tempatnya, lalu nama, tagline, dan catatan batas produk fade in; seluruh layar fade out setelah gerbang siap. Reduce Motion: semua tampil sekaligus, jeda ±0,6 detik. Token di `splashMotion`. Tampilan akhirnya "Memuat" (logo, "Rekan Wicara" serif 34, "Latihan bicara dengan bantuan visual", batang 96 × 3 yang bergeser selama menunggu gerbang siap; indikator tak-tentu, tidak menunjukkan persentase, diam bila Reduce Motion, catatan batas produk).
- **Selamat datang (rute baru `/welcome`, **[BEDA DARI FLOW]**, D11):** layar pertama untuk yang belum masuk: logo 176, "Berlatih bicara dengan melihat.", kalimat pendukung, "Masuk" (krem) dan "Buat akun" (sekunder) menempel di bawah, catatan batas produk.
- **Masuk:** tanpa header Stack; logo 56 + wordmark, judul + penjelasan, kolom isian 5.5, tombol, "Belum punya akun? Daftar", catatan batas produk. **Daftar:** kapsul "Kembali" di isi, judul "Buat akun Pendamping", kolom, daftar syarat sandi (ikon `success` bila terpenuhi + teks), persetujuan privasi, "Sudah punya akun? Masuk". Kolom **Nama panggilan** (2–20 karakter, tidak unik, hanya tampil di Beranda); tidak ada pesan "tersedia" karena tidak dicek ke server. **Masuk hanya dengan email + kata sandi** (Figma diperbarui 14 Nov).
- **Onboarding:** dua batang langkah + "Langkah n dari 2" di atas; langkah 1: empat kartu siklus + catatan batas, "Lanjut" menempel di bawah; langkah 2: kartu privasi `hero` (teks yang menyebut hasil angka disimpan online tanpa nama, lebih lengkap dari versi Figma), dua persetujuan dalam kartu, "Centang kedua persetujuan untuk lanjut." selama belum lengkap, "Lanjut ke kalibrasi" dan "Kembali".
- **Cek email (FG-14):** tanpa header Stack; kapsul "Ke Masuk", ikon surat 56 di tengah, judul serif, catatan, tombol "Ke halaman Masuk" (krem) dan "Daftar ulang" (sekunder) menempel di bawah.
- **Buat PIN (FG-15):** dua langkah dengan "Langkah n dari 2" di kanan atas; kapsul "Kembali" hanya di langkah 2 (langkah 1 tidak punya tujuan kembali; **[BEDA DARI Figma 29:28]**); judul serif, instruksi (teks lebih lengkap dari Figma: PIN disimpan di HP dan tidak dikirim), empat titik, papan angka menempel di bawah. **Lupa PIN:** kapsul "Kembali", ikon gembok, judul "Lupa PIN?", kolom "Kata sandi akun", "Lanjut" dan "Batal".
- **Kalibrasi (FG-16):** satu layar per langkah (diam, a, i, u): `SessionHeader` (kapsul "Kembali", "Langkah n dari 4", batang bersegmen, judul), instruksi singkat langkah itu (Figma hanya menulis kalimat umum; instruksi per langkah dipertahankan karena perlu), kartu bentuk bibir (gambar 130 + "Bentuk bibir" + nama bentuk), panel kamera dan tombol "Rekam (3 detik)" langsung tanpa tombol "Siap, rekam". "Kembali" menggantikan "Lewati, ke beranda". Lencana "Cahaya cukup" tidak dipasang (D9).

## 7. Teks (bahasa Indonesia)

- Kalimat pendek, kata umum, kata kerja di depan. Tanpa tanda seru, tanpa emoji dalam teks sistem.
- Istilah tetap: **Sesuai / Mendekati / Belum sesuai**, **Bibir**, **Suara**, **teman Tuli**, **Rekan Wicara**.
- Hindari: "salah", "gagal", "diagnosis", "terapi" (kecuali "bukan pengganti terapis"), "normal", "gangguan", "penderita", "tunarungu".
- Umpan balik Suara tidak merujuk pendengaran saja ("terdengar"); gunakan acuan visual (mis. "batang kamu masih di bawah zona target"; hanya bila ada data target, lihat D3).
- Petunjuk konkret: "Buka mulut sedikit lebih lebar."
- Keterangan tombol kembali menyebut tujuan.

## 8. Getar dan gerak

| Momen | Getar | Wajib ada juga |
|---|---|---|
| Rekam dimulai | impact sedang | lencana "MEREKAM" |
| Rekam selesai | notifikasi berhasil | teks "Selesai" |
| Hasil Sesuai | notifikasi berhasil | badge |
| Mendekati / Belum sesuai | impact ringan | badge |

- Tanpa getar tipe error pada hasil latihan. Semua panggilan getar tidak boleh melempar error dan mengikuti sakelar Getar.
- Gerak hanya efek tekan, pengisian cincin, transisi bawaan, dan animasi pembuka (6.8). Layar tujuan gerbang (Selamat datang, Buat PIN, Onboarding, Beranda) masuk dengan fade. Hormati Reduce Motion lewat `AccessibilityInfo.isReduceMotionEnabled`.

## 9. Lapisan kamera

Latar `#000000`, oval dan hitung mundur putih (oval merah muda `danger` saat merekam). Nilai lewat token `overlay`. Cek pencahayaan (ikon + teks) hanya dipasang bila ada pemeriksaan nyata di sisi klien (5.14).

## 10. Grafik hasil

Garis target putus-putus `textMuted`, garis pengguna tebal `text`, dengan keterangan teks di bawah ("Garis putus: target", "Garis tebal: kamu"). Setiap grafik punya `accessibilityLabel` yang menjelaskan isinya. Pola, bukan warna, yang membedakan target dan pengguna.

## 11. Larangan

- Gradasi, efek kaca, dan bayangan dalam bentuk apa pun.
- Teks miring di mana pun. Serif untuk teks isi, tombol, angka, atau judul bagian.
- Maskot atau ilustrasi karakter yang disalin atau dihasilkan AI. Ilustrasi tetap buatan tim.
- Hijau (`hero`) di luar yang diizinkan 3.2. Koral di luar tab aktif dan cincin.
- Kartu seragam berisi ikon, judul, dan dua baris teks dalam kisi; kartu di dalam kartu tanpa alasan; kotak ikon dekoratif.
- Lingkaran atau cincin dekoratif tanpa fungsi (mis. di Splash).
- Ikon tanpa label pada navigasi atau aksi.
- Emoji sebagai ikon UI.
- Angka atau metrik yang tidak punya sumber data.
- Tombol berbahaya sebagai pilihan utama atau diletakkan di atas pilihan aman.
- Hex atau angka ukuran literal di file layar/komponen.

## 12. Keputusan terbuka dan yang berbeda dari dokumen lain

| # | Hal | Posisi desain ini | Dokumen lain |
|---|---|---|---|
| D1 | Hero "Lanjutkan latihan" di Beranda | ada, diimplementasikan (FG-6) | flow NAV-2/NAV-3: Beranda dua kartu, tanpa hero |
| D2 | Pengaturan tidak dikunci PIN (hanya Ganti PIN dan Keluar) | ya, diimplementasikan (FG-10) | flow SET-2: seluruh tab dikunci |
| D3 | Kartu "Kekerasan suara" di Hasil Level 1 | hanya garis pengguna bila data ada (FG-8); batang target **belum** | kontrak API belum memuat nilai target |
| D4 | Font Inter | disetujui Rico (14 Nov 2026), dimuat | selesai |
| D5 | Bar bawah 80 dp, lingkaran 40 dp | ya, diimplementasikan (FG-5) | v6: 64 dp dan 48 dp |
| D6 | Badge tanpa wadah, tiga simbol lingkaran | ya, diimplementasikan (FG-3) | v6 §5.3: ikon berbeda bentuk |
| D7 | Tombol kembali berketerangan di kapsul | ya, diimplementasikan (FG-2) | v6: tombol kembali sistem |
| D8 | Logo | aset PNG dari Figma "Logo/Mark" (FG-11) | kemiripan merek belum diperiksa |
| D9 | Lencana "Cahaya cukup" | **tidak dipasang** | Figma menggambarnya; tidak ada cek pencahayaan di klien (prinsip 9) |
| D10 | Tahap Menganalisis (bibir berjalan, suara menunggu) | indikatif | server tidak melaporkan tahap |
| D11 | Rute "Selamat datang" `/welcome` | ada (disetujui Rico) | flow: pengguna belum masuk langsung ke Masuk |
| D12 | Dialog keluar sesi latihan | masih `Alert` sistem | design ini: dialog 5.12 |

## 13. Daftar periksa per layar yang diubah

- [ ] Hitam-putih: tiga status masih berbeda (simbol + label).
- [ ] Skala teks 200%: tidak ada teks terpotong atau tumpang tindih.
- [ ] Layar 360 dp (HP Android demo): tidak ada tumpang tindih.
- [ ] Perangkat dibisukan, getar mati: semua alur selesai.
- [ ] Target sentuh ≥ 48 dp; jarak antar tombol ≥ 12 dp.
- [ ] Setiap tombol, badge, dan item bar bawah punya `accessibilityLabel`.
- [ ] Tidak ada hex/ukuran literal di file layar.
- [ ] Konfirmasi: pilihan aman krem di atas, aksi berbahaya merah di bawah.
- [ ] Reduce Motion aktif: hanya perubahan langsung.
- [ ] Efek tekan terlihat saat jari menutupi tombol (isi berubah).
- [ ] Tidak ada bayangan, teks miring, hijau/koral di luar tempatnya.
- [ ] Layar diperiksa di cahaya terang: garis `hairline` dan teks redup tetap terbaca.
- [ ] `npm test` dan `npm run typecheck` lulus.

Daftar periksa rinci per layar untuk 360 dp dan skala teks 200%: `docs/CHECKLIST_360_200.md`.

## 14. Belum diverifikasi

- Belum diuji dengan pengguna Tuli. Jangan menulis "teruji pengguna" atau "ramah Tuli" sebagai klaim terbukti.
- Seluruh desain diimplementasikan dari Figma dan diuji dengan tes otomatis (641+ tes); belum diuji di perangkat, termasuk skala teks 200%, layar 360 dp, dan prototype interaksi (belum dibuat).
- Selisih permukaan kecil (1,22 dan 1,18) bergantung pada garis `hairline`; terbaca di cahaya terang belum diuji.
- Font Inter dan Playfair Display di perangkat belum dicoba, termasuk cadangan font sistem.
- Pola yang kini komponen di kode: `BackButton`, `ListGroup`/`ListRow`, `ConfirmDialog`, `SegmentedControl`, `PinPad`, `HeroCard`, `ActionBar`, `SessionHeader`, `LogoMark`. Di Figma belum semuanya komponen.
- Ilustrasi bibir (a, i, u, e, o dan rapat; selain "a" baru digambar tim) dan logo belum ditinjau ahli; kemiripan logo dengan produk lain belum diperiksa. Splash native dan batang Memuat belum dicoba di perangkat.
- Ikon di Figma digambar sebagai SVG bergaya garis; di app memakai Ionicons, jadi bentuk bisa sedikit berbeda.
- Kontras dihitung dengan rumus WCAG pada 14 Nov 2026; hitung ulang bila warna diubah.
- Arah gaya terinspirasi VibeMove hanya pada struktur dan suasana; itu bukan bukti kecocokan untuk teman Tuli.

Penggunaan AI untuk desain dan kode wajib dicatat di dokumentasi lomba.

PRIORITAS URUTAN REFERENSI DESIGN
1. FIGMA
2. DESIGN.MD