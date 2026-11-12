export const COMMUNICATION_TARGETS = [
  { value: 'tolong', label: 'Tolong' },
  { value: 'saya tuli', label: 'Saya Tuli' },
  { value: 'hai', label: 'Hai' },
  { value: 'makan', label: 'Makan' },
] as const;

export type CommunicationTarget = typeof COMMUNICATION_TARGETS[number]['value'];

/** Compare text only; never infer how well individual sounds were pronounced. */
export function matchesTarget(transcription: string, target: CommunicationTarget): boolean {
  const text = transcription.toLocaleLowerCase('id-ID').replace(/\p{P}/gu, '').trim().replace(/\s+/g, ' ');
  return text === target;
}
