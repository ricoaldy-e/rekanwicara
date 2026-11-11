/**
 * Build-time config from app/.env. Expo inlines `process.env.EXPO_PUBLIC_*` only when accessed
 * with dot notation, so keep these as literal property reads.
 */
export const ENV_API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? '';
export const DATASET_MODE: boolean = process.env.EXPO_PUBLIC_DATASET_MODE === 'true';
/** Public by design (RLS protects the data); empty = no Supabase, the app keeps everything on the phone. */
export const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
