# Prompt Claude Code — Rombak UI "Hutan Malam" (design.md v6)

13 Nov 2026 · Acuan: `docs/design.md` v6. Pengganti urutan di design.md §0.1 (langkah 2 dipecah jadi 2a dan 2b, ditambah langkah 0, 11, dan 12).

## Cara pakai

1. **Satu langkah = satu sesi.** Setelah langkah selesai, di-commit, dan dicek di HP, ketik `/clear`, lalu tempel prompt berikutnya.
2. Atur model dan effort **sebelum** menempel prompt (`/model`). Saran per langkah ada di tabel di bawah.
3. Langkah bertanda **[Plan]**: masuk Plan Mode dulu (Shift+Tab sampai mode plan aktif), setujui rencananya, baru biarkan dikerjakan.
4. Setelah tiap langkah, buka app di HP (Expo Go) dan lihat layar yang berubah. Tes hijau belum berarti tampilannya benar.
5. Aturan mundur (design.md §0.1): langkah yang merusak alur rekam→hasil dan tidak beres dalam ±20 menit dibatalkan dengan `git revert <hash>`.
6. Bila Claude mengerjakan hal di luar langkah, hentikan dengan Esc: "Hanya langkah UI-n."

## Ringkasan langkah, model, dan effort

| Langkah | Isi | Model | Effort | Mode | Wajib? |
|---|---|---|---|---|---|
| 0 | Cabang + commit dokumen (manual) | — | — | — | Wajib |
| UI-1 | Ganti nama "Rekan Wicara" | Sonnet | low | biasa | Wajib |
| UI-2a | Semua warna/ukuran lewat token, **tanpa** mengubah tampilan | Sonnet | medium | [Plan] | Wajib |
| UI-2b | Ganti nilai token ke tema gelap + grafik, bibir, status bar, app.json | Opus | high | [Plan] | Wajib |
| UI-3 | `BigButton` kapsul | Sonnet | medium | biasa | Wajib |
| UI-4 | `Card` + `HeroCard` | Sonnet | medium | biasa | Wajib |
| UI-5 | `StatusBadge` + ikon SVG | Sonnet | high | biasa | Wajib |
| UI-6 | Tata letak Hasil | Sonnet | high | [Plan] | Prioritas 1 |
| UI-7 | Tata letak `practice` | Sonnet | medium | biasa | Prioritas 2 |
| UI-8 | Tata letak `home` | Opus | high | [Plan] | Prioritas 3 |
| UI-9 | `BottomBar` | Sonnet | medium | biasa | Prioritas 4 |
| UI-10 | Sakelar Getar + Reduce Motion | Sonnet | high | [Plan] | Wajib |
| UI-11 | Pemeriksaan akhir (review, tanpa fitur baru) | Opus | high | biasa | Wajib |
| UI-12 | Opsional: Playfair Display / cincin fokus | Sonnet | medium | biasa | Opsional |

Alasan pembagian model:
- **Opus** dipakai untuk langkah yang menyentuh banyak berkas sekaligus atau perlu menimbang kontras dan perilaku tersembunyi (2b, 8, 11).
- **Sonnet** cukup untuk langkah yang batasnya jelas (satu komponen atau satu layar).
- Effort tinggi dipakai di langkah yang punya tes yang mudah pecah (5, 6, 10).

**Kenapa langkah 2 dipecah.** Tema gelap tidak bisa setengah jadi. Begitu latar berubah gelap, setiap warna literal yang tertinggal langsung gagal kontras di layar mana pun, termasuk layar dataset. Contohnya hijau `#1B5E20` di atas latar gelap hanya sekitar 2:1. Jadi:
- **2a** memindahkan semuanya ke token tanpa mengubah tampilan (aman, mudah diverifikasi);
- **2b** hanya mengganti nilai token dan memperbaiki tempat yang dirancang untuk latar terang.

Bila waktu habis setelah 2b, app sudah gelap dan konsisten walau komponennya masih lama.

---

## Langkah 0 — Persiapan (manual, tanpa Claude)

```bash
git status                       # periksa: app/package-lock.json berubah, padahal package.json hanya beda akhir baris
git diff app/package-lock.json   # pastikan perubahan ini memang disengaja; bila tidak, git checkout -- app/package-lock.json
git checkout -b ui-hutan-malam
git add docs/design.md docs/PROMPT_UI.md CLAUDE.md
git commit -m "docs: design v6 Hutan Malam and UI prompts"
cd app && npm test && npm run typecheck   # catat hasil awal; semua langkah dibandingkan dengan ini
```

