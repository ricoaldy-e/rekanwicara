# FL-4 — Sesi latihan memakai `PracticeItem`, hasil per level, dan "Keluar latihan"

**Tujuan:** sesi latihan menerima materi L1/L2/L3 dari lapisan data, tetap merekam dan mengunggah seperti sekarang, dan menampilkan hasil per level (L1 tiga status + grafik; L2–L3 dua status tanpa grafik; retry).

- **Prioritas:** A (inti alur Tuli; paling berisiko merusak rekam → hasil)
- **Saran model / effort:** Opus 5.5 / high. Alasan: menyentuh alur rekam → kirim → hasil dan banyak tes. *(Belum diuji.)*
- **Mode:** Plan
- **Bergantung pada:** FL-D (wajib), FL-3 (untuk masuk dari L1). Urutan FL-4 sebelum FL-5 disengaja: alur rekam yang benar diuji dulu dengan L1 sebelum ada Jalur kata.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-4: <ringkas>`.
- Acuan: `docs/kontrak-fe-final.md` §5 (aturan 1–6), §8, §9; `docs/flow-srs-ui.md` §6, HAS-1..4, NAV-6, LAT-4, LAT-6, LAT-7; `docs/design.md` §5.3, §6.2.2, §6.2.3 (diganti flow §6), §8, §10; `00-audit.md` K10.
- Aturan: jangan ubah `RecordPanel`, `useUpload`, `recording/localFile.ts`, `recorder.ts`; rekaman tetap dihapus setelah hasil diterima atau saat keluar (kontrak §5 aturan 6, CLAUDE.md); tidak menampilkan teks hasil pengenalan; tanpa dependensi baru.
- Tidak boleh rusak: unggah ke `/v1/analyze` (lewat `src/data/analyze.ts`, `ANALYZE_API=v1`), getar hasil, `testID` hasil yang masih berlaku: `result-ok`, `result-bibir`, `result-suara`, `result-retry`, `result-disclaimer`; `result-hint` dipakai untuk kartu umpan balik.

## Langkah
1. **Parameter rute.** `practice/[itemId]` menerima `itemId` + opsional `wordId` dan `position`. Cari materi: tanpa `wordId` → item `level_1` dari `useCatalog`; dengan `wordId` → `getWord(wordId)` → `wordToPath` → langkah dengan `position` (atau `whole` bila tanpa `position`). Tidak ditemukan → `InfoNote` "Materi tidak ditemukan." + tombol kembali (kontrak §9).
2. **Kirim.** Ganti `api.analyze(...)` dengan `analyze({ file, item, sessionId: SESSION_ID, userId: profile.userId }, opts)` dari `src/data/analyze.ts`. Sisanya (hapus berkas, `reset`, `UploadStatus`, "Rekam ulang") tetap.
   - Galat `NOT_SUPPORTED_V1` (kata Pendamping tanpa v2): jangan tampilkan tombol rekam; di tahap Lihat tampilkan `InfoNote` "Penilaian kata ini belum tersedia di server demo." (K10 — tunggu keputusan Rico; ini usulan bawaan).
   - Galat 503/504 → "Penilaian belum bisa dilakukan. Coba lagi." (bukan hasil salah).
3. **Simpan progres.** Hanya `status === 'evaluated'`: bentuk `Attempt` seperti sekarang dengan `overall = toStored(result)`, `level` 1/2/3, `item_id` katalog. `retry` tidak disimpan. Hapus pemanggilan `feedbackDetail` (mode `hidden`/`overall` tidak ada lagi, kontrak §8). `buzzResult` dipanggil untuk setiap hasil `evaluated` (status ringkas).
4. **`ResultView`** menerima `AnalyzeResult` (bukan `AnalyzeResponse` v1):
   - `retry`: `InfoNote` warning dengan `feedback.message` + "Rekaman ini tidak dihitung sebagai percobaan." (`testID="result-retry"`). Tanpa lencana.
   - Kartu target: L1 `LipIllustration` + teks (pakai `targetShape` dari teks item bila bisa; bila tidak, hanya teks); L2–L3 teks besar.
   - Lencana: `lip_result` → "Bibir", `voice_result` → "Suara"; masing-masing hanya bila tidak `null` (item `l0_*` tidak punya Bibir). `StatusBadge` menerima `ResultStatus` (ubah `statusStyles` jadi berkunci `sesuai/mendekati/belum_sesuai`; warna dan bentuk ikon tetap). Di L2–L3 nilai `mendekati` sudah dipetakan oleh `clampStatus`.
   - Kartu umpan balik (`testID="result-hint"`, pola `hero`): `lip_feedback` lalu `voice_feedback`, maks dua kalimat, hanya bila tidak `null`; keduanya `sesuai` → tidak dirender.
   - Grafik **hanya bila `level === 1` dan `visuals` ada**: Peta vokal, Cermin bibir, Kekerasan suara (komponen di `results/charts.tsx` tidak diubah). L2–L3: tidak ada grafik.
   - `sample === true` → `InfoNote` "Hasil contoh, bukan analisis rekaman." di paling atas.
   - Disclaimer persis seperti sekarang.
5. **Keluar latihan (NAV-6).** Header: tombol kembali berlabel "Keluar latihan" (≥ 48 dp). Tahap `record`/`send` → dialog "Keluar dari latihan? Rekaman ini tidak disimpan." (Keluar / Lanjut); tahap `look`/`result` → keluar langsung. Tombol kembali Android sama. Pakai `usePreventRemove` dari `@react-navigation/native` v7 **setelah mengecek tanda tangannya di dokumentasi resmi**, dan `Alert.alert` sebagai dialog (komponen `ConfirmDialog` baru ada di FL-5b; ganti nanti bila sempat). Keluar → `deleteLocalFile` (sudah terjadi di efek unmount).
6. **Lihat (LAT-4, LAT-7).** `ModelVideo` menerima `PracticeItem`: teks instruksi selalu tampil di bawah video. Sumber video: `item.video` → signed URL (`src/data/media.ts`, FL-8; untuk sekarang `USE_MOCK` → tidak ada video); bila tidak ada `item.video` dan `ANALYZE_API=v1` → coba `/v1/model-video/{itemId}` seperti sekarang (video tim yang ada tetap terpakai). Gagal → teks instruksi + "Coba lagi". Video tidak autoplay bersuara: `muted` atau tombol putar (flow §11). `instructionSource === 'ai'` → satu baris kecil "Instruksi dibuat dengan bantuan AI" (Q21; lewati bila kolom tidak ada).
7. Judul header tetap "Ucapkan “…”"; durasi rekam: `l0_*` 4 detik, lainnya bawaan.
8. **Tes:** tulis ulang `ResultView.test.tsx` (L1 tiga status + grafik; L2 dua status tanpa grafik; `mendekati` di L2 tidak pernah tampil; umpan balik maks dua, urut Bibir-Suara; keduanya sesuai → tanpa kartu; retry; label hasil contoh; kata klinis tidak muncul; grafik punya label teks). Ubah `StatusBadge.test.tsx`, `haptics.test.ts`, `ModelVideo.test.tsx` ke tipe baru. Tes baru `practice.test.tsx` minimal: rekam (mock `RecordPanel`) → `analyze` dipanggil dengan `item_id` benar → hasil tampil; retry tidak memanggil `addAttempt`.

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] `git diff --stat` tidak menyentuh `src/recording/`.
- [ ] `grep -rn "transcription\|units" app/src/results app/app/practice` hanya di kode grafik lama yang tidak dipakai L2–L3, atau kosong.
- [ ] Tidak ada `feedbackDetail` di `app/app`.

## Cek di HP (Rico) — dengan server v1 menyala, `ANALYZE_API=v1`
- L1 "A": rekam → hasil tiga kemungkinan status, peta vokal + cermin bibir terlihat.
- L1 "A panjang": hanya lencana Suara + grafik kekerasan.
- Tutup mulut / keluar bingkai → retry: pesan + "Rekam ulang", tidak ada lencana.
- Saat "Merekam…": ketuk "Keluar latihan" → dialog muncul; pilih Lanjut → rekaman berlanjut. Tombol kembali Android sama.
- Getar mati di Pengaturan → tidak ada getar.
- (Setelah FL-5) L2 "MA" dari "MAMA": dua status, tanpa grafik.

## Penutup
Laporkan perubahan, setiap tes yang diubah beserta alasannya (HAS-1..4, kontrak §5), yang belum teruji (v2 sungguhan; signed URL). Perbarui PROGRESS. Komit. **BERHENTI.**
Aturan mundur: bila rekam → hasil L1 tidak jalan di HP dan tidak beres ±20 menit, `git revert` komit ini. Alur lama (v1 `Item`) kembali; FL-5 lalu tidak bisa dikerjakan — laporkan.
