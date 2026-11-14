# Daftar periksa manual: 360 dp dan skala teks 200%

Dibuat di FG-12 (14 Nov 2026). Semua kotak masih kosong: **belum ada yang diuji di perangkat.** Isi saat menguji di HP Android demo (Expo Go).

## Persiapan

1. **Skala teks 200%:** `adb shell settings put system font_scale 2.0` (kembali ke normal: `adb shell settings put system font_scale 1.0`). Tanpa adb: Pengaturan HP → Tampilan → Ukuran font, geser ke paling besar; bila batas HP di bawah 200%, catat angkanya.
2. **Lebar 360 dp:** HP 360 dp (mis. 360 × 800), atau `adb shell wm size 720x1600` dengan `wm density 320` (360 dp). Kembalikan: `adb shell wm size reset` dan `adb shell wm density reset`.
3. **Mode demo** (Pengaturan → Mode demo) memberi riwayat contoh, jadi Beranda, Hasil, dan Aktivitas punya isi. Pengguna baru: profil kosong. Server mock (`mock_mode`) cukup untuk alur rekam sampai Hasil.
4. Uji tiap layar di **empat kombinasi**: normal, 360 dp, 200%, 360 dp + 200%.

## Aturan lulus (berlaku di semua layar)

- Tidak ada teks terpotong, tumpang tindih, atau terdorong keluar layar; tidak ada gulir horizontal.
- Setiap tombol dan tautan tetap terjangkau (tidak tertutup bar menempel atau bar bawah) dan ≥ 48 dp.
- Konten yang butuh gulir punya petunjuk (potongan item berikutnya terlihat), dan bar menempel tidak menutup baris terakhir.
- Status tetap bisa dibedakan tanpa warna (simbol + teks) dan teks ≥ 15 pada 100%.
- Tombol berbahaya tidak jadi pilihan utama; konfirmasi: pilihan aman krem di atas.
- Pembaca layar (TalkBack) membaca nama dan state setiap kontrol; tidak ada kontrol tanpa nama.

## Per layar

Tandai: `[ ]` belum · `[x]` lulus · `[!]` bermasalah (catat di kolom Catatan).

### Masuk ke app

| Layar | Cek khusus | 360 | 200% | 360+200% | Catatan |
|---|---|---|---|---|---|
| Splash · Memuat | Logo, nama, tagline, batang, dan catatan batas produk muat; catatan tidak terpotong | [ ] | [ ] | [ ] | |
| Selamat datang | Judul 2–3 baris tidak mendorong tombol keluar layar; "Masuk" dan "Buat akun" tetap menempel dan terbaca | [ ] | [ ] | [ ] | |
| Masuk | Baris logo + "Rekan Wicara" membungkus rapi; keyboard tidak menutup tombol "Masuk"; "Belum punya akun? Daftar" membungkus dan tetap satu tautan | [ ] | [ ] | [ ] | |
| Masuk · galat | Pesan galat terlihat tanpa menggulir jauh; fokus pindah ke kolom yang salah | [ ] | [ ] | [ ] | |
| Daftar | Kapsul "Kembali", checklist sandi (ikon + teks), persetujuan, dan "Sudah punya akun? Masuk" terjangkau dengan keyboard terbuka; Android back kembali ke Selamat datang | [ ] | [ ] | [ ] | |
| Cek email, Buat PIN, Lupa PIN | (tidak di-restyle di FG-11) hanya pastikan tidak pecah | [ ] | [ ] | [ ] | |
| Onboarding 1 | Empat kartu siklus (teks 2 baris) dan catatan batas; "Lanjut" menempel dan tidak menutup catatan | [ ] | [ ] | [ ] | |
| Onboarding 2 | Kartu privasi panjang, dua persetujuan, teks alasan, tiga elemen bawah (alasan, "Lanjut ke kalibrasi", "Kembali") tidak menutup persetujuan | [ ] | [ ] | [ ] | |
| Kalibrasi | (tidak di-restyle) panel rekam dan langkah tidak pecah | [ ] | [ ] | [ ] | |

### Latihan

