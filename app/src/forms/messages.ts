/** Every user-facing form text (flow §7.1.1, §7.7.1–§7.7.3), so it can be reviewed in one place. */
import { LIMITS, MAX_SYLLABLES, VIDEO_LIMITS } from './limits';

const MAX_VIDEO_MB = Math.round(VIDEO_LIMITS.maxBytes / (1024 * 1024));
const MAX_VIDEO_SECONDS = Math.round(VIDEO_LIMITS.maxDurationMs / 1000);

export const MESSAGES = {
  // Nickname (shown on Beranda; not used to sign in)
  nicknameEmpty: 'Isi nama panggilan.',
  nicknameShort: `Nama panggilan minimal ${LIMITS.nickname.min} karakter.`,
  nicknameLong: `Nama panggilan maksimal ${LIMITS.nickname.max} karakter.`,
  nicknameChars: 'Mulai dengan huruf atau angka. Boleh spasi, titik, apostrof, dan tanda hubung.',
  // Email (sign-in takes the email only: kontrak FE §1 #4)
  emailEmpty: 'Isi email.',
  emailInvalid: 'Email belum benar. Contoh: nama@email.com',
  // Password
  passwordEmpty: 'Isi kata sandi.',
  passwordEdgeSpace: 'Kata sandi tidak boleh diawali atau diakhiri spasi.',
  passwordShort: `Kata sandi minimal ${LIMITS.password.min} karakter.`,
  passwordLong: `Kata sandi maksimal ${LIMITS.password.max} karakter.`,
  passwordComposition: 'Kata sandi harus ada huruf dan angka.',
  passwordSameAsIdentity: 'Kata sandi tidak boleh sama dengan nama panggilan atau email.',
  passwordMismatch: 'Kata sandi tidak sama.',
  passwordWrong: 'Kata sandi salah.',
  forgotPinIntro: 'Masukkan kata sandi akunmu untuk membuat PIN baru. PIN lama diganti.',
  signInFailed: 'Email atau kata sandi salah.',
  privacyConsent: 'Centang persetujuan untuk melanjutkan.',
  emailTaken: 'Email ini sudah terdaftar. Coba masuk.',
  emailNotConfirmed: 'Email belum dikonfirmasi. Buka email untuk konfirmasi, lalu masuk.',
  authNetwork: 'Tidak ada koneksi. Periksa jaringan, lalu coba lagi.',
  authServer: 'Server sedang bermasalah. Coba lagi sebentar.',
  // PIN
  pinWeak: 'PIN terlalu mudah ditebak. Pilih angka lain.',
  pinMismatch: 'PIN tidak sama. Ulangi dari awal.',
  pinSameAsOld: 'PIN baru harus berbeda dari PIN lama.',
  pinWrong: 'PIN salah. Sisa {n} percobaan.',
  pinLocked: 'Terlalu banyak percobaan. Coba lagi dalam {n} detik.',
  pinChanged: 'PIN diganti.',
  pinSaveFailed: 'PIN belum bisa disimpan. Coba lagi.',
  // Word and syllables
  wordEmpty: 'Isi kata yang akan dilatih.',
  wordChars: 'Gunakan huruf saja. Spasi atau tanda hubung boleh di antara huruf.',
  wordLong: `Maksimal ${LIMITS.word.max} karakter.`,
  wordDuplicate: 'Kata ini sudah ada.',
  syllableHint: `Huruf saja, tanpa spasi. Maksimal ${LIMITS.syllable.max} huruf.`,
  syllableEmpty: 'Isi suku kata atau hapus baris ini.',
  syllableChars: 'Suku kata hanya huruf, tanpa spasi.',
  syllableLong: `Maksimal ${LIMITS.syllable.max} huruf.`,
  syllablesMismatch: 'Gabungan suku kata (“{joined}”) berbeda dari kata (“{word}”). Periksa lagi, atau lanjut bila sudah benar.',
  syllablesFull: `Maksimal ${MAX_SYLLABLES} suku kata`,
  deleteSyllable: 'Hapus suku kata ini?',
  instructionEmpty: 'Isi instruksi pelafalan atau buat dengan AI.',
  instructionShort: `Tulis minimal ${LIMITS.instruction.min} karakter agar jelas.`,
  instructionLong: `Maksimal ${LIMITS.instruction.max} karakter.`,
  instructionHint: 'Jelaskan posisi bibir, lidah, dan rahang saat mengucapkannya.',
  // Instruksi dengan AI (flow §7.5.2)
  aiNeedWord: 'Isi kata dulu untuk membuat instruksi.',
  aiNeedSyllable: 'Isi suku kata dulu untuk membuat instruksi.',
  consentToSave: 'Centang persetujuan untuk menyimpan.',
  deleteWord: 'Hapus “{word}” dan {n} suku katanya? Ini tidak bisa dibatalkan.',
  deleteWordNoSyllables: 'Hapus “{word}”? Ini tidak bisa dibatalkan.',
  deleteFailed: 'Kata belum bisa dihapus. Coba lagi.',
  wordDeleted: 'Kata “{word}” dihapus.',
  wordSaved: 'Kata “{word}” disimpan.',
  wordIncomplete: 'Belum lengkap',
  companionWordsUnavailable: 'Kata Pendamping belum tersedia di versi ini: penyimpanan video di server belum siap. Gunakan mode tiruan untuk mencoba.',
  companionEmpty: 'Belum ada kata. Tambahkan kata yang ingin dilatih bersama.',
  videoPermissionCamera: 'Izin kamera dibutuhkan untuk merekam video. Buka pengaturan untuk mengizinkan.',
  videoPickFailed: 'Video belum bisa diambil. Coba lagi.',
  videoKept: 'Video sudah tersimpan.',
  uploadFailed: 'Unggah gagal. Periksa koneksi lalu coba lagi.',
  saveFailed: 'Kata belum bisa disimpan. Coba lagi.',
  consentVideo: 'Saya memastikan orang di video setuju videonya dipakai untuk latihan di aplikasi ini.',
  uploading: 'Mengunggah video {n} dari {total} · {pct}%',
  // Video
  videoEmpty: 'Pilih atau rekam video contoh.',
  videoFormat: 'Format belum didukung. Gunakan MP4 atau MOV.',
  videoTooBig: `Video terlalu besar ({mb} MB). Maksimal ${MAX_VIDEO_MB} MB.`,
  videoTooLong: `Video terlalu panjang. Maksimal ${MAX_VIDEO_SECONDS} detik.`,
  // Whole form
  requiredNote: 'Semua isian wajib diisi kecuali yang bertanda opsional.',
  errorCount: 'Ada {n} isian yang perlu diperbaiki.',
  discardTitle: 'Buang perubahan?',
  discardConfirm: 'Buang',
  discardKeep: 'Lanjut mengisi',
} as const;

