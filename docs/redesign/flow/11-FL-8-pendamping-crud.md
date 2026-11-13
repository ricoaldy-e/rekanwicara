# FL-8 — Area Pendamping: daftar, tambah, ubah, hapus kata + suku kata (instruksi manual)

**Tujuan:** Pendamping bisa menambah kata (dengan 0–6 suku kata), mengubah, dan menghapusnya, masing-masing dengan teks, satu video, instruksi, dan persetujuan video; kata bawaan hanya-baca.

- **Prioritas:** C (terbesar; lewati bila waktu habis — alur Tuli tidak bergantung padanya)
- **Saran model / effort:** Opus 5.5 / high. Alasan: formulir bertingkat, unggah dengan kompensasi, dan aturan etika video. *(Belum diuji.)*
- **Mode:** Plan
- **Bergantung pada:** FL-5b, FL-6, FL-D. **Dependensi baru `expo-image-picker` — tanya Rico dulu; jangan pasang tanpa jawaban.** Tanpa izin: `VideoField` hanya memakai video tiruan (berkas contoh lokal) dan ditandai jelas sebagai mode tiruan. **Butuh K1** (penyimpanan video wajah di Supabase) sebelum `USE_MOCK=false`.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-8: <ringkas>` (boleh dipecah `FL-8a` daftar + hapus, `FL-8b'` formulir, bila ±20 menit tidak cukup per bagian; jangan gabung dengan FL-8b AI).
- Acuan: `docs/kontrak-fe-final.md` §6 (urutan simpan + kompensasi, ubah/hapus video, "Belum lengkap", signed URL, batas 50 MiB/30 detik), §9; `docs/flow-srs-ui.md` PEN-1..PEN-9, §7.5.1, §7.7.1, §7.7.3, Q7, Q9, Q12, Q20; `docs/design.md` §2, §5.2, §11.
- Aturan: nama berkas Inggris; semua pesan di `messages.ts`; tidak ada hapus tanpa konfirmasi; isian tidak hilang saat gagal atau saat pemilih video dibuka; video Pendamping **bukan** rekaman latihan — jangan dicampur dengan `recording/localFile.ts`; tidak ada kunci layanan di app.

