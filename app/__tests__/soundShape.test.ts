import { soundShape } from '../src/results/lipShapes';

it('draws every Level 1 vowel, also "o" and a held vowel, and nothing for loudness', () => {
  expect(soundShape('A')).toBe('a');
  expect(soundShape('o')).toBe('o');
  expect(soundShape('A panjang')).toBe('a');
  expect(soundShape('Pelan ke keras')).toBeNull();
  expect(soundShape('MAMA')).toBeNull();
});
