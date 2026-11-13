# Autentikasi pendamping

Logic email/password memakai `@supabase/supabase-js` yang sudah terpasang. Tidak ada
perubahan schema, tabel, RLS, policy, dependency, halaman atau navigasi. File SQL existing
tetap acuan kolom dan foreign key. Instruksi Anonymous Sign-Ins pada header SQL merupakan
alur lama; login anonim otomatis tidak dipakai oleh logic baru.

## Setup

1. Gunakan proyek/schema existing. Aktifkan provider Email/password di Supabase Auth.
   Pertahankan email confirmation sesuai kebutuhan; jika aktif, register belum memberi
   sesi sampai email diverifikasi. Aturan kekuatan password tetap ditentukan Supabase.
2. Isi URL dan anon/publishable key yang sudah disediakan di `app/.env`:
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Public key tetap dibatasi RLS.
3. Khusus penghapusan akun, isi `SUPABASE_URL` HTTPS dan `SUPABASE_SERVICE_ROLE_KEY` di
   `server/.env`, lalu restart backend. Kedua field sudah tersedia sebelumnya. Jangan
   memasukkan service role ke aplikasi, EXPO_PUBLIC_*, log, Git, atau permintaan client.
   Tanpa konfigurasi ini, operasi lain tetap melalui Supabase client; delete gagal 503.
4. Atur SMTP/email template dan allowlist redirect di Supabase untuk konfirmasi/recovery.
   Gunakan HTTPS untuk backend ketika mengirim bearer token di luar pengujian LAN lokal.

Konfigurasi lokal digunakan untuk tes live yang diminta pengguna. Nilai credential
tidak dicetak ke log, tidak ditanam dalam kode, dan file .env tidak diubah.

## Fungsi yang disediakan

Semua fungsi akun di `app/src/auth/companion.ts`. Error yang ditampilkan berasal dari
pesan lokal, tanpa menyalin detail upstream yang mungkin berisi credential.

| Fungsi | Perilaku |
|---|---|
| `registerCompanion(email, password, name?)` | Register dengan `options.data.display_name`; buat public.profiles jika sesi langsung tersedia. Session bisa null saat menunggu konfirmasi email. |
| `loginCompanion(email, password)` | Login, pastikan public.profiles ada dari metadata register tanpa menimpa profil existing, lalu kembalikan sesi. |
| `logoutCompanion()` | Logout perangkat ini, tidak menghapus profil/antrean/PIN lokal. |
| `getCompanionSession()` | Membaca sesi tersimpan; sesi anonim tidak diperlakukan sebagai akun pendamping. |
| `onCompanionAuthChange(listener)` | Listener sesi awal/login/logout/refresh; mengembalikan unsubscribe. |
| `createCompanionProfile(name)` | INSERT profil pemilik sesi; duplicate/error dilaporkan. |
| `readCompanionProfile()` | SELECT profil sendiri; null jika belum dibuat. |
| `updateCompanionProfile(name)` | UPDATE display_name profil sendiri; null diperbolehkan untuk mengosongkan nama. |
| `deleteCompanionAccount(password, serverUrl)` | Reauthentication email/password, panggil endpoint delete dengan bearer token, lalu bersihkan sesi/profil/PIN akun tersebut. |
| `requestPasswordReset(email, redirectTo?)` | Meminta email pemulihan tanpa memberi tahu apakah email terdaftar. |
| `verifyPasswordRecovery(tokenHash)` | `verifyOtp` bertipe recovery dengan TokenHash dari email, menghasilkan sesi recovery. |
| `requestPasswordChangeVerification()` | Meminta OTP reauthentication jika secure password change memerlukannya. |
| `changePassword(password, nonce?)` | Update password sesi login/recovery; nonce diteruskan bila diperlukan oleh Supabase. |

Nama profil dibatasi 1–200 karakter setelah trim, atau null. CRUD hanya memakai
`profiles(user_id, display_name, created_at)` yang sudah ada. ID pemilik selalu berasal
dari `auth.getUser()`, bukan input dari pemanggil. Saat register, nama disimpan pada
metadata Auth. Jika konfirmasi email aktif, tidak ada sesi untuk melewati RLS, sehingga
public.profiles dibuat pada login pertama sesudah konfirmasi. Jika sesi langsung
tersedia, profil dibuat saat register. Tidak menambah trigger atau mengubah policy.
Pembuatan idempoten menggunakan ignoreDuplicates dan tidak menimpa nama existing.
Sinkronisasi antrean tidak lagi membuat profil kosong yang bisa mendahului nama register.
Untuk akun yang profilnya sudah tersedia, gunakan update alih-alih create. Bila login
Auth berhasil tetapi penulisan profil gagal, error menyebut login berhasil dan meminta
login ulang untuk mencoba pembuatan profil kembali, tanpa menghilangkan sesi.

