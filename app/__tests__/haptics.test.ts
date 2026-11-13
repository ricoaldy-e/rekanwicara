import * as Haptics from 'expo-haptics';

import { buzz, buzzDone, setHapticsEnabled } from '../src/a11y/haptics';
import { parseProfile } from '../src/user/pure';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  jest.clearAllMocks();
  setHapticsEnabled(true);
});

describe('haptics', () => {
  it('vibrates when enabled', () => {
    buzz(Haptics.ImpactFeedbackStyle.Medium);
    buzzDone();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('does not call expo-haptics when the setting is off', () => {
    setHapticsEnabled(false);
    buzz();
    buzzDone();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('never throws when the haptic call fails', () => {
    (Haptics.impactAsync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no engine');
    });
    expect(() => buzz()).not.toThrow();
  });
});

describe('vibration setting', () => {
  it('reads as on for a profile saved before the field existed', () => {
    const raw = JSON.stringify({ userId: 'u1', settings: { sessionMinutes: 5, listenCheckRequired: true, unlockAll: false } });
    expect(parseProfile(raw).settings.vibration).toBe(true);
  });

  it('keeps an explicit off', () => {
    const raw = JSON.stringify({ userId: 'u1', settings: { vibration: false } });
    expect(parseProfile(raw).settings.vibration).toBe(false);
  });
});
