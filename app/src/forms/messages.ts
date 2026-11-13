/** Every user-facing form text (flow §7.1.1, §7.7.1–§7.7.3), so it can be reviewed in one place. */
import { LIMITS, MAX_SYLLABLES, VIDEO_LIMITS } from './limits';

const MAX_VIDEO_MB = Math.round(VIDEO_LIMITS.maxBytes / (1024 * 1024));
const MAX_VIDEO_SECONDS = Math.round(VIDEO_LIMITS.maxDurationMs / 1000);

export const MESSAGES = {
  // Username
  usernameEmpty: 'Isi username.',
  usernameShort: `Username minimal ${LIMITS.username.min} karakter.`,
  usernameLong: `Username maksimal ${LIMITS.username.max} karakter.`,
  usernameStart: 'Username harus diawali huruf.',
  usernameChars: 'Gunakan huruf, angka, titik, atau garis bawah.',
  // Email (sign-in takes the email only: kontrak FE §1 #4)
  emailEmpty: 'Isi email.',
  emailInvalid: 'Email belum benar. Contoh: nama@email.com',
  // Password
  passwordEmpty: 'Isi kata sandi.',
  passwordEdgeSpace: 'Kata sandi tidak boleh diawali atau diakhiri spasi.',
  passwordShort: `Kata sandi minimal ${LIMITS.password.min} karakter.`,
  passwordLong: `Kata sandi maksimal ${LIMITS.password.max} karakter.`,
  passwordComposition: 'Kata sandi harus ada huruf dan angka.',
  passwordSameAsIdentity: 'Kata sandi tidak boleh sama dengan username atau email.',
  passwordMismatch: 'Kata sandi tidak sama.',
  signInFailed: 'Email atau kata sandi salah.',
  privacyConsent: 'Centang persetujuan untuk melanjutkan.',
  // PIN
  pinWeak: 'PIN terlalu mudah ditebak. Pilih angka lain.',
  pinMismatch: 'PIN tidak sama. Ulangi dari awal.',
  pinSameAsOld: 'PIN baru harus berbeda dari PIN lama.',
  pinWrong: 'PIN salah. Sisa {n} percobaan.',
  pinLocked: 'Terlalu banyak percobaan. Coba lagi dalam {n} detik.',
  pinChanged: 'PIN diganti.',
  // Word and syllables
  wordEmpty: 'Isi kata yang akan dilatih.',
  wordChars: 'Gunakan huruf saja. Spasi atau tanda hubung boleh di antara huruf.',
  wordLong: `Maksimal ${LIMITS.word.max} karakter.`,
  wordDuplicate: 'Kata ini sudah ada.',
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
  consentToSave: 'Centang persetujuan untuk menyimpan.',
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
