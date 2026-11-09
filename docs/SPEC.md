# SPEC — Cermin Wicara MVP (v1)

Dokumen ini adalah acuan teknis untuk Claude Code dan tim. Semua angka ambang di sini adalah
**nilai awal** yang disetel ulang dari data (fase A6) dan disimpan di `server/app/config/thresholds.yaml`.

---

## §1 Produk dan batas

- Pengguna: penyandang Tuli/gangguan pendengaran yang memilih berlatih bicara.
- Pendamping: orang tua/keluarga/guru. Memantau lewat Mode Pendamping (PIN), bukan akun terpisah.
- Posisi: alat bantu latihan mandiri di antara pertemuan dengan guru/terapis. Bukan diagnosis.
- Skor = indikator latihan (perkiraan sistem). Aplikasi selalu menampilkan label itu.

## §2 Metode belajar

Siklus satu percobaan: **Lihat** (video model + garis bibir target) → **Tiru** (rekam 2–3 detik)
→ **Bandingkan** (hasil muncul SETELAH mencoba) → **Ulangi**.

| Level | Isi | Status MVP |
|---|---|---|
| 0 | Suara: tahan "aaa", pelan lalu keras | Wajib |
| 1 | Bunyi terisolasi: a, i, u, mmm (e, o bonus) | Wajib |
| 2 | Suku kata: ma mi mu pa pi pu ba bi bu | Wajib |
| 3 | Kata (lihat §3) | Wajib |
| 4 | Pasangan minimal | Bonus |

Setiap materi naik level sendiri-sendiri (lihat §8.4).

## §3 Materi (sumber: `server/app/content/items.json`)

Notasi unit: suku kata atau vokal. Setiap unit tersusun dari fon: `C:m`, `C:p`, `C:b`, `V:a`, `V:i`, `V:u`, `V:e`, `V:o`.

| item_id | level | teks | unit (suku kata) | prioritas |
|---|---|---|---|---|
| l0_hold_a | 0 | Tahan "aaa" | [a] (nilai durasi) | wajib |
| l0_soft_loud | 0 | Pelan lalu keras | [a, a] (nilai selisih kekerasan) | wajib |
| l1_a | 1 | a | [a] | wajib |
| l1_i | 1 | i | [i] | wajib |
| l1_u | 1 | u | [u] | wajib |
| l1_m | 1 | mmm | [m_hum] | wajib |
| l1_e | 1 | e | [e] | bonus |
| l1_o | 1 | o | [o] | bonus |
| l2_ma … l2_bu | 2 | ma, mi, mu, pa, pi, pu, ba, bi, bu | [ma] … [bu] | wajib |
| l3_mama | 3 | mama | [ma, ma] | wajib |
| l3_papa | 3 | papa | [pa, pa] | wajib |
| l3_bibi | 3 | bibi | [bi, bi] | wajib |
| l3_pipi | 3 | pipi | [pi, pi] | wajib |
| l3_apa | 3 | apa | [a, pa] | wajib |
| l3_abu | 3 | abu | [a, bu] | wajib |
| l3_ibu | 3 | ibu | [i, bu] | wajib |
| l3_ubi | 3 | ubi | [u, bi] | wajib |
| l3_bumi | 3 | bumi | [bu, mi] | wajib |
| l3_mau | 3 | mau | [ma, u] | bonus |
| l3_bau | 3 | bau | [ba, u] | bonus |
| l3_boba | 3 | boba | [bo, ba] | bonus |

Level 4 (bonus): pasangan `mama–papa`, `bau–mau`, `pipi–bibi`, `abu–ibu`, `papa–pipi`.

Bentuk `items.json` (contoh satu entri):
```json
{"item_id":"l3_mama","level":3,"text":"mama","units":["ma","ma"],
 "priority":"required","emoji":"👩","active":true}
```
- Makna kata ditampilkan dengan emoji + teks (tanpa berkas gambar). Kata tanpa emoji yang cocok cukup teks.
  Saran: mama 👩, papa 👨, ibu 👩‍👧, bumi 🌍, ubi 🍠, boba 🧋, mau 🙋, bau 👃, apa ❓; bibi, pipi, abu cukup teks.
