import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Speak a message to a screen reader. Android reads `accessibilityLiveRegion` texts by itself;
 * iOS has no live regions, so it needs this call (flow §7.7.1).
 */
export function announce(message: string): void {
  if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
}
