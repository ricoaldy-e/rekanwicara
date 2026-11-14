# Brief instruksi AI: `POST /v2/instructions/generate`

Untuk teman backend. Format kontrak **tidak berubah** (`docs/kontrak-fe-final.md` §7). Yang berubah hanya **isi** `instruction`: sekarang berupa **langkah-langkah, satu langkah per baris**.

## Kenapa
Pengguna Tuli membaca instruksi sambil menonton video. Instruksi satu paragraf panjang diganti kartu, satu langkah per kartu. Di data tetap satu kolom `instruction`; langkahnya adalah barisnya (dipisah `\n`).

## Permintaan (tidak berubah)
```json
{ "type": "word", "text": "TOLONG" }
{ "type": "syllable", "text": "TO", "parent_word": "TOLONG" }
```

## Jawaban yang diminta
```json
{ "instruction": "Rapatkan bibir dengan nyaman.\nBuka mulut sedikit dan ucapkan TO.\nHentikan bunyi dengan cepat." }
```

Aturan format (app memeriksa dan merapikan, tetapi hasil terbaik kalau LLM sudah menurut):

| Hal | Aturan |
|---|---|
| Jumlah langkah | 2–4 untuk kata, 1–3 untuk suku kata. Maksimal 5 |
| Pemisah | Satu langkah per baris, dipisah `\n`. **Tanpa nomor, tanpa "-", tanpa "•", tanpa judul** |
| Panjang | Tiap langkah 5–120 karakter (usahakan di bawah 100). Total maksimal 500 karakter |
| Isi satu langkah | Satu gerakan yang bisa dilihat: bibir, rahang, atau lidah. Kalimat pendek, kata kerja di depan |
| Bahasa | Indonesia sehari-hari, ramah, tanpa tanda seru dan tanpa emoji |
| Penutup | Tanpa kalimat pembuka atau penutup ("Berikut instruksinya", "Semoga membantu") |

## Yang boleh dan yang dilarang
- **Boleh:** posisi bibir, rahang, lidah; hal yang terlihat di cermin; jumlah pengulangan; kecepatan ("pelan", "pendek").
- **Dilarang:** petunjuk berbasis bunyi atau pendengaran ("dengarkan", "terdengar"), saran medis atau terapi, kata "normal", "abnormal", "gangguan", "diagnosis", "tunarungu", "penderita", janji hasil ("pasti benar"), dan menyebut kemampuan seseorang.
- Untuk suku kata, instruksi **bicara tentang suku kata itu**, boleh menyebut kata induknya sekali untuk konteks.

## Contoh prompt sistem (usul)
```
Kamu membantu Pendamping menulis instruksi pelafalan bahasa Indonesia untuk teman Tuli yang belajar
bicara dengan melihat bentuk mulut. Tulis 2 sampai 4 langkah (suku kata: 1 sampai 3). Satu langkah
satu baris, tanpa nomor, tanpa tanda baris, tanpa judul. Tiap langkah satu gerakan yang bisa dilihat
(bibir, rahang, atau lidah), kalimat pendek, kata kerja di depan, maksimal 100 karakter. Jangan
menyebut bunyi atau pendengaran. Jangan memberi saran medis atau terapi. Jangan memakai emoji atau
tanda seru. Jawab hanya langkah-langkahnya.
```
Pesan pengguna: jenis (kata atau suku kata), teksnya, dan untuk suku kata kata induknya.

## Pemeriksaan di server (usul)
1. Pisahkan per baris, buang baris kosong, buang nomor atau tanda baris di awal.
2. Jika lebih dari 5 baris, gabungkan sisanya ke baris terakhir; jika satu paragraf panjang, pecah per kalimat.
3. Potong tiap baris di 120 karakter dan total di 500. Jika hasil kosong atau tidak masuk akal, balas galat seperti sekarang (app menampilkan "Coba lagi").
4. Tolak (galat) jawaban yang memuat kata terlarang di atas.

App melakukan langkah 1–3 lagi di sisi klien (`src/forms/instructionSteps.ts`, fungsi `fromAi`), jadi jawaban yang sedikit meleset tetap tampil rapi. Pendamping selalu bisa mengedit sebelum menyimpan.
