# FL-2 — Tiga tab tetap; bar tersembunyi di sesi latihan

**Tujuan:** bar bawah Latihan / Pendamping / Pengaturan selalu terlihat di layar tab, dan tidak terlihat di `practice/[itemId]`.

- **Prioritas:** A
- **Saran model / effort:** Sonnet 5.5 / high. Alasan: perubahan struktur navigasi; logikanya sedikit tetapi mudah salah rute. *(Belum diuji.)*
- **Mode:** Plan
- **Bergantung pada:** FL-1 (tidak keras). Tidak bergantung FL-D.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-2: <ringkas>`.
- Acuan: `docs/flow-srs-ui.md` §4, §5.2, NAV-1; `docs/design.md` §5.9 (gaya bar); `00-audit.md` b (peta rute) dan g.5 (typed routes).
- Aturan: tanpa dependensi baru (`Tabs` dari `expo-router` sudah ada); jangan sentuh `server/`; pertahankan `testID`/`accessibilityLabel` yang masih berlaku.
- Tidak boleh rusak: rekam → hasil; `router.replace('/home')` di `calibration.tsx`; `Redirect` di `index.tsx`.

## Keputusan struktur (dari FL-0, cek ulang dengan dokumentasi expo-router SDK 58 sebelum menulis)
- Tab bersarang di Stack akar (pola resmi "add navigation": `<Stack.Screen name="(tabs)" options={{ headerShown: false }} />`).
- `practice/[itemId]` **tetap di Stack akar**, sehingga saat dibuka ia menutupi navigator tab: bar tersembunyi tanpa kode tambahan.
- URL lama dipertahankan: `(tabs)/home/…` → `/home`, `(tabs)/companion/…` → `/companion`, `(tabs)/settings/…` → `/settings`.

## Langkah
1. Buat `app/(tabs)/_layout.tsx`: `<Tabs tabBar={(props) => <BottomBar … />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>` dengan tiga layar `home`, `companion`, `settings`. Item bar: Latihan (`mic-outline`), Pendamping (`people-outline`, `accessibilityLabel` "Mode Pendamping" — sama dengan tes lama), Pengaturan (`settings-outline`). Aktif = rute tab yang sedang fokus. Periksa nama prop `sceneStyle` di dokumentasi; jangan menebak.
2. `BottomBar`: tidak perlu diubah strukturnya. Pastikan area aman bawah ditangani (sebelumnya `Screen` yang memberi area aman; sekarang bar berada di luar `Screen`). Tambah `useSafeAreaInsets` di pembungkus `tabBar`, bukan di `BottomBar`.
3. Buat `app/(tabs)/home/_layout.tsx` (Stack, header gelap seperti `_layout.tsx` akar, judul "Rekan Wicara" serif). Pindahkan `app/home.tsx` → `app/(tabs)/home/index.tsx` **tanpa** mengubah isinya kecuali: hapus prop `footer={<BottomBar …/>}` (bar kini milik tab).
4. Pindahkan `app/companion.tsx` → `app/(tabs)/companion/index.tsx` dan `app/settings.tsx` → `app/(tabs)/settings/index.tsx` apa adanya (+ `_layout.tsx` Stack masing-masing). Perbaiki path impor relatif. Pendamping lama (PIN lamanya) tetap dipakai sampai FL-6/FL-8.
5. `app/_layout.tsx`: hapus `home`, `companion`, `settings` dari daftar `Stack.Screen`; tambah `(tabs)` dengan `headerShown: false`. `practice/[itemId]`, `about`, `calibration`, `onboarding`, `dataset/*` tetap.
6. Sesi Pendamping berakhir saat kembali ke tab Latihan (flow §5.5) — **jangan** dikerjakan di sini; itu FL-6.
7. Perbarui impor di tes yang memindah berkas: `home.test.tsx`, `companion.test.tsx`. Tes `home` yang mengecek tombol "Mode Pendamping"/"Tentang aplikasi" di kaki home **akan gagal** karena bar bukan lagi bagian layar: ubah tes itu menjadi tes `BottomBar` dalam `(tabs)/_layout` atau tandai `it.skip` dengan komentar "diganti FL-3" — pilih yang pertama bila cepat.
8. Jalankan `npx expo start` sekali (lalu hentikan) agar `.expo/types/router.d.ts` dibuat ulang, kemudian `npm run typecheck`.

## Kriteria selesai
- [ ] `npm test` dan `npm run typecheck` lulus; tes yang diubah tercatat di PROGRESS dengan alasan.
- [ ] `grep -rn "router.push('/home')\|'/companion'\|'/settings'" app/app` hanya berisi rute yang benar-benar ada.
- [ ] Layar tab tidak memakai hex literal.

## Cek di HP (Rico)
- Buka app → Beranda: bar terlihat, tiga label terbaca, Latihan aktif (lingkaran koral, ikon gelap).
- Ketuk Pendamping → layar PIN lama, bar tetap terlihat. Ketuk Pengaturan → Pengaturan lama (alamat server bisa diubah).
- Buka satu materi → **bar hilang**. Rekam sampai hasil. Kembali → bar muncul lagi.
- Tombol kembali Android dari Beranda: keluar app, bukan ke layar kosong.
- Skala teks 200%: label bar tidak terpotong.

## Penutup
Laporkan perubahan, tes yang diubah + alasan, yang belum teruji (perilaku tombol kembali di iOS). Perbarui PROGRESS. Komit. **BERHENTI.**
Aturan mundur: bila rekam → hasil atau navigasi Beranda rusak dan tidak beres ±20 menit, `git revert` komit ini; lanjut FL-3 di struktur lama (Beranda tanpa tab) dan catat.
