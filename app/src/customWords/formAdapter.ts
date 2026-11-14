import { ApiError } from '../api/apiError';
import type { WordFormData } from '../data/words';
import { makeUuid } from '../user/pure';
import type { EditorWord } from './service';

export function toFormData(editor: EditorWord): WordFormData {
  const video = (value: EditorWord['video']): WordFormData['video'] => value ? { kind: 'kept', path: value.path, available: value.available } : null;
  return { text: editor.word, instruction: editor.instruction, video: video(editor.video),
    syllables: editor.syllables.map((part) => ({ id: part.id, text: part.text, instruction: part.instruction, video: video(part.video) })) };
}

/** Keep stable material UUIDs and the open editor's retry paths while the design form owns its input. */
export function fromFormData(previous: EditorWord, data: WordFormData): EditorWord {
  const kept = (input: WordFormData['video'], reference: EditorWord['video']) => {
    if (input?.kind !== 'kept') return null;
    if (!reference || input.path !== reference.path) throw new ApiError('file', 'Referensi video berbeda. Muat ulang kata.');
    return reference;
  };
  return { ...previous, word: data.text, instruction: data.instruction,
    video: kept(data.video, previous.video), localUri: data.video?.kind === 'new' ? data.video.file.uri : null,
    syllables: data.syllables.map((part) => {
      const id = part.id ?? makeUuid();
      const before = previous.syllables.find((value) => value.id === id);
      return { id, text: part.text, instruction: part.instruction, video: kept(part.video, before?.video ?? null),
        localUri: part.video?.kind === 'new' ? part.video.file.uri : null };
    }) };
}
