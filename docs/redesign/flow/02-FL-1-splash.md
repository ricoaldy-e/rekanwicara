# FL-1 — Splash dan layar pertama tanpa kilatan putih

**Tujuan:** dari ikon diketuk sampai layar pertama, tidak ada putih; tulisan "Rekan Wicara" satu warna terang di atas `#08110B`.

- **Prioritas:** A (kecil; kebanyakan sudah dikerjakan komit `a19ed60`, langkah ini memverifikasi dan menambal sisa)
- **Saran model / effort:** Sonnet 5.5 / low. Alasan: berkas konfigurasi dan aset, tanpa logika. *(Belum diuji.)*
- **Mode:** biasa

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-1: <ringkas>`.
- Acuan: `docs/flow-srs-ui.md` §9.1; `docs/kontrak-fe-final.md` §1 #7; `docs/design.md` §3 (token), §11.
- Aturan: tanpa dependensi baru; jangan sentuh `server/`; jangan komit `.env`.
- Tidak boleh rusak: pemuatan font Playfair di `app/_layout.tsx` (splash ditahan sampai font siap atau gagal).

## Keadaan yang sudah dicek (FL-0)
- `app.json`: `userInterfaceStyle: "dark"`, `backgroundColor: "#08110B"`, plugin `expo-splash-screen` dengan `backgroundColor: "#08110B"`, `android.adaptiveIcon.backgroundColor: "#08110B"`. Sudah sesuai.
- `_layout.tsx` mengembalikan `null` sampai font siap, jadi splash native tetap tampil (tidak ada layar JS putih).
- `app/index.tsx` saat memuat memakai `Screen` (latar `background`).
- Belum dicek: apakah `assets/images/splash-icon.png` **transparan** dan tanpa tepi putih; splash sekarang memakai ikon, **bukan wordmark** "Rekan Wicara".

## Langkah
1. Periksa `splash-icon.png`, `icon.png`, `android-icon-*.png`: mode warna PNG ber-alfa (bukan JPEG, bukan latar putih). Pakai alat yang sudah ada di mesin (mis. `python -c` dengan modul standar untuk membaca header PNG, atau `file`). Jangan pasang alat baru. Bila ada piksel tepi putih/abu terang di area transparan, laporkan dan minta Rico menyediakan aset; **jangan menggambar logo** (design.md §11: tanpa logo buatan AI).
2. Wordmark: bila Rico menyediakan `assets/images/splash-wordmark.png` (transparan, krem `#FAFCF9`), pasang di plugin splash. Bila tidak, biarkan ikon dan catat di PROGRESS bahwa wordmark belum ada. Jangan membuat wordmark dengan teks di gambar.
3. Pastikan setiap layout baru yang akan dibuat (FL-2) memakai `contentStyle`/`sceneStyle` berlatar `colors.background` — tulis pengingat ini di PROGRESS untuk FL-2.
4. Header Beranda: judul "Rekan Wicara" memakai `displayFont()` dan `colors.text` (sudah di `_layout.tsx`; akan pindah di FL-2).

## Kriteria selesai
- [ ] Laporan jenis setiap aset (PNG + alfa / bukan).
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] Tidak ada hex baru di layar/komponen.

## Cek di HP (Rico)
- Tutup paksa Expo Go, buka lagi: perhatikan splash → layar pertama. Tidak boleh ada kilatan putih atau kotak putih di sekitar ikon.
- Ulangi dengan mode terang HP aktif (app memaksa gelap; splash harus tetap gelap).
- Catatan: Expo Go memakai splash milik Expo Go sebagian; splash final hanya terlihat pasti di build. Laporkan apa yang terlihat, jangan menyimpulkan "beres" dari Expo Go saja.

## Penutup
Laporkan perubahan (mungkin tidak ada kode), aset yang perlu Rico sediakan, yang belum teruji (splash di build sungguhan). Perbarui PROGRESS. Komit (bila ada perubahan). **BERHENTI.**
