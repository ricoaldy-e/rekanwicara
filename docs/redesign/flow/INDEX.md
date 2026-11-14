# Alur v2 — indeks langkah

Cabang `flow-v2` (dari `design` @ `5abb808`). Baseline: 28 suite / 296 tes lulus, typecheck lulus. Audit: [00-audit.md](00-audit.md).

Setiap langkah: satu sesi, satu komit `phase FL-x: …`, `npm test` + `npm run typecheck` sesudahnya, lalu berhenti. Aturan mundur: bila alur rekam → hasil rusak dan tidak beres dalam ±20 menit, `git revert` komit itu dan lanjut.

## Urutan

| # | Berkas | Isi | Prioritas | Bergantung pada | Ukuran relatif | Model / effort (saran, belum diuji) | Mode |
|---|---|---|---|---|---|---|---|
| 1 | [01-FL-D-data-mock.md](01-FL-D-data-mock.md) | Tipe v2, mappers, katalog tiruan, adapter `/v1/analyze` → hasil v2 | **A** | K5, K6 (pakai usulan bila belum dijawab) | Sedang | Opus 5.5 / high | Plan |
| 2 | [02-FL-1-splash.md](02-FL-1-splash.md) | Verifikasi splash gelap; wordmark bila ada aset | **A** | — | Kecil | Sonnet 5.5 / low | biasa |
| 3 | [03-FL-2-tabs.md](03-FL-2-tabs.md) | `(tabs)` Latihan/Pendamping/Pengaturan; sesi latihan di luar tabs | **A** | — | Sedang | Sonnet 5.5 / high | Plan |
| 4 | [04-FL-3-beranda.md](04-FL-3-beranda.md) | Beranda dua kartu, hapus misi; daftar L1 | **A** | FL-D, FL-2 | Sedang | Opus 5.5 / high | Plan |
| 5 | [05-FL-4-latihan-hasil.md](05-FL-4-latihan-hasil.md) | Sesi latihan pakai `PracticeItem`; hasil per level; "Keluar latihan" | **A** | FL-D, FL-3 | Besar | Opus 5.5 / high | Plan |
| 6 | [06-FL-5-pilih-kata-jalur.md](06-FL-5-pilih-kata-jalur.md) | Pilih kata, Jalur kata L2 → L3 | **A** | FL-D, FL-3, FL-4 | Sedang | Sonnet 5.5 / medium | biasa |
| 7 | [07-FL-5b-formulir.md](07-FL-5b-formulir.md) | Komponen formulir, validator, pesan, `PinPad` | B | — | Besar | Sonnet 5.5 / high | Plan |
| 8 | [08-FL-6-pin.md](08-FL-6-pin.md) | PIN per akun, gerbang tab, kunci, ganti | B | FL-2, FL-5b | Sedang | Sonnet 5.5 / high | Plan |
| 9 | [09-FL-7-auth.md](09-FL-7-auth.md) | Masuk (email), Daftar, Cek email, gerbang awal | B | FL-5b, FL-6; K3, K7 | Besar | Sonnet 5.5 / high | biasa |
| 10 | [10-FL-9-pengaturan.md](10-FL-9-pengaturan.md) | Pengaturan: Getar, Ganti PIN, Tentang, Keluar | B | FL-6, (FL-7 untuk Keluar) | Kecil | Sonnet 5.5 / medium | biasa |
| 11 | [11-FL-8-pendamping-crud.md](11-FL-8-pendamping-crud.md) | CRUD kata + suku kata + video | C | FL-5b, FL-6, FL-D; **`expo-image-picker`**; K1 | Sangat besar | Opus 5.5 / high | Plan |
| 12 | [12-FL-8b-tombol-ai.md](12-FL-8b-tombol-ai.md) | Tombol "Buat dengan AI" | C | FL-8; K2 | Sedang | Sonnet 5.5 / high | Plan |
| 13 | [13-FL-10-pemeriksaan-akhir.md](13-FL-10-pemeriksaan-akhir.md) | Pemeriksaan akhir, teks jujur, PROGRESS | **A** | langkah terakhir yang selesai | Kecil–sedang | Opus 5.5 / high | biasa |

