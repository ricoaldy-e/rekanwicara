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

/** hairline = card edge and field line in every state (Figma). */
export const stroke = { hairline: 1, thin: 1.5, thick: 2 } as const;

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
  titleLarge: 28,
  display: 34,
  /** Large target word of the dataset recorder (team-only screens). */
  hero: 56,
} as const;

/** Line height for body text (1.5 × body). */
export const lineHeight = { body: 24, small: 22, label: 22, large: 28, title: 32, titleLarge: 36, display: 42 } as const;

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

/** Height of a text field (design.md §5.5). */
export const fieldHeight = 56;

/** Room kept at the right of a field for an accessory such as "Tampilkan" (eye 20 + gap 6 + "Sembunyikan" 15 Bold). */
export const fieldAccessory = 148;

/** PIN pad and dots metrics from Figma "PIN pad" (50:186) and "PIN dots" (50:179), design.md §5.6. */
export const pin = { key: 76, rowGap: 14, columnGap: 28, digit: 30, dot: 22, dotGap: 20, dotRing: 2.5, dotPaddingVertical: 8 } as const;

/** BottomBar metrics from Figma "BottomBar" (25:88), design.md §5.11. */
export const bottomBar = { height: 80, padding: 8, circle: 40, icon: 22, gap: 2, inset: 16 } as const;

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

/** StatusBadge metrics from Figma "StatusBadge" (25:86): glyph, glyph-label gap, text size and line height. */
export const statusBadge = {
  md: { glyph: 18, gap: 6, fontSize: fontSize.small, lineHeight: 20 },
  lg: { glyph: 26, gap: 10, fontSize: fontSize.label, lineHeight: 22 },
  paddingVertical: 2,
} as const;

/** Dialog card metrics from Figma "Dialog" (63:584), design.md §5.12. */
export const dialog = { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 20, gap: 16, textGap: 6, actionsGap: 10 } as const;

/** Segmented control metrics from Figma 37:399, design.md §5.7. */
export const segmented = { padding: 4, gap: 2, radius: 12, segmentHeight: 40, segmentRadius: 9, fontSize: fontSize.small, lineHeight: 20 } as const;

/** List group metrics from Figma "Grup · …" (50:421), design.md §5.3. `inset` is the divider's left offset inside the row padding. */
export const listGroup = {
  paddingLeft: 16,
  paddingRight: 12,
  paddingVertical: 2,
  rowPaddingVertical: 12,
  rowGap: 12,
  inset: 56,
  textGap: 2,
  chevron: 20,
  titleGap: 8,
} as const;

/** Home layout from Figma "Beranda Latihan" (57:385), design.md §3.3 and §6.1: screen gutter, group gap, section heading gap. */
export const layout = { gutter: 20, groupGap: 24, sectionGap: 12 } as const;

/** Home tiles from Figma: LevelTile (57:422) and StatTile (57:449). */
export const levelTile = { height: 132, padding: 16, icon: 28 } as const;
export const statTile = { padding: 12, gap: 12, ring: 40, ringWidth: 4, icon: 20 } as const;

/** Home header avatar and list tiles from Figma 57:385 / 64:585: letter tile, "Langkah awal" marker and row padding. */
export const homeList = { avatar: 44, letterTile: 44, marker: 32, markerInset: 44, stepRowPadding: 14, activityGroupPadding: 4, groupSidePadding: 16, emptyGap: 14, checkIcon: 18, heroIllustration: 112 } as const;

/** Practice session from Figma "Latihan · …" (46:135, 46:177, 46:217, 46:253), design.md §5.14, §6.4. */
export const session = {
  stepBar: { height: 6, gap: 6 },
  media: 200,
  videoRatio: 3 / 4,
  videoMaxHeight: 0.45,
  illustration: 180,
  recordPanel: { ovalWidth: 150, ovalHeight: 200, ovalPercent: '62%', ovalStroke: 3, ovalDash: 10, ovalGap: 8, countdown: 140, badgeInset: 10, badgeDot: 10, barInset: 14, barHeight: 6 },
  stage: { icon: 24, gap: 14, ring: 3 },
} as const;

/** Result screen from Figma "Hasil · Level 1" (48:135): card paddings, target illustration and the sticky action bar. */
export const result = { cardPadding: 16, targetPadding: 14, illustration: 110, cardGap: 10, legendGap: 16, hintPadding: 20, hintGap: 6, targetWordGap: 2 } as const;
export const actionBar = { paddingTop: 12, paddingBottom: 24, gap: 12 } as const;

/** Word and sound lists from Figma "Level 1" (37:260), "Pilih kata" (37:379): letter tile, row text, chips. */
export const wordList = { tile: 44, textGap: 4, titleRowGap: 8, chipPaddingHorizontal: 10, chipPaddingVertical: 3, chipPaddingVerticalLarge: 6, chipGap: 6, chipIcon: 18, chevron: 22, banner: 14, bannerRing: 44 } as const;

/** Step cards of "Jalur kata" (31:317): tile, padding and the "Berikutnya" chip. */
export const pathCard = { padding: 14, paddingNext: 12, tileHeight: 56, tileMinWidth: 56, tilePaddingHorizontal: 12, gap: 12, textGap: 6, chevron: 24 } as const;

/** Pendamping (50:402) and Pengaturan (51:268): account avatar, settings rows, the "Hapus kata" button (61:833). */
export const companion = { avatar: 48, rowPadding: 14, groupPadding: 4, deleteHeight: 52, deleteIcon: 20, deleteGap: 8, wordTileFont: 20 } as const;

/** Entry screens from Figma "Splash · Memuat" (106:627), "Selamat datang" (106:646), "Masuk" (27:38), onboarding (29:182). */
export const entry = {
  gutter: 24,
  brandLogo: 56,
  welcomeGutter: 20,
  welcomeLogo: 176,
  welcomeLogoArea: 330,
  splashLogo: 120,
  splashBar: { width: 96, height: 3, fill: 38 },
  check: { box: 28, radius: 8, icon: 20, gap: 12 },
  stepBarGap: 8,
} as const;

/** Icon sizes in dp. Outline Ionicons are drawn in these boxes; labels carry the meaning (design.md §2). */
export const iconSize = { chip: 18, field: 20, base: 22, button: 24, option: 26, note: 28, add: 32, status: 34, gate: 48 } as const;

/** Permission gate badge (camera / microphone), and the step bar of the older StepHeader. */
export const gate = { badge: 88, badgeBorder: 3 } as const;
export const stepHeaderBar = 12;

export const theme = { colors, fontSize, spacing, radius, touchTarget, buttonHeight, statusStyles, overlay, chart, stroke, fontFamily } as const;