Bila tes awal sudah ada yang merah, catat dulu. Jangan biarkan Claude "memperbaiki" tes yang sudah merah sejak awal.

---

## UI-1 — Ganti nama · Sonnet, low

```
Langkah UI-1. Baca CLAUDE.md dan docs/design.md §1 dan §7. Hanya langkah ini.

Tujuan: semua teks yang terlihat pengguna memakai nama "Rekan Wicara".

Kerjakan:
1. Cari "Cermin Wicara" (tidak peka huruf besar/kecil) di app/. Ganti menjadi "Rekan Wicara" di teks yang terlihat
   pengguna: app.json (name, teks izin kamera dan mikrofon), app/_layout.tsx (judul header home),
   app/onboarding.tsx, app/about.tsx, src/user/report.ts, dan tempat lain yang muncul dari pencarian.
2. JANGAN ganti "Cermin bibir" (nama grafik di hasil, design.md §1).
3. JANGAN ganti slug, package name, bundle id, scheme, nama folder, atau nama berkas di langkah ini.
   Bila ada yang masih bernama cermin-wicara, laporkan saja.
4. Perbarui tes yang memeriksa teks lama.

Selesai bila: pencarian "Cermin Wicara" di app/ (di luar node_modules) kosong; npm test dan npm run typecheck lulus.
Commit: "phase UI-1: rename app to Rekan Wicara". Laporkan daftar berkas yang berubah.
```

---

## UI-2a — Semua lewat token, tampilan tidak berubah · Sonnet, medium · [Plan]

```
Langkah UI-2a. Baca CLAUDE.md dan docs/design.md §0 dan §3. Hanya langkah ini.

Tujuan: tidak ada lagi warna atau radius literal di luar app/src/theme/index.ts, dan nama token sudah sesuai design.md §3.
TAMPILAN TIDAK BOLEH BERUBAH di langkah ini: semua nilai baru sama dengan nilai lama.

Kerjakan:
1. Cari hex, rgb/rgba, dan nama warna literal di app/app dan app/src (di luar theme). Yang saya tahu:
   RecordPanel.tsx (REC_RED, latar dan teks putih/hitam lapisan kamera), LipIllustration.tsx (LIP_FILL, MOUTH_DARK),
   results/charts.tsx (rgba(17,17,17,0.18) di Cermin Bibir), StatusBadge.tsx (#111111), InfoNote.tsx (#FDECEA),
   UploadStatus.tsx, PermissionGate.tsx, ClipPreview.tsx, ModelVideo.tsx, dataset/session.tsx, dataset/model-videos.tsx (#1B5E20).
   Jalankan pencarianmu sendiri juga; daftar ini mungkin belum lengkap.
2. Tambahkan token di theme dengan NILAI LAMA: success, warningBg, overlay {background, text, record}, lip {fill, mouthDark},
   chart {userFill}, serta nama baru dari §3 yang belum ada: surfaceRaised, hero, onHero, onHeroMuted, primaryPressed,
   accent, onAccent, stroke {thin, thick}, fontFamily {display, text}.
   Untuk token baru yang belum dipakai, isi nilai sementara yang tidak mengubah tampilan dan beri komentar "nilai v6 di UI-2b".
3. Radius: tambahkan tile, card, pill. Ganti pemakaian radius.md → radius.tile dan radius.lg → radius.card di semua berkas,
   lalu hapus md/lg. Nilai sementara tile = 12, card = 18 (nilai lama).
4. Token yang tidak ada di §3 (secondary, onSecondary, infoBorder, disabled) masih dipakai BigButton.tsx dan InfoNote.tsx.
   Biarkan dulu (akan hilang di UI-3), tapi tulis daftar pemakaiannya di laporan.
5. Ganti fontWeight '800'/'900' menjadi '700' (design.md §4). Ini satu-satunya perubahan tampilan yang diizinkan.
6. statusStyles: JANGAN ubah bentuk datanya di langkah ini (diubah di UI-5).

Jangan: mengubah nilai warna, tata letak, teks, testID, atau accessibilityLabel.
Selesai bila: pencarian hex/rgba di luar theme kosong (kecuali komentar); npm test dan npm run typecheck lulus;
app di HP terlihat sama seperti sebelumnya.
Commit: "phase UI-2a: route all colors and radii through theme tokens".
```

