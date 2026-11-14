# FL-10 — Pemeriksaan akhir, teks jujur, dan catatan

**Tujuan:** memastikan apa pun yang selesai malam ini jalan, jujur, dan tercatat; sisanya ditulis sebagai batasan.

- **Prioritas:** A (selalu dikerjakan, meskipun langkah B/C dilewati)
- **Saran model / effort:** Opus 5.5 / high. Alasan: audit lintas berkas dan klaim, bukan menulis fitur. *(Belum diuji.)*
- **Mode:** biasa (tanpa fitur baru; hanya perbaikan kecil dan dokumen)
- **Bergantung pada:** langkah terakhir yang selesai.

## Konteks tetap
- Cabang `flow-v2`. Komit `phase FL-10: <ringkas>`.
- Acuan: `docs/design.md` §12 (daftar periksa), §11, §14; `docs/flow-srs-ui.md` §6 (kata terlarang), §11; `docs/kontrak-fe-final.md` §10 (kriteria selesai FE); `00-audit.md` c.3 (keputusan Rico) dan d.
- Aturan: jangan menulis "teruji pengguna" atau "ramah Tuli"; jangan menambah fitur; jangan sentuh `server/`; jangan komit `.env`.

## Langkah
1. Jalankan `npm test`, `npm run typecheck`; bandingkan jumlah tes dengan baseline (296) dan daftar tes yang dihapus/diubah di PROGRESS — setiap selisih harus punya alasan tertulis.
2. Pindai teks UI: `grep -rniE "normal|abnormal|gangguan|diagnosis|terapi\b|penderita|tunarungu|Cermin Wicara|RekanWicara" app/app app/src` (kecuali kalimat "bukan pengganti terapis" yang memang disengaja); `grep -rn "#[0-9A-Fa-f]\{6\}" app/app app/src/components` (hex literal); `fontStyle: 'italic'`; `shadow`/`elevation`.
3. Teks klaim: `about.tsx` (batas materi, privasi, video Pendamping — K1, K11), `onboarding.tsx`, README bagian app, `docs/MODEL_CARD.md` bila menyebut level/fitur yang berubah. **Usulkan** teks baru di laporan; ubah hanya yang sudah diputuskan Rico. Fitur yang dilewati (mis. CRUD, AI, Lupa PIN, lupa sandi Q15, wordmark) ditulis di README sebagai batasan/rencana.
4. `docs/PROGRESS.md`: bagian "Alur v2" (langkah selesai, dilewati, tes yang berubah + alasan, konflik dokumen dari `00-audit.md` c.2 yang belum diperbaiki); perbaiki dua kalimat usang (baris "Playfair … tidak dikerjakan" dan "typecheck masih gagal").
5. Usulan perubahan `docs/design.md` (§0 tekan-lama, §5.9 isi bar, §6 tabel layar, §6.2.1, §6.2.3) dan `flow-srs-ui.md` §10 ("tiga kartu") — tulis sebagai daftar di PROGRESS; ubah dokumen hanya bila Rico setuju.
6. Daftar periksa design.md §12 untuk setiap layar yang diubah; tandai yang hanya bisa dicek di HP.
7. Kriteria kontrak §10: centang yang benar-benar terbukti (tes atau cek HP Rico), tulis "belum" untuk sisanya.

## Kriteria selesai
- [ ] Tes dan typecheck lulus.
- [ ] Tidak ada klaim di UI/README yang tidak benar menurut kode (rekaman dihapus, video, AI, PIN).
- [ ] PROGRESS memuat daftar keputusan Rico yang masih terbuka.

## Cek di HP (Rico) — alur penuh sebelum kunci fitur
1. Hapus data Expo Go → (Masuk/Daftar bila FL-7) → Buat PIN (bila FL-6) → onboarding → kalibrasi → Beranda.
2. L1 A: rekam → hasil tiga status + grafik. L1 A panjang: Suara + grafik kekerasan.
3. Pilih kata → PAPA → PA → hasil dua status, tanpa grafik → PAPA.
4. Retry (wajah keluar bingkai).
5. Pendamping + Pengaturan dengan PIN (bila FL-6).
6. Mode pesawat di Beranda: pesan galat + "Coba lagi", tidak ada layar kosong.
7. 200% teks, TalkBack di Beranda dan Hasil, getar mati.

## Penutup
Laporkan hasil pemeriksaan, perbaikan kecil yang dilakukan, keputusan yang masih terbuka, dan apa yang **tidak** teruji. Komit. **BERHENTI.**
