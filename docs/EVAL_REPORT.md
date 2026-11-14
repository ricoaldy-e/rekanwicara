# Laporan evaluasi — Rekan Wicara MVP (fase A6)

**Bukti awal, bukan klaim akurasi.** Semua angka berasal dari 81 klip yang direkam oleh 3 anggota tim
(dewasa, bukan penutur Tuli, semuanya iPhone, satu ruang tenang). Satu klip bernilai 2–5% dari satu
putaran, jadi setiap persentase ditulis bersama jumlah kliknya.

Diperbarui: Rabu 11 November 2026. Ulangi dengan `ml/eval/tune_thresholds.py` lalu `ml/eval/evaluate.py`.

## Ringkasan

| Metrik SPEC §11 | LOSO sebelum A6 | **LOSO sesudah A6** | kappa | Target | Tercapai |
|---|---|---|---|---|---|
| Deteksi bibir rapat | 54/60 = 90% | **56/60 = 93%** | 0.71 | ≥ 90% | ya |
| Senyap vs bersuara saat rapat | 36/48 = 75% | **43/50 = 86%** | 0.29 | ≥ 80% | ya |
| Vokal a/i/u | 18/23 = 78% | **19/23 = 83%** | 0.55 | ≥ 85% | belum |
| Status kata (hijau vs bukan) | 8/22 = 36% | **12/22 = 55%** | 0.23 | ≥ 80% | belum |
| Klip buruk sengaja tertangkap (wajah keluar bingkai) | | **3/3 = 100%** | | semua | ya |
| Klip layak yang salah ditolak | | **1/74 = 1%** | | < 10% | ya |
| Waktu proses server p90 (81 klip) | | **984 ms** (p50 804 ms) | | ≤ 5 s | ya |

LOSO = setel ambang pada 2 orang, uji pada orang ke-3, tiga putaran; setiap klip diuji tepat sekali.
"Sebelum A6" = ambang SPEC/A2/A3 dengan jangkar vokal yang sama per putaran.

Kesimpulan: deteksi bibir rapat, suara saat bibir rapat, kualitas rekaman, dan waktu respons sudah
memenuhi target. **Vokal (83%) dan terutama status kata (55%) belum**: mesin masih lebih ketat dari
penilai manusia pada kata dua suku kata. Penyebab utamanya terukur (lihat "Kasus gagal").

## Data dan kebenaran

- 81 klip: P1, P2, P3 masing-masing 27 (SPEC §10.2), ditambah 16 video model yang tidak dipakai di sini.
- Cek label: setiap klip dinilai oleh **2 anggota yang bukan perekamnya** di `/labeler` (162 penilaian).
  Kesepakatan antar-penilai untuk "sesuai materi": 73/81 = 90%, kappa 0.65. Untuk "bibir salah" dan
  "kualitas baik" kesepakatannya 95% dan 94%, tetapi kappa ≈ 0 karena hampir semua jawaban "tidak"
  (kappa tidak bermakna untuk kelas yang sangat jarang).
- Kebenaran per klip = kedua penilai sepakat. 8 klip yang penilainya berbeda pendapat tidak dipakai untuk
  status kata. Kesalahan sengaja yang dinilai "sesuai" oleh kedua penilai dengan bibir benar dianggap
  tidak dilakukan (2 klip: `P2 mama_as_papa`, `P2 a_narrow`).
- Klip "benar" yang ditolak kedua penilai tanpa keterangan aspeknya tidak dipakai untuk metrik per unit.
- Blok G (`bad_face`, `bad_noise`) hanya dipakai untuk metrik kualitas rekaman.

Definisi metrik:
- **Bibir rapat**: setiap konsonan m/p/b di Level 2–3; mesin "rapat" bila penutupan ditemukan (§6.6).
- **Senyap vs bersuara**: setiap penutupan yang benar ada dan ditemukan; mesin "sesuai" bila pemeriksaan
  suara konsonan (§6.7) hijau. `mama_as_papa` = kedua penutupan seharusnya senyap.
- **Vokal**: klip Level 1 a/i/u; mesin "sesuai" bila status unit hijau.
- **Status kata**: klip Level 3; mesin "sesuai" bila semua unit hijau.

## Metode penyetelan

- Penilaian ulang memakai deret bibir dan suara tersimpan (`data/processed/*.npz`, A4), dengan fungsi
  segmentasi dan aturan yang sama persis dengan `/v1/analyze`.
- Grid kecil, satu parameter per langkah (10 parameter, 3–6 nilai). Setiap parameter dipilih untuk
  akurasi seimbang (rata-rata recall kedua kelas) pada metriknya sendiri. Bila seri, dipilih yang membuat
  status kata lebih baik, lalu yang paling dekat dengan nilai lama.
