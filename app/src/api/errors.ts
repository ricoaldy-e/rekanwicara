import { ApiError } from './apiError';

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
    case 'cancelled':
      return 'Pengiriman dibatalkan.';
    case 'http':
      if (err.code === 'not_found') return 'Data tidak ditemukan di server.';
      if (err.code === 'file_too_large') return 'Berkas rekaman terlalu besar.';
      if (err.code === 'unsupported_media_type') return 'Berkas bukan video yang didukung.';
      if (err.code === 'invalid_speaker_id' || err.code === 'invalid_item_id' || err.code === 'invalid_request')
        return 'Data rekaman ditolak server. Periksa kode penutur dan materi.';
      if (err.status !== null && err.status >= 500) return 'Server sedang bermasalah. Coba lagi sebentar.';
      return 'Permintaan ditolak server. Coba lagi.';
  }
}
