# DESIGN.md — Rekan Wicara

Versi 6 (final untuk submission) · 13 Nov 2026 · Berlaku untuk `app/` (Expo, React Native, TypeScript strict, expo-router)

Dokumen ini mengatur **tampilan dan teks**. Perilaku produk mengikuti `docs/SPEC.md` (kontrak API di SPEC §5).

## Arah gaya: "Hutan Malam"

Gelap, tenang, dan rapi. Latar hijau-hitam, kartu yang sedikit lebih terang, satu kartu utama berwarna hijau tua dengan tombol kapsul krem, ubin berikon, cincin kemajuan, dan bar bawah berlabel. Judul memakai serif Playfair Display (tanpa miring); semua teks lain sans sistem. Tanpa bayangan. Kedalaman dibentuk oleh selisih warna permukaan.

Inspirasi: bentuk dan komponen aplikasi kebugaran "VibeMove" (Dribbble). Yang diambil: struktur komponen dan suasana. Yang **tidak** diambil: maskot dan ilustrasi karakter (karya orang lain), teks miring (mengubah cara kata terbaca), foto, dan angka kontras rendah. Tidak ada kode atau aset yang disalin.

Versi 6 menggantikan versi 3 (kulit lama), 4 ("Kertas & Tinta", bayangan keras) dan 5 ("Kertas Hangat"). Dipertahankan dari versi sebelumnya: perilaku dari kode yang berjalan, ikon status berbentuk beda, nama "Rekan Wicara", tata letak `practice` dan Hasil (6.2), dan aturan mundur (0.1). Aturan lama "jangan menulis ulang layar yang berfungsi" tidak berlaku untuk tata letak dan gaya; hanya untuk logika dan data (0).

## 0. Cara memakai (untuk agen)

- Baca seluruhnya sebelum mengubah UI.
- **Tata letak dan gaya boleh dirombak; logika dan data tidak.** Jangan mengubah state data, alur data, panggilan API, aturan progresi, rute, dan perilaku tersembunyi (tekan-lama judul "Misi hari ini" selama 2 detik membuka Pengaturan; harus tetap ada). State tampilan murni (mis. level yang sedang dipilih di `home`) boleh.
- **Pertahankan `testID` dan `accessibilityLabel` yang ada** agar tes dan pembaca layar tidak pecah. Bila sebuah tes memang harus berubah (mis. ikon `StatusBadge`), ubah tesnya dan catat di `docs/PROGRESS.md`.
- Ubah tampilan lewat token dan komponen bersama dulu; edit layar hanya untuk tata letak (6.2).
- Semua warna, ukuran, jarak, dan radius berasal dari `app/src/theme/index.ts`. Tidak ada hex atau ukuran literal di layar/komponen. Bila butuh nilai baru, tambahkan token di sana.
- Komponen bersama ada di `app/src/components/` dan diekspor lewat `index.ts`. Pakai ulang sebelum membuat baru.
- Tanpa dependensi baru (tanpa NativeWind, pustaka komponen, atau font tambahan) tanpa bertanya. Pakai `StyleSheet`, `Pressable`, `react-native-svg`, dan Ionicons yang sudah ada.
- **Skala ukuran baru (bagian 3 dan 4) menggantikan ukuran lama.** Jangan membuat teks lebih kecil dari yang tertulis di bagian 4 dan jangan membuat target sentuh di bawah 48 dp.
- Kasus tak tercakup: pilih yang lebih sederhana, lebih datar, lebih kontras. Catat di `docs/PROGRESS.md`.
- Bagian **[BELUM DIVERIFIKASI]** belum diuji; jangan menyebutnya "teruji" di README, model card, atau video.

### 0.1 Urutan kerja dan pengaman

Prompt per langkah, model, dan effort ada di `docs/PROMPT_UI.md`; di sana langkah 2 dibagi dua: **2a** (semua warna dan radius lewat token, tampilan belum berubah) lalu **2b** (nilai token jadi tema gelap). Kerjakan di cabang git terpisah dari keadaan yang sudah berjalan. Satu langkah, satu commit. Setelah tiap langkah jalankan `npm test` dan `npm run typecheck`.

1. Ganti nama menjadi "Rekan Wicara" (`app.json`, `_layout.tsx`, `onboarding.tsx`, `about.tsx`, `report.ts`, teks izin kamera/mikrofon).
2. Pindahkan hex literal ke token, lalu ubah nilai token ke palet gelap dan skala ukuran bagian 3–4, termasuk `statusStyles` (3.1). Set status bar ke gaya terang (teks putih) dan latar akar ke `background`. Periksa `results/charts.tsx` dan `RecordPanel.tsx`: warna yang dirancang untuk latar putih harus diganti token.
3. `BigButton`: bentuk kapsul, varian, dan keadaan ditekan (5.1).
4. `Card` dan `HeroCard` (5.2).
5. `StatusBadge` dengan bentuk ikon baru dan warna baru (5.3); ubah `__tests__/StatusBadge.test.tsx`.
6. Tata letak Hasil (6.2.3).
7. Tata letak `practice` (6.2.2).
8. Tata letak `home` (6.2.1): `HeroCard`, `LevelTile`, `StatTile` + `ProgressRing`. Paling besar; periksa `__tests__/home.test.tsx`.
9. `BottomBar` di `home` (5.9).
10. Pengaturan: tambahkan sakelar Getar (terbukti belum ada: `settings.tsx` tidak memuat `Switch` maupun kata "getar"), lalu dukungan Reduce Motion (8). Haptics saat ini hanya dipakai di `RecordPanel.tsx`; sakelar harus mengatur panggilan itu.

