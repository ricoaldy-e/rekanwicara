/**
 * Kebijakan Privasi (Figma "Kebijakan privasi"). Plain statements of what the app really does; keep it in step with
 * docs/supabase/schema.sql, the upload code and the product boundary in CLAUDE.md. Change `PRIVACY_UPDATED` with any edit.
 */
export const PRIVACY_UPDATED = '14 November 2026';

export interface PolicySection {
  title: string;
  paragraphs: string[];
}

export const PRIVACY_INTRO =
  'Rekan Wicara adalah alat bantu latihan pelafalan. Halaman ini menjelaskan data apa yang dipakai, untuk apa, dan di mana disimpan.';

export const PRIVACY_SECTIONS: PolicySection[] = [
  {
    title: 'Ringkasan',
    paragraphs: [
      'Rekaman latihan dihapus setelah dinilai. Wajah hanya dipakai untuk mengukur bentuk bibir, tanpa pengenalan identitas. Yang disimpan berupa angka hasil latihan, bukan video atau audio.',
    ],
  },
  {
    title: 'Rekaman latihan',
    paragraphs: [
      'Saat kamu merekam, video wajah dan suara dikirim ke server latihan hanya untuk dinilai. Wajah dipakai untuk mengukur bentuk mulut. Tidak ada pengenalan identitas wajah.',
      'Server menilai rekaman dengan MediaPipe (bentuk mulut), Parselmouth (ciri suara), dan Wav2Vec2 (mengenali bunyi yang diucapkan). Semuanya berjalan di server latihan, tidak di layanan lain.',
      'Rekaman dihapus segera setelah dinilai, juga saat terjadi galat. Rekaman yang gagal terkirim tetap di HP sampai dikirim ulang, sampai kamu merekam ulang, atau sampai kamu meninggalkan layar, lalu dibuang. Catatan log server hanya berisi angka dan kode status.',
    ],
  },
  {
    title: 'Data akun',
    paragraphs: [
      'Akun Pendamping memakai email, kata sandi, dan nama panggilan. Kata sandi dikelola layanan masuk (Supabase) dan tidak disimpan di app. Nama panggilan hanya tampil di Beranda dan Pengaturan.',
    ],
  },
  {
    title: 'Hasil latihan dan kalibrasi',
    paragraphs: [
      'Yang disimpan berupa angka dan kode: materi yang dilatih, status Bibir dan Suara, waktu latihan, dan angka kalibrasi. Semua itu tersimpan di HP. Bila akun terhubung, hasil dan kemajuan juga disimpan online (Supabase) terkait pengenal akun, bukan namamu, tanpa video atau audio.',
      'Angka kalibrasi disimpan di server latihan dan hanya berisi angka.',
    ],
  },
  {
    title: 'Kata dan video dari Pendamping',
    paragraphs: [
      'Kata, instruksi, dan video contoh yang ditambahkan Pendamping disimpan di layanan penyimpanan akun Pendamping. Pendamping memastikan orang di video setuju videonya dipakai untuk latihan di aplikasi ini. Saat sebuah kata dihapus, videonya ikut dihapus.',
    ],
  },
  {
    title: 'Instruksi dengan AI',
    paragraphs: [
      'Tombol "Buat dengan AI" mengirim teks kata atau suku kata (beserta kata induknya) ke layanan AI untuk membuat instruksi. Video dan rekaman latihan tidak dikirim. Instruksi dari AI bisa keliru, jadi periksa sebelum menyimpan.',
    ],
  },
  {
    title: 'Data di HP',
    paragraphs: [
      'PIN Pendamping disimpan di penyimpanan aman HP dan tidak dikirim ke server. Riwayat latihan dan pengaturan, misalnya Getar, disimpan di HP.',
    ],
  },
  {
    title: 'Pilihanmu',
    paragraphs: [
      'Kamu bisa keluar dari akun kapan saja di Pengaturan. Pendamping bisa menghapus kata beserta videonya. Rekaman latihan tidak perlu dihapus karena tidak disimpan.',
      'Penghapusan akun dan data online belum tersedia di app. Hubungi tim pengembang di rekanwicara@gmail.com untuk itu.',
    ],
  },
  {
    title: 'Batas penggunaan',
    paragraphs: ['Hasil adalah perkiraan sistem untuk latihan. Bukan pengganti guru atau terapis wicara, dan bukan penilaian klinis.'],
  },
  {
    title: 'Perubahan',
    paragraphs: ['Bila kebijakan ini berubah, tanggal pembaruan di atas ikut berubah.'],
  },
];