- Video model tidak dibundel di app: disajikan server lewat `GET /v1/model-video/{item_id}` (lihat §5).
Validasi saat memuat: setiap unit harus tersusun dari fon Tahap A. Materi yang melanggar ditolak.

## §4 Arsitektur

```
HP (Expo Go)                          Laptop (FastAPI)
expo-camera rekam mp4 (video+audio) ─▶ /v1/analyze
                                        1 media: ffprobe offset, ffmpeg → wav 16k mono + frame 15 fps 480p
                                        2 quality (K1)
                                        3a lips: MediaPipe Face Landmarker (VIDEO mode)
                                        3b audio: Parselmouth
                                        4 segment: unit/suku kata
                                        5 rules + hints → JSON
                                        6 hapus semua berkas sementara
◀───────────────────────────────────── hasil JSON
app simpan ringkasan → Supabase
```

Environment server (`server/.env`): `HOST`, `PORT`, `MOCK_MODE` (true/false), `DATASET_MODE`,
`DEBUG`, `DATA_DIR` (default `../data`), `SCORER_MODE` (MVP: selalu `rules`), `ENGINE_VERSION`.

## §5 Kontrak API v1 (sumber kebenaran)

Semua endpoint di bawah prefix `/v1`. Upload memakai `multipart/form-data`.

### GET /v1/health
`{"status":"ok","engine_version":"0.1.0","scorer_mode":"rules","mock_mode":false}`

### GET /v1/items
Daftar materi aktif dari `items.json`.

### POST /v1/calibrate
Field: `file` (mp4), `user_id`, `step` ∈ `rest | vowel_a | vowel_i | vowel_u`.
```json
{"status":"ok","step":"vowel_a","quality_flags":[],"saved":true,
 "calibration_complete":false,"engine_version":"0.1.0"}
```
`status:"retry"` bila ada flag kualitas; `saved:false`.

### POST /v1/analyze
Field: `file` (mp4), `user_id`, `item_id`, `session_id`.
```json
{
  "status": "ok",
  "quality_flags": [],
  "item_id": "l3_mama",
  "level": 3,
  "overall": "merah",
  "score": 0.75,
  "indicators": {"bibir": "hijau", "suara": "merah"},
  "units": [
    {"index":0,"target":"ma","start_ms":120,"end_ms":520,
     "bibir":"hijau","suara":"hijau","status":"hijau","reason_code":null},
    {"index":1,"target":"ma","start_ms":520,"end_ms":980,
     "bibir":"hijau","suara":"merah","status":"merah","reason_code":"closure_voicing_expected"}
  ],
  "hint_id": "m_voicing",
  "visuals": {
    "vowel_point": {"f1": 720, "f2": 1300},
    "vowel_anchors": {"a": {"f1":780,"f2":1350}, "i": {"f1":320,"f2":2300}, "u": {"f1":350,"f2":900}},
    "lip_contour": {"points": [[0.41,0.62],[0.45,0.60]]},
    "loudness": {"t_ms": [0,10,20], "db": [42.1,55.3,61.0]}
  },
  "scorer": "rules",
  "engine_version": "0.1.0",
  "processing_ms": 2140
}
```
- `overall`, `bibir`, `suara`, `status` ∈ `hijau | kuning | merah`. Untuk Level 0, `bibir` = `null`.
- Bila `status:"retry"`: `overall`, `score`, `units` = null; `hint_id` = kode `retry_*` pertama.
- `visuals` boleh berisi `null` per kunci bila tidak relevan.
- `reason_code` lihat §6.9.

### POST /v1/dataset/upload (hanya bila `DATASET_MODE=true`)
Field: `file`, `purpose` (`dataset` | `model_video`), `speaker_id`, `item_id`, `rep` (int),
`intended_error` (string, `none` bila tidak ada), `condition` (`quiet` | `noisy`), `session_id`.
- `purpose=dataset`: simpan ke `DATA_DIR/raw/{speaker_id}/{item_id}__r{rep}__{intended_error}__{condition}.mp4`
  dan tambahkan baris ke `DATA_DIR/raw/metadata.csv`.
