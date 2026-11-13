import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { createApiClient } from '../api/client';
import { getClient, isSupabaseConfigured } from '../data/supabase';
import { removeAccountData } from '../user/storage';

export interface CompanionProfile {
  user_id: string;
  display_name: string | null;
  created_at: string;
}

let changingAuth = false;

/** Prevent a second login/logout from changing the owner during credential mutations. */
async function changeAuth<T>(operation: () => Promise<T>): Promise<T> {
  if (changingAuth) throw new Error('Tunggu proses akun yang sedang berjalan.');
  changingAuth = true;
  try {
    return await operation();
  } finally {
    changingAuth = false;
  }
}

function emailAddress(email: string): string {
  const value = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Alamat email tidak valid.');
  return value;
}

function passwordValue(password: string): string {
  if (!password) throw new Error('Password wajib diisi.');
  return password;
}

function companionSession(session: Session | null): Session | null {
  return session?.user.email && !session.user.is_anonymous ? session : null;
}

export async function getCompanionSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getClient().auth.getSession();
  if (error) throw new Error('Sesi login belum dapat dibaca.');
  return companionSession(data.session);
}

/** INITIAL_SESSION restores persistence; callbacks stay synchronous to avoid Auth lock deadlocks. */
export function onCompanionAuthChange(
  listener: (session: Session | null, event: AuthChangeEvent) => void,
): () => void {
  if (!isSupabaseConfigured) {
    listener(null, 'INITIAL_SESSION');
    return () => {};
  }
  const { data } = getClient().auth.onAuthStateChange((event, session) => {
    listener(companionSession(session), event);
  });
  return () => data.subscription.unsubscribe();
}

export async function requireCompanionUser(): Promise<User> {
  const { data, error } = await getClient().auth.getUser();
  if (error || !data.user || data.user.is_anonymous || !data.user.email) {
    throw new Error('Sesi akun pendamping tidak tersedia. Silakan login kembali.');
  }
  return data.user;
}

export async function registerCompanion(email: string, password: string, name: string | null = null) {
  return changeAuth(async () => {
    const { data, error } = await getClient().auth.signUp({
      email: emailAddress(email), password: passwordValue(password),
      options: { data: { display_name: displayName(name) } },
    });
    if (error) throw new Error('Pendaftaran belum berhasil. Periksa data atau coba lagi.');
    if (data.session) await ensureCompanionProfile(data.session.user);
    // With email confirmation enabled, session is null until the email is verified.
    return data;
  });
}

async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await getClient().auth.signInWithPassword({
    email: emailAddress(email), password: passwordValue(password),
  });
  if (error || !companionSession(data.session)) throw new Error('Login gagal. Periksa email dan password.');
  return data.session!;
}

export async function loginCompanion(email: string, password: string): Promise<Session> {
  return changeAuth(async () => {
    const session = await signIn(email, password);
    await ensureCompanionProfile(session.user);
    return session;
  });
}

async function signOutLocal(): Promise<void> {
  const { error } = await getClient().auth.signOut({ scope: 'local' });
  if (error) throw new Error('Logout belum berhasil. Coba lagi.');
}

export async function logoutCompanion(): Promise<void> {
  return changeAuth(signOutLocal);
}

export async function requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
  const { error } = await getClient().auth.resetPasswordForEmail(emailAddress(email), { redirectTo });
  if (error) throw new Error('Permintaan pemulihan password belum berhasil. Coba lagi.');
}

/** Pass the token_hash from the recovery email, never an unverified account id. */
export async function verifyPasswordRecovery(tokenHash: string): Promise<Session> {
  return changeAuth(async () => {
    if (!tokenHash) throw new Error('Token pemulihan wajib diisi.');
    const { data, error } = await getClient().auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    if (error || !companionSession(data.session)) throw new Error('Tautan pemulihan tidak valid atau kedaluwarsa.');
    return data.session!;
  });
}

export async function requestPasswordChangeVerification(): Promise<void> {
  return changeAuth(async () => {
    await requireCompanionUser();
    const { error } = await getClient().auth.reauthenticate();
    if (error) throw new Error('Verifikasi perubahan password belum berhasil.');
  });
}

export async function changePassword(password: string, nonce?: string): Promise<void> {
  return changeAuth(async () => {
    await requireCompanionUser();
    const { error } = await getClient().auth.updateUser({ password: passwordValue(password), nonce });
    if (error) throw new Error('Password belum berhasil diubah. Periksa persyaratan password dan verifikasi.');
  });
}

function displayName(value: string | null): string | null {
  if (value === null) return null;
  const name = value.trim();
  if (!name || name.length > 200) throw new Error('Nama pendamping harus 1 sampai 200 karakter.');
  return name;
}

async function ensureCompanionProfile(user: User): Promise<void> {
  const name: unknown = user.user_metadata?.display_name;
  const { error } = await getClient().from('profiles').upsert({
    user_id: user.id,
    display_name: typeof name === 'string' && name.trim() && name.trim().length <= 200 ? name.trim() : null,
  }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw new Error('Login berhasil, tetapi profil belum dapat dibuat. Silakan coba login kembali.');
}

export async function readCompanionProfile(): Promise<CompanionProfile | null> {
  const user = await requireCompanionUser();
  const { data, error } = await getClient().from('profiles')
    .select('user_id,display_name,created_at').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error('Profil belum dapat dibaca.');
  return data;
}

export async function createCompanionProfile(name: string | null): Promise<CompanionProfile> {
  const user = await requireCompanionUser();
  const { data, error } = await getClient().from('profiles')
    .insert({ user_id: user.id, display_name: displayName(name) })
    .select('user_id,display_name,created_at').single();
  if (error || !data) throw new Error('Profil belum berhasil dibuat atau sudah tersedia.');
  return data;
}

export async function updateCompanionProfile(name: string | null): Promise<CompanionProfile> {
  const user = await requireCompanionUser();
  const { data, error } = await getClient().from('profiles')
    .update({ display_name: displayName(name) }).eq('user_id', user.id)
    .select('user_id,display_name,created_at').single();
  if (error || !data) throw new Error('Profil belum berhasil diubah.');
  return data;
}

/** Deletion of the Auth owner cascades through the existing foreign keys; no profile-only delete. */
export async function deleteCompanionAccount(password: string, serverUrl: string): Promise<void> {
  return changeAuth(async () => {
    const owner = await requireCompanionUser();
    const session = await signIn(owner.email!, password);
    if (session.user.id !== owner.id) throw new Error('Akun berubah; penghapusan dibatalkan.');
    await createApiClient(serverUrl).deleteAccount(session.access_token);
    try {
      try {
        await signOutLocal();
      } finally {
        await removeAccountData(owner.id);
      }
    } catch {
      throw new Error('Akun sudah dihapus. Pembersihan sesi atau data lokal belum berhasil sepenuhnya.');
    }
  });
}
