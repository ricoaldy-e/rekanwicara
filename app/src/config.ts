/**
 * Build-time config from app/.env. Expo inlines `process.env.EXPO_PUBLIC_*` only when accessed
 * with dot notation, so keep these as literal property reads.
 */
export const ENV_API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? '';
export const DATASET_MODE: boolean = process.env.EXPO_PUBLIC_DATASET_MODE === 'true';
/** Public by design (RLS protects the data); empty = no Supabase, the app keeps everything on the phone. */
export const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** true: catalog/word data come from src/mock instead of FastAPI v2 (docs/kontrak-fe-final.md §2). */
export const USE_MOCK: boolean = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

export type AnalyzeApi = 'v1' | 'v2' | 'mock';
/** v2 is the scorer (lips, voice, Wav2Vec2); v1 is no longer used and stays only as an explicit opt-in. */
export function parseAnalyzeApi(value: string | undefined): AnalyzeApi {
  return value === 'v1' || value === 'mock' ? value : 'v2';
}
export const ANALYZE_API: AnalyzeApi = parseAnalyzeApi(process.env.EXPO_PUBLIC_ANALYZE_API);