Langkah 1–5 paling terlihat dan paling kecil risikonya; selesaikan dan commit lebih dulu. Langkah 6–9 boleh dikurangi bila waktu habis (urutan prioritas: Hasil, practice, `home` tanpa bar bawah, lalu bar bawah).

Aturan mundur: bila sebuah langkah merusak alur rekam sampai hasil atau tes, dan tidak selesai diperbaiki dalam sekitar 20 menit, batalkan langkah itu (`git revert`) dan lanjut ke langkah berikutnya. Alur rekam sampai hasil yang berfungsi lebih penting daripada tampilan. Fitur dikunci Jumat 13 Nov malam; Sabtu hanya untuk bug, README, dan unggah.

### 0.2 Langkah opsional (hanya bila langkah 1–10 selesai, tes lulus, dan sudah di-commit)

Kerjakan hanya bila masih ada waktu sebelum fitur dikunci. Tiap langkah punya batas waktu; jika terlewat, batalkan dengan `git revert`. Boleh dilewati seluruhnya tanpa mengubah klaim apa pun di README.

**A. Font judul Playfair Display** (batas sekitar 30 menit; paling berisiko, kerjakan paling akhir)
1. Tanyakan dulu sebelum menambah dependensi (aturan bagian 0). Paket yang dimaksud: `@expo-google-fonts/playfair-display` dan `expo-font` (sudah ada di dependensi). Nama paket mengikuti konvensi Expo Google Fonts (huruf kecil, spasi jadi tanda hubung); pastikan paketnya ada dan terpasang sebelum lanjut. Lisensi font: SIL OFL (Google Fonts). **[BELUM DIVERIFIKASI]**
2. Muat hanya **Playfair Display 700 Bold** (tanpa varian miring). Atur `fontFamily.display` di **satu komponen teks bersama** (`Title` dan judul `HeroCard`), bukan per layar.
3. Teks isi tetap font sistem. Tidak ada font sans tambahan.
4. Tahan tampilan sampai font selesai dimuat. Bila gagal dimuat, `fontFamily.display` kembali ke serif sistem (iOS `Georgia`, Android `serif`) dan aplikasi tetap jalan.
5. Ukuran tidak berubah (tetap bagian 4). Cek skala teks 200%: judul tidak terpotong.
6. Jalankan `npm test` dan `npm run typecheck`.

**B. Cincin fokus untuk pengendali non-sentuh** (batas sekitar 15 menit; tanpa dependensi)
Cincin 3 dp warna `focus`, berjarak 2 dp dari tepi elemen, tampil hanya saat elemen difokuskan. **[BELUM DIVERIFIKASI di perangkat]**

## 1. Produk dan nama

Alat latihan bicara untuk teman Tuli yang memilih berlatih. Umpan balik pendengaran diganti umpan balik visual.
Alur: rekam video wajah dan suara 2–3 detik → dua indikator (**Bibir**, **Suara**) + satu petunjuk.
Status hanya tiga: **Sesuai**, **Mendekati**, **Belum sesuai** (kode API: hijau, kuning, merah). Tanpa skor angka.
Alat bantu latihan, bukan pengganti terapis wicara.

- Nama aplikasi: **Rekan Wicara** (dua kata, huruf awal besar) di semua teks yang terlihat pengguna: judul, header, Tentang, onboarding, izin kamera/mikrofon, laporan, README, video.
- Slug, folder, bundle id: `rekanwicara`. Jangan menulis `RekanWicara`, `REKAN WICARA`, atau "Cermin Wicara".
- "Cermin bibir" adalah nama grafik di hasil, bukan nama aplikasi. Boleh tetap.
- Header layar utama: teks "Rekan Wicara", tanpa logo buatan AI.

## 2. Prinsip

1. **Visual dulu.** Tidak ada informasi yang hanya lewat suara. Getar hanya pelengkap dan bisa dimatikan.
2. **Satu instruksi per layar.** Kalimat pendek, kata umum, ikon + teks.
3. **Warna tidak pernah membawa makna sendirian.** Status = bentuk ikon + label teks + warna.
4. **Kontras** teks minimal 4,5:1; ikon dan garis komponen minimal 3:1.
5. **Target sentuh minimal 48 dp** (tombol utama 52). Jarak antar target minimal 12 dp. Ikon tanpa label teks tidak boleh menjadi satu-satunya penanda sebuah aksi.
6. **Teks mengikuti pengaturan sistem.** Tata letak tidak pecah di skala 200%.
7. **Satu tombol primer (krem) per layar.** Aksen koral bukan tombol.
8. **Tanpa bayangan.** Bisa ditekan terlihat dari bentuknya: tombol kapsul, ubin dan baris dengan penanda `›` atau ikon, tab dengan label.
9. **Jujur.** UI tidak mengklaim hal yang tidak dilakukan app (mis. "rekaman dihapus" hanya bila benar di kode).
10. **Alur rekam sampai hasil lebih penting daripada kerapian.**