/** Texts of the shared form components. */
/** Texts of "Buat dengan AI" (flow §7.5.2). */
export const AI = {
  button: 'Buat dengan AI',
  again: 'Buat ulang',
  loading: 'Membuat instruksi…',
  cancel: 'Batal',
  working: 'Sedang membuat instruksi',
  disclosure: 'Kata yang kamu tulis dikirim ke layanan AI untuk membuat instruksi. Video tidak dikirim.',
  filled: 'Instruksi terisi. Periksa sebelum menyimpan.',
  label: 'Dibuat dengan AI. Periksa dan ubah bila perlu.',
  undo: 'Kembalikan teks sebelumnya',
  replaceTitle: 'Ganti instruksi yang sudah ditulis?',
  replace: 'Ganti',
  failed: 'Instruksi belum bisa dibuat. Tulis sendiri atau coba lagi.',
  offline: 'Tidak ada koneksi. Tulis sendiri atau coba lagi nanti.',
  rateLimited: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
  warning: 'Instruksi dari AI bisa keliru dan bukan saran klinis. Periksa sebelum menyimpan.',
} as const;

export const UI = {
  optional: '(opsional)',
  showPassword: 'Tampilkan sandi',
  hidePassword: 'Sembunyikan sandi',
  retry: 'Coba lagi',
  cancel: 'Batal',
  delete: 'Hapus',
  pinDigit: 'Angka {d}',
  pinDots: '{n} dari {total} angka terisi',
  counter: '{n} / {max}',
  dismiss: 'Tutup pesan',
  forgotPin: 'Lupa PIN?',
  pickGallery: 'Pilih dari galeri',
  recordVideo: 'Rekam video',
  replaceGallery: 'Ganti dari galeri',
  recordAgain: 'Rekam video baru',
  removeVideo: 'Hapus video',
  openSettings: 'Buka pengaturan',
  addSyllable: 'Tambah suku kata',
  moveUp: 'Naik',
  moveDown: 'Turun',
  removeSyllable: 'Hapus',
  save: 'Simpan',
  cancelUpload: 'Batalkan',
  syllableLabel: 'Suku kata {n}',
  sectionWord: 'Kata',
  sectionSyllables: 'Suku kata (opsional)',
  pwRule8: '8 karakter atau lebih',
  pwRuleLetter: 'Ada huruf',
  pwRuleDigit: 'Ada angka',
  ruleMet: 'terpenuhi',
  ruleNotMet: 'belum',
} as const;

export type MessageKey = keyof typeof MESSAGES;
export type Vars = Record<string, string | number>;
/** What a validator returns for a bad value: a key, or a key with values for its {placeholders}. */
export type Problem = MessageKey | { key: MessageKey; vars: Vars };

export function fill(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function messageOf(problem: Problem): string {
  return typeof problem === 'string' ? MESSAGES[problem] : fill(MESSAGES[problem.key], problem.vars);
}