- Jangkar vokal (F1/F2 a, i, u) per putaran dihitung hanya dari klip 2 penutur penyetel, tidak dari penutur uji.
- Tanpa kalibrasi pengguna: semua klip dinilai dengan default populasi (§6.3), seperti pengguna baru.

## Ambang hasil A6

Nilai final disetel dari ketiga orang dan ditulis ke `server/app/config/thresholds.yaml` (nilai lama
tersimpan di komentar baris).

| Parameter | Sebelum | Uji P1 | Uji P2 | Uji P3 | **Final** |
|---|---|---|---|---|---|
| `lips.closed_gap_ratio` | 0.08 | 0.10 | 0.10 | 0.10 | **0.10** |
| `consonants.p.voiced_ratio_max` | 0.3 | 0.6 | 0.6 | 0.6 | **0.6** |
| `consonants.b.voiced_ratio_min` | 0.5 | 0.3 | 0.3 | 0.5 | **0.3** |
| `consonants.m.voiced_ratio_min` | 0.5 | 0.4 | 0.4 | 0.5 | **0.4** |
| `vowels.a.jaw_open_min` | 0.40 | 0.35 | 0.30 | 0.30 | **0.30** |
| `vowels.i.lip_width_ratio_min` | 1.05 | 1.00 | 1.00 | 1.05 | **1.00** |
| `vowels.u.rounding_min` | 0.35 | 0.35 | 0.35 | 0.35 | 0.35 |
| `vowels.a.f1_margin_hz`, `i/u.f2_margin_hz` | 100 / 300 / 300 | sama | sama | sama | sama |

Batas kuning p dan b ikut bergeser dengan jarak 0,1 seperti di SPEC (p 0,7; b 0,2).

Catatan penting: **rentang /p/ dan /b/ sekarang tumpang tindih** (p dianggap senyap sampai 60% bersuara,
b dianggap bersuara mulai 30%). Pada ucapan alami ketiga penutur, /p/ di antara dua vokal ikut bergetar
sebagian (A2: intensitas di dalam penutupan 50–60 dB). Akibatnya sistem andal menangkap "m/b tanpa suara",
tetapi **belum bisa diandalkan untuk menangkap /p/ yang terlalu bersuara**. Nilai p 0,6 juga berada di
ujung grid.

## Per putaran LOSO

| Uji | Metrik | Sebelum A6 | Sesudah A6 | kappa |
|---|---|---|---|---|
| P1 | bibir rapat | 19/20 = 95% | 20/20 = 100% | 1.00 |
| P1 | senyap vs bersuara | 13/17 = 76% | 16/18 = 89% | 0.44 |
| P1 | vokal a/i/u | 8/8 = 100% | 8/8 = 100% | 1.00 |
| P1 | status kata | 1/6 = 17% | 2/6 = 33% | 0.08 |
| P2 | bibir rapat | 18/20 = 90% | 18/20 = 90% | 0.62 |
| P2 | senyap vs bersuara | 13/16 = 81% | 16/16 = 100% | n/a |
| P2 | vokal a/i/u | 6/7 = 86% | 6/7 = 86% | 0.59 |
| P2 | status kata | 5/8 = 62% | 7/8 = 88% | 0.60 |
| P3 | bibir rapat | 17/20 = 85% | 18/20 = 90% | 0.62 |
| P3 | senyap vs bersuara | 10/15 = 67% | 11/16 = 69% | 0.13 |
| P3 | vokal a/i/u | 4/8 = 50% | 5/8 = 62% | 0.14 |
| P3 | status kata | 2/8 = 25% | 3/8 = 38% | 0.09 |

Jumlah sampel suara bisa berubah karena ambang bibir rapat yang baru menemukan lebih banyak penutupan.
P3 paling lemah; P3 beristirahat dengan bibir agak membulat, sehingga default populasi kurang cocok
(lihat rekomendasi kalibrasi).

Dengan ambang final pada ketiga orang (dalam sampel, lebih optimis dari LOSO): bibir rapat 56/60 = 93%,
suara 45/50 = 90%, vokal 21/23 = 91%, status kata 14/22 = 64%.

## Confusion (LOSO sesudah A6)

**Deteksi bibir rapat**

| Manusia \ Mesin | rapat | tidak rapat |
|---|---|---|
| rapat | 50 | 4 |
| tidak rapat | 0 | 6 |

**Senyap vs bersuara saat rapat**