- `purpose=model_video`: simpan (timpa) ke `DATA_DIR/model_videos/{item_id}.mp4`, tidak masuk metadata.
Respons: `{"status":"ok","clip_id":"..."}`.

### GET /v1/model-video/{item_id}
Mengirim berkas `DATA_DIR/model_videos/{item_id}.mp4` (video/mp4). 404 bila belum ada; app lalu
menampilkan teks + ilustrasi bibir saja.

### Mode mock
Bila `MOCK_MODE=true`, `/analyze` dan `/calibrate` mengembalikan contoh valid tanpa analisis.
Query `?mock=hijau|kuning|merah|retry` memilih variasi.

## §6 Pipeline server

### §6.1 Media
- `ffprobe`: baca `start_time` stream video dan audio; simpan selisihnya (`av_offset_ms`) untuk menyelaraskan waktu.
- `ffmpeg`: audio → WAV mono 16 kHz; video → frame 15 fps, tinggi 480 px (frame rate dinormalkan).
- Durasi maksimal 4 detik (potong bila lebih). Semua berkas di direktori sementara yang dihapus di `finally`.

### §6.2 Kualitas rekaman (K1)
| flag | kondisi awal |
|---|---|
| `no_face` | wajah terdeteksi < 90% frame |
| `face_off_frame` | lebar wajah < 25% lebar frame, atau titik mulut di luar frame |
| `too_quiet` | puncak intensitas < noise_floor + 10 dB |
| `too_noisy` | (median intensitas ucapan − noise_floor) < 15 dB |
| `clipping` | > 1% sampel |amplitudo| ≥ 0,99 |
| `too_short` | durasi ucapan < 0,2 s |

noise_floor: dari kalibrasi bila ada; bila tidak, persentil ke-10 intensitas klip.

### §6.3 Kalibrasi (K2) — `DATA_DIR/calibration/{user_id}.json`, angka saja
- `rest`: median fitur bibir 3 detik diam (termasuk `mouth_width_rest`), noise_floor.
- `vowel_a|i|u`: median F1, F2, dan fitur bibir di 50% tengah ucapan.
- Jangkar diperbarui: median dari 10 percobaan terakhir berstatus hijau untuk vokal itu.
- Tanpa kalibrasi: pakai nilai default populasi di `thresholds.yaml` dan tambahkan `"uncalibrated"` ke `quality_flags` (bukan penyebab retry).

### §6.4 Fitur bibir (MediaPipe Face Landmarker, `output_face_blendshapes=True`, `num_faces=1`, mode VIDEO)
Per frame:
- `jaw_open` = blendshape jawOpen − nilai rest.
- `lip_gap_ratio` = jarak titik 13 (bibir atas dalam) ke 14 (bibir bawah dalam) ÷ `mouth_width_rest`.
- `lip_width_ratio` = jarak sudut mulut 61 ke 291 ÷ `mouth_width_rest`.
- `rounding` = max(mouthPucker, mouthFunnel) − nilai rest.
- `closed` = `lip_gap_ratio` < 0,05 (silang-cek dengan mouthClose).
- Normalisasi cadangan bila belum kalibrasi: jarak sudut mata luar 33–263.
- Haluskan dengan median filter 3 frame.
- `lip_contour`: ±20 titik garis luar bibir dari frame tengah unit terakhir, dinormalkan 0–1 terhadap kotak mulut.
- **Verifikasi indeks landmark dengan menggambar titiknya di frame contoh sebelum dipakai.**

### §6.5 Fitur suara (Parselmouth, langkah 10 ms)
- Intensitas: `to_intensity()`.
- Nada dan bersuara: `to_pitch(time_step=0.01, pitch_floor=75, pitch_ceiling=600)`; frame bersuara = F0 terdefinisi.
- Formant: `to_formant_burg(time_step=0.01, max_number_of_formants=5, maximum_formant=5500)`.
- Nilai vokal: median F1, F2 di 50% tengah segmen vokal yang bersuara.

