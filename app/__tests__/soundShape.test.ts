import { soundShape } from '../src/results/lipShapes';

it('draws every Level 1 vowel (a, i, u, e, o) and a held vowel, and nothing for loudness', () => {
  expect(soundShape('A')).toBe('a');
  expect(soundShape('o')).toBe('o');
  expect(soundShape('E')).toBe('e');
  expect(soundShape('I')).toBe('i');
  expect(soundShape('u')).toBe('u');
  expect(soundShape('A panjang')).toBe('a');
  expect(soundShape('Pelan ke keras')).toBeNull();
  expect(soundShape('MAMA')).toBeNull();
});
