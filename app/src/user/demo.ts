import { makeId, makeUuid, newProfile, type Profile } from './pure';

/** Synthetic progress in memory only; never persisted or sent to Supabase. */
export function createDemoProfile(now = new Date()): Profile {
  const profile = newProfile();
  profile.userId = makeId('demo');
  profile.onboarded = true;
  for (const [itemId, level] of [['l1_a', 1], ['l2_ma', 2]] as const) {
    for (let index = 0; index < 10; index++) {
      profile.attempts.push({
        id: makeUuid(), itemId, level, sessionId: `demo_${index < 5 ? 1 : 2}`,
        at: new Date(now.getTime() - (20 - index) * 60_000).toISOString(),
        overall: 'hijau', score: 1, indicators: { bibir: 'hijau', suara: 'hijau' },
        hintId: 'ok_good', scorer: 'rules', engineVersion: 'demo', synced: true,
      });
    }
  }
  return profile;
}