### §6.6 Segmentasi
1. Wilayah ucapan: intensitas > noise_floor + 10 dB; ambil rentang terpanjang, toleransi celah 100 ms.
2. Penutupan bibir: `closed` berturut-turut ≥ 80 ms (≥ 2 frame).
3. Ciri penutupan: `closure_ms`, `voiced_ratio` (proporsi frame audio bersuara selama tertutup, setelah koreksi `av_offset_ms`), `closure_db`.
4. Batas suku kata: awal setiap penutupan, kecuali penutupan pertama bila kata diawali konsonan.
   Contoh `apa` = [a | pa]: batas di awal penutupan /p/. `mama` = [ma | ma]: batas di awal penutupan kedua.
5. Bila jumlah penutupan ≠ jumlah konsonan di templat: cadangan = lembah intensitas terdalam sebanyak (jumlah unit − 1); tandai unit tanpa penutupan sebagai `closure_missing`.

### §6.7 Aturan penilaian (scorer `rules`)
Status: hijau bila semua syarat terpenuhi; kuning bila nilai dalam 15% dari ambang; merah selain itu.

Level 0:
- `l0_hold_a`: durasi bersuara tanpa putus ≥ 3,0 s (kuning ≥ 2,55 s).
- `l0_soft_loud`: selisih median intensitas bagian kedua − bagian pertama ≥ 6 dB (kuning 5–6 dB).
  Bagian dipisah oleh jeda terpanjang; bila tidak ada jeda, bagi dua.

Vokal (bibir; suara relatif terhadap jangkar pengguna):
| vokal | bibir hijau | suara hijau |
|---|---|---|
| a | jaw_open ≥ 0,40 | F1 ≥ max(F1_i, F1_u) + 100 Hz |
| i | lip_width_ratio ≥ 1,05 dan rounding < 0,20 | F2 ≥ F2_u + 300 Hz |
| u | rounding ≥ 0,35 dan lip_width_ratio ≤ 0,95 | F2 ≤ F2_i − 300 Hz |
| e (bonus) | jaw_open 0,15–0,40, lip_width_ratio ≥ 1,0 | F2 di antara jangkar i dan u, lebih dekat ke i |
| o (bonus) | rounding ≥ 0,25, jaw_open 0,15–0,40 | F2 rendah, F1 > F1_u |

`m_hum`: bibir rapat ≥ 80% durasi ucapan; voiced_ratio ≥ 0,7 dan durasi ≥ 0,5 s.

Konsonan bibir (dalam suku kata):
| fon | bibir | suara saat tertutup |
|---|---|---|
| p | penutupan ≥ 80 ms lalu terbuka | voiced_ratio < 0,3 (kuning < 0,4) |
| b | penutupan ≥ 80 ms lalu terbuka | voiced_ratio ≥ 0,5 (kuning ≥ 0,4) |
| m | penutupan ≥ 80 ms lalu terbuka | voiced_ratio ≥ 0,5; bonus: closure_ms ≥ 100 dan closure_db ≥ noise_floor + 15 |

Satu unit suku kata = konsonan + vokal. Bibir unit = terburuk dari bibir konsonan dan bibir vokal; Suara unit = terburuk dari suara konsonan dan suara vokal.

### §6.8 Status dan skor
- Status unit = terburuk dari Bibir dan Suara.
- `score` = (hijau + 0,5 × kuning) ÷ jumlah unit.
- `overall`: hijau bila semua hijau; merah bila ada merah; selain itu kuning.
- `indicators.bibir`/`suara` = terburuk di semua unit.

### §6.9 reason_code → hint_id
| reason_code | hint_id |
|---|---|
| `l0_duration_short` | `l0_duration_short` |
| `l0_loudness_flat` | `l0_loudness_flat` |
| `vowel_open_low` (a) | `a_open` |
| `vowel_spread_low` (i) | `i_spread` |
| `vowel_round_low` (u) | `u_round` |
| `vowel_acoustic_mismatch` | hint bibir vokal target (a_open / i_spread / u_round) |
| `closure_missing` | `closure_missing` |
| `closure_voicing_expected` (m) | `m_voicing` |
| `closure_voicing_expected` (b) | `b_voicing` |
| `closure_voicing_unexpected` (p) | `p_silent` |
| `hum_open` | `closure_missing` |
| `hum_short` | `m_voicing` |