---

## UI-2b — Tema gelap · Opus, high · [Plan]

```
Langkah UI-2b. Baca CLAUDE.md dan docs/design.md §2, §3, §4, §5.6, §9, §10, §11. Hanya langkah ini.

Tujuan: seluruh app memakai palet gelap "Hutan Malam" dan skala ukuran baru, dengan kontras benar di SETIAP layar,
termasuk layar pengembang (dataset, allosaurus, wav2vec2, combined). Komponen belum diubah bentuknya (itu UI-3 sampai UI-5).

Kerjakan:
1. Ubah nilai token di app/src/theme/index.ts ke design.md §3 (warna, fontSize, radius, touchTarget 48, stroke, fontFamily).
   fontFamily.display: Platform.select({ ios: 'Georgia', android: 'serif' }); fontFamily.text: undefined (font sistem).
   Tambahkan fontSize.label = 17 (§4).
2. Petakan token lama yang tidak ada di §3 supaya tidak ada yang tak terbaca di latar gelap:
   secondary → transparan, onSecondary → text, infoBorder → border, disabled → surfaceRaised.
   Periksa setiap pemakaian colors.primary: di v6 primary adalah krem (isi tombol), bukan aksen biru.
   Pemakaian sebagai warna teks atau ikon (judul level, label misi, ikon langkah, ActivityIndicator, header tint)
   harus diganti ke text atau textMuted. Jangan pakai accent untuk teks (§3.3).
3. app/_layout.tsx: <StatusBar style="light" />, header dan konten berlatar background, headerTintColor text.
   app.json: userInterfaceStyle "dark", backgroundColor dan splash backgroundColor "#08110B" (supaya tidak berkedip putih).
4. results/charts.tsx (berkas ini dirancang untuk latar terang): garis target putus-putus textMuted,
   garis pengguna tebal text, isi area dengan token yang terlihat di surface, teks SVG minimal 4,5:1.
   Tulis di laporan kontras setiap pasangan warna yang kamu pakai, dihitung dengan rumus WCAG.
5. LipIllustration.tsx (§5.6): garis text 3 dp tanpa isi warna, di atas surface. Bukaan mulut boleh diisi background.
   Bentuk bibir per bunyi TIDAK berubah.
6. RecordPanel.tsx dan lapisan kamera (§9): nilai overlay tetap hitam/putih/merah rekam; hitung mundur tetap 140.
   Bingkai kamera: radius.card, garis stroke.thick border.
7. Teks yang memakai textMuted di atas hero hanya 3,76:1. Jangan menaruh textMuted di atas hero; pakai onHeroMuted.
8. Jalankan aplikasi di pikiranmu layar demi layar: onboarding, calibration, home, practice (semua tahap), companion,
   settings, about, dataset. Cari teks gelap di atas gelap, ikon yang hilang, dan garis yang tidak terlihat.

Jangan: mengubah struktur komponen, tata letak, teks, testID, accessibilityLabel, atau logika.
Selesai bila: npm test dan npm run typecheck lulus; laporan berisi daftar layar yang diperiksa dan tabel kontras grafik.
Commit: "phase UI-2b: dark Hutan Malam palette and type scale".
```

Cek manual setelah UI-2b: buka setiap layar di HP. Lihat dalam cahaya terang (design.md §12). Rekam satu percobaan sampai hasil.

---

## UI-3 — BigButton · Sonnet, medium

