# AGENTS.md — aturan untuk agen AI di repo ini (Codex, Claude Code, dll.)

Proyek: **Cermin Wicara** (aplikasi latihan pelafalan untuk penyandang Tuli/tunarungu, lomba LOGICODIX 2026).
Kunci fitur **Jumat 13 Nov 2026 malam**, submission **Sabtu 14 Nov 2026**.

## Baca dulu, berurutan

1. `CLAUDE.md`: aturan kerja per fase dan batas produk. **Berlaku untuk semua agen, bukan hanya Claude.**
2. `CONTEXT.md`: ringkasan, status, hasil dan keterbatasan, cara menyiapkan laptop.
3. `docs/PROGRESS.md`: status tiap fase dan semua keputusan beserta alasan.
4. `docs/SPEC.md`: spesifikasi (§5 = kontrak API, sumber kebenaran).
5. `docs/NEXT_STEPS.md`: pekerjaan tersisa (I1, B4, F) dengan prompt-nya.

## Aturan keras

- **Satu fase pada satu waktu.** Mulai dengan rencana singkat (berkas yang akan dibuat/diubah, keputusan yang butuh
  persetujuan) dan **tunggu persetujuan pengguna** sebelum menulis kode. Jangan mencicil fase berikutnya.
- Logika baru wajib punya tes (pytest untuk `server/` dan `ml/`, jest untuk `app/`); jalankan sebelum menyatakan selesai.
  Jangan menyatakan "selesai" bila tes, `tsc`, atau lint gagal. Laporkan apa adanya, termasuk yang belum diuji.
- Tanya dulu sebelum menambah dependency atau mengubah kontrak API (ubah SPEC §5, `server/app/api/schemas.py`, dan
  `app/src/api/types.ts` bersama-sama).
- **Privasi:** jangan membaca, memutar, mengunggah, atau menyalin isi `data/` (video wajah) ke layanan apa pun; jangan
  menaruh rekaman, path rekaman, atau token/kunci di log, kode, atau commit. `.env` dan `data/` tidak pernah di-commit.
- **Batas produk (UI dan output API):** alat bantu latihan, bukan diagnosis; jangan pakai kata "normal", "abnormal",
  "gangguan", "diagnosis"; status selalu warna + ikon + teks; tanpa isyarat suara; tidak ada pengenalan identitas wajah.
- Semua ambang ada di `server/app/config/thresholds.yaml`, bukan di-hardcode.
- Python: type hints, pydantic untuk I/O, format dengan `ruff format` dan lolos `ruff check`. TypeScript strict.
  Nama berkas, variabel, dan komentar kode dalam bahasa Inggris; teks untuk pengguna dalam Bahasa Indonesia.
- Cek dokumentasi resmi bila API sebuah library tidak pasti; jangan menebak. Bila sesuatu gagal di lingkungan ini
  (mis. ffmpeg tidak ada), berhenti dan beri instruksi, jangan membuat solusi diam-diam.

## Git

- Kerjakan di branch fase (`phase-<id>`), commit dengan pesan `phase <ID>: <ringkas>`, lalu gabungkan ke `main` dengan
  fast-forward. **Pesan commit tidak boleh memuat atribusi AI** (mis. `Co-Authored-By`, "Generated with ..."): commit
  atas nama pengguna saja. **Jangan `git push`** kecuali pengguna memintanya.
- Jangan memakai `--force`, `--no-verify`, atau perintah yang menghapus riwayat.

## Perintah umum

- Server: `cd server && .venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000`; tes: `pytest -q`;
  lint: `ruff check app tests ../ml` dan `ruff format --check app tests ../ml`.
- App: `cd app && npx expo start -c`; tes: `npm test`; tipe: `npx tsc --noEmit`; lint: `npx expo lint`;
  kesehatan proyek: `npx --yes expo-doctor@1.21.6` (versi `latest` sempat rusak).
- Windows PowerShell: pakai sintaks PowerShell; `git` sering menulis peringatan CRLF ke stderr (abaikan).

## Gaya kerja

Jawab dalam Bahasa Indonesia, singkat, kritis, dan jujur tentang keterbatasan. Utamakan solusi terkecil yang benar dan
lengkap (jangan over-engineering), tetapi jangan melewatkan tes, validasi di batas kepercayaan, atau privasi.
