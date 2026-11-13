/** Catalog and word detail: mock (USE_MOCK) or FastAPI v2. Screens import only from here. */
import { ApiError } from '../api/apiError';
import type { CatalogDTO, WordDTO } from '../api/types';
import { createV2Client, type GetToken } from '../api/v2';
import { USE_MOCK } from '../config';
import { MOCK_CATALOG, MOCK_WORDS } from '../mock';
import { mockWordStore } from '../mock/words';
import { completeWordDTOs } from './words';

export interface SourceOptions {
  baseUrl: string;
  getToken?: GetToken;
  /** Defaults to USE_MOCK; tests pass it explicitly. */
  mock?: boolean;
}

const MOCK_DELAY_MS = 200;
const pause = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

/**
 * Mock catalog: the built-in words of src/mock plus the companion's words from the mock store. Words that
 * are "Belum lengkap" (a save stopped half-way) are left out, so the Tuli user never sees them (kontrak §6).
 */
export async function getCatalog(opts: SourceOptions): Promise<CatalogDTO> {
  if (!(opts.mock ?? USE_MOCK)) return createV2Client(opts).getCatalog();
  await pause();
  const custom = await completeWordDTOs(mockWordStore);
  return {
    level_1: MOCK_CATALOG.level_1,
    words: [
      ...MOCK_CATALOG.words.filter((w) => w.source === 'default'),
      ...custom.map((w) => ({ id: w.id, text: w.text, source: w.source, has_level_2: w.level_2.length > 0 })),
    ],
  };
}

export async function getWord(id: string, opts: SourceOptions): Promise<WordDTO> {
  if (!(opts.mock ?? USE_MOCK)) return createV2Client(opts).getWord(id);
  await pause();
  const builtIn = MOCK_WORDS[id];
  const word = builtIn?.source === 'default' ? builtIn : (await completeWordDTOs(mockWordStore)).find((w) => w.id === id);
  if (!word) throw new ApiError('http', 'Word not found', 404, 'ITEM_NOT_FOUND');
  return word;
}