## 3. Token (sumber: `app/src/theme/index.ts`)

Nama token tetap: `colors`, `fontSize`, `spacing`, `radius`, `touchTarget`, `statusStyles`. Tambahan: `stroke` dan `fontFamily`. Nilai di bawah **menggantikan** nilai lama.

| Kelompok | Token → nilai |
|---|---|
| Latar | `background` `#08110B` · `surface` `#131C16` (kartu, ubin) · `surfaceRaised` `#1B261E` (baris dalam kartu, nonaktif, saat ditekan) |
| Kartu utama | `hero` `#3A5A46` · `onHero` `#FAFCF9` · `onHeroMuted` `#D5E0D5` |
| Teks | `text` `#FAFCF9` · `textMuted` `#AEB8AD` |
| Tombol primer | `primary` `#FAFCF9` · `onPrimary` `#08110B` · `primaryPressed` `#D9DED6` |
| Garis | `border` `#6E7F71` (tombol sekunder, kontrol, fokus) |
| Aksen | `accent` `#E8693F` · `onAccent` `#08110B` (hanya cincin kemajuan dan penanda tab aktif) |
| Catatan | `infoBg` `#16261C` · `warningBg` `#2B1A1E` · `danger` `#FF8FA3` |
| Fokus | `focus` `#FFB300` |
| Teks | `small` 15 · `body` 17 · `large` 22 · `title` 28 · `display` 40 |
| Jarak | 4 / 8 / 16 / 24 / 32 |
| Radius | `tile` 14 (ubin, badge, chip) · `card` 20 (kartu, kartu utama) · `pill` 999 (hanya tombol dan bar bawah) |
| Sentuh | `touchTarget` 48 · tombol utama tinggi 52 |
| Garis tebal | `stroke.thin` 1,5 · `stroke.thick` 2 |
| Font | `fontFamily.display` = Playfair Display Bold bila dimuat (0.2 A), cadangan serif sistem (iOS `Georgia`, Android `serif`) · `fontFamily.text` = font sistem |

### 3.1 Status (`statusStyles`)

Badge berlatar `surface`; ikon, label, dan batang kiri 4 dp berwarna status. Teks tidak pernah putih di atas warna status.

| Status | Warna (`foreground`) | Kontras di `surface` |
|---|---|---|
| hijau (Sesuai) | `#7FD1A0` | 9,57:1 |
| kuning (Mendekati) | `#F2C14E` | 10,38:1 |
| merah (Belum sesuai) | `#FF8FA3` | 8,06:1 |

### 3.2 Kontras yang dihitung (rumus WCAG, 13 Nov 2026)

- `text` di `background` 18,59:1; di `surface` 16,89:1; di `surfaceRaised` 15,16:1.
- `textMuted` di `background` 9,37:1; di `surface` 8,51:1; di `surfaceRaised` 7,64:1.
- `onHero` di `hero` 7,45:1; `onHeroMuted` di `hero` 5,66:1.
- `onPrimary` di `primary` 18,59:1; di `primaryPressed` 14,03:1.
- `border` di `background` 4,51:1; di `surface` 4,10:1 (komponen minimal 3:1).
- `accent` di `surface` 5,41:1; di `surfaceRaised` 4,86:1; `onAccent` di `accent` 5,96:1. **Putih di atas `accent` hanya 3,22:1; jangan pakai teks atau ikon putih di atas koral.** `textMuted` di atas `hero` hanya 3,76:1; di atas `hero` pakai `onHeroMuted`.
- Status di `surfaceRaised`: hijau 8,59:1, kuning 9,32:1, merah 7,23:1. `danger` di `warningBg` 7,65:1; `text` di `warningBg` 16,04:1; `text` di `infoBg` 15,33:1.
- `focus` di `background` 10,68:1.
- Trek cincin (`surfaceRaised` di `surface`) hanya 1,11:1: ia dekoratif, dan angka di sebelahnya yang membawa informasi.

### 3.3 Aturan warna

- `accent` koral hanya untuk cincin kemajuan dan penanda tab aktif; tidak untuk tombol, teks, atau status. Alasannya: dekat dengan status merah/kuning, dan putih di atasnya gagal kontras.
- Warna status tidak dipakai untuk tombol, kartu utama, atau dekorasi.
- `textMuted` tidak dipakai di atas `hero`.
- Pemetaan token lama: `secondary` → transparan, `onSecondary` → `text`, `infoBorder` → `border`, `disabled` → `surfaceRaised`. `colors.primary` berubah makna (krem, isi tombol): pemakaian lama sebagai warna teks/ikon diganti `text` atau `textMuted`.
- Maksimal empat warna berbeda per layar di luar warna status.
- Tidak ada mode terang pada versi ini (satu tema agar pengujian terkendali).
- Token yang harus ditambah (menggantikan hex literal yang ada): `success`, `warningBg`, `overlay` untuk lapisan kamera, `hero`, `surfaceRaised`, `stroke`, `fontFamily`, `accent`, dan `focus` (sudah ada, ubah nilainya).

## 4. Tipografi

