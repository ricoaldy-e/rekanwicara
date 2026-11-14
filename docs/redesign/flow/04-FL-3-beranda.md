# FL-3 — Beranda dua kartu tanpa misi, dan daftar bunyi L1

**Tujuan:** Beranda hanya berisi dua kartu ("Level 1 — Bunyi vokal", "Level 2 dan 3 — Pilih kata") dengan ringkasan "x dari N sesuai", dan Level 1 punya daftar bunyinya sendiri.

- **Prioritas:** A
- **Saran model / effort:** Opus 5.5 / high. Alasan: menghapus banyak perilaku lama tanpa merusak kalibrasi, catatan server, dan `testID` yang masih berlaku. *(Belum diuji.)*
- **Mode:** Plan
- **Bergantung pada:** FL-D (katalog, `fromStored`), FL-2 (rute `(tabs)/home`). Bila FL-2 dibatalkan: kerjakan di `app/home.tsx`.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-3: <ringkas>`.
- Acuan: `docs/flow-srs-ui.md` §5.3, NAV-2, NAV-3, NAV-4, NAV-5 (Q6: tidak dikunci), LAT-1; `docs/kontrak-fe-final.md` §4, §8 (ringkasan dari status terbaik per `itemId` unik; **tanpa** kunci); `docs/design.md` §5.2, §5.8, §2, §7; `00-audit.md` c.1.
- Aturan: tanpa dependensi baru; status selalu ikon + teks + warna; target ≥ 48 dp; tanpa hex literal; teks Indonesia tanpa kata terlarang.
- Tidak boleh rusak: `calibration-banner` + tombol "Kalibrasi sekarang", catatan mode demo, catatan server mock, `home-error` + "Coba lagi".

## Langkah
1. `src/data/progress.ts` (murni): `bestStatus(attempts, itemId)` dari `profile.attempts` (simpanan v1 `hijau/kuning/merah` → `fromStored`), urutan terbaik `sesuai > mendekati > belum_sesuai`; `summary(itemIds)` → `{ done: jumlah itemId unik yang terbaiknya sesuai, total: jumlah itemId unik }`. Tes jest: kosong → 0 dari N; duplikat itemId dihitung sekali; `kuning` bukan sesuai.
2. Beranda `app/(tabs)/home/index.tsx`, tulis ulang isi (bukan provider):
   - Pertahankan blok catatan atas (demo, kalibrasi + `testID` `calibration-banner`, server mock, galat kesehatan).
   - Galat katalog → `InfoNote` `testID="home-error"` + "Coba lagi" (`reload` dari `useCatalog`).
   - Dua kartu (pakai `LevelTile` yang diperluas **atau** `Card` dengan `onPress`; pilih yang lebih sedikit kode): ikon Ionicons (`volume-medium-outline` untuk L1, `chatbubble-outline` untuk L2–3), nama, "x dari N sesuai". `accessibilityLabel` lengkap: "Level 1, Bunyi vokal, 2 dari 6 sesuai".
   - Kartu L1 → `/home/level-1`. Kartu L2–3 → `/home/words` (layar FL-5; untuk sementara buat berkas kosong berisi `InfoNote` "Segera hadir" **hanya bila** FL-5 tidak langsung dikerjakan sesudahnya).
   - Tautan "Tentang aplikasi" (`Card` dengan `›`, `accessibilityLabel` "Tentang aplikasi") di bawah kartu → `/about`.
   - Tombol "Mode Dataset" tetap bila `DATASET_MODE`.
   - Hapus: tekan-lama "Misi hari ini", `HeroCard` misi, daftar "Langkah hari ini", `StatTile`, ubin Level 0–4, `StageBadge`, teks "Lulus satu materi Level … dulu". Jangan menghapus berkas logika (`progression.ts`, `homeStats.ts`, `levels.ts`).
3. `app/(tabs)/home/level-1.tsx`: judul "Level 1 · Bunyi vokal"; satu `Card` per item `level_1` (urutan katalog): teks besar, `StatusBadge` status terbaik (`size="md"`, label "Terakhir") atau "Belum dicoba"; `testID="item-<itemId>"`; ketuk → `router.push({ pathname: '/practice/[itemId]', params: { itemId } })`. Tanpa kunci.
4. Tes: tulis ulang `__tests__/home.test.tsx`: dua kartu tampil dengan ringkasan; ketuk kartu L1 → push `/home/level-1`; ketuk L2–3 → push `/home/words`; tautan Tentang → push `/about`; `calibration-banner` tampil bila belum kalibrasi; `home-error` tampil saat katalog gagal; **tidak ada** teks "Misi hari ini". Tes baru `level1.test.tsx`: daftar dan navigasi. Catat di PROGRESS tes lama mana yang dihapus dan alasannya (NAV-3/NAV-4).
5. `design.md` **tidak** diubah di langkah ini (FL-10 mengusulkan perubahannya).

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] `grep -rn "planSession\|homeStats\|LEVEL_NAMES\|Misi hari ini" app/app` kosong.
- [ ] `grep -rn "Terkunci\|locked" app/app/(tabs)/home` kosong (Q6: tidak dikunci).
- [ ] Ringkasan "x dari N" dihitung dari `itemId` unik (tes membuktikan).

## Cek di HP (Rico)
- Beranda: dua kartu, angka "0 dari 6 sesuai" pada pemakaian pertama, bar bawah terlihat.
- Level 1 → daftar 6 bunyi (A, I, U, O, A panjang, Pelan ke keras). Ketuk A → sesi latihan (bar hilang) → rekam → hasil → kembali: status A berubah.
- Skala teks 200%: kartu tidak terpotong.
- Pembaca layar (TalkBack): kartu dibacakan dengan nama dan ringkasan.

## Penutup
Laporkan perubahan, tes yang diubah/dihapus beserta alasannya, yang belum teruji (data progres lama dari Level 0–4 masih terhitung bila id sama). Perbarui PROGRESS. Komit. **BERHENTI.**
Aturan mundur: bila rekam → hasil dari Level 1 rusak dan tidak beres ±20 menit, `git revert`.
