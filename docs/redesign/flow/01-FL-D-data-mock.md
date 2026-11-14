# FL-D — Lapisan data, tipe v2, dan data tiruan

**Tujuan:** layar bisa memakai katalog L1/kata, detail kata, dan hasil analisis berbentuk kontrak FE final, dari tiruan atau dari `/v1/analyze`, tanpa mengubah satu layar pun.

- **Prioritas:** A (semua langkah lain bergantung padanya)
- **Saran model / effort:** Opus 5.5 / high. Alasan: menentukan tipe dan adapter yang dipakai semua langkah; salah bentuk di sini menjalar. *(Saran belum diuji.)*
- **Mode:** Plan (tunjukkan daftar berkas dan tipe dulu, tunggu persetujuan)
- **Bergantung pada:** keputusan K5 dan K6 di `00-audit.md`. Bila Rico belum menjawab, pakai usulan (dua sakelar, nama `EXPO_PUBLIC_API_URL` tetap)

## Konteks tetap
- Cabang `flow-v2`. Satu langkah = satu komit `phase FL-D: <ringkas>`.
- Acuan: `docs/kontrak-fe-final.md` §1, §2, §4, §5, §8, §9 (menang atas flow §8); `docs/flow-srs-ui.md` §3, §6; `docs/redesign/flow/00-audit.md` b, c.2, f.
- Aturan: jangan sentuh `server/`; jangan komit `.env`/kunci; tidak ada service-role key atau kunci LLM di app; jangan pasang dependensi baru; jangan ubah tipe v1 di `src/api/types.ts` (tambahkan v2 di bagian terpisah); ambang tidak di-hardcode (UI tidak menilai apa pun).
- Tidak boleh rusak: `practice/[itemId]` tetap mengunggah ke `/v1/analyze` seperti sekarang (langkah ini **tidak** mengubah layar).

## Langkah
1. `src/config.ts`: tambah `USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true'` dan `ANALYZE_API: 'v1' | 'v2' | 'mock'` dari `EXPO_PUBLIC_ANALYZE_API` (bawaan `'v1'`, nilai tak dikenal → `'v1'`). Akses dengan titik (catatan di berkas itu). Tambah dua baris ke `app/.env.example` dengan komentar. Jangan sentuh `app/.env`.
2. `src/api/types.ts`: bagian baru `// ---------- v2 (docs/kontrak-fe-final.md) ----------` berisi `Level`, `Source`, `ResultStatus` (`'sesuai' | 'mendekati' | 'belum_sesuai'`; nama berbeda dari `Status` v1 agar tidak bentrok), `VideoRef`, `CatalogDTO`, `WordDTO`, `AnalyzeResponseV2`, `Visuals` dipakai ulang. Salin persis dari kontrak §4–§5.
3. `src/data/types.ts` (tipe UI): `PracticeItem` (kontrak §4) ditambah `source` dan `instructionSource?`; `WordSummary` (`id`, `text`, `source`, `hasLevel2`); `WordPath` (`word`, `syllables: PracticeItem[]`, `whole: PracticeItem`); `AnalyzeResult` = `AnalyzeResponseV2` yang sudah dibersihkan (status per level) + `sample: boolean` (true bila hasil tiruan).
4. `src/data/mappers.ts` (fungsi murni):
   - `catalogToL1(dto)`, `catalogToWords(dto)`, `wordToPath(dto)`; item `l0_*` → `level: 1`; `key = \`${itemId}#${position}\``; `video = videos[0]`.
   - `clampStatus(level, s)`: `mendekati` di level 2/3 → `belum_sesuai` + `console.warn` hanya bila `__DEV__` (kontrak §5 aturan 1).
   - `fromV1(res: AnalyzeResponse, level: Level): AnalyzeResult`: `hijau→sesuai`, `kuning→mendekati`, `merah→belum_sesuai`, lalu `clampStatus`; `retry` → `status:'retry'`, `feedback.message` = teks `getHint(hint_id)` (sudah ada di `src/content/hints.ts`); petunjuk v1 tunggal ditaruh di `lip_feedback` bila Bibir tidak sesuai, selain itu di `voice_feedback`; `visuals` hanya bila level 1, selain itu `null`; tidak menyalin `units` atau teks pengenalan apa pun.
   - `toStored(s: ResultStatus): Status` dan `fromStored(s: Status): ResultStatus` (kontrak §8: `sesuai→hijau`, `mendekati→kuning`, `belum_sesuai→merah`).