Dua peran, **tanpa miring sama sekali**:
- **Judul** (`title`, judul `HeroCard`, nama aplikasi di header, judul bagian): **Playfair Display Bold 700** lewat `fontFamily.display`; hanya pada ukuran 22 ke atas karena garis tipisnya sangat halus.
- **Semua teks lain** (isi, tombol, label, status, angka, keterangan): font sistem (Roboto di Android, San Francisco di iOS) lewat `fontFamily.text`.
- Default tanpa dependensi: bila Playfair belum dipasang atau gagal dimuat, judul memakai serif sistem. Memasang Playfair adalah langkah opsional 0.2 A; bila tidak dikerjakan, tulis di README bahwa Playfair Display direncanakan setelah submission. **[BELUM DIVERIFIKASI di perangkat]**

| Gaya | Ukuran | Bobot | Dipakai untuk |
|---|---|---|---|
| display | 40 | 700 (serif) | Kata target besar saat merekam, angka besar |
| title | 28 | 700 (serif) | Judul layar, judul `HeroCard` |
| large | 22 | 700 | Judul bagian, nama materi, teks petunjuk |
| body | 17 (baris 25) | 400 | Instruksi, penjelasan |
| label | 17 | 700 | Teks tombol, label status |
| small | 15 | 400 | Keterangan, disclaimer, label ubin dan tab |

- **Tidak ada teks di bawah 15.** Tanpa huruf kapital semua. **Tanpa miring di mana pun**, termasuk judul.
- Bobot memakai 400 dan 700. Bobot 800/900 yang ada diganti 700 saat file disentuh.
- `allowFontScaling` tetap aktif. Beri `maxFontSizeMultiplier={2}` pada teks di dalam tombol, badge, ubin, dan bar bawah.
- Tautan: warna `text`, bergaris bawah.
- Hitung mundur di lapisan kamera tetap 140 dp (bagian 9).

## 5. Komponen

### 5.1 BigButton
- Bentuk kapsul (`radius.pill`), tinggi minimal 52 (48 untuk tombol padat berdampingan). Tanpa bayangan.
- Varian:
  - `primary`: isi `primary` (krem), teks `onPrimary`. Satu per layar. Dipakai juga di atas `HeroCard`.
  - `secondary`: isi transparan, garis `stroke.thick` `border`, teks `text`.
- Ikon bersama label (Ionicons bergaya garis, 22 dp). Aksi dipicu saat jari dilepas (`onPress`), sehingga bisa dibatalkan dengan menggeser jari keluar.
- **Ditekan**, dua isyarat sekaligus: (1) **isi berubah**: `primary` menjadi `primaryPressed`, `secondary` menjadi `surfaceRaised`; (2) skala 0,98 selama 100 ms. Tanpa opacity. Reduce Motion: tanpa skala; perubahan isi tetap terjadi langsung.
- Nonaktif: isi `surfaceRaised`, teks `textMuted`, tanpa garis. Tampilkan alasannya dengan teks di dekatnya. Jangan memakai opacity.
- Aksesibilitas: `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityState={{ disabled }}`.
- Komponen ini sudah ada; jangan menulis ulang strukturnya, hanya gaya dan keadaan ditekan.

### 5.2 Card dan HeroCard
**Card statis:** isi `surface`, tanpa garis, `radius.card`, padding 16, tanpa bayangan.

**Card yang bisa ditekan** (`onPress`): sama, ditambah ikon `›` di kanan, tinggi minimal `touchTarget`, role button, dan isi `surfaceRaised` saat ditekan.

**HeroCard** (komponen baru, satu per layar, hanya di `home`): isi `hero`, tanpa garis, `radius.card`, padding 20. Teks `onHero`; judul memakai `fontFamily.display` (`title`); teks pendukung `onHeroMuted` (`body`). Satu tombol `primary` di dalamnya. Tidak dipakai untuk status atau pesan galat. Judul kartu utama pada layar Hasil: kartu petunjuk memakai pola yang sama (isi `hero`, tanpa tombol).

### 5.3 StatusBadge (dan ikon status)
Dipakai di Hasil dan `home`: badge **Bibir** dan **Suara**, berlabel "Bibir: Sesuai" dan seterusnya.

| Status | Bentuk ikon | Label |
|---|---|---|
| hijau | lingkaran + centang | Sesuai |
| kuning | segitiga + tanda ≈ | Mendekati |
| merah | persegi + panah memutar | Belum sesuai |

- Warna ikon, label, dan batang kiri 4 dp dari 3.1; latar `surface`, `radius.tile`. Tanda silang tidak dipakai karena terasa menghukum.
- Ikon digambar dengan `react-native-svg`, garis 3,5 dp, 22 dp pada ukuran `md` dan 28 dp pada `lg`. Ikon lain di app tetap satu keluarga: Ionicons.
- Warna status hanya hidup di `statusStyles`. Badge tanpa bayangan dan bukan elemen yang bisa ditekan.
- Dua indikator berdiri sendiri; jangan digabung menjadi satu status atau skor, kecuali mode `overall` (SPEC §8.4).
- Layar sempit atau skala teks di atas 1,3: susun vertikal.

### 5.4 InfoNote, ProgressBar, CheckRow, StepHeader
Pakai yang ada, dengan gaya baru: `InfoNote` netral berlatar `infoBg`; nada `warning` berlatar `warningBg` dengan `danger` + ikon + teks. `ProgressBar`: trek `surfaceRaised`, isi `text`. `StepHeader` selalu menyertakan teks "Langkah n dari N" (`small`, `textMuted`) di atas judul serif.

