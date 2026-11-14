# Paket produksi — 8 Kata Penting

**Status: siap dipakai untuk merekam; belum ada video.** Total 24 file final, masing-masing satu video untuk 8 kata lengkap dan 16 potongan.

## Berkas untuk perekam

1. [Panduan perekaman](RECORDING_GUIDE.md): kamera, cahaya, framing, audio, gerak tangan, urutan take, ekspor dan penyimpanan.
2. [Kartu rekam 01–24](SHOT_LIST.md): target, file rencana dan langkah model untuk setiap video.
3. [Checklist cetak](CHECKLIST.md): 24 baris kosong dan pemeriksaan kualitas tiap file.
4. [Manifest CSV](video_manifest.csv): daftar rencana file/status yang bisa dibuka sebagai tabel.
5. [Pemeriksaan kesesuaian sumber](SOURCE_CHECK.md): cakupan 24 kartu dan kecocokan 113 langkah dengan sumber.

Folder penyimpanan disiapkan di `media/important_words/` dari root repo. Panduan tetap berada di docs, sedangkan rekaman hanya lokal dan diabaikan Git. Sumber langkah: [dokumen v4 pengguna](../../../KATA_PENTING_LANDASAN_DAN_INSTRUKSI.md), Bagian B/C. Kartu rekam sudah mandiri sehingga perekam tidak perlu mengambil instruksi dari bagian riset.

## Daftar file final yang harus direkam

Nama berikut seluruhnya rencana; file MP4 belum dibuat. Tiap kata mempunyai `word/` dan, selain HAUS, `syllables/`.

| Kata / folder induk | File kata lengkap di word/ | File potongan di syllables/ | Jumlah |
|---|---|---|---|
| TOLONG / `tolong/` | `kp_tolong.mp4` | `kp_tolong_to.mp4`, `kp_tolong_long.mp4` | 3 |
| POLISI / `polisi/` | `kp_polisi.mp4` | `kp_polisi_po.mp4`, `kp_polisi_li.mp4`, `kp_polisi_si.mp4` | 4 |
| API / `api/` | `kp_api.mp4` | `kp_api_a.mp4`, `kp_api_pi.mp4` | 3 |
| SAKIT / `sakit/` | `kp_sakit.mp4` | `kp_sakit_sa.mp4`, `kp_sakit_kit.mp4` | 3 |
| OBAT / `obat/` | `kp_obat.mp4` | `kp_obat_o.mp4`, `kp_obat_bat.mp4` | 3 |
| ALAMAT / `alamat/` | `kp_alamat.mp4` | `kp_alamat_a.mp4`, `kp_alamat_la.mp4`, `kp_alamat_mat.mp4` | 4 |
| MAKAN / `makan/` | `kp_makan.mp4` | `kp_makan_ma.mp4`, `kp_makan_kan.mp4` | 3 |
| HAUS / `haus/` | `kp_haus.mp4` | — (hanya kata lengkap) | 1 |
| **Total** | **8 video** | **16 video** | **24** |

Contoh struktur rencana:

```text
media/important_words/
  README.md
  .gitignore
  _takes/                 # master/take kerja lokal, belum ada rekaman
  tolong/
    word/                 # kp_tolong.mp4
    syllables/            # kp_tolong_to.mp4, kp_tolong_long.mp4
  polisi/word/ dan syllables/
  api/word/ dan syllables/
  sakit/word/ dan syllables/
  obat/word/ dan syllables/
  alamat/word/ dan syllables/
  makan/word/ dan syllables/
  haus/word/              # kp_haus.mp4; tidak ada folder potongan HA/US
```

Penanda .gitkeep mempertahankan folder kosong; bukan video dummy. Berkas rekaman tidak masuk Git. HAUS tidak dipecah; A untuk API dan A untuk ALAMAT tetap dua video berbeda.

Tahap berikutnya: tim merekam seluruh video sungguhan, memeriksa kualitas lokal, memilih final dan menandai checklist. Integrasi aplikasi/backend menunggu seluruh video tersedia; paket ini tidak mengubah API atau memasang aset ke aplikasi.
