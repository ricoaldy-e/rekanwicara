# FL-8b — Tombol "Buat dengan AI" untuk instruksi pelafalan

**Tujuan:** di setiap blok formulir kata, Pendamping bisa meminta usulan instruksi dari AI, meninjau, mengedit, atau mengembalikan teks sebelumnya; tidak pernah tersimpan otomatis.

- **Prioritas:** C (hanya bila FL-8 selesai)
- **Saran model / effort:** Sonnet 5.5 / high. Alasan: satu komponen dengan banyak keadaan (memuat, batal, gagal, ganti, kembalikan, label AI). *(Belum diuji.)*
- **Mode:** Plan
- **Bergantung pada:** FL-8 (`WordForm`), FL-5b (`ConfirmDialog`, pesan). **Butuh K2** (pengungkapan pihak ketiga) sebelum memakai BE sungguhan.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-8b: <ringkas>`.
- Acuan: `docs/flow-srs-ui.md` §7.5.2 (semua baris), PEN-7, PEN-9, Q21, Q22, Q23; `docs/kontrak-fe-final.md` §7 (`POST /v2/instructions/generate`, `type: word | syllable`, `parent_word`), §9 (429 → tombol dinonaktifkan sementara dengan alasan; 503/504 → pesan + "Coba lagi"), §1 #6 (`instruction_source` opsional).
- Aturan: **tidak ada kunci LLM di app**; app hanya memanggil endpoint BE; hanya teks kata dikirim, video tidak; tanpa dependensi baru.

## Langkah
1. `src/api/instructions.ts` → `generateInstruction({ type, text, parentWord? }, signal)` lewat `src/api/v2.ts`, batas 20 detik (`AbortController`). Tiruan `src/mock/instructions.ts`: tunda 1,5 detik; teks yang mengandung `gagal` → 503, `banyak` → 429, `lambat` → timeout; selain itu templat pendek tanpa kata terlarang.
2. `src/components/form/AiInstructionButton.tsx` (satu per blok):
   - Teks blok tidak valid → tombol tetap aktif; tekan → galat di kolom teks "Isi kata dulu untuk membuat instruksi." + fokus ke sana.
   - Kolom instruksi sudah berisi → `ConfirmDialog` "Ganti instruksi yang sudah ditulis?" (Ganti / Batal); simpan teks lama untuk "Kembalikan teks sebelumnya" (satu tingkat, selama formulir terbuka).
   - Memuat: label "Membuat instruksi…", indikator, kolom instruksi baca-saja, tombol "Batal"; umumkan "Sedang membuat instruksi".
   - Berhasil: isi kolom, fokus ke kolom, umumkan "Instruksi terisi. Periksa sebelum menyimpan.", tombol menjadi "Buat ulang"; `instructionSource = 'ai'` dan baris "Dibuat dengan AI. Periksa dan ubah bila perlu."; begitu Pendamping mengetik → `'ai_edited'`, baris hilang. Ketik dari awal → `'manual'`.
   - Gagal: ikon + teks di bawah tombol sesuai jenis (umum / tanpa koneksi / terlalu banyak permintaan) + "Coba lagi"; 429 → tombol nonaktif sementara dengan teks alasan (kontrak §9); isian lain tidak berubah.
   - Teks bantu tetap: "Kata yang kamu tulis dikirim ke layanan AI untuk membuat instruksi. Video tidak dikirim." dan peringatan formulir "Instruksi dari AI bisa keliru dan bukan saran klinis. Periksa sebelum menyimpan."
   - Suku kata mengirim `parent_word` = teks kata induk.
3. `instruction_source` dikirim saat Simpan bila kolom ada di BE; bila tidak ada, abaikan tanpa galat (kontrak #6).
4. Tahap Lihat menampilkan "Instruksi dibuat dengan bantuan AI" bila `instructionSource === 'ai'` (sudah disiapkan FL-4; cek).
5. Tes: setiap keadaan di atas dengan tiruan (berhasil, gagal 503, 429 menonaktifkan, timeout, ganti isi + kembalikan, label hilang setelah edit, teks kosong memindah fokus, hasil > 500 karakter memunculkan galat biasa).

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] `grep -rni "gemini\|openai\|api_key\|apikey" app/src app/app` kosong (kecuali teks dokumentasi).
- [ ] Hasil AI tidak pernah memanggil `create`/`update` sendiri (tes membuktikan).

## Cek di HP (Rico)
- Tiruan: "Buat dengan AI" pada "MAMA" → memuat → terisi + label AI; edit satu huruf → label hilang.
- Ketik "gagal" sebagai kata → pesan gagal + "Coba lagi"; "banyak" → tombol nonaktif dengan alasan.
- TalkBack mengumumkan memuat dan berhasil.

## Penutup
Laporkan perubahan, tes baru, yang belum teruji (BE/LLM sungguhan, batas permintaan nyata). Catat penggunaan AI untuk dokumentasi lomba. Perbarui PROGRESS. Komit. **BERHENTI.**