### 5.5 Panel rekam (RecordPanel)
Tombol rekam adalah `BigButton` `primary` berlabel "Rekam (n detik)" dan berubah menjadi "Merekam…" selama merekam. Keadaan "sedang merekam" harus tetap terlihat sepanjang rekaman, bukan efek tekan sesaat. Yang sudah ada dan dipertahankan:
- lencana "MEREKAM" bertitik putih di atas bingkai kamera, dan oval panduan berubah merah,
- `ProgressBar` waktu rekam,
- tombol nonaktif dengan label "Merekam…".

Bingkai kamera: `radius.card`, garis `stroke.thick` `border`. Panel ini memakai gaya bagian 9.

### 5.6 Ilustrasi bunyi
`LipIllustration` (SVG buatan tim): rileks, a, i, u, rapat (p/b/m). Garis `text` 3 dp tanpa isi, di atas `surface`. p, b, m dibedakan lewat label dan indikator Suara, bukan gambar. Tanpa gambar AI. Bila gambar belum ada, tampilkan kartu petunjuk tanpa gambar.

### 5.7 ProgressRing dan StatTile (baru)
- **ProgressRing:** `react-native-svg`, 34 dp, garis 4 dp, ujung bulat, trek `surfaceRaised`, isi `accent`, mulai dari atas. Nilai 0–1 dari data yang sudah ada. Dekoratif (`accessible={false}`); angka dan label di sampingnya yang dibaca pembaca layar.
- **StatTile:** isi `surface`, `radius.tile`, padding 12: cincin, nilai (`label`), keterangan (`small`, `textMuted`). Tiga ubin sejajar: "2 / 4 langkah" (cincin = langkah selesai dari `plan`), "3 sesuai" (cincin = materi dengan status terakhir hijau dari seluruh materi; angka = jumlah), "6 menit sesi" (tanpa cincin, dari `profile.settings.sessionMinutes`). Hanya memakai data yang sudah ada; tanpa logika baru. Bila data kosong, tampilkan "0" dan cincin kosong.

### 5.8 LevelTile (baru)
Ubin berikon dengan label: ikon Ionicons (Level 0 `volume-medium-outline`, Level 1 `happy-outline`, Level 2 `chatbubble-outline`, Level 3 `text-outline`, Level 4 `swap-horizontal-outline`), label "Level n" (`small`). Satu ubin per level yang ada di data (`LEVEL_NAMES` punya Level 0–4; bungkus ke baris berikutnya bila tidak muat), `surface`, `radius.tile`, tinggi minimal 72. Terpilih: isi `surfaceRaised` + garis `stroke.thick` `border`. Terkunci: ikon gembok + teks "Terkunci", warna `textMuted`; tetap bisa difokuskan dan membaca kalimat syarat. Memilih ubin hanya mengganti level yang ditampilkan di bawahnya (state tampilan murni; default: level materi berikutnya, bila tidak ada maka level terbuka terendah).

### 5.9 BottomBar (baru, hanya di `home`)
Kapsul `surface` di bawah layar (tinggi 64 + area aman). Tiga item, **ikon di atas label yang selalu terlihat** (`small`): **Latihan** (aktif), **Pendamping** (`/companion`), **Tentang** (`/about`). Aktif: lingkaran `accent` 48 dp di belakang ikon (ikon `onAccent`) dan label `text` Bold; tidak aktif: ikon dan label `textMuted`. Setiap item `accessibilityRole="button"` dengan label yang sama dengan tombol lama ("Mode Pendamping", "Tentang aplikasi") agar tes tetap lulus. Menggantikan dua tombol sekunder di kaki layar `home`; tombol "Mode Dataset" (`DATASET_MODE`) tetap di atas bar. Item "Latihan" (aktif) tidak berpindah layar saat ditekan. Tidak ada tab baru dan tidak ada layar baru.

## 6. Layar (mengikuti `app/app/`, navigasi Stack)

| Layar | Isi dan aturan |
|---|---|
| `index` | Pengalih awal; tanpa desain khusus. |
| `onboarding` | Maksimal 3 langkah: apa yang dilakukan app (alat bantu, bukan pengganti terapis), persetujuan, PIN pendamping. Satu tombol primer. |
| `calibration` | 4 langkah (diam, a, i, u). Ilustrasi, `StepHeader`, panel rekam. |
| `home` | Lihat 6.2.1. Terkunci = ikon gembok + teks "Terkunci", bukan hanya redup. Status materi (terkunci / berlatih / lulus / ulasan) selalu ikon + teks. |
| `practice/[itemId]` | Lihat → Tiru → Bandingkan → Ulangi. Judul "Ucapkan “a”". Video model, atau teks besar + ilustrasi bila 404. |
| `companion` | Spanduk tetap "Mode Pendamping" (latar `infoBg`). Ringkasan mingguan, Uji Dengar, durasi sesi, bagikan laporan. |
| `settings` | Getar (toggle, status "Aktif"/"Mati" ditulis), ukuran teks mengikuti sistem (keterangan), opsi demo tersembunyi. |
| `about` | Nama, versi app dan mesin server, privasi, satu kalimat: alat bantu latihan, bukan pengganti terapis wicara. |
| `dataset/*`, `allosaurus`, `wav2vec2`, `combined` | Layar pengembang/eksperimen. Tidak didesain; tetap memakai token. |

