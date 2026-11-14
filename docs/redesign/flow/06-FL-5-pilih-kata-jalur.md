# FL-5 — Pilih kata dan Jalur kata (L2 → L3)

**Tujuan:** pengguna memilih satu kata, lalu melihat suku katanya (Level 2, bila ada) dan kata itu sendiri (Level 3), dengan status tiap langkah dan penanda "Berikutnya", tanpa kunci.

- **Prioritas:** A (melengkapi alur Tuli)
- **Saran model / effort:** Sonnet 5.5 / medium. Alasan: dua layar daftar di atas lapisan data yang sudah ada. *(Belum diuji.)*
- **Mode:** biasa
- **Bergantung pada:** FL-D, FL-3 (kartu "Level 2 dan 3"), FL-4 (`practice` menerima `wordId` + `position`).

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-5: <ringkas>`.
- Acuan: `docs/flow-srs-ui.md` §5.3, LAT-2, LAT-3, LAT-5; `docs/kontrak-fe-final.md` §4 (aturan `has_level_2`, `position`, progres per `itemId` unik), §8; `docs/design.md` §5.2, §7, §11 (chip bukan kapsul).
- Aturan: tanpa dependensi baru; tanpa kunci level (Q6, kontrak §8); status ikon + teks + warna; target ≥ 48 dp.
- Tidak boleh rusak: rekam → hasil dari L1.

## Langkah
1. Komponen `src/components/SourceChip.tsx`: ikon + teks "Bawaan" (`lock-closed-outline`) atau "Dari Pendamping" (`person-outline`), `radius.tile`, `surfaceRaised`, `textMuted`; ekspor lewat `index.ts`.
2. `app/(tabs)/home/words/index.tsx` (Pilih kata): judul "Pilih kata"; satu `Card` per kata (urutan katalog, satu daftar, tanpa filter level): teks kata (`large`, Bold), `SourceChip`, ringkasan "Level 2: 1 dari 2 sesuai · Level 3: belum" (Level 2 tidak disebut bila `hasLevel2` false). Ringkasan butuh detail kata: muat `getWord` per kata secara malas **hanya** bila murah; bila tidak, tampilkan ringkasan Level 3 saja dan catat. Ketuk → `/home/words/[wordId]`. Kosong → `InfoNote`. `testID="word-<id>"`.
3. `app/(tabs)/home/words/[wordId].tsx` (Jalur kata): judul = kata. Bagian "Level 2 · Suku kata" (hanya bila ada): satu kartu per langkah urut `position` ("MA", "MA" — dua kartu, status sama karena per `itemId` unik). Bagian "Level 3 · Kata": satu kartu. Penanda "Berikutnya" (ikon + teks) pada langkah pertama yang status terbaiknya belum `sesuai`, urut L2 lalu L3. Ketuk kartu → `practice/[itemId]` dengan `params: { itemId, wordId, position }`. Galat/404 → "Materi tidak ditemukan." + kembali.
4. Kata Pendamping (`source: 'custom'`) dengan `ANALYZE_API=v1`: kartu tetap tampil; keterangan "Penilaian belum tersedia di server demo." mengikuti keputusan K10 (lihat FL-4).
5. Kata "belum lengkap" (kontrak §6) tidak pernah muncul di sini — penyaringan di `src/data` (FL-8); di tiruan semua lengkap.
6. Tes: `words.test.tsx` — daftar memuat empat kata tiruan dengan chip benar; "MINUM" tanpa bagian Level 2; "PAPA" menampilkan dua kartu PA dan satu kartu PAPA; "Berikutnya" pindah setelah status sesuai; ketuk mengirim `wordId` + `position`.

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus (jalankan `npx expo start` sekali bila typed routes mengeluh).
- [ ] Tidak ada daftar suku kata mandiri di mana pun (`grep -rn "level_2" app/app` hanya di Jalur kata).
- [ ] Bar bawah terlihat di Pilih kata dan Jalur kata; hilang di sesi latihan.

## Cek di HP (Rico)
- Beranda → "Level 2 dan 3" → Pilih kata: MAMA, PAPA (Bawaan), TOLONG, MINUM (Dari Pendamping, tiruan).
- PAPA → PA, PA, PAPA. Latih PA (server v1 menilai `l2_pa`): hasil dua status tanpa grafik; kembali → kedua kartu PA berstatus sama; "Berikutnya" pindah ke PAPA.
- MINUM → langsung Level 3.
- 200% teks: ringkasan membungkus, tidak terpotong.

## Penutup
Laporkan perubahan, tes baru, yang belum teruji (katalog v2 sungguhan; kata Pendamping sungguhan). Perbarui PROGRESS. Komit. **BERHENTI.**
Aturan mundur: bila merusak rekam → hasil dan tidak beres ±20 menit, `git revert`.