Perkiraan jam tidak ditulis: saya tidak punya dasar yang wajar untuk angka per langkah. "Ukuran relatif" hanya membandingkan langkah satu sama lain. Penilaian kasar: jalur A saja (1–6 + 13) sudah sebanyak pekerjaan UI-1 … UI-10 sebelumnya; B dan C kemungkinan tidak muat sebelum fitur dikunci malam ini.

### Mengapa urutan berbeda dari usulan awal
- **FL-D pertama**: semua layar baru butuh tipe dan katalog; adapter v1 dibuat dan dites sebelum layar menyentuh alur rekam.
- **FL-4 sebelum FL-5**: alur rekam → hasil dibuktikan dengan L1 (risiko terbesar) sebelum Jalur kata dibangun di atasnya.
- **FL-9 sebelum FL-8**: Pengaturan kecil dan memakai hasil FL-6/FL-7; CRUD paling besar dan paling mungkin dilewati, jadi ditaruh di akhir.
- **FL-10 selalu**, prioritas A.

## Bila waktu habis
1. Wajib: 1 → 3 → 4 → 5 → 6 → 13 (alur Tuli lengkap dengan tiruan + `/v1/analyze`). FL-1 boleh hanya verifikasi.
2. Berikutnya: 7 → 8 (PIN melindungi Pengaturan yang memuat alamat server).
3. Boleh dilewati, tulis sebagai batasan di README: FL-7 (akun), FL-9 Keluar, FL-8, FL-8b, Lupa PIN (S), wordmark splash, ringkasan Level 2 di Pilih kata.

## Dependensi antar langkah

```
FL-D ──┬─> FL-3 ──> FL-4 ──> FL-5 ─────────────────┐
FL-2 ──┘                                            ├─> FL-10
FL-5b ──> FL-6 ──> FL-7 ──> FL-9                    │
             └────────────> FL-8 ──> FL-8b ─────────┘
FL-1 (bebas)
```

## Titik sambung dengan BE

| Titik | Sisi FE (berkas) | Sakelar | Status sekarang |
|---|---|---|---|
| Katalog `GET /v2/catalog`, `GET /v2/words/{id}` | `src/data/catalog.ts` → `src/api/v2.ts` | `EXPO_PUBLIC_USE_MOCK` | `/v2` **tidak ada** di server lokal (hanya `server/app/api/v1`). Tiruan |
| Analisis `POST /v2/analyze` | `src/data/analyze.ts` | `EXPO_PUBLIC_ANALYZE_API = v1 \| v2 \| mock` (usulan K5) | Bawaan `v1` (`/v1/analyze`, sudah jalan) + adapter `fromV1` |
| Instruksi AI `POST /v2/instructions/generate` | `src/api/instructions.ts` | `USE_MOCK` | Tiruan |
| Auth | `src/auth/session.ts` (Supabase SDK) | `USE_MOCK` | Klien Supabase ada; login anonim sekarang (K3) |
| CRUD kata, Storage | `src/data/words.ts`, `src/data/media.ts` | `USE_MOCK` | Tabel `custom_*` dan bucket tidak ada di `docs/supabase/schema.sql` — tanya BE |
| Progres `attempts`/`progress` | `src/data/sync.ts` (ada) | — | Jalan; konfirmasi CHECK `overall` menerima `kuning` (sudah di skema) dan `level` 1–3 (skema 0–4, aman) |

Hal yang harus BE konfirmasi sebelum `USE_MOCK=false`: ejaan `lip_result` / `voice_result` / `lip_feedback` / `voice_feedback`; ada tidaknya `instruction_source`; id suku kata bawaan (usulan FE: id v1 `l2_ma`, `l2_pa`); tabel + bucket + RLS untuk materi Pendamping; batas video.