Prioritas memilih SATU petunjuk: (1) flag kualitas → `retry_*`; (2) unit merah pertama, lalu kuning pertama;
(3) dalam satu unit, masalah bibir sebelum suara; (4) semua hijau → `ok_good`.
Kalimat petunjuk ada di `server/app/content/hints.json` (salinan juga di app). Lihat §13.

## §7 Scorer Wav2Vec2 — DITUNDA ke roadmap

**Tidak dikerjakan di MVP**: data hanya ±80 klip dari 3 orang, terlalu sedikit untuk melatih pengklasifikasi. `SCORER_MODE` di MVP selalu `rules`. Rancangan di bawah disimpan untuk tahap lanjutan bersama mitra (data dari banyak penutur).

- Model awal: `facebook/wav2vec2-base`, dibekukan. Uji embedding lapisan 4–9 (mean-pool di wilayah ucapan unit); pilih lewat validasi.
- Pengklasifikasi: StandardScaler + LogisticRegression multinomial (bandingkan dengan MLP kecil bila sempat).
- Kelas: `a i u m_hum ma mi mu pa pi pu ba bi bu` + `other` (na, ta, da, ka, sa, la, diam, batuk, bising). Bonus: `e o bo`.
- Data latih: unit dari rekaman Level 1–2 dan unit hasil segmentasi kata Level 3.
- Validasi silang per penutur (GroupKFold); uji akhir pada penutur yang disisihkan.
- Keputusan untuk target T: hijau bila top-1 = T dan p(T) ≥ θ_hijau (awal 0,6); kuning bila T di top-2 atau p(T) ≥ θ_kuning (awal 0,35); merah selain itu.
- Pemetaan kebingungan → reason_code: target m/b diprediksi p → `closure_voicing_expected`; target p diprediksi m/b → `closure_voicing_unexpected`; vokal tertukar → `vowel_acoustic_mismatch`; `other` → `closure_missing` (untuk unit berkonsonan) atau `vowel_acoustic_mismatch`.
- `SCORER_MODE=hybrid`: indikator Suara untuk unit Level 1–3 dari Wav2Vec2; Level 0 dan Bibir tetap dari aturan.
- Artefak: `server/models/w2v_clf.joblib` + `w2v_meta.json` (lapisan, kelas, θ, versi).

## §8 Aplikasi

### §8.1 Layar
- `onboarding`: penjelasan alat bantu (bukan pengganti guru/terapis), persetujuan pengguna/pendamping, buat PIN pendamping.
- `calibration`: 4 langkah (rest 3 s, a, i, u) dengan instruksi visual dan gambar.
- `home`: misi hari ini, daftar level dan materi beserta statusnya (terkunci / berlatih / lulus / ulasan).
- `practice/[itemId]`: Lihat → Tiru → Bandingkan → Ulangi. Video model diputar dari `GET /v1/model-video/{item_id}`;
  bila 404, tampilkan teks besar + ilustrasi bibir SVG.
- Ilustrasi bentuk bibir (rileks, /a/ terbuka, /i/ melebar, /u/ membulat, rapat) dan posisi wajah dalam oval
  digambar sebagai komponen SVG sederhana di app, tanpa berkas gambar dari luar.
- `companion` (PIN): ringkasan mingguan, Uji Dengar (opsional), pengaturan durasi sesi, bagikan laporan teks.
- `dataset` (tersembunyi, hanya bila `EXPO_PUBLIC_DATASET_MODE=true`): lihat §10.

### §8.2 Perekaman
- expo-camera kamera depan, mode video, satu file mp4 dengan audio. Durasi default 2,5 s (Level 0: 4 s).
- Bingkai oval sebagai panduan posisi wajah. Hitung mundur visual 3-2-1 + getar. Indikator merekam yang jelas.
- Upload dengan indikator progres; bila gagal jaringan, tawarkan coba lagi.

### §8.3 Tampilan hasil
- Dua indikator (Bibir, Suara): warna + ikon + teks (Sesuai / Mendekati / Belum sesuai).
- Satu kalimat petunjuk dari `hint_id`.
- Peta Vokal (SVG): segitiga jangkar a–i–u pengguna + titik percobaan (sumbu: F2 horizontal terbalik, F1 vertikal ke bawah).
- Cermin Bibir (SVG): garis bibir pengguna vs garis target dari video model.
- Level 0: grafik kekerasan suara sederhana.
- Label kecil: "Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis."