Logic recovery menerima TokenHash yang diteruskan oleh pemanggil. Email template dapat
menyertakan `{{ .TokenHash }}` dalam tautan recovery milik aplikasi. Setelah verifikasi,
panggil changePassword. Tidak ada handler URL, halaman reset, atau navigasi baru pada
fase ini. UI berikutnya harus menangani tautan/token dan meneruskannya ke fungsi ini;
`detectSessionInUrl` tetap false agar token tidak diterima otomatis dari URL.

Mutasi sesi/password/account tidak boleh berjalan bersamaan melalui fungsi-fungsi ini;
operasi kedua mendapat error untuk dicoba setelah operasi pertama selesai. Ini mencegah
pergantian pemilik saat password atau akun sedang dimutasi.

## PIN dan penyimpanan lokal

Fungsi di `app/src/user/storage.ts`:

- `savePin(pin)`: membuat PIN tepat empat digit; menolak overwrite PIN existing.
- `verifyPin(pin)`: mengecek PIN akun aktif; false untuk format salah atau akun berganti
  selama pembacaan; tanpa sesi pendamping, operasi ditolak.
- `changePin(currentPin, nextPin)`: wajib PIN lama benar; kedua PIN empat digit. Operasi
  tulis bersamaan ditolak, dan pemilik dicek kembali sebelum menulis.

PIN hanya di SecureStore `cw.companionPin.<auth.uid()>`. Nilai tidak dicatat di log,
AsyncStorage atau database. Ini pengunci lokal empat digit, bukan pengganti Supabase Auth.
Onboarding dapat memverifikasi PIN existing tanpa menimpa nilainya.

Profil/antrean disimpan di `cw.profile.<auth.uid()>`; nilai userId harus sesuai nama key.
Signed-out memakai `cw.profile.guest`, tanpa mengirim isinya ke akun berikutnya. Kunci
lama `cw.profile` dan `cw.companionPin` dibiarkan utuh, tidak dihapus, tidak dimigrasikan,
dan tidak otomatis ditautkan ke akun email baru. Akun anonim lama di Supabase juga tidak
dihapus/diubah. Penggabungan data lama harus menjadi tindakan migrasi eksplisit terpisah.

UserProvider mengikuti event Auth, memuat profil akun aktif, dan mengabaikan load/sync/
callback yang selesai dari akun sebelumnya. State anak provider direset saat pemilik
berganti agar otorisasi PIN lokal dari akun sebelumnya tidak terbawa. Refresh token akun
yang sama mempertahankan state. Sinkronisasi memverifikasi UID sebelum pengiriman dan
menolak setiap batch dengan pemilik berbeda; tidak lagi membuat akun anonim otomatis.
Sesi dipersistenkan di AsyncStorage dengan processLock, auto-refresh hanya di foreground.

## Penghapusan akun

`DELETE /v1/auth/account` memverifikasi bearer melalui Supabase `GET /auth/v1/user`.
ID hasil verifikasi dipakai pada Admin Auth `DELETE /auth/v1/admin/users/{id}` dengan
service role khusus server. Caller tidak dapat memilih user_id lain. Respons sukses
`{ "status": "deleted" }`; request gagal tidak dilaporkan sebagai berhasil.

DELETE profil saja tidak disediakan karena policy existing tidak mengizinkannya, dan
itu akan meninggalkan akun Auth hidup. Hard deletion Auth mengikuti ON DELETE CASCADE
yang sudah ada untuk profiles/attempts/progress/listen_checks. Hanya permintaan eksplisit
delete account yang menghapus data; logout/pergantian akun tidak melakukannya.
Jika server menolak delete, penyimpanan lokal tetap dipertahankan. Jika delete sudah
berhasil tetapi pembersihan lokal gagal, error menyatakan akun sudah dihapus, sehingga
pemanggil tidak menganggap penghapusan remote gagal. JWT yang telah diterbitkan dapat
tetap berlaku sampai kedaluwarsa; tidak menjanjikan revokasi seketika pada semua layanan.

## Validasi dan batas penggunaan

Berkas fase ini (perubahan eksperimen Wav2Vec2 sebelumnya tetap dipertahankan):

- Baru: `app/src/auth/companion.ts`, `server/app/api/v1/auth.py`,
  `app/__tests__/auth.test.ts`, `app/__tests__/authIsolation.test.tsx`,
  `app/__tests__/supabaseAuth.test.ts`, `server/tests/test_companion_auth.py`, dokumen ini.
- Logic existing: `app/src/data/supabase.ts`, `app/src/data/sync.ts`,
  `app/src/state/user.tsx`, `app/src/user/pure.ts`, `app/src/user/storage.ts`,
  `app/src/api/client.ts`, `app/src/api/types.ts`, `server/app/api/schemas.py`,
  `server/app/api/v1/__init__.py`, `server/.env.example`.
