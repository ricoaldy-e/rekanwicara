# FL-9 — Pengaturan baru: Getar, Ganti PIN, Keluar, Tentang

**Tujuan:** tab Pengaturan berisi Getar, Ganti PIN, Tentang aplikasi, dan Keluar, dengan opsi operator demo dipertahankan di bawah.

- **Prioritas:** B (Getar dan alamat server sudah ada; yang baru hanya susunan + Keluar)
- **Saran model / effort:** Sonnet 5.5 / medium. Alasan: menyusun ulang layar yang ada dan menyambung fungsi yang sudah dibuat FL-6/FL-7. *(Belum diuji.)*
- **Mode:** biasa
- **Bergantung pada:** FL-6 (`change-pin`, gerbang), FL-7 (`signOut`). Tanpa FL-7: tombol Keluar tidak ditampilkan dan dicatat.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-9: <ringkas>`.
- Acuan: `docs/flow-srs-ui.md` SET-1, SET-2, AUTH-5, AUTH-6, Q5, Q10; `docs/kontrak-fe-final.md` §3 (keluar: `signOut()` lalu hapus cache akun); `docs/design.md` §6 baris `settings`, §8; `00-audit.md` K9, K12.
- Aturan: tanpa dependensi baru; jangan hapus opsi operator demo (alamat server dibutuhkan saat demo); `testID` `vibration-toggle`, `vibration-state`, `settings-url`, `demo-toggle` dipertahankan.
- Tidak boleh rusak: sakelar Getar mengatur `setHapticsEnabled` (dipakai `RecordPanel` dan hasil).

## Langkah
1. Susun `app/(tabs)/settings/index.tsx`: (1) Getar (yang ada), (2) Reduce Motion: hanya keterangan "Gerak mengikuti pengaturan HP" (UI-10 memakai pengaturan sistem; tidak ada sakelar dalam app — jangan membuat sakelar baru), (3) "Ganti PIN" (`Card` dengan `›`) → `change-pin`, (4) "Tentang aplikasi" → `/about`, (5) "Keluar" (`BigButton` secondary, ikon `log-out-outline`), (6) bagian "Untuk operator demo" yang ada (alamat server, uji koneksi, profil demo, uji eksperimen `__DEV__`).
2. Keluar: `ConfirmDialog` "Keluar dari akun? Riwayat latihan tetap tersimpan di akun. Untuk masuk lagi, butuh email dan kata sandi." (teks final tunggu K12) → `signOut()` → hapus cache akun (katalog, kata Pendamping tiruan/cache, progres lokal **bila** K12 menyatakan demikian; PIN per akun tidak dihapus) → `router.replace('/auth/sign-in')`. Galat jaringan saat keluar → tetap keluar lokal (sesi dihapus) dan catat.
3. Tidak ada kata "normal/abnormal/gangguan/diagnosis/terapi" dan tidak ada klaim keamanan PIN.
4. Tes: urutan bagian; `vibration-toggle` mengubah status "Aktif/Mati"; "Ganti PIN" membuka rute; Keluar memanggil `signOut` hanya setelah konfirmasi dan berpindah ke Masuk; batal → tidak terjadi apa-apa.

## Kriteria selesai
- [ ] `npm test`, `npm run typecheck` lulus.
- [ ] Opsi operator demo masih bisa mengubah alamat server.

## Cek di HP (Rico)
- Pengaturan (setelah PIN): Getar mati → rekam → tidak bergetar.
- Ganti PIN berhasil; PIN lama ditolak sesudahnya.
- Keluar → konfirmasi → layar Masuk; masuk lagi → Beranda tanpa Buat PIN (PIN per akun tetap).

## Penutup
Laporkan perubahan, tes yang diubah, yang belum teruji (keluar saat luring dengan Supabase sungguhan). Perbarui PROGRESS. Komit. **BERHENTI.**