### §8.4 Logika kemajuan (TypeScript murni, dites)
- Naik level per materi: ≥ 8 dari 10 percobaan terakhir berstatus hijau, tersebar di ≥ 2 sesi. Percobaan `retry` tidak dihitung.
- Level 3: bila Uji Dengar diaktifkan pendamping, butuh juga ≥ 1 Uji Dengar "jelas".
- Pola: berblok di awal; acak setelah akurasi ≥ 80%.
- Pengurangan umpan balik: Level 0 grafik + hasil; Level 1–2 indikator + petunjuk tiap percobaan; Level 3 status keseluruhan tiap 2 percobaan (mesin tetap menilai semua).
- Ulasan berjarak: hari ke-1, 3, 7, 14 setelah lulus.
- Macet: < 40% hijau selama 3 sesi → turunkan satu level atau ganti materi; tampilkan saran ke pendamping untuk berkonsultasi dengan guru/terapis.
- Sesi ±10 menit: pemanasan Level 0 → ulasan → inti → tantangan acak → ringkasan.

### §8.5 Aksesibilitas
Tanpa isyarat suara; teks besar; kontras tinggi; ikon + teks; tombol besar; animasi seperlunya; semua instruksi bergambar.

## §9 Supabase
Tabel (RLS aktif, autentikasi anonim; `user_id = auth.uid()`):
- `profiles(user_id uuid pk, display_name text, created_at)`
- `attempts(id uuid pk, user_id, session_id, item_id, level int, status text, overall text, score real, indicators jsonb, hint_id text, scorer text, engine_version text, created_at)`
- `progress(user_id, item_id, stage text, last_10 jsonb, sessions_count int, passed_at timestamptz, next_review_at timestamptz, pk(user_id,item_id))`
- `listen_checks(id, user_id, item_id, result text, created_at)`
Tidak ada video/audio di Supabase. App punya antrean lokal (AsyncStorage) bila offline, sinkron saat online.

## §10 Dataset (versi tim 3 orang, maksimal 100 video)

Data **tidak dipakai untuk melatih model**. Penilaian memakai MediaPipe (model pralatih) + Parselmouth + aturan.
Data hanya dipakai untuk (1) menyetel ambang di `thresholds.yaml` dan (2) menguji kesepakatan dengan penilaian manusia.

### §10.1 Perekam
3 anggota tim, kode `P1`, `P2`, `P3`. Persetujuan cukup berupa kesepakatan tim yang dicatat di MODEL_CARD.md.

### §10.2 Skrip sesi per orang (27 klip, ±6 menit)
| blok | isi | ulangan | klip |
|---|---|---|---|
| A | l0_hold_a, l0_soft_loud | 1 | 2 |
| B | a, i, u | 2 | 6 |
| C | mmm | 1 | 1 |
| D | ma, pa, ba, mi, pi, bu | 1 | 6 |
| E | mama, papa, bibi, apa, ibu, bumi | 1 | 6 |
| F | kesalahan disengaja (§10.3) | 1 | 4 |
| G | klip buruk: wajah keluar bingkai, ruangan bising | 1 | 2 |
| | **total** | | **27** |
3 orang × 27 = 81 klip. Urutan di dalam blok diacak.

### §10.3 Kesalahan disengaja dan label otomatis
| intended_error | instruksi | label otomatis |
|---|---|---|
| `mama_as_papa` | Ucapkan "mama" tapi tahan suara saat bibir rapat | kedua unit: bibir ok, suara salah |
| `u_flat_lips` | Ucapkan "u" dengan bibir datar | unit 1: bibir salah |
| `a_narrow` | Ucapkan "a" dengan mulut hampir tertutup | unit 1: bibir salah |
| `mama_no_closure` | Ucapkan "mama" tanpa merapatkan bibir | kedua unit: bibir salah |
| `bad_face` (blok G) | Geser wajah keluar bingkai | harus `retry` (no_face / face_off_frame) |
| `bad_noise` (blok G) | Ucapkan "a" dengan musik atau kipas keras | harus `retry` (too_noisy) atau tetap dinilai bila suara jelas |
Klip lain: label otomatis "semua unit ok". Saat merekam, tekan **ulang** bila salah ucap.

