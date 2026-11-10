import { ApiError } from '../api/apiError';

/**
 * Dataset-specific wording. The upload route only exists when the server runs with DATASET_MODE=true,
 * so a 404 there means "dataset mode is off on the laptop", not "data not found".
 */
export function describeDatasetError(err: unknown): string | null {
  if (!(err instanceof ApiError) || err.kind !== 'http') return null;
  if (err.status === 404) {
    return 'Server belum dalam Mode Dataset. Di laptop, set DATASET_MODE=true di server/.env lalu jalankan ulang server.';
  }
  if (err.code === 'intended_error_item_mismatch' || err.code === 'invalid_intended_error') {
    return 'Kombinasi materi dan kesalahan disengaja ditolak server. Laporkan ke tim.';
  }
  return null;
}
