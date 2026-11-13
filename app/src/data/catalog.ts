/** Catalog and word detail: mock (USE_MOCK) or FastAPI v2. Screens import only from here. */
import { ApiError } from '../api/apiError';
import type { CatalogDTO, WordDTO } from '../api/types';
import { createV2Client, type GetToken } from '../api/v2';
import { USE_MOCK } from '../config';
import { MOCK_CATALOG, MOCK_WORDS } from '../mock';

export interface SourceOptions {
  baseUrl: string;
  getToken?: GetToken;
  /** Defaults to USE_MOCK; tests pass it explicitly. */
  mock?: boolean;
}

const MOCK_DELAY_MS = 200;
const later = <T>(value: () => T) =>
  new Promise<T>((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(value());
      } catch (err) {
        reject(err);
      }
    }, MOCK_DELAY_MS),
  );

export function getCatalog(opts: SourceOptions): Promise<CatalogDTO> {
  if (opts.mock ?? USE_MOCK) return later(() => MOCK_CATALOG);
  return createV2Client(opts).getCatalog();
}

export function getWord(id: string, opts: SourceOptions): Promise<WordDTO> {
  if (opts.mock ?? USE_MOCK) {
    return later(() => {
      const word = MOCK_WORDS[id];
      if (!word) throw new ApiError('http', 'Word not found', 404, 'ITEM_NOT_FOUND');
      return word;
    });
  }
  return createV2Client(opts).getWord(id);
}