5. `src/mock/catalog.json` persis kontrak §4. **Satu perbedaan yang disengaja:** id suku kata bawaan memakai id v1 yang ada di `server/app/content/items.json` (`l2_ma`, `l2_pa`) agar `ANALYZE_API=v1` bisa menilainya. `src/mock/words/` berisi `l3_mama` (MA#1, MA#2), `l3_papa` (PA#1, PA#2), `custom_word:1111…` (TO, LONG), `custom_word:2222…` (`level_2: []`). Instruksi pendek, tanpa kata terlarang.
6. `src/data/catalog.ts`: `getCatalog()`, `getWord(id)`. `USE_MOCK` → baca tiruan (`Promise` dengan tunda kecil); selain itu panggil `src/api/v2.ts` (buat sekarang: `fetch` + `Authorization: Bearer` bila ada token + peta galat kontrak §9 ke `ApiError`; token diambil dari fungsi yang dioper, bukan diimpor dari auth agar tidak ada siklus).
7. `src/data/analyze.ts`: `analyze({ file, item, sessionId, userId }, opts)` → `AnalyzeResult`. `v1`: `api.analyze` lama + `fromV1`. `v2`: `src/api/v2.ts` + `clampStatus`. `mock`: hasil tiruan berurutan (sesuai, mendekati/belum, retry) dengan `sample: true`. Kata `source: 'custom'` dengan `ANALYZE_API=v1` → lempar galat berkode `NOT_SUPPORTED_V1` (layar memutuskan pesannya di FL-4; K10).
8. `src/data/useCatalog.ts`: hook kecil (memuat, galat, `reload`) untuk L1 dan kata. Jangan ubah `ContentProvider` (masih dipakai kalibrasi dan kesehatan server).
9. Tes jest baru `__tests__/mappers.test.ts`: tiga status L1; `mendekati` L2/L3 → `belum_sesuai`; `visuals` null di L2/L3; `fromV1` retry; `fromV1` tidak membawa `units`; `l0_*` → level 1; `key` dua langkah PA berbeda; `toStored/fromStored` bolak-balik. `__tests__/analyzeSource.test.ts`: `ANALYZE_API` tak dikenal → `v1`; kata custom + v1 → galat `NOT_SUPPORTED_V1`.

## Kriteria selesai
- [ ] `npm test` dan `npm run typecheck` lulus; jumlah tes lama tetap 296 + tes baru.
- [ ] Tidak ada berkas di `app/app/` yang berubah (`git diff --stat app/app` kosong).
- [ ] `grep -rn "service_role\|GEMINI\|sk-" app/src` kosong.
- [ ] Tipe v2 sama persis dengan kontrak §4–§5 (bandingkan baris per baris).

## Cek di HP (Rico)
- Tidak ada yang berubah di layar. Buka app, rekam satu latihan seperti biasa: hasil tetap muncul (bukti `/v1/analyze` tidak tersentuh).

## Penutup
Laporkan: berkas baru/berubah, keputusan bentuk tipe yang menyimpang dari kontrak (seharusnya hanya id `l2_*`), tes baru, yang belum teruji (klien v2 belum pernah memanggil server sungguhan). Perbarui `docs/PROGRESS.md` (bagian "Alur v2"). Komit. **Lalu BERHENTI.**
Aturan mundur: langkah ini tidak menyentuh layar; bila tes lama merah dan tidak beres dalam ±20 menit, `git revert` dan laporkan.