### 6.1 Hasil (`ResultView`)
Urutan tetap: (1) dua `StatusBadge` + satu petunjuk dari `hint_id`; (2) grafik yang berlaku (Peta Vokal, Cermin Bibir, grafik kekerasan Level 0); (3) disclaimer "Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis."; (4) tombol primer "Ulangi", sekunder "Lihat contoh lagi" dan "Selesai".
- Mode `overall`: satu badge "Hasil". Mode `hidden`: hanya `InfoNote` bahwa percobaan tercatat.
- `retry`: `InfoNote` nada warning + teks "Rekaman ini tidak dihitung sebagai percobaan."
- Menunggu: teks "Menganalisis…" dengan batang kemajuan, bukan spinner saja.

### 6.2 Tata letak (boleh dirombak; logika dan data tetap)

Aturan umum: satu hal utama per layar, hal utama di atas dan aksi di bawah; rata kiri; jarak antar kelompok `spacing.lg`, di dalam kelompok `spacing.sm`; tidak ada informasi yang dihapus, hanya ditata ulang. Sketsa adalah arah, bukan piksel; lebar sempit atau skala teks di atas 1,3 menyusun kolom menjadi satu kolom.

#### 6.2.1 `home`
```
Rekan Wicara                          (serif Bold)         Pengaturan tersembunyi: tanpa ikon
Misi hari ini                         (small; tekan-lama 2 dtk = Pengaturan)
[ InfoNote + tombol kalibrasi ]       (hanya bila belum dikalibrasi; tombol secondary)
┌ HeroCard (hijau) ─────────────────┐
│ Siap latihan “papa”?   (serif 28) │   tekan-lama 2 dtk pada judul = Pengaturan
│ Langkah 2 dari 4. Rekam 3 detik.  │
│ ( ▶ Mulai latihan )               │   primary (krem)
└───────────────────────────────────┘
Level                                 (small, textMuted)
[Lv 0] [Lv 1] [Lv 2] [🔒]            LevelTile, satu per level yang ada di data (bungkus bila tidak muat)
Kemajuanmu
[ ◔ 2/4 ] [ ◔ 3 ] [ 6 menit ]        3 StatTile
Langkah hari ini · ±5 menit          (daftar langkah, pola kartu)
 ✓ Pemanasan: mama
 ○ Latihan inti: papa      ← berikut
Level 0: ...                         (daftar materi level terpilih)
 mama                    [✓ Sesuai]  ›
 papa                    Belum dicoba ›
( Latihan )( Pendamping )( Tentang )  BottomBar
```
- Tombol utama layar adalah "Mulai latihan" di `HeroCard` (`testID` `mission-start` dipertahankan). Tombol kalibrasi memakai gaya sekunder.
- `HeroCard` menampung keadaan yang sudah ada: bila sesi selesai, judul tetap dan teks "Sesi hari ini selesai." tanpa tombol; bila `needsHelp`, teks bantuan yang sudah ada tampil sebagai `InfoNote` di bawahnya. Judul kartu: kata target langkah berikutnya; bila tidak ada langkah, tampilkan teks lama persis "Pilih satu materi untuk mulai berlatih." (tes `home` memeriksanya).
- Judul "Misi hari ini" tetap ada sebagai `accessibilityLabel` dan target tekan-lama (bisa berupa judul kecil di atas kartu atau teks di `HeroCard`); perilaku tersembunyi tidak boleh hilang.
- "x dari N langkah" dihitung dari `plan` yang sudah ada; daftar langkah tetap menampilkan semua langkah dan bisa ditekan seperti sekarang.
- Baris materi: kata target (`large`, Bold) di kiri; `StageBadge` dan `StatusBadge` ukuran `md` di bawahnya atau di kanan (bungkus bila sempit). Materi terkunci: ikon gembok + "Terkunci" + kalimat syarat yang sudah ada.
- Pertahankan `testID` yang ada (`mission`, `mission-start`, `item-<id>`, `stage-<id>`, `calibration-banner`, `home-error`, `mission-needs-help`).

#### 6.2.2 `practice/[itemId]`
- Setiap tahap: `StepHeader` di atas, isi di tengah, **area aksi di bawah** (jarak 24 dp dari isi).
- **Lihat:** `ModelVideo` selebar layar di kartu `surface`; area aksi: "Mulai rekam" (primary).
- **Tiru:** kata target ditampilkan besar (`display`, serif Bold, dengan emoji materi bila ada) di atas `RecordPanel`, menggantikan kalimat "Ucapkan: ..." berukuran `body`; "Lihat contoh lagi" (secondary) di bawah panel.
- **Kirim:** status unggah dan satu tombol "Rekam ulang" hanya bila gagal (perilaku tetap).
- **Bandingkan:** `ResultView`; area aksi: "Ulangi" (primary, lebar penuh), lalu "Lihat contoh lagi" dan "Selesai" (secondary) **berdampingan** bila lebar layar ≥ 360 dp dan skala teks ≤ 1,3, selain itu bertumpuk. Urutan alur "Lihat → Tiru → Bandingkan → Ulangi" tidak berubah.

