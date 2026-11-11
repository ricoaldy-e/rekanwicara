import type { Status } from '../api/types';

/**
 * Accessible theme (SPEC §8.5): high contrast, large text, large touch targets.
 * Main text/status pairs exceed 4.5:1; primary is 10.04:1 and red is 6.57:1.
 */
export const colors = {
  background: '#FFFFFF',
  surface: '#F4F6F8',
  text: '#111111',
  textMuted: '#3A3A3A',
  border: '#1F1F1F',
  primary: '#0B3D91',
  onPrimary: '#FFFFFF',
  secondary: '#FFFFFF',
  onSecondary: '#0B3D91',
  disabled: '#E0E0E0',
  danger: '#B71C1C',
  infoBg: '#E8F0FE',
  infoBorder: '#0B3D91',
  focus: '#FFB300',
} as const;

export const fontSize = {
  small: 17,
  body: 20,
  large: 24,
  title: 30,
  display: 44,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  md: 12,
  lg: 18,
} as const;

/** Minimum touch target (dp). Platform guidance is 48; we go larger for comfort. */
export const touchTarget = 64;

export interface StatusStyle {
  label: string;
  icon: 'checkmark-circle' | 'alert-circle' | 'close-circle';
  background: string;
  foreground: string;
}

/** Status is never conveyed by color alone: color + icon + text (CLAUDE.md). */
export const statusStyles: Record<Status, StatusStyle> = {
  hijau: { label: 'Sesuai', icon: 'checkmark-circle', background: '#1B5E20', foreground: '#FFFFFF' },
  kuning: { label: 'Mendekati', icon: 'alert-circle', background: '#FFC400', foreground: '#111111' },
  merah: { label: 'Belum sesuai', icon: 'close-circle', background: '#B71C1C', foreground: '#FFFFFF' },
};

export const theme = { colors, fontSize, spacing, radius, touchTarget, statusStyles } as const;