| Manusia \ Mesin | sesuai target | tidak sesuai |
|---|---|---|
| sesuai target | 41 | 5 |
| tidak sesuai | 2 | 2 |

Hanya 4 sampel "tidak sesuai" (dua klip `mama_as_papa` yang benar-benar dilakukan): kappa 0.29 untuk
metrik ini didasarkan pada sangat sedikit kasus negatif.

## Kasus gagal

1. **Penutupan /b/ sebelum "u" terlewat (4 dari 4 kesalahan bibir rapat).** `P2 bu`, `P2 ibu`, `P3 ibu`,
   `P3 bumi`: semuanya unit "bu". Bibir yang membulat untuk "u" sudah maju sejak penutupan /b/, dan
   penutupan cepat bisa jatuh di antara dua frame 15 fps. Celah bibir dalam tidak pernah turun di bawah
   ambang. Perbaikan yang dicoba di A3 (abaikan frame yang membulat) memperbaiki 2 klip tetapi merusak 3,
   sehingga tidak dipakai.
2. **`P3 bibi`: penilai mendengar "bibi" yang benar, mesin mengukur 0% bersuara di kedua penutupan /b/.**
   Mesin menilai "b" sebagai "p". Kemungkinan P3 mengucapkan /b/ dengan getaran sangat lemah yang tidak
   tertangkap pelacak nada Praat pada intensitas rendah, atau /b/-nya memang luruh. Tidak dapat dipastikan
   tanpa analisis spektrum per klip.
3. **Label dan ukuran bertentangan pada kesalahan sengaja.** `P3 u_flat_lips`: kedua penilai menyatakan
   "tidak sesuai", tetapi mesin mengukur bibir tetap membulat (rounding 0,87) dan menilai hijau.
   Sebaliknya `P2 a_narrow`: kedua penilai menyatakan "sesuai", tetapi mesin mengukur mulut hampir
   tertutup (jaw_open 0,17) dan menilai merah. Di kedua kasus mesin mengikuti ukuran bibir; penilai
   mungkin dipengaruhi instruksi atau suara. Keduanya dihitung sebagai kesalahan mesin di tabel di atas.

Status kata yang benar tetapi tidak hijau (10 klip) disebabkan oleh: "a" di dalam kata yang kurang
terbuka dibanding "a" tunggal (P1/P3 `papa`, `apa`, `mama`), penutupan "bu" yang terlewat (kasus 1),
dan suara /b/ P3 (kasus 2).

## Kualitas rekaman (K1)

- `bad_face`: 3/3 diminta ulang (`no_face`/`face_off_frame`).
- `bad_noise`: 0/3 diminta ulang. SPEC mengizinkan klip ini tetap dinilai bila suara jelas; pada rekaman
  tim, bising latar hanya 47–49 dB (A1/B1), tidak cukup keras untuk memicu `too_noisy`. Kemampuan menolak
  ruangan yang sangat bising belum teruji.
- Klip layak yang ditolak: 1/74 (`P2 l1_i r1`, `too_noisy`; klip ini diucapkan terlalu pelan, tercatat sejak B1).

## Batasan

- **3 penutur dewasa dari tim sendiri, bukan pengguna sasaran.** Belum diuji pada penutur Tuli atau anak,
  yang pola bibir dan suaranya bisa jauh berbeda.
- Data sangat kecil (±1 klip per materi per orang); grid sengaja kasar, tetapi ambang tetap bisa terlalu
  pas dengan 3 orang ini. Hanya vokal a/i/u dan konsonan m/p/b (Tahap A); e dan o tidak dinilai.
- Semua klip dari iPhone di satu ruangan; kamera Android dan ruangan lain belum diuji.
- Evaluasi memakai default populasi tanpa kalibrasi. Default `rest_rounding` dan rasio mulut-mata diukur
  dari ketiga orang (A2/A3), jadi ada sedikit kebocoran ke putaran LOSO.
- Kebenaran berasal dari penilai awam dengan kesepakatan kappa 0.65, bukan dari guru atau terapis wicara.

## Rekomendasi

1. **Evaluasi dengan kalibrasi pengguna** (rest + a/i/u). P3 menunjukkan default populasi tidak cocok
   untuk semua orang; app sudah mendukung kalibrasi, tetapi dataset belum punya klip kalibrasi terpisah.
2. Penutupan sebelum "u": coba perekaman 30 fps atau ciri bibir lain selain celah bibir dalam.
3. Kumpulkan data mitra (sekolah/komunitas Tuli, dengan persetujuan) sebelum ambang dipakai lebih luas.
4. Rekam ulang `bad_noise` dengan bising yang benar-benar keras untuk menguji `too_noisy`.
