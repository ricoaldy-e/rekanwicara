/**
 * Test-only words: MAMA and PAPA (PAPA repeats the syllable PA) plus the two sample companion words.
 * The product mock (src/mock) lists the eight important words only; these keep the word-path tests readable.
 */
import type { CatalogDTO, WordDTO } from '../src/api/types';
import { MOCK_CATALOG, MOCK_WORDS } from '../src/mock';
import l3Mama from './words/l3_mama.json';
import l3Papa from './words/l3_papa.json';

const custom = MOCK_CATALOG.words.filter((w) => w.source === 'custom');

export const SAMPLE_CATALOG: CatalogDTO = {
  level_1: MOCK_CATALOG.level_1,
  words: [
    { id: 'l3_mama', text: 'MAMA', source: 'default', has_level_2: true },
    { id: 'l3_papa', text: 'PAPA', source: 'default', has_level_2: true },
    ...custom,
  ],
};

export const SAMPLE_WORDS: Readonly<Record<string, WordDTO>> = {
  l3_mama: l3Mama as WordDTO,
  l3_papa: l3Papa as WordDTO,
  ...Object.fromEntries(custom.map((w) => [w.id, MOCK_WORDS[w.id]])),
};
