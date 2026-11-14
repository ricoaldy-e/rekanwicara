# FL-5b — Komponen formulir bersama, validator, dan pesan

**Tujuan:** satu set komponen formulir dan validator murni yang dipakai PIN, Masuk/Daftar, dan formulir kata, sehingga langkah berikutnya hanya menyusun layar.

- **Prioritas:** B (wajib sebelum FL-6, FL-7, FL-8; tidak dibutuhkan alur Tuli)
- **Saran model / effort:** Sonnet 5.5 / high. Alasan: banyak komponen kecil dengan aturan aksesibilitas rinci dan tes batas. *(Belum diuji.)*
- **Mode:** Plan
- **Bergantung pada:** tidak ada (bisa paralel dengan jalur A secara kode, tetapi dikomit sesudah FL-5).

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-5b: <ringkas>`.
- Acuan: `docs/flow-srs-ui.md` §7.1.1 (**kecuali** Masuk: email saja, kontrak FE §1 #4), §7.7.1–§7.7.4; `docs/kontrak-fe-final.md` §3; `docs/design.md` §2, §3 (token `focus`, `danger`, `border`), §4, §7.
- Aturan: **tanpa pustaka formulir** (hook `useFormState` sendiri); tanpa dependensi baru; semua pesan di `src/forms/messages.ts`; sandi tidak masuk log/state tersimpan; tanpa hex literal.

## Langkah
1. `src/forms/messages.ts`: semua teks dari flow §7.1.1, §7.7.2, §7.7.3, plus "Ada {n} isian yang perlu diperbaiki." Ubah pesan Masuk: "Isi email." dan galat umum "Email atau kata sandi salah." (kontrak #4). Buang pesan ketersediaan username.
2. `src/forms/validators/` (fungsi murni, mengembalikan kunci pesan atau `null`):
   - `auth.ts`: `username`, `email` (normalisasi pangkas + huruf kecil, maks 254), `newPassword(pw, {username, email})`, `repeatPassword`, `signIn({email, password})` (tanpa aturan kekuatan).
   - `pin.ts`: `isFourDigits`, `isWeakPin` (semua sama; naik/turun berurutan 4 digit, termasuk `0123`, `9876`), `sameAsOld`.
   - `word.ts`: `wordText`, `syllableText`, `syllablesMatch` (peringatan, bukan galat), `instruction` (10–500), `maxSyllables` dari konstanta `MAX_SYLLABLES = 6` di `src/forms/limits.ts`.
   - `video.ts`: `videoFile({ mimeType, fileSize, durationMs })` dengan `VIDEO_LIMITS = { maxBytes: 50 * 1024 * 1024, maxDurationMs: 30_000, types: ['video/mp4', 'video/quicktime'] }` di `limits.ts` (kontrak §6: 50 MiB). Pesan ukuran menyebut MB bulat.
3. `src/forms/useFormState.ts`: nilai, tersentuh, galat, `dirty`, `validateField` saat blur (setelah disentuh), `onChange` hanya menghapus galat yang sudah teratasi, `submit()` → validasi semua, kembalikan kunci kolom pertama yang salah dan jumlah galat. State hidup di komponen induk (bertahan saat pemilih video dibuka).
4. Komponen di `src/components/form/` (ekspor lewat `src/components/index.ts`):
   - `TextField`: label di atas (selalu terlihat), teks bantu → `accessibilityHint`, galat = ikon `alert-circle` + teks + garis `danger` (`stroke.thick`), fokus = garis `focus` 3 dp, penghitung "n / max" saat ≥ 80%, `(opsional)` di label, `maxFontSizeMultiplier` tidak dibatasi (kolom tumbuh), `accessibilityLiveRegion="polite"` pada galat (Android) dan `AccessibilityInfo.announceForAccessibility` (iOS). `forwardRef` agar induk bisa memindah fokus.
   - `PasswordField`: `TextField` + tombol teks "Tampilkan sandi"/"Sembunyikan sandi" dengan `accessibilityState={{ checked }}`.
   - `Checkbox`: pakai ulang pola `CheckRow` yang ada (cek dulu; perluas, jangan duplikasi) + galat.
   - `FormBanner` (ikon + teks + "Coba lagi"), `Snackbar` (teks, ≥ 5 detik, live region, tidak menutupi tombol utama — taruh di atas bar bawah), `ConfirmDialog` (`Modal` RN; tombol Batal fokus awal; varian `danger` = ikon + teks, bukan warna saja).
   - `PinDots` (satu elemen aksesibilitas "n dari 4 angka terisi") dan `PinPad` (0–9 + Hapus, tiap tombol ≥ 64 dp, label "Angka 5", "Hapus", nonaktif saat terkunci). Token baru bila perlu: `pinKey: 64` di `theme`.
5. Tes jest: tiap validator — batas bawah, batas atas, satu di luar batas, hanya spasi, spasi ganda, huruf besar/kecil, non-ASCII + emoji, tempelan panjang (flow §7.7.4). Komponen: galat muncul saat blur dan saat kirim, hilang saat diperbaiki; `submit` mengembalikan kolom pertama yang salah; `PinPad` memanggil `onDigit`; `PinDots` membaca "2 dari 4 angka terisi"; `ConfirmDialog` tidak tampil bila `visible=false`.

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] `grep -rn "console.log" app/src/forms app/src/components/form` kosong.
- [ ] Tidak ada teks pesan di luar `messages.ts` dalam berkas formulir.
- [ ] Belum ada layar yang memakai komponen ini (itu FL-6..FL-8), kecuali satu halaman uji di `DATASET_MODE`/`__DEV__` bila Rico ingin melihatnya di HP (opsional).

## Cek di HP (Rico)
- Tidak ada yang terlihat bagi pengguna di langkah ini. Opsional: layar uji pengembang untuk melihat `TextField` galat, fokus, 200% teks, TalkBack.

## Penutup
Laporkan komponen dan validator baru, keputusan aturan yang ambigu (mis. "spasi ganda" di sandi), yang belum teruji (pengumuman pembaca layar di perangkat). Perbarui PROGRESS. Komit. **BERHENTI.**
