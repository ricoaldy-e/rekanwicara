import { ApiError } from './client';

/** Indonesian, user-facing text for any error thrown by the API client. */
export function errorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Terjadi kesalahan. Coba lagi.';
  switch (err.kind) {
    case 'network':
      return 'Tidak dapat terhubung ke server. Pastikan HP dan laptop memakai Wi-Fi yang sama, lalu coba lagi.';
    case 'timeout':
      return 'Server terlalu lama menjawab. Coba lagi.';
    case 'parse':
      return 'Jawaban server tidak dapat dibaca. Periksa alamat server.';
    case 'http':
      if (err.code === 'not_found') return 'Data tidak ditemukan di server.';
      if (err.code === 'file_too_large') return 'Berkas rekaman terlalu besar.';
      if (err.status !== null && err.status >= 500) return 'Server sedang bermasalah. Coba lagi sebentar.';
      return 'Permintaan ditolak server. Coba lagi.';
  }
}