#### 6.2.3 Hasil (`ResultView`)
```
[‹]  Langkah 3 dari 4
Bandingkan                            (serif Bold)
┌ kartu target (surface) ───────────┐   opsional, bila bentuk target tersedia
│ [gambar bibir]  Bentuk bibir      │   LipIllustration
│                 papa              │
└───────────────────────────────────┘
┌ Bibir ────────┐ ┌ Suara ────────┐
│▌◯✓ Sesuai     │ │▌△≈ Mendekati  │   dua StatusBadge sejajar
└───────────────┘ └───────────────┘
┌ HeroCard-pola (hijau) ────────────┐
│ Petunjuk                          │
│ Ucapkan sedikit lebih keras.      │   satu petunjuk, large Bold
└───────────────────────────────────┘
Grafik yang berlaku (Peta vokal / Cermin bibir / Kekerasan suara)
Hasil ini perkiraan sistem ...        (small, textMuted)
( ↻ Ulangi )
( Lihat contoh )( Selesai )
```
- `StatusBadge` di Hasil berukuran `lg`; di `home` berukuran `md`. Properti lama tidak berubah.
- Mode `overall`: satu badge lebar penuh. Mode `hidden` dan `retry`: tetap `InfoNote` seperti sekarang.
- Satu petunjuk, tidak lebih. Bila `hint_id` kosong, kartu petunjuk tidak ditampilkan.
- Kartu target hanya ditampilkan bila bentuk target sudah tersedia dari data yang ada (`targetShape`); jangan menambah logika baru.
- Pertahankan `testID` yang ada (`result-ok`, `result-bibir`, `result-suara`, `result-hint`, `result-overall`, `result-hidden`, `result-retry`, `result-disclaimer`).

## 7. Teks (bahasa Indonesia)

- Kalimat pendek, kata umum, kata kerja di depan. Sapaan "kamu" hanya bila perlu. Tanpa tanda seru, tanpa emoji dalam teks sistem.
- Istilah tetap: **Sesuai / Mendekati / Belum sesuai**, **Bibir**, **Suara**, **teman Tuli**, **Rekan Wicara**.
- Petunjuk konkret: "Buka mulut sedikit lebih lebar."

| Hindari | Pakai |
|---|---|
| "Salah", "gagal" | "Belum sesuai" |
| "Hebat! Terus semangat!" | "Mendekati. Coba sekali lagi." |
| "diagnosis", "terapi", "normal", "gangguan" | tidak dipakai |
| "penderita", "tunarungu" | "teman Tuli", "pengguna" |
| "Silakan lafalkan vokal berikut" | "Ucapkan “a”" |
| "Cermin Wicara", "RekanWicara" | "Rekan Wicara" |

## 8. Getar dan gerak

| Momen | Getar | Wajib ada juga |
|---|---|---|
| Rekam dimulai | impact sedang | Indikator "Merekam" |
| Rekam selesai | notifikasi berhasil | Teks "Selesai" |
| Hasil Sesuai | notifikasi berhasil | Badge |
| Mendekati / Belum sesuai | impact ringan | Badge |

- Tanpa getar tipe error atau warning pada hasil latihan.
- Semua panggilan getar tidak boleh melempar error (pola `buzz` yang ada) dan harus mengikuti sakelar Getar di Pengaturan. Sakelar itu belum ada (diperiksa: `settings.tsx` tidak memuat `Switch` atau kata "getar"); getar saat ini hanya dipanggil dari `RecordPanel.tsx`.
- Gerak hanya efek tekan (skala 0,98, 100 ms), pengisian cincin, dan transisi layar bawaan. Tanpa konfeti. Hormati Reduce Motion lewat `AccessibilityInfo.isReduceMotionEnabled` bawaan React Native (tanpa dependensi); bila aktif, tanpa animasi.

## 9. Lapisan kamera

Latar `#000000`, oval panduan dan hitung mundur putih, indikator REC merah dengan ikon dan teks. Hitung mundur 140 dp dipertahankan. Cek pencahayaan memakai ikon + teks. Semua nilai lewat token `overlay`. Karena seluruh app sudah gelap, tidak ada lagi lompatan terang-gelap saat membuka kamera.

## 10. Grafik hasil (`results/charts.tsx`)

Garis target putus-putus `textMuted`, garis pengguna tebal `text`, dengan label teks. Setiap grafik punya `accessibilityLabel` yang menjelaskan isinya. Pola (putus vs tebal), bukan warna, yang membedakan target dan pengguna. Berkas ini dirancang untuk latar terang: ganti semua warna dengan token dan periksa kontras tiap elemen (**belum dibaca saat dokumen ini ditulis**).

## 11. Larangan

