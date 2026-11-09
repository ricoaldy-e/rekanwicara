# Cermin Wicara

Aplikasi **alat bantu latihan pelafalan** untuk teman Tuli/tunarungu yang memilih berlatih bicara.
Pengguna merekam 2–3 detik video wajah beserta suaranya; server menilai bentuk bibir dan suara,
lalu aplikasi menampilkan dua indikator (Bibir, Suara) dan satu petunjuk.

> Cermin Wicara adalah alat bantu latihan mandiri di antara pertemuan dengan guru/terapis.
> Hasilnya adalah perkiraan sistem untuk latihan, **bukan diagnosis atau penilaian klinis**.

Dibuat untuk LOGICODIX 2026, subtema Inclusive Health.

## Struktur repo

```
cermin-wicara/
├── app/        Aplikasi React Native + Expo (Expo Go)
├── server/     FastAPI: analisis video (MediaPipe) dan suara (Parselmouth, Wav2Vec2)
├── ml/         Skrip dataset, pelabelan, training, evaluasi
├── data/       Dataset dan kalibrasi lokal (tidak di-commit)
└── docs/       Spesifikasi, progres, laporan evaluasi, lisensi pihak ketiga
```

## Dokumen

- [docs/SPEC.md](docs/SPEC.md): spesifikasi teknis dan kontrak API (§5).
- [docs/PROGRESS.md](docs/PROGRESS.md): status pengerjaan per fase.
- [docs/THIRD_PARTY.md](docs/THIRD_PARTY.md): komponen pihak ketiga dan lisensinya.

## Cara menjalankan

_Akan dilengkapi di fase F._

- Server: lihat `server/README.md`.
- App: _menyusul (fase B0)._

## Lisensi

Kode di repo ini berlisensi MIT (lihat [LICENSE](LICENSE)). Komponen pihak ketiga memakai
lisensinya masing-masing (lihat [docs/THIRD_PARTY.md](docs/THIRD_PARTY.md)).