### §10.4 Video model (16 video, 1 orang, ±5 menit)
l1_a, l1_i, l1_u, l1_m, l2_ma, l2_pa, l2_ba, dan 9 kata wajib Level 3. Materi lain (Level 0, suku kata lain,
kata bonus) memakai teks + ilustrasi bibir SVG. Total video: 81 + 16 = 97.

### §10.5 Metadata dan label
`data/raw/metadata.csv`: `clip_id, speaker_id, item_id, rep, intended_error, condition, session_id, recorded_at, device`.
Cek label: setiap klip dinilai oleh **2 anggota yang bukan perekamnya** (masing-masing ±54 klip, ±5 menit) di `/labeler`.
Berkas: `data/labels/labels_{annotator}.csv` dengan kolom `clip_id, annotator, matches_request, heard_label, lips_wrong, quality_ok, notes`.

### §10.6 Pembagian: leave-one-speaker-out (LOSO)
Setel ambang memakai 2 orang, uji pada 1 orang sisanya; ulangi 3 kali sehingga setiap orang pernah menjadi penguji.
Laporkan rata-rata dan hasil per putaran. Ambang final disetel dari ketiga orang. Tidak ada augmentasi (tidak ada training).

## §11 Evaluasi (fase A6)
| metrik | target |
|---|---|
| kesepakatan deteksi bibir rapat | ≥ 90% |
| kesepakatan vokal a/i/u | ≥ 85% |
| kesepakatan senyap vs bersuara saat rapat | ≥ 80% |
| kesepakatan status kata (hijau vs bukan) | ≥ 80% |
| Cohen's kappa per kemampuan | dilaporkan |
| klip buruk tertangkap K1 | semua yang disengaja |
| klip layak salah ditolak | < 10% |
| waktu respons p90 | ≤ 5 s |
Evaluasi memakai LOSO (§10.6). Data kecil: satu klip ≈ 3–4% pada setiap putaran, jadi laporkan jumlah klip di samping setiap persentase dan sebut hasilnya sebagai bukti awal. Laporan: `docs/EVAL_REPORT.md`.

## §12 Privasi
Rekaman produk dihapus setelah analisis. Tidak ada media di log. Dataset hanya di `data/` lokal dengan
persetujuan tertulis; dihapus setelah lomba kecuali penutur setuju disimpan. Kalibrasi hanya angka.

## §13 Pustaka petunjuk (`hints.json`, draf, ditinjau ahli)
| hint_id | kalimat |
|---|---|
| ok_good | Bagus! Coba sekali lagi tanpa melihat layar. |
| l0_duration_short | Tahan suaranya sedikit lebih lama. |
| l0_loudness_flat | Bedakan lagi: pertama pelan, lalu keras. |
| a_open | Buka mulut lebih lebar. |
| i_spread | Tarik sudut bibir ke samping, seperti tersenyum. |
| u_round | Bulatkan dan majukan bibir, seperti meniup. |
| closure_missing | Rapatkan kedua bibir dulu, baru buka. |
| m_voicing | Saat bibir rapat, biarkan suara keluar lewat hidung. Rasakan getaran di hidung. |
| p_silent | Saat bibir rapat, tahan sebentar tanpa suara, lalu lepaskan. |
| b_voicing | Saat bibir rapat, suara tetap berbunyi, lalu lepaskan bibir. |
| retry_no_face | Wajah belum terlihat. Posisikan wajah di dalam bingkai. |
| retry_off_frame | Dekatkan wajah dan letakkan di tengah. |
| retry_quiet | Suara belum terdeteksi. Coba bersuara lebih jelas. |
| retry_noisy | Ruangan terlalu bising. Coba di tempat yang lebih tenang. |
| retry_clipping | Suara terlalu keras di mikrofon. Jauhkan HP sedikit. |
| retry_short | Ucapannya terlalu singkat. Coba lagi. |
