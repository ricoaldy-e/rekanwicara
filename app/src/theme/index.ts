import { Platform } from 'react-native';

import type { Status } from '../api/types';

/**
 * "Hutan Malam" dark theme (docs/design.md v6 §3). Contrast ratios are listed in design.md §3.2.
 */
export const colors = {
  background: '#08110B',
  surface: '#131C16',
  surfaceRaised: '#1B261E',
  hero: '#3A5A46',
  onHero: '#FAFCF9',
  onHeroMuted: '#D5E0D5',
  text: '#FAFCF9',
  textMuted: '#AEB8AD',
  primary: '#FAFCF9',
  onPrimary: '#08110B',
  primaryPressed: '#D9DED6',
  border: '#6E7F71',
  accent: '#E8693F',
  onAccent: '#08110B',
  infoBg: '#16261C',
  warningBg: '#2B1A1E',
  danger: '#FF8FA3',
  success: '#7FD1A0',
  focus: '#FFB300',
} as const;

/** Camera layer colors (design.md §9). */
export const overlay = {
  background: '#000000',
  text: '#FFFFFF',
  record: '#C62828',
  scrim: 'rgba(0,0,0,0.45)',
} as const;

export const chart = { userFill: 'rgba(250,252,249,0.18)' } as const;

export const stroke = { thin: 1.5, thick: 2 } as const;

export const fontFamily = {
  /** Serif for titles only (design.md §4); Playfair Display is optional step 0.2 A. */
  display: Platform.select({ ios: 'Georgia', android: 'serif' }),
  /** undefined = system font. */
  text: undefined,
} as const;

export const fontSize = {
  small: 15,
  body: 17,
  label: 17,
  large: 22,
  title: 28,
  display: 40,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  tile: 14,
  card: 20,
  pill: 999,
} as const;

/** Minimum touch target (dp), design.md §2. */
export const touchTarget = 48;

/** Height of the main button (design.md §5.1). */
export const buttonHeight = 52;

export interface StatusStyle {
  label: string;
  foreground: string;
}

/** Status is never conveyed by color alone: color + icon shape + text (design.md §3.1, §5.3). */
export const statusStyles: Record<Status, StatusStyle> = {
  hijau: { label: 'Sesuai', foreground: '#7FD1A0' },
  kuning: { label: 'Mendekati', foreground: '#F2C14E' },
  merah: { label: 'Belum sesuai', foreground: '#FF8FA3' },
};

export const theme = { colors, fontSize, spacing, radius, touchTarget, buttonHeight, statusStyles, overlay, chart, stroke, fontFamily } as const;