- Gradasi, efek kaca, dan **bayangan dalam bentuk apa pun** (keras, blur, glow).
- Teks atau ikon putih di atas `accent`. `accent` untuk tombol, teks, atau status.
- Maskot atau karakter ilustrasi yang disalin dari referensi atau dihasilkan AI. Ilustrasi tetap `LipIllustration` buatan tim.
- **Miring (italic) di mana pun.** Serif untuk teks isi, tombol, label, atau angka; serif hanya untuk judul (bagian 4).
- Ikon tanpa label pada navigasi atau aksi.
- Emoji sebagai ikon UI atau hiasan. Pengecualian: `item.emoji` adalah isi materi dari server (tampil di `home`, `ModelVideo`, `companion`); boleh dipertahankan sebagai gambar kata, dengan teks kata selalu menyertainya dan emoji tidak dibaca pembaca layar (`accessible={false}`).
- Ilustrasi 3D/blob. **Ilustrasi atau logo buatan AI.**
- Lebih dari empat warna per layar di luar warna status.
- Semua teks rata tengah (default rata kiri). Teks kapital semua. Bentuk kapsul selain tombol dan bar bawah.
- Kisi kartu seragam berisi ikon, judul, dan dua baris teks (ubin level dan ubin kemajuan adalah pengecualian karena membawa data berbeda).
- Pujian generik, teks promosi, lorem ipsum, data tiruan yang terlihat palsu.
- Hex atau angka ukuran literal di file layar/komponen.

## 12. Daftar periksa per layar yang diubah

- [ ] Tangkapan layar hitam-putih: tiga status masih berbeda (bentuk + label).
- [ ] Skala teks 200%: tidak ada teks terpotong atau tumpang tindih (termasuk judul serif, ubin, dan bar bawah).
- [ ] Perangkat dibisukan, getar mati: semua alur selesai.
- [ ] Target sentuh ≥ 48 dp; jarak antar tombol ≥ 12 dp.
- [ ] Setiap tombol, badge, dan item bar bawah punya `accessibilityLabel`.
- [ ] Tidak ada hex/ukuran literal di file layar.
- [ ] Teks sesuai bagian 7; nama "Rekan Wicara".
- [ ] Reduce Motion aktif: hanya perubahan langsung.
- [ ] Panel rekam: keadaan "Merekam" terlihat sepanjang rekaman.
- [ ] Efek tekan terlihat saat jari menutupi tombol (isi berubah, bukan hanya skala).
- [ ] Tidak ada bayangan, tidak ada teks miring, tidak ada putih di atas koral.
- [ ] Setiap ikon bar bawah punya label teks yang terlihat.
- [ ] Layar diperiksa di bawah cahaya terang (di luar ruangan atau kecerahan tinggi): teks redup tetap terbaca.
- [ ] `npm test` dan `npm run typecheck` lulus.

## 13. Setelah submission (tidak dikerjakan sekarang)

Source tidak boleh berubah setelah submission, jadi ini hanya rencana: Playfair Display dan cincin fokus (bila tidak sempat dikerjakan sebagai langkah opsional 0.2), tema terang sebagai pilihan, layar Kemajuan sebagai tab sungguhan, dan diagram penampang CC0 (Wright & McCloy) sebagai pelengkap ilustrasi (https://commons.wikimedia.org/wiki/Category:Phonetics; cek lisensi di halaman berkas, simbol IPA hanya pendekatan bunyi bahasa Indonesia).

## 14. Belum diverifikasi

- Belum diuji dengan pengguna Tuli. Jangan menulis "teruji pengguna" atau "ramah Tuli" sebagai klaim terbukti. Tidak ada bukti bahwa tema gelap lebih baik atau lebih buruk bagi teman Tuli.
- Simulasi buta warna belum dijalankan; pengaman utamanya bentuk dan label. Risiko khusus: koral (`accent`) dan merah muda (`danger`) berdekatan; dibedakan dengan fungsi dan bentuk, bukan hanya warna.
- Teks redup di layar gelap pada cahaya terang (di luar ruangan) belum diuji.
- Ukuran yang lebih kecil dari kode lama (target 48 dp, teks isi 17) memenuhi pedoman umum, tetapi belum diuji dengan pengguna.
- Bentuk ikon status, efek tekan, `HeroCard`, `ProgressRing`, `BottomBar`, tampilan Playfair (atau cadangan serif sistem), dan pola getar belum diuji di perangkat, termasuk pada skala teks 200%.
- Kontras dihitung dengan rumus WCAG pada 13 Nov 2026; hitung ulang bila warna diubah. `results/charts.tsx` sudah dibaca dan diberi token (UI-2b); isi area grafik (segitiga vokal 1,10:1, isi bibir pengguna 1,74:1) dekoratif, informasi dibawa garis (≥ 4,10:1). Belum dilihat di perangkat.
- Ikon status (UI-5): garis luar 3,5 dp, tanda dalam (centang, ≈, panah) 2 dp agar muat di 22 dp. Koordinat ditulis tanpa melihat hasil gambar.
- Sketsa tata letak 6.2 disusun dari pembacaan `home.tsx`, `practice/[itemId].tsx`, `ResultView.tsx`, `RecordPanel.tsx`, `BigButton.tsx`, dan `StatusBadge.tsx` pada 13 Nov 2026; belum dijalankan di perangkat.
- Arah gaya terinspirasi VibeMove (Dribbble) hanya pada struktur komponen dan suasana; itu bukan bukti kecocokan untuk teman Tuli.
- Nama "Rekan Wicara" belum diperiksa terhadap produk lain.
- Bukti riset desain untuk pengguna Tuli sebagian besar bersifat umum, bukan khusus latihan bicara atau Indonesia.

Penggunaan AI untuk desain dan kode wajib dicatat di dokumentasi lomba.