```
Langkah UI-3. Baca CLAUDE.md dan docs/design.md §5.1 dan §8. Hanya langkah ini.

Tujuan: app/src/components/BigButton.tsx mengikuti §5.1. Struktur dan props tetap; hanya gaya dan keadaan ditekan.

Kerjakan:
1. Kapsul radius.pill, tinggi minimal 52, tanpa bayangan. Teks fontSize.label Bold, maxFontSizeMultiplier={2}.
   Ikon Ionicons 22. Teks boleh membungkus ke dua baris pada skala besar; tombol harus tumbuh, bukan memotong.
2. primary: isi primary, teks onPrimary; ditekan → isi primaryPressed.
   secondary: isi transparan, garis stroke.thick border, teks text; ditekan → isi surfaceRaised.
   Nonaktif: isi surfaceRaised, teks textMuted, tanpa garis. Tanpa opacity di keadaan mana pun.
3. Skala 0,98 saat ditekan. Bila Reduce Motion aktif, tanpa skala (isi tetap berubah).
   Pakai AccessibilityInfo.isReduceMotionEnabled() dan event reduceMotionChanged, dalam satu hook kecil
   (src/a11y/useReduceMotion.ts) yang juga akan dipakai UI-10. Tanpa dependensi.
4. Hapus token secondary, onSecondary, disabled, dan infoBorder bila sudah tidak dipakai di mana pun (cek InfoNote.tsx).
5. Tambahkan tes: tombol nonaktif tidak memanggil onPress; accessibilityState.disabled benar. Tes yang ada tetap lulus.

Jangan: mengubah props, label, testID, atau tombol di layar mana pun.
Selesai bila: npm test dan npm run typecheck lulus. Commit: "phase UI-3: capsule BigButton".
```

---

## UI-4 — Card dan HeroCard · Sonnet, medium

```
Langkah UI-4. Baca CLAUDE.md dan docs/design.md §5.2 dan §5.4. Hanya langkah ini.

Kerjakan:
1. Card.tsx: statis = isi surface, tanpa garis, radius.card, padding 16. Dengan onPress = sama, ditambah
   Ionicons chevron-forward di kanan (accessible={false}), tinggi minimal touchTarget, isi surfaceRaised saat ditekan.
   Props tetap sama.
2. HeroCard.tsx baru di src/components (ekspor lewat index.ts): props { title, body?, children?, testID?, titleProps? }.
   Isi hero, radius.card, padding 20. Judul fontFamily.display fontSize.title Bold warna onHero,
   accessibilityRole="header". Body onHeroMuted fontSize.body. children untuk satu tombol primary.
   Belum dipakai di layar mana pun pada langkah ini.
3. InfoNote, ProgressBar, StepHeader (§5.4): InfoNote netral latar infoBg; warning latar warningBg + danger + ikon + teks.
   ProgressBar trek surfaceRaised, isi text. StepHeader: "Langkah n dari N" (small, textMuted) di atas judul serif.
4. Title di Typography.tsx memakai fontFamily.display.
5. Tes kecil untuk HeroCard: judul dibaca sebagai header, children dirender.

Selesai bila: npm test dan npm run typecheck lulus. Commit: "phase UI-4: flat Card, HeroCard, note styles".
```

---

## UI-5 — StatusBadge · Sonnet, high

```
Langkah UI-5. Baca CLAUDE.md dan docs/design.md §3.1 dan §5.3. Hanya langkah ini.

Kerjakan:
1. statusStyles di theme: tiap status { label, foreground } dengan warna §3.1. Hapus background/icon lama.
   Perbarui semua pemakai: StatusBadge.tsx, results/ResultView.tsx, app/home.tsx, src/experiments/CombinedObservations.tsx
   (memakai style.background; ganti ke latar surface + batang kiri warna status, sama seperti badge).
2. Komponen StatusIcon (react-native-svg, garis 3,5, ukuran 22 untuk md dan 28 untuk lg, warna foreground):
   hijau = lingkaran + centang; kuning = segitiga + tanda ≈; merah = persegi bersudut tumpul + panah memutar.
   Bentuk luar harus berbeda jelas bila dilihat hitam-putih. accessible={false}.
3. StatusBadge: latar surface, radius.tile, batang kiri 4 dp warna status, ikon dan teks warna status,
   fontSize.label Bold, maxFontSizeMultiplier={2}. Props, accessibilityLabel ("Bibir: Sesuai"), dan testID tetap.
   Teks tidak pernah putih di atas warna status.
4. Perbarui __tests__/StatusBadge.test.tsx: uji label teks dan accessibilityLabel untuk tiga status, dan bahwa
   tiap status merender bentuk ikon yang berbeda (lewat testID ikon). Jangan menghapus kasus uji yang ada tanpa
   menggantinya. Catat perubahan tes di docs/PROGRESS.md.

Selesai bila: npm test dan npm run typecheck lulus. Commit: "phase UI-5: StatusBadge with distinct shape icons".
```

---

