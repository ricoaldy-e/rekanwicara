/** Instruction suggestions (kontrak §7): mock (USE_MOCK) or FastAPI v2. Screens import only from here. */
import { ApiError } from '../api/apiError';
import type { InstructionRequest } from '../api/types';
import { createV2Client, type V2Options } from '../api/v2';
import { withAccount } from '../auth/v2Auth';
import { USE_MOCK } from '../config';
import { fromAi } from '../forms/instructionSteps';

export interface GenerateOptions extends Pick<V2Options, 'getToken' | 'refreshSession' | 'onSessionLost'> {
  baseUrl: string;
  signal?: AbortSignal;
  /** Defaults to USE_MOCK; tests pass it explicitly. */
  mock?: boolean;
}

const MOCK_DELAY_MS = 700;

/** A suggestion for the companion to review. Never saved on its own (flow §7.5.2). */
export async function generateInstruction(req: InstructionRequest, opts: GenerateOptions): Promise<string> {
  if (!(opts.mock ?? USE_MOCK)) {
    const res = await createV2Client(withAccount(opts)).generateInstruction(req, opts.signal);
    return fromAi(res.instruction);
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, MOCK_DELAY_MS);
    opts.signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new ApiError('cancelled', 'Request cancelled'));
    });
  });
  const text = req.text.toLowerCase();
  return req.type === 'word'
    ? `Rapatkan bibir dengan nyaman.\nUcapkan “${text}” pelan-pelan dan jelas.`
    : `Ucapkan “${text}” pendek dan jelas.\nIngat, ini bagian dari kata “${req.parent_word.toLowerCase()}”.`;
}
