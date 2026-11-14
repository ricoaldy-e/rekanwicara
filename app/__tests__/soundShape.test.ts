import { soundShape } from '../src/results/lipShapes';

it('draws the Level 1 vowels a, i, u and a held vowel, and nothing for "o" or loudness', () => {
  expect(soundShape('A')).toBe('a');
  expect(soundShape('o')).toBeNull();
  expect(soundShape('I')).toBe('i');
  expect(soundShape('u')).toBe('u');
  expect(soundShape('A panjang')).toBe('a');
  expect(soundShape('Pelan ke keras')).toBeNull();
  expect(soundShape('MAMA')).toBeNull();
});
