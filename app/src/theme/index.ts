import { Platform } from 'react-native';

import type { ResultStatus } from '../api/types';

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

export const stroke = { thin: 1.5, thick: 2, focus: 3 } as const;

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif' });
const PLAYFAIR = 'PlayfairDisplay_700Bold';
let playfairLoaded = false;

/** Called by the root layout once Playfair Display 700 is loaded (design.md §0.2 A). */
export const setPlayfairLoaded = (loaded: boolean) => {
  playfairLoaded = loaded;
};

export const fontFamily = {
  /** Titles only (design.md §4). Read at render time: Playfair Bold when loaded, else system serif. */
  get display() {
    return playfairLoaded ? PLAYFAIR : SERIF;
  },
  /** undefined = system font. */
  text: undefined,
};

/** Title font style. The Playfair file is already Bold, so no fontWeight (avoids faux-bold); the serif fallback needs it. */
export const displayFont = () =>
  playfairLoaded ? ({ fontFamily: PLAYFAIR } as const) : ({ fontFamily: SERIF, fontWeight: '700' } as const);

export const fontSize = {
  small: 15,
  body: 16,
  label: 16,
  large: 20,
  title: 24,
  display: 34,
} as const;

/** Line height for body text (1.5 × body). */
export const lineHeight = { body: 24 } as const;

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

/** Size of one PIN pad key (flow §7.7.2: at least 64 dp). */
export const pinKey = 64;

export interface StatusStyle {
  label: string;
  foreground: string;
}

/** Status is never conveyed by color alone: color + icon shape + text (design.md §3.1, §5.3). */
export const statusStyles: Record<ResultStatus, StatusStyle> = {
  sesuai: { label: 'Sesuai', foreground: '#7FD1A0' },
  mendekati: { label: 'Mendekati', foreground: '#F2C14E' },
  belum_sesuai: { label: 'Belum sesuai', foreground: '#FF8FA3' },
};

export const theme = { colors, fontSize, spacing, radius, touchTarget, buttonHeight, statusStyles, overlay, chart, stroke, fontFamily } as const;
