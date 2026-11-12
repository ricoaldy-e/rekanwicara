# Uji Gabungan: MediaPipe + Wav2Vec2

Revisi 13 November 2026, setelah persetujuan pengguna: MediaPipe memeriksa indikasi
berbicara dan Wav2Vec2 menjadi sumber transkripsi untuk kategori **Berhasil / Mendekati /
Coba lagi**. **Parselmouth tidak dijalankan dalam jalur ini**. Latihan utama lama tetap
memakai pipeline sebelumnya; Level 3 dan progres belum diganti.

Status: implementasi, tes otomatis, dan model asli lulus pengujian eksekusi sintetis.
Versi sebelumnya (tiga observasi) sudah dikonfirmasi tampil di HP. Versi dengan pemeriksaan
gerak dan tiga kategori ini juga sudah dicoba di HP: pengguna mengonfirmasi Berhasil atau
Mendekati muncul. Ini konfirmasi eksekusi/tampilan kategori, bukan validasi kedua kategori
secara terpisah atau akurasi penilaian. Ambang belum dievaluasi terhadap pendengar.

## Mencoba di HP

1. Buka Expo Go `exp://192.168.101.22:8081`, lalu Reload.
2. Tekan lama **Misi hari ini** dua detik → Pengaturan.
3. Server tetap `http://192.168.101.22:8000` → **Uji Gabungan**.
4. Pilih Tolong / Saya Tuli / Hai / Makan → **Latih kata ini** → **Rekam ucapan**.
5. Ucapkan setelah indikator MEREKAM muncul. Lihat teks asli, **Hasil latihan**, dan
   **Pemeriksaan berbicara**. **Rekam lagi** mempertahankan target; **Pilih kata lain**
   kembali ke daftar target.

Alamat khusus jaringan saat ini. Durasi perekaman bawaan tetap 2,5 detik, batas audio
server 4 detik. Gunakan layar Uji Gabungan untuk kategori yang memerlukan kedua komponen;
layar Uji Wav2Vec2 terpisah tetap sebagai pembanding transkripsi saja.

## Aturan hasil

| Kondisi | Tampilan |
|---|---|
| Audio cukup aktif, MediaPipe lulus, teks sama dengan target | Berhasil, hijau + ikon centang + teks |
| Audio cukup aktif, MediaPipe lulus, teks berbeda tetapi dekat | Mendekati, kuning + ikon + teks |
| Audio senyap/singkat, pemeriksaan visual tidak lulus, atau teks jauh/kosong | Coba lagi, merah + ikon + teks dan alasan |
| Salah satu komponen gagal atau timeout | Penilaian belum tersedia; tidak memberi status ucapan salah |

Hanya Berhasil berarti kedua pemeriksaan lulus. Mendekati tidak menjadi kelulusan.
Target dibandingkan setelah inferensi, tidak pernah menjadi prompt atau batas decoder.
Transkripsi asli dipertahankan. Tidak menulis progres, kelulusan atau Supabase.

Kategori suara adalah **kecocokan teks yang terbaca**, bukan ketepatan setiap bunyi.
Kesalahan pengenalan model dapat terlihat seperti kesalahan pengguna. Tidak menampilkan
persentase kemiripan sebagai persentase ketepatan pelafalan.

## Menghitung Mendekati

Tidak ada regex untuk variasi salah ucap atau daftar koreksi kata. Unicode NFC/casefold,
tanda baca menjadi spasi, lalu spasi diringkas. Levenshtein menghitung perubahan minimum
berupa penambahan, penghapusan, dan penggantian karakter. Contoh:

| Target | Transkripsi | Jarak | Kategori teks awal |
|---|---|---|---|
| tolong | tolong | 0 | Berhasil |
| tolong | tolon | 1 | Mendekati |
| makan | makam | 1 | Mendekati, bukan Berhasil |
| hai | ha | 1 | Mendekati |
| saya tuli | saya | 5 | Coba lagi |

Kategori tabel hanya berlaku setelah pemeriksaan rekaman lulus. Nilai awal di
`experiments` dalam thresholds.yaml, **belum disetel menggunakan penilaian pengguna**:

- Target lebih panjang dari 3 karakter: `1 - jarak / max(panjang_target, panjang_teks)`
  minimal **0,75** untuk Mendekati.
- Target sampai 3 karakter: paling banyak **1 edit** untuk Mendekati.
- Teks kosong sesudah perapian selalu Coba lagi, tanpa memaksakan menjadi target.

Semua kata memakai algoritma yang sama. Empat target yang diizinkan adalah konten latihan,
bukan kamus kemungkinan kesalahan. Kemiripan tulisan tidak mempertimbangkan kedekatan
fonetik atau makna; contoh makan/makam menunjukkan batas ini.

## Pemeriksaan MediaPipe dan audio

Satu upload dikonversi sekali menjadi WAV PCM 16-bit mono 16 kHz dan frame 15 fps. Audio
berlebih ditolak melalui validasi satu sampel di atas batas; input tidak diterima setelah
dipotong. Seluruh media sementara dibersihkan setelah hasil lengkap, sebagian, atau error.

Pemeriksaan audio dasar memakai NumPy/RMS, tanpa Parselmouth, pitch, atau formant:
frame **20 ms**, RMS aktif minimal **0,005**, total aktif minimal **200 ms**. Ini pemeriksaan
energi, bukan pengenal ucapan atau sumber suara; musik/nada pun dapat dianggap aktif.

