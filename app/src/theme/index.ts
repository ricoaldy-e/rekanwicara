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
  success: '#1B5E20',
  warningBg: '#FDECEA',
  // nilai v6 di UI-2b
  surfaceRaised: '#E0E0E0',
  hero: '#0B3D91',
  onHero: '#FFFFFF',
  onHeroMuted: '#FFFFFF',
  primaryPressed: '#0B3D91',
  accent: '#0B3D91',
  onAccent: '#FFFFFF',
} as const;

/** Camera layer colors. */
export const overlay = {
  background: '#000000',
  text: '#FFFFFF',
  record: '#C62828',
  scrim: 'rgba(0,0,0,0.45)',
} as const;

export const lip = { fill: '#B04A5A', mouthDark: '#2B0A10' } as const;

export const chart = { userFill: 'rgba(17,17,17,0.18)' } as const;

// nilai v6 di UI-2b
export const stroke = { thin: 1.5, thick: 2 } as const;

// nilai v6 di UI-2b
export const fontFamily = { display: undefined, text: undefined } as const;

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
  tile: 12,
  card: 18,
  pill: 999,
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

export const theme = { colors, fontSize, spacing, radius, touchTarget, statusStyles, overlay, lip, chart, stroke, fontFamily } as const;
