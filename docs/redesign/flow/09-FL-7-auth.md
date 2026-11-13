# FL-7 — Masuk, Daftar, Cek email, sesi tersimpan

**Tujuan:** Pendamping mendaftar (username, email, sandi) atau masuk (email + sandi) sekali, lalu app berikutnya langsung ke Beranda; berjalan penuh dengan tiruan.

- **Prioritas:** B
- **Saran model / effort:** Sonnet 5.5 / high. Alasan: formulir dengan banyak keadaan + sambungan Supabase Auth + gerbang awal. *(Belum diuji.)*
- **Mode:** biasa
- **Bergantung pada:** FL-5b (komponen, validator), FL-6 (`create-pin` sebagai tujuan sesudah Daftar). **Butuh jawaban K3 (login anonim) dan K7 (penyimpanan sesi)** — tanpa jawaban, pakai usulan di `00-audit.md`.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-7: <ringkas>`.
- Acuan: `docs/kontrak-fe-final.md` §1 #4 (**masuk dengan email saja; username = `display_name`, tidak unik**), §2, §3, §9; `docs/flow-srs-ui.md` §5.1, AUTH-1, AUTH-2, AUTH-6 (bagian Keluar dikerjakan FL-9), §7.1.1 (perilaku formulir; abaikan bagian "username" pada Masuk dan cek ketersediaan username), Q18; `docs/design.md` §2, §7.
- Aturan: `@supabase/supabase-js` sudah terpasang; **hanya** kunci publishable (`EXPO_PUBLIC_SUPABASE_ANON_KEY`); tidak ada service-role key; sandi tidak masuk log, state tersimpan, atau pesan; jangan komit `.env`.
- Tidak boleh rusak: sinkron attempts/progres yang ada (`src/data/sync.ts`) dan mode demo.

## Langkah
1. `src/auth/supabase.ts`: pindahkan pembuatan klien dari `src/data/supabase.ts` (satu klien; `data/supabase.ts` mengimpor dari sini). `src/auth/session.ts`: `signUp({ username, email, password })` → `supabase.auth.signUp({ email, password, options: { data: { display_name: username } } })`; `signIn({ email, password })` → `signInWithPassword`; `signOut()`; `getSession()`; `onAuthStateChange`. Peta galat SDK → kode UI (`INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `NETWORK`, `SERVER`, `EMAIL_NOT_CONFIRMED`) di satu fungsi. Periksa nama kode galat Supabase di dokumentasi resmi supabase-js v2; jangan menebak teks pesan.
2. Tiruan `src/mock/auth.ts` (bentuk sama): akun di AsyncStorage tanpa sandi; `salah@contoh.id` → `INVALID_CREDENTIALS`; `dipakai@contoh.id` saat daftar → `EMAIL_TAKEN`; `uid = 'mock-user'`. Pilih lewat `USE_MOCK` di satu tempat.
3. `src/auth/AuthProvider.tsx`: `session`, `uid`, `ready`. Bungkus di `_layout.tsx` di atas `UserProvider`.
4. Layar `app/auth/sign-in.tsx` (Masuk): Email, Kata sandi (`PasswordField`), tombol "Masuk" (memuat, cegah kirim ganda), tautan "Belum punya akun? Daftar". Galat `INVALID_CREDENTIALS` → satu baris "Email atau kata sandi salah."; `NETWORK` → `FormBanner` + "Coba lagi"; isian tidak hilang.
5. `app/auth/sign-up.tsx` (Daftar): Username, Email, Kata sandi + daftar periksa ("8 karakter atau lebih", "Ada huruf", "Ada angka"; ikon + teks), Ulangi sandi, kotak persetujuan privasi dengan tautan ke `/about` (Q18). `EMAIL_TAKEN` → galat di kolom email. Berhasil dengan sesi → upsert `profiles` (kontrak §3) → `create-pin`. `session = null` → `app/auth/check-email.tsx` (AUTH-8: "Buka email untuk konfirmasi, lalu masuk." + tombol "Ke halaman Masuk").
6. Atribut kolom: `autoComplete` (`username`, `email`, `new-password`, `current-password`), `textContentType`, `autoCapitalize="none"`, `keyboardType="email-address"`, `returnKeyType="next"`, kolom terakhir mengirim. `KeyboardAvoidingView` agar tombol tidak tertutup.
7. `index.tsx` (gerbang): `!ready` → memuat; tanpa sesi → `/auth/sign-in`; tanpa PIN → `/auth/create-pin`; belum onboarding → `/onboarding`; selain itu `/home`. Stack akar: grup `auth` tanpa bar, header gelap, tanpa tombol kembali dari Masuk.
8. K3: hapus `signInAnonymously()` dari `createRemote().ensureUser` (sinkron hanya berjalan bila ada sesi akun). Sesuaikan `sync.test.ts`/`user.test.ts`.
9. Kode galat 401 FastAPI (kontrak §9): `src/api/v2.ts` menyegarkan sesi sekali, gagal → `signOut` + `/auth/sign-in`. Bila v2 belum dipakai, tulis fungsinya + tes saja.
10. Tes: Masuk (validasi saat kirim; fokus ke kolom pertama; galat umum; tidak ada sandi di snapshot/console), Daftar (daftar periksa berubah saat mengetik; ulangi sandi; persetujuan wajib; `EMAIL_TAKEN` di kolom), gerbang `index` (empat cabang), peta galat Supabase.

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] `grep -rn "password" app/src app/app | grep -i "log\|warn\|AsyncStorage"` kosong.
- [ ] `grep -rn "signInAnonymously" app/src` kosong (bila K3 disetujui).
- [ ] Dengan `USE_MOCK=true`: Daftar → Buat PIN → onboarding → kalibrasi → Beranda; tutup app → buka → langsung Beranda (AUTH-2).

## Cek di HP (Rico)
- `USE_MOCK=true`: daftar akun tiruan; salahkan sandi saat Masuk; matikan Wi-Fi lalu Masuk → banner + "Coba lagi", isian utuh.
- Bila proyek Supabase sudah punya Email auth: `USE_MOCK=false`, daftar email sungguhan, cek apakah muncul "Cek email" (bergantung pengaturan konfirmasi email di Supabase).
- Pengelola sandi HP menawarkan isi otomatis.
- 200% teks: kolom tumbuh, tombol tidak tertutup papan ketik.

## Penutup
Laporkan perubahan, tes yang diubah (sync/user) beserta alasannya, yang belum teruji (Supabase sungguhan; iOS). Perbarui PROGRESS. Komit. **BERHENTI.**
Aturan mundur: bila gerbang awal membuat app tidak bisa mencapai Beranda dan tidak beres ±20 menit, `git revert` (alur lama: onboarding → Beranda).
