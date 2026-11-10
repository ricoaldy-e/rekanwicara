/**
 * Recorder state machine (pure, tested). RecordPanel drives the side effects:
 * idle → countdown (3, 2, 1) → recording → finishing → idle (uri delivered) | error.
 */

export const COUNTDOWN_FROM = 3;
export const DEFAULT_DURATION_MS = 2500;

export type RecorderPhase = 'idle' | 'countdown' | 'recording' | 'finishing' | 'error';

export interface RecorderState {
  phase: RecorderPhase;
  /** Number shown during the countdown. */
  count: number;
  elapsedMs: number;
  error: string | null;
}

export type RecorderAction =
  | { type: 'start' }
  | { type: 'tick' }
  | { type: 'progress'; elapsedMs: number }
  | { type: 'stop' }
  | { type: 'finished' }
  | { type: 'failed'; message: string }
  | { type: 'reset' };

export const initialRecorderState: RecorderState = { phase: 'idle', count: COUNTDOWN_FROM, elapsedMs: 0, error: null };

export function recorderReducer(state: RecorderState, action: RecorderAction): RecorderState {
  switch (action.type) {
    case 'start':
      if (state.phase !== 'idle' && state.phase !== 'error') return state;
      return { phase: 'countdown', count: COUNTDOWN_FROM, elapsedMs: 0, error: null };
    case 'tick':
      if (state.phase !== 'countdown') return state;
      return state.count > 1 ? { ...state, count: state.count - 1 } : { ...state, phase: 'recording', count: 0 };
    case 'progress':
      return state.phase === 'recording' ? { ...state, elapsedMs: action.elapsedMs } : state;
    case 'stop':
      return state.phase === 'recording' ? { ...state, phase: 'finishing' } : state;
    case 'finished':
      return initialRecorderState;
    case 'failed':
      return { ...initialRecorderState, phase: 'error', error: action.message };
    case 'reset':
      return initialRecorderState;
  }
}

/** Android's expo-camera takes maxDuration as whole seconds; the JS timer stops at durationMs. */
export function safetyMaxDurationS(durationMs: number): number {
  return Math.ceil(durationMs / 1000) + 1;
}
