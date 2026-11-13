import AsyncStorage from '@react-native-async-storage/async-storage';

import { newProfile, parseProfile, type Profile } from './pure';

export const PROFILE_KEY = 'cw.profile';

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
