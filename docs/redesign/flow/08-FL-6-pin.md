# FL-6 — PIN Pendamping: buat, gerbang, kunci sementara, ganti

**Tujuan:** tab Pendamping dan Pengaturan hanya terbuka dengan PIN 4 angka per akun, dengan papan angka khusus, batas salah, dan sesi yang berakhir sendiri.

- **Prioritas:** B
- **Saran model / effort:** Sonnet 5.5 / high. Alasan: logika waktu (kunci, diam), penyimpanan aman, dan aturan sesi. *(Belum diuji.)*
- **Mode:** Plan
- **Bergantung pada:** FL-2 (tab), FL-5b (`PinPad`, `PinDots`, validator `pin`). FL-7 belum wajib: tanpa akun, `uid = 'local'`.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-6: <ringkas>`.
- Acuan: `docs/flow-srs-ui.md` §5.5, AUTH-3, AUTH-4, AUTH-5, AUTH-7 (S), §7.7.2; `docs/kontrak-fe-final.md` §2 (kunci `rw.companionPin:<auth.uid()>`), §3; `docs/design.md` §8 (getar mengikuti sakelar; Reduce Motion).
- Aturan: `expo-secure-store` sudah terpasang (tanpa dependensi baru); PIN tidak ditampilkan, tidak masuk log, tanpa tombol "tampilkan"; **jangan** klaim PIN sebagai keamanan di UI/README; nilai awal N = 5, kunci 30 detik, diam 5 menit (kontrak §11: nilai awal FE, satu konstanta).
- Tidak boleh rusak: tab Latihan dan sesi latihan tidak pernah meminta PIN.

## Langkah
1. `src/pin/pinStore.ts`: `savePin(uid, pin)`, `verifyPin(uid, pin)`, `hasPin(uid)`, `getLock(uid)` / `recordFailure(uid)` / `clearFailures(uid)` (hitungan salah dan `lockedUntil` di SecureStore juga, agar tidak reset saat app ditutup). Konstanta `PIN_LIMITS` di `src/forms/limits.ts`. Migrasi: bila kunci lama `cw.companionPin` ada dan kunci baru belum, salin sekali lalu hapus yang lama. Fungsi murni untuk keputusan kunci (`lockState(failures, lockedUntil, now)`) agar bisa dites tanpa SecureStore.
2. `src/pin/PinSession.tsx` (context): `unlocked`, `unlock()`, `lock()`. Kunci kembali saat: tab Latihan difokus, `AppState` bukan `active`, atau 5 menit tanpa sentuhan di area Pendamping/Pengaturan (`onTouchStart` di pembungkus layout tab tersebut memperbarui waktu).
3. Layar `app/auth/create-pin.tsx`: langkah 1 "Buat PIN 4 angka" → langkah 2 "Ulangi PIN"; tolak PIN lemah; tidak cocok → "PIN tidak sama. Ulangi dari awal." kembali ke langkah 1. Berhasil → `/onboarding` (bila belum) atau `/home`.
4. Gerbang: komponen `PinGate` di `app/(tabs)/companion/_layout.tsx` dan `app/(tabs)/settings/_layout.tsx` — bila `!unlocked`, render layar PIN ("Masukkan PIN Pendamping"), bukan isi. Masuk otomatis di digit ke-4. Salah: titik dikosongkan, getar (`buzz` yang menghormati sakelar; **bukan** pola error bila sakelar mati), "PIN salah. Sisa n percobaan." Terkunci: `PinPad` nonaktif + hitung mundur detik terlihat. Tanpa animasi goyang (atau tanpa animasi saat Reduce Motion).
5. Hapus gerbang PIN lama di layar Pendamping lama (`companion/index.tsx` tahap `'pin'`) — gerbang kini di layout. Tes companion lama disesuaikan atau dihapus bila FL-8 menyusul.
6. Onboarding: buang langkah 3 (PIN); `completeOnboarding()` tidak lagi menerima PIN (perbarui `state/user.tsx` dan tes `onboarding`, `demo`). StepHeader "dari 2".
7. `index.tsx`: belum ada PIN untuk `uid` → `/auth/create-pin`.
8. `app/(tabs)/settings/change-pin.tsx` (AUTH-5): PIN lama → PIN baru → ulangi; baru = lama ditolak; berhasil → snackbar "PIN diganti." dan kembali.
9. "Lupa PIN?" (AUTH-7, **S**): tautan teks ≥ 48 dp di gerbang → minta sandi akun (butuh FL-7) → `create-pin`. Tanpa FL-7: sembunyikan tautan dan catat.
10. Tes: `pinStore` (simpan/verifikasi per uid, migrasi kunci lama), `lockState` (5 salah → terkunci 30 detik; lewat waktu → terbuka; tidak reset saat dibaca ulang), `create-pin` (lemah ditolak, tidak cocok kembali ke langkah 1), gerbang (benar → isi tampil; salah → pesan sisa; terkunci → pad nonaktif), sesi terkunci lagi saat tab Latihan difokus.

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] `grep -rn "cw.companionPin" app/src` hanya di kode migrasi.
- [ ] `grep -rni "aman\|keamanan" app/app/auth app/app/(tabs)` tidak mengklaim keamanan PIN.

## Cek di HP (Rico)
- Pasang ulang (hapus data Expo Go): app meminta Buat PIN; 1234 ditolak; 2580 → ulangi → masuk.
- Tab Pendamping → PIN; salah 5 kali → terkunci 30 detik dengan hitung mundur; tutup paksa app, buka lagi → masih terkunci.
- Masuk Pendamping, pindah ke Latihan, kembali ke Pendamping → diminta PIN lagi. Kirim app ke latar → kembali → diminta PIN.
- TalkBack: titik dibacakan "2 dari 4 angka terisi", digit tidak dibacakan.

## Penutup
Laporkan perubahan, tes onboarding/demo/companion yang diubah beserta alasannya, yang belum teruji (iOS; lupa PIN tanpa FL-7). Perbarui PROGRESS. Komit. **BERHENTI.**
Aturan mundur: bila gerbang mengunci tab Latihan atau merusak rekam → hasil dan tidak beres ±20 menit, `git revert`.