- Tes existing: `app/__tests__/api.client.test.ts`, `app/__tests__/demo.test.tsx`,
  `app/__tests__/sync.test.ts`.
- Acuan/setup: `docs/SPEC.md`, `docs/PROGRESS.md`, `CONTEXT.md`, `README.md`, `app/README.md`.

Hasil lokal: **536 pytest** (15 tambahan), **318 Jest** (33 tambahan, 27 suite),
TypeScript dan Ruff check/format 95 berkas lulus. Expo lint exit 0 dengan 0 error dan
8 warning lama; pytest memiliki satu warning deprecation Starlette/HTTPX lama.

```powershell
# Dari server/
$env:DEBUG='false'
$env:PYTHONDONTWRITEBYTECODE='1'
& .venv/Scripts/python.exe -B -m pytest -q -p no:cacheprovider
& .venv/Scripts/ruff.exe check --no-cache app tests ../ml
& .venv/Scripts/ruff.exe format --no-cache --check app tests ../ml
# Dari app/
npm.cmd test -- --runInBand
npx.cmd tsc --noEmit
npx.cmd expo lint --no-cache
```

Pengujian otomatis memakai Auth/PostgREST/HTTP mocks serta AsyncStorage/SecureStore sintetis.
Tes mencakup isolasi UID,
pergantian akun saat load/sync, callback lama, PIN per akun, penolakan akun anonim,
reauthentication, serta delete yang memverifikasi pemilik dan gagal tertutup.

### Tes Supabase asli, 13 November 2026

Atas permintaan eksplisit pengguna, backend terbaru dijalankan di port 8000 dan satu
akun uji dibuat dengan email/password/nama yang ditentukan pengguna. Password masuk
melalui console tanpa echo; credential/sesi uji hanya berada di memori proses terisolasi,
tanpa mencetak email/password/token atau memakai sesi aplikasi yang sedang berjalan.
Proses tes dihentikan setelah logout. Akun/profil uji tetap disimpan, tidak dihapus.

Logic TypeScript `app/src/auth/companion.ts` diuji langsung melalui transpile dengan
TypeScript terpasang dan Supabase JS 2.119.0 terpasang. Hanya batas native/UI yang
diganti adapter; panggilan Auth dan PostgREST menuju proyek Supabase asli.

| Pemeriksaan aktual | Hasil |
|---|---|
| Backend health dan OpenAPI | HTTP 200; route Auth terbaru terdaftar |
| Auth settings/tabel profiles | HTTP 200; Email aktif, signup diizinkan, konfirmasi wajib |
| Register | Berhasil, identitas baru dan metadata display_name tersedia; session null sebelum konfirmasi |
| Login sebelum konfirmasi | Ditolak HTTP 400 dengan email_not_confirmed |
| Konfirmasi email | Pengguna membuka tautan; konfirmasi terbukti dari login setelahnya |
| Login email/password setelah konfirmasi | Berhasil, akun bukan anonim |
| public.profiles setelah login | Baris tersedia, user_id sesuai sesi, display_name sesuai nama register |
| Refresh session | Berhasil terhadap Auth asli |
| Restorasi sesi | Berhasil dengan client baru dan storage uji terisolasi di memori |
| Baca profil akun uji dari client tanpa login | Tidak mendapatkan baris profil; bukan audit semua policy |
| Logout | Berhasil, getSession null; akun uji dipertahankan |
| Backend dengan bearer tidak valid | HTTP 401/auth_invalid melalui Supabase asli; tidak menghapus akun |

Redirect konfirmasi proyek menuju localhost:3000 yang tidak berjalan. Halaman redirect
gagal dibuka, tetapi konfirmasi sudah diproses: login asli setelahnya berhasil. Tidak
menyalakan server dummy 3000 atau mengubah redirect proyek secara diam-diam.
Belum diuji live: reset/perubahan password, nonce, SecureStore/native HP, dan penghapusan
akun. Restorasi storage uji di Node tidak membuktikan persistensi fisik pada perangkat.
Tidak ada SQL/schema/policy diubah atau pembacaan data akun lain.

UI lama belum menyediakan form login/register/recovery/change PIN atau tombol delete;
fungsi siap dipanggil oleh UI pada fase terpisah. Saat sesi pendamping belum tersedia,
sinkronisasi/PIN akun tidak bisa digunakan. Onboarding lama membutuhkan PIN akun, sehingga
pemanggil harus menyediakan sesi email/password terlebih dahulu; data lama tetap ada.

Dokumentasi resmi yang diperiksa:
[React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native),
[email recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail),
[verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp),
[updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser),
[Admin deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).