## Langkah
1. **Dependensi (setelah izin):** `npx expo install expo-image-picker`; tambah plugin `expo-image-picker` di `app.json` dengan teks izin Indonesia. Periksa di dokumentasi SDK 58: `launchImageLibraryAsync({ mediaTypes: ['videos'] })`, `launchCameraAsync`, opsi batas durasi, dan field aset `duration`/`fileSize`/`mimeType` — jangan menebak satuan `duration`.
2. `src/data/words.ts` (+ `src/mock/words.ts` berbentuk sama, AsyncStorage): `listMine()`, `getForEdit(id)`, `create(form, onProgress)`, `update(id, form, onProgress)`, `remove(id)`. Supabase: urutan kontrak §6 dengan kompensasi (hapus baris + berkas yang dibuat pada percobaan itu). `src/data/media.ts`: `upload(path, file, onProgress)`, `signedUrl(path)` (minta ulang sekali), `removeFiles(paths)` (gagal → antrean lokal). Kata gagal setengah jalan → status "Belum lengkap" di daftar Pendamping, tidak muncul di Pilih kata (saring di `catalog.ts`).
3. `app/(tabs)/companion/index.tsx` (ganti layar lama): "Kata saya" (kartu: teks, jumlah suku kata, "Belum lengkap" bila perlu, tombol "Ubah" dan "Hapus" berlabel) dan "Kata bawaan" (`SourceChip` Bawaan, ikon gembok, tanpa tombol). Tombol primer "Tambah kata". Kosong → kalimat ajakan singkat.
4. `src/components/form/VideoField.tsx`: tombol "Pilih dari galeri" dan "Rekam video", pratinjau `expo-video` (tanpa autoplay bersuara), "Ganti", "Hapus"; validasi `video.ts`; izin ditolak → kalimat + "Buka pengaturan" (`Linking.openSettings()`). `SyllableRow.tsx`: teks, `VideoField`, instruksi, tombol "Naik", "Turun", "Hapus" berlabel (bukan seret).
5. `src/components/form/WordForm.tsx` (dipakai `words/new.tsx` dan `words/[wordId]/edit.tsx`): kalimat "Semua isian wajib diisi kecuali yang bertanda opsional."; blok KATA (teks, video, instruksi); "SUKU KATA (opsional)" + "Tambah suku kata" (nonaktif di 6 dengan teks "Maksimal 6 suku kata"); peringatan kecocokan gabungan suku kata (bukan penghalang); duplikat kata (tanpa peka huruf, termasuk kata bawaan) → "Kata ini sudah ada."; kotak persetujuan video (Q12); "Simpan" + "Batal". Kirim → validasi semua → fokus ke kolom pertama yang salah + pengumuman jumlah. Unggah: progres per video (persen + bar) + "Batalkan". Gagal → `FormBanner` + "Coba lagi", isian utuh. Berhasil → kembali, snackbar "Kata “mama” disimpan." Keluar dengan perubahan → "Buang perubahan?" (header + tombol kembali Android, `usePreventRemove`). Instruksi diketik manual di langkah ini; tombol AI = FL-8b.
6. Hapus: `ConfirmDialog` "Hapus “mama” dan 2 suku katanya? Ini tidak bisa dibatalkan." (Batal fokus awal; Hapus bergaya `danger` dengan ikon + teks). Riwayat latihan kata itu disembunyikan dari ringkasan (Q7 usulan) — saring di `progress.ts` dengan daftar id kata yang ada.
7. Ubah video: unggah baru → perbarui baris → **sesudah berhasil** hapus berkas lama (kontrak §6).
8. Teks Tentang (`about.tsx`) dan README: kalimat "tanpa video" **jangan** diubah sendiri — tandai di laporan untuk keputusan K1; FL-10 menyusun usulan teks.
9. Tes: validator `word`/`video` (sudah di FL-5b) dipakai; tes `WordForm` (wajib per blok, maks 6, Naik/Turun mengubah urutan, persetujuan wajib, gagal unggah mempertahankan isian, "Buang perubahan?" hanya bila `dirty`); tes `words.ts` tiruan (kompensasi saat gagal di tahap 2 menghapus berkas tahap 1); daftar (bawaan tanpa tombol ubah/hapus). Hapus `companion.test.tsx` lama; catat alasan (Q11).

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] Tidak ada jalur UI yang mengubah/menghapus kata `source: 'default'` (tes membuktikan).
- [ ] Dengan `USE_MOCK=true`: tambah kata tanpa suku kata, kata dengan suku kata, ubah, hapus — semua terlihat di Pilih kata (kontrak §10).
- [ ] Tidak ada video Pendamping yang tertulis ke log.

## Cek di HP (Rico)
- Tambah "SUSU" dengan SU, SU: pilih video dari galeri (video > 30 detik ditolak dengan pesan), rekam video kamera, persetujuan; simpan → snackbar; muncul di Pilih kata (tab Latihan).
- Matikan Wi-Fi saat simpan (mode Supabase): banner, isian utuh, "Coba lagi" berhasil setelah Wi-Fi nyala.
- Hapus kata → dialog menyebut nama dan jumlah suku kata.
- Putar layar / buka galeri lalu batal: isian tidak hilang.
- 200% teks dan TalkBack pada formulir.

## Penutup
Laporkan perubahan, dependensi yang dipasang (atau tidak), tes yang dihapus/diubah beserta alasannya, yang belum teruji (Supabase Storage sungguhan, RLS, iOS). Perbarui PROGRESS. Komit. **BERHENTI.**
Aturan mundur: langkah ini tidak menyentuh alur latihan; bila Pilih kata/Jalur kata rusak karena penyaringan "Belum lengkap" dan tidak beres ±20 menit, `git revert`.
