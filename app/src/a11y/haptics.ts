import * as Haptics from 'expo-haptics';

import type { Status } from '../api/types';

// Haptics are a visual-only UI's "beep" (CLAUDE.md: no sound cues). They follow the Getar switch
// in Settings and never throw. UserProvider keeps the flag in sync with profile.settings.vibration.
let enabled = true;

export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
};

export const buzz = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
  if (!enabled) return;
  try {
    Haptics.impactAsync(style).catch(() => undefined);
  } catch {
    // no haptic engine
  }
};

export const buzzDone = () => {
  if (!enabled) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  } catch {
    // no haptic engine
  }
};

/** Result shown (design.md §8): success for Sesuai, a light tap otherwise. Never an error or warning pattern. */
export const buzzResult = (status: Status) =>
  status === 'hijau' ? buzzDone() : buzz(Haptics.ImpactFeedbackStyle.Light);
