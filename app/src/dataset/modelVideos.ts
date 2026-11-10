import { durationForItem, itemText } from './script';

/**
 * SPEC §10.4: 16 model videos (one person): l1_a, l1_i, l1_u, l1_m, l2_ma, l2_pa, l2_ba and the 9
 * required Level 3 words. Other items use text + an SVG lip illustration instead.
 */
export const MODEL_VIDEO_ITEMS: readonly string[] = [
  'l1_a',
  'l1_i',
  'l1_u',
  'l1_m',
  'l2_ma',
  'l2_pa',
  'l2_ba',
  'l3_mama',
  'l3_papa',
  'l3_bibi',
  'l3_pipi',
  'l3_apa',
  'l3_abu',
  'l3_ibu',
  'l3_ubi',
  'l3_bumi',
];

export interface ModelVideoSpec {
  item_id: string;
  text: string;
  durationMs: number;
}

export const MODEL_VIDEOS: readonly ModelVideoSpec[] = MODEL_VIDEO_ITEMS.map((item_id) => ({
  item_id,
  text: itemText(item_id),
  durationMs: durationForItem(item_id),
}));