## UI-6 — Tata letak Hasil · Sonnet, high · [Plan]

```
Langkah UI-6. Baca CLAUDE.md dan docs/design.md §6.1 dan §6.2.3, lalu src/results/ResultView.tsx dan
__tests__/ResultView.test.tsx. Hanya langkah ini.

Tujuan: ResultView mengikuti sketsa §6.2.3. Logika (mode overall/hidden/retry, pilihan grafik, getHint, targetShape) tetap.

Kerjakan:
1. Urutan mode ok: kartu target (hanya bila targetShape ada; LipIllustration + kata target),
   dua StatusBadge ukuran lg sejajar (susun vertikal bila lebar < 360 dp atau skala teks > 1,3; pakai useWindowDimensions),
   kartu petunjuk berpola hero (label "Petunjuk" onHeroMuted + satu kalimat fontSize.large Bold onHero; tidak dirender
   bila hint kosong), grafik yang berlaku, disclaimer small textMuted.
2. Mode overall: satu badge lebar penuh. Mode hidden dan retry: InfoNote seperti sekarang.
3. Pertahankan semua testID (result-ok, result-bibir, result-suara, result-hint, result-overall, result-hidden,
   result-retry, result-disclaimer) dan teks disclaimer persis.
4. Tombol aksi tetap di layar practice (UI-7), bukan di ResultView.

Selesai bila: tes ResultView lulus tanpa melemahkan asersinya; npm run typecheck lulus.
Commit: "phase UI-6: result layout".
```

---

## UI-7 — Tata letak practice · Sonnet, medium

```
Langkah UI-7. Baca CLAUDE.md dan docs/design.md §6.2.2, lalu app/practice/[itemId].tsx. Hanya langkah ini.

Kerjakan:
1. Tiap tahap: StepHeader di atas, isi di tengah, area aksi di bawah dengan jarak spacing.lg.
2. Lihat: ModelVideo di kartu surface; "Mulai rekam" primary.
3. Tiru: kata target besar (fontSize.display, fontFamily.display) di atas RecordPanel, menggantikan kalimat "Ucapkan: ...".
   Emoji materi boleh tampil di sebelahnya dengan accessible={false}; accessibilityLabel kata target tetap
   menyebut "Ucapkan <kata>". "Lihat contoh lagi" secondary di bawah panel.
4. Kirim: tetap; "Rekam ulang" hanya bila gagal.
5. Bandingkan: "Ulangi" primary lebar penuh; "Lihat contoh lagi" dan "Selesai" secondary berdampingan bila lebar ≥ 360
   dan skala teks ≤ 1,3, selain itu bertumpuk. Jarak antar tombol minimal 12.

Jangan: mengubah state, alur tahap, unggahan, atau penghapusan rekaman.
Selesai bila: npm test dan npm run typecheck lulus; alur Lihat → Tiru → Bandingkan → Ulangi dicoba di HP.
Commit: "phase UI-7: practice layout".
```

---

## UI-8 — Tata letak home · Opus, high · [Plan]