MediaPipe harus memenuhi keterlihatan wajah/bibir dari ambang lama. Gerak celah dan lebar
bibir dinormalisasi terhadap skala mata menggunakan helper `lip_series`, dengan median
filter lama. Hanya frame wajah yang berada pada waktu audio aktif ikut diperiksa,
memperhitungkan offset audio/video dan toleransi **100 ms**. Minimal **dua perubahan**
antar-frame sebesar **0,015** dan rentang perubahan minimal **0,04** diperlukan.
Gerak di luar audio aktif, wajah yang hilang, atau wajah statis tidak meluluskan.

Ambang ini heuristik awal, dapat menolak gerak kecil yang sebenarnya cukup bagi pendengar.
Ini **bukan bukti sumber suara, liveness, atau pengenalan identitas**. Orang yang bergerak
bibir bersamaan suara dari sumber lain masih dapat melewati pemeriksaan. Kontur satu
cuplikan hanya ilustrasi hasil deteksi; keputusan gerak memakai rangkaian frame.

## Kode dan kontrak

- `server/app/pipeline/text_match.py`: perapian dan Levenshtein generik.
- `server/app/pipeline/combined.py`: audio dasar, pemeriksaan gerak, dan keputusan akhir.
- Pengukuran/flag wajah dipindah dari quality.py ke face.py dan diekspor ulang agar
  pemanggil lama tetap bekerja. Jalur eksperimen tidak mengimpor atau memanggil Parselmouth.
- `POST /v1/experiments/combined`, hanya DEBUG=true, multipart `file` + `target` wajib
  dengan empat nilai kanonis. Target tidak diteruskan ke model. Kontrak terbaru SPEC §5,
  schemas.py dan types.ts diubah bersama; app menolak respons untuk target berbeda.
- `feedback.outcome` tiga kategori atau null untuk kegagalan proses. `status` complete/
  partial tetap menggambarkan eksekusi, bukan kelulusan. Teks yang tersedia tetap tampil.
- Upload native menambahkan parameter target, mempertahankan progres BigInt iOS, timeout,
  abort, tanpa retry otomatis/copy. Respons bertingkat dan konsistensi gate divalidasi.
- Model/checkpoint/dependency tetap seperti WAV2VEC2_POC.md, CPU lokal/offline,
  weights_only=True. Timeout ASR 30 detik, tanpa dependency baru.

## Pengujian aktual revisi ini

- **493 pytest lulus**, satu peringatan lama Starlette/HTTPX. Mencakup kategori teks, Unicode,
  perubahan ambang, kesamaan teks yang tidak melewati gate, wajah hilang/statis, gerak di
  luar audio, offset AV, senyap, audio singkat, gerakan kamera, model gagal, timeout,
  satu konversi, target tidak valid, error aman, cleanup, dan fixture kontrak.
- Uji subprocess memblokir impor `parselmouth`: pipeline baru tetap bisa dimuat dan
  menjalankan pemeriksaan RMS. Regresi seluruh pipeline lama juga lulus.
- **280 Jest lulus**, 24 suite; target multipart, tiga label hasil, raw text, gate gagal,
  error teknis tanpa kategori latihan, abort/cleanup, respons kontradiktif/target berbeda.
- TypeScript, Ruff check dan format check **91 berkas** lolos. Expo lint exit 0:
  **0 error, 8 warning lama**. Detektor TSX tidak menemukan pola yang dipindai, tetapi tidak
  menggantikan pemeriksaan visual hasil render di HP.
- HTTP layanan asli: video sintetis tanpa wajah + nada 220 Hz menghasilkan **200**, total
  **6224,6 ms**, `coba_lagi`/`visual_gate`, visual retry/no_face/motion_missing. ASR asli
  berhasil dengan teks kosong, inferensi **608,149 ms**. Target di luar daftar ditolak
  **422**, upload WAV ke endpoint video ditolak **415**.
- Ini bukti eksekusi dan penolakan yang tepat pada input sintetis, bukan akurasi manusia.
  Tiga kategori positif/negatif diuji deterministik dengan landmark dan prediksi pengganti.
- Uji tambahan dengan model asli dan konfigurasi uji terpisah: model wajah tidak ada
  dan subprocess ASR timeout masing-masing menghasilkan HTTP 200 partial dengan
  `feedback.outcome: null`/`component_unavailable`, bukan Coba lagi. Direktori sementara
  kosong sesudah kedua kasus; konfigurasi layanan aktif tidak diganti oleh uji ini.
- Bundle iOS HTTP **200**, **7.735.835 byte**. Backend aktif port **8000**, Metro **8081**.
- requirements.txt, pyvenv.cfg dan pip freeze backend identik sebelum/sesudah. Tidak ada
  pemasangan paket, commit/merge/push/deploy, atau perubahan tag submission.

Perintah dari server/: pytest -q -p no:cacheprovider melalui python -B dengan DEBUG=false
dan PYTHONDONTWRITEBYTECODE=1; Ruff check dan format --check untuk app/tests/../ml.
Dari app/: npm.cmd test -- --runInBand, npx.cmd tsc --noEmit, npx.cmd expo lint --no-cache.

Belum diuji: ambang pada pengguna Tuli, pendengar tanpa melihat target, false accept/
false reject, pembeda gerakan bibir dengan sumber suara lain, dan penghapusan fisik cache
native. Kamera gagal tanpa URI tetap memiliki batas cleanup yang didokumentasikan.
