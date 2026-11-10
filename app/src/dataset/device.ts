import { Platform } from 'react-native';

/** Server pattern for the metadata.csv `device` field (server/app/api/v1/dataset.py). */
export const DEVICE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,39}$/;

/** Keeps only allowed characters, max 40, starting with a letter/digit; undefined if nothing is left. */
export function sanitizeDevice(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/[^A-Za-z0-9 _.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Za-z0-9]+/, '')
    .trim()
    .slice(0, 40)
    .trim();
  return DEVICE_PATTERN.test(cleaned) ? cleaned : undefined;
}

interface AndroidConstants {
  Brand?: string;
  Model?: string;
  Manufacturer?: string;
}

/** e.g. "samsung SM-A525F" on Android; "iOS 18.1" on iPhone (no model name without extra modules). */
export function deviceLabel(
  os: string = Platform.OS,
  constants: unknown = Platform.constants,
  version: string | number = Platform.Version,
): string | undefined {
  if (os === 'android') {
    const c = (constants ?? {}) as AndroidConstants;
    const brand = c.Brand ?? c.Manufacturer ?? '';
    const model = c.Model ?? '';
    const label = model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`;
    return sanitizeDevice(label);
  }
  if (os === 'ios') return sanitizeDevice(`iOS ${version}`);
  return undefined;
}