| Layar | Cek khusus | 360 | 200% | 360+200% | Catatan |
|---|---|---|---|---|---|
| Beranda | Header: nama panjang + wordmark tidak saling menimpa; hero (judul 28, ilustrasi, tombol) muat; dua LevelTile dan dua StatTile berdampingan tidak memotong "Level 2 dan 3" atau "5 / 12"; Aktivitas: judul + badge membungkus | [ ] | [ ] | [ ] | |
| Beranda · pengguna baru | Hero, tiga langkah awal (marker + teks), kartu "Belum ada latihan" | [ ] | [ ] | [ ] | |
| Level 1 | Banner + cincin, enam baris bunyi: judul, keterangan, dan badge "Belum sesuai" tidak berebut tempat | [ ] | [ ] | [ ] | |
| Pilih kata | Segmented control: tiga label ("Pendamping" terpanjang) tidak terpotong; baris kata: kata + badge membungkus, chip "Dari Pendamping" muat; filter kosong menampilkan catatan | [ ] | [ ] | [ ] | |
| Jalur kata | Judul 34 + chip sumber membungkus; kartu langkah dengan chip "Berikutnya" tidak terpotong; tile "mama" melebar tanpa menutup teks | [ ] | [ ] | [ ] | |
| Sesi · Lihat | Kartu video, "Putar contoh", instruksi panjang; "Mulai rekam" menempel dan tidak menutup instruksi | [ ] | [ ] | [ ] | |
| Sesi · Tiru | Panel 3:4 + dua tombol muat di layar pendek (atau menggulir dengan jelas); oval 150 × 200 tidak keluar panel; keterangan dalam panel terbaca di atas pratinjau kamera | [ ] | [ ] | [ ] | |
| Sesi · Merekam | Angka 140 di dalam oval, lencana MEREKAM, batang waktu, dan "Merekam…" terlihat sekaligus; getar mati: semua tetap jelas | [ ] | [ ] | [ ] | |
| Sesi · Menganalisis | Tiga tahap tidak terpotong; "Batalkan" menempel; tekan "Batalkan" benar-benar menghentikan permintaan (cek log server: tidak ada hasil masuk) | [ ] | [ ] | [ ] | |
| Hasil · Level 1 | Kartu target (ilustrasi 110 + teks), dua kartu indikator menumpuk bila sempit, grafik tidak terpotong, bar aksi menempel dan baris terakhir (disclaimer) masih bisa digulir keluar dari bawah bar | [ ] | [ ] | [ ] | |
| Hasil · Level 2–3 | Kata target, dua kartu, petunjuk, disclaimer | [ ] | [ ] | [ ] | |
| Hasil · semua sesuai / tidak dihitung | Tanpa kartu petunjuk; InfoNote + "Rekam ulang" (belum dibandingkan dengan Figma 48:280 dan 48:335) | [ ] | [ ] | [ ] | |
| Dialog keluar latihan | Masih `Alert` sistem: judul dan dua tombol terbaca di 200%; Android back menutup tanpa aksi | [ ] | [ ] | [ ] | |

### Pendamping dan Pengaturan

| Layar | Cek khusus | 360 | 200% | 360+200% | Catatan |
|---|---|---|---|---|---|
| Gerbang PIN | Papan angka 4 baris (346 dp) + titik + pesan + "Lupa PIN?" muat di layar pendek atau menggulir; kunci bulat 76 dp tidak berhimpit | [ ] | [ ] | [ ] | |
| Pendamping · daftar | Pengantar 3 baris, "Tambah kata", baris kata dengan "Belum lengkap", grup "Kata bawaan" (kata + "Bawaan" berdampingan) | [ ] | [ ] | [ ] | |
| Kata baru / Ubah kata | Formulir panjang; tombol Simpan, Batal, dan "Hapus kata" tidak berhimpit; "Hapus kata" tidak terpencet tanpa sengaja | [ ] | [ ] | [ ] | |
| Dialog hapus kata | Judul panjang ("Hapus “tolong” dan 2 suku katanya? …") muat; Batal krem di atas, "Hapus kata" merah di bawah; fokus awal pada Batal (TalkBack) | [ ] | [ ] | [ ] | |
| Pengaturan | Kartu akun (nama + email panjang), baris Getar (teks 2 baris + "Aktif" + sakelar), Ganti PIN + ikon kunci, catatan PIN, versi; bagian operator demo di bawah tidak terpotong | [ ] | [ ] | [ ] | |
| Keluar (PIN lalu dialog) | PIN diminta, Batal kembali ke Pengaturan, Keluar menuju Selamat datang/Masuk | [ ] | [ ] | [ ] | |
| Tentang | (tidak di-restyle) tidak pecah | [ ] | [ ] | [ ] | |
| Bar bawah | Tiga label ("Pendamping", "Pengaturan") tidak terpotong di 200% (tinggi item 64 dp tetap); tab aktif jelas tanpa warna saja | [ ] | [ ] | [ ] | |

## Pemeriksaan lintas layar

- [ ] **Hitam-putih** (Pengaturan aksesibilitas → koreksi warna → monokrom): Sesuai, Mendekati, Belum sesuai tetap berbeda; tab aktif dan status "Belum dicoba" tetap jelas.
- [ ] **Perangkat dibisukan, getar mati:** alur rekam → Hasil selesai tanpa kehilangan informasi.
- [ ] **TalkBack:** urutan baca masuk akal di Beranda, Hasil, dan Pengaturan; kartu indikator dibaca "Bibir: Sesuai"; baris daftar dibaca satu elemen dengan nama lama ("Ubah TOLONG", "A, terakhir Mendekati").
- [ ] **Reduce Motion aktif:** tidak ada animasi selain perubahan langsung (cincin tahap tidak berputar).
- [ ] **Cahaya terang di luar ruangan:** garis `hairline`, teks `textMuted`, dan oval putus-putus di panel rekam tetap terbaca.
- [ ] **Font gagal dimuat** (mode pesawat saat pertama kali, atau uji dengan font dimatikan): app tetap jalan dengan font sistem.
- [ ] **Target sentuh ≥ 48 dp dan jarak antar tombol ≥ 12 dp** di semua layar di atas (kunci PIN 76, kapsul kembali 48).
- [ ] **Kontras teks:** hitung ulang hanya bila warna token berubah (tes `theme.contrast.test.ts` menjaga nilainya).

## Yang tidak bisa dicek lewat tes otomatis (jadi wajib manual)

Tata letak nyata di perangkat (pembungkusan teks, tinggi layar pendek), pratinjau kamera di bawah oval SVG, splash native (butuh build, bukan Expo Go), keyboard di Masuk/Daftar dengan header tersembunyi, perilaku `player.currentTime = 0` untuk "Putar contoh", pembatalan unggahan di jaringan nyata, dan sesi PIN setelah Keluar dibatalkan.
