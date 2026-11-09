/**
 * Build-time config from app/.env. Expo inlines `process.env.EXPO_PUBLIC_*` only when accessed
 * with dot notation, so keep these as literal property reads.
 */
export const ENV_API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? '';
export const DATASET_MODE: boolean = process.env.EXPO_PUBLIC_DATASET_MODE === 'true';
