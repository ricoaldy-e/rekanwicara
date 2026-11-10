import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { newProfile, parseProfile, type Profile } from './pure';

export const PROFILE_KEY = 'cw.profile';
export const PIN_KEY = 'cw.companionPin';

/** Storage can be unavailable (private mode, cleared data): fall back to a fresh profile. */
export async function loadProfile(): Promise<Profile> {
  try {
    return parseProfile(await AsyncStorage.getItem(PROFILE_KEY));
  } catch {
    return newProfile();
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // The session keeps working from memory; progress is lost only if the app closes.
  }
}

/** The companion PIN lives in the device keystore, never in AsyncStorage. */
export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function verifyPin(pin: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_KEY)) === pin;
}
