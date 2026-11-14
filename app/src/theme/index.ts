import { Platform } from 'react-native';

import type { ResultStatus } from '../api/types';

/**
 * Neutral charcoal dark theme (docs/design.md v7 §3.1). Contrast ratios are checked in __tests__/theme.contrast.test.ts.
 */
export const colors = {
  background: '#141414',
  surface: '#262626',
  surfaceRaised: '#323232',
  hairline: '#424242',
  border: '#8E8E8E',
  text: '#F7F7F4',
  textMuted: '#ABABA7',
  primary: '#F7F7F4',
  onPrimary: '#141414',
  primaryPressed: '#D6D6D2',
  hero: '#41604F',
  onHero: '#FAFAF7',
  onHeroMuted: '#E6EEE8',
  accent: '#E8693F',
  onAccent: '#141414',
  danger: '#FF8FA3',
  dangerPressed: '#E57990',
  success: '#7FD1A0',
  warning: '#F2C14E',
  focus: '#FFB300',
  infoBg: '#2C2C2C',
  warningBg: '#33232A',
  segment: '#636366',
} as const;

/** Camera layer colors (design.md §9). */
export const overlay = {
  background: '#000000',
  text: '#FFFFFF',
  record: '#C62828',
  scrim: 'rgba(0,0,0,0.45)',
} as const;

export const chart = { userFill: 'rgba(247,247,244,0.18)' } as const;

export const stroke = { thin: 1.5, thick: 2, focus: 3 } as const;

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif' });
const PLAYFAIR = 'PlayfairDisplay_700Bold';
const INTER = { regular: 'Inter_400Regular', bold: 'Inter_700Bold' } as const;
let playfairLoaded = false;
let interLoaded = false;

/** Called by the root layout once Inter 400 and 700 are loaded (design.md §0, §4). */
export const setInterLoaded = (loaded: boolean) => {
  interLoaded = loaded;
};

/** Called by the root layout once Playfair Display 700 is loaded (design.md §0.2 A). */
export const setPlayfairLoaded = (loaded: boolean) => {
  playfairLoaded = loaded;
};

export const fontFamily = {
  /** Titles only (design.md §4). Read at render time: Playfair Bold when loaded, else system serif. */
  get display() {
    return playfairLoaded ? PLAYFAIR : SERIF;
  },
  /** Inter Regular when loaded, else undefined = system font. */
  get text() {
    return interLoaded ? INTER.regular : undefined;
  },
};

/**
 * Body font style. Inter 400 and 700 are separate families, so no fontWeight when loaded (avoids faux-bold);
 * the system fallback needs it.
 */
export const textFont = (bold = false) =>
  interLoaded
    ? ({ fontFamily: bold ? INTER.bold : INTER.regular } as const)
    : ({ fontFamily: undefined, fontWeight: bold ? '700' : '400' } as const);

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
  sheet: 28,
  dialog: 24,
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
  sesuai: { label: 'Sesuai', foreground: colors.success },
  mendekati: { label: 'Mendekati', foreground: colors.warning },
  belum_sesuai: { label: 'Belum sesuai', foreground: colors.danger },
};

export const theme = { colors, fontSize, spacing, radius, touchTarget, buttonHeight, statusStyles, overlay, chart, stroke, fontFamily } as const;