```
Langkah UI-8. Baca CLAUDE.md, docs/design.md §5.7, §5.8, §6.2.1, lalu app/home.tsx dan __tests__/home.test.tsx
(dan tes lain yang merender Home, cari dengan grep). Hanya langkah ini. BottomBar BUKAN langkah ini.

Tujuan: home mengikuti sketsa §6.2.1. Data, plan, progres, dan navigasi tidak berubah.

Kerjakan:
1. Header: teks "Rekan Wicara" (fontFamily.display). JANGAN menambah ikon pengaturan: Pengaturan tetap tersembunyi.
2. Tekan-lama 2 detik untuk membuka /settings HARUS tetap ada, dengan accessibilityLabel "Misi hari ini".
   Taruh di judul kecil "Misi hari ini" di atas HeroCard. Tambahkan tes yang memicu onLongPress dan memeriksa
   router.push('/settings'), bila belum ada.
3. HeroCard: judul = kata target langkah berikutnya ("Siap latihan “papa”?"), body = "Langkah x dari N.", tombol primary
   "Mulai latihan" testID mission-start. Bila semua langkah selesai: body "Sesi hari ini selesai." tanpa tombol.
   Bila tidak ada plan: judul "Pilih satu materi untuk mulai berlatih." (pertahankan teks lama persis; tes memakainya).
   needsHelp tetap InfoNote testID mission-needs-help di bawahnya. Kalibrasi tetap InfoNote + tombol, tapi secondary.
4. LevelTile (komponen baru): satu ubin per level yang ADA di data (groupByLevel). Level 4 (Pasangan kata) ada di
   LEVEL_NAMES, jadi bisa lima ubin; bungkus ke baris berikutnya bila tidak muat. Ikon: L0 volume-medium-outline,
   L1 happy-outline, L2 chatbubble-outline, L3 text-outline, L4 swap-horizontal-outline. Label "Level n".
   Terkunci bila semua materi di level itu locked: ikon lock-closed + "Terkunci" textMuted, tetap bisa difokuskan.
   accessibilityRole="button", accessibilityState { selected }, label "Level n: <nama>" (+ ", terkunci").
   Pilihan level = useState tampilan saja; default level materi langkah berikutnya, bila tidak ada level terbuka terendah.
   Daftar materi di bawah hanya menampilkan level terpilih.
5. StatTile + ProgressRing (komponen baru, §5.7): "x / N langkah" dari plan, "n sesuai" (jumlah materi dengan progress
   last === 'hijau'; cincin = n / jumlah materi), "m menit sesi" dari profile.settings.sessionMinutes tanpa cincin.
   Hitungan ini fungsi murni kecil di src/state (mis. homeStats.ts) dengan tes jest; data kosong → 0.
6. Daftar langkah hari ini: pertahankan accessibilityLabel tiap langkah persis ("Pemanasan: hold_a", dst.).
7. Baris materi: Card bisa ditekan, kata target fontSize.large Bold, StageBadge dan StatusBadge md di bawahnya,
   terkunci = ikon gembok + "Terkunci" + kalimat syarat lama. Emoji accessible={false}.
8. Pertahankan semua testID (mission, mission-start, item-<id>, stage-<id>, calibration-banner, home-error,
   mission-needs-help) dan tombol "Mode Pendamping", "Tentang aplikasi", "Mode Dataset" di kaki layar (BottomBar di UI-9).

Selesai bila: semua tes lulus tanpa melemahkan asersi; tes baru untuk homeStats dan tekan-lama; typecheck lulus.
Cek di HP: skala teks 200% tidak memotong ubin. Commit: "phase UI-8: home layout with hero, level and stat tiles".
```

---

## UI-9 — BottomBar · Sonnet, medium

```
Langkah UI-9. Baca CLAUDE.md, docs/design.md §5.9, lalu app/home.tsx dan __tests__/home.test.tsx. Hanya langkah ini.

Kerjakan:
1. Komponen BottomBar: kapsul surface di bawah layar, tinggi 64 + area aman (react-native-safe-area-context yang sudah ada),
   tiga item ikon di atas label yang selalu terlihat (fontSize.small, maxFontSizeMultiplier={2}).
2. Item: Latihan (aktif, accessibilityState { selected: true }; menekannya menggulir ke atas atau tidak berbuat apa-apa,
   jangan navigasi), Pendamping → /companion (accessibilityLabel "Mode Pendamping"),
   Tentang → /about (accessibilityLabel "Tentang aplikasi").
3. Aktif: lingkaran accent 48 dp di belakang ikon (ikon onAccent), label text Bold. Tidak aktif: textMuted.
   Tidak ada putih di atas accent.
4. Hapus dua tombol sekunder lama di kaki home. "Mode Dataset" (DATASET_MODE) tetap tombol di atas bar.
   Isi layar tidak boleh tertutup bar: beri padding bawah pada konten scroll.

Selesai bila: tes home yang menekan "Mode Pendamping" dan "Tentang aplikasi" tetap lulus tanpa diubah; typecheck lulus.
Commit: "phase UI-9: home bottom bar".
```

---

## UI-10 — Getar dan Reduce Motion · Sonnet, high · [Plan]

```
Langkah UI-10. Baca CLAUDE.md, docs/design.md §6 (baris settings) dan §8, lalu app/settings.tsx,
src/recording/RecordPanel.tsx, dan cara profile.settings disimpan (src/state/user dan src/user). Hanya langkah ini.

Kerjakan:
1. Tambahkan setting vibration (boolean, default true) ke profile.settings dengan cara yang sama seperti
   sessionMinutes disimpan. Profil lama tanpa field ini harus terbaca sebagai true (jangan merusak data tersimpan).
2. settings.tsx: baris "Getar" dengan Switch bawaan React Native, label di kiri, teks "Aktif"/"Mati" terlihat di
   samping sakelar, accessibilityLabel "Getar", target ≥ 48 dp, warna lewat token.
3. Satukan panggilan getar dalam satu modul (src/a11y/haptics.ts) yang mengikuti pola buzz yang ada (tidak pernah
   melempar) dan tidak memanggil expo-haptics bila setting mati. RecordPanel memakai modul ini.
   Pola sesuai tabel §8: rekam dimulai impact medium, rekam selesai notifikasi success.
   (Getar hasil Sesuai/Mendekati hanya bila sudah ada pemanggilan hasil; jangan menambah alur baru.)
4. Reduce Motion: pakai hook src/a11y/useReduceMotion.ts dari UI-3. Animasi yang tersisa (skala tombol, pengisian
   cincin, animasi hitung mundur bila ada) jadi perubahan langsung bila aktif.
5. Tes: setting mati → expo-haptics tidak dipanggil; profil lama tanpa field → getar aktif.

Selesai bila: npm test dan npm run typecheck lulus. Commit: "phase UI-10: vibration toggle and reduce motion".
```

---

## UI-11 — Pemeriksaan akhir · Opus, high

```
Langkah UI-11. Baca CLAUDE.md dan docs/design.md §11 dan §12. Jangan menambah fitur. Hanya perbaikan kecil.

Kerjakan:
1. Jalankan daftar periksa §12 untuk setiap layar yang berubah sejak cabang ui-hutan-malam dibuat (git diff main...HEAD).
   Untuk butir yang hanya bisa diperiksa di perangkat (skala 200%, TalkBack, cahaya terang, getar), tulis sebagai
   "perlu dicek manual", jangan ditandai lulus.
2. Cari pelanggaran §11 di kode: hex literal di luar theme, fontStyle italic, shadow*/elevation, putih di atas accent,
   kata terlarang di teks UI (normal, abnormal, gangguan, diagnosis, terapi, penderita, tunarungu, Cermin Wicara),
   ikon tanpa label pada navigasi atau aksi.
3. Perbaiki temuan yang kecil dan jelas. Temuan yang butuh keputusan desain dilaporkan, tidak diperbaiki.
4. Perbarui docs/PROGRESS.md (fase UI: apa yang selesai, yang dilewati, keputusan di luar design.md) dan
   bagian "Belum diverifikasi" di design.md §14 bila ada yang berubah.

Selesai bila: npm test dan npm run typecheck lulus; laporan berisi daftar periksa per layar dan daftar cek manual.
Commit: "phase UI-11: UI audit fixes and progress notes".
```

Setelah UI-11: cek manual di HP (§12), lalu merge `ui-hutan-malam` ke `main` sebelum fitur dikunci.

---

## UI-12 — Opsional (hanya bila UI-1 sampai UI-11 selesai) · Sonnet, medium

```
Langkah UI-12A. Baca CLAUDE.md dan docs/design.md §0.2 A dan §4. Hanya langkah ini.

Sebelum memasang apa pun: periksa di dokumentasi resmi Expo bahwa paket @expo-google-fonts/playfair-display ada dan
cara memuatnya dengan expo-font yang sudah terpasang, lalu TANYAKAN saya sebelum npx expo install.
Setelah saya setuju: muat hanya Playfair Display 700 Bold (tanpa italic); fontFamily.display memakainya; tahan splash
sampai font dimuat; bila gagal, kembali ke serif sistem tanpa crash. Ukuran tidak berubah.
Selesai bila: npm test dan typecheck lulus; judul di HP tidak terpotong pada skala 200%. Commit: "phase UI-12A: Playfair Display titles".
Batas 30 menit; bila lewat, saya akan revert.
```

```
Langkah UI-12B. Baca docs/design.md §0.2 B. Cincin fokus 3 dp warna focus, jarak 2 dp, hanya saat elemen difokuskan,
pada BigButton dan Card yang bisa ditekan. Tanpa dependensi. Tandai [BELUM DIVERIFIKASI di perangkat] di design.md §14.
Commit: "phase UI-12B: focus ring". Batas 15 menit.
```
