import fs from 'node:fs';
import path from 'node:path';

import { INDONESIAN_PHONE_LABELS, readableIndonesianPhones } from '../src/content/phonetics';

it.each([
  ['m a m a', 'm a m a'],
  ['ŋ ɲ ʃ x tʃ dʒ ɡ j', 'ng ny sy kh c j g y'],
  ['ə e ɛ ɔ o', 'e e e o o'],
  ['ʔ a', 'henti glotal a'],
  ['  m\ta\n', 'm a'],
  ['m æ a', 'm bunyi lain a'],
  ['constructor __proto__', 'bunyi lain bunyi lain'],
  ['', ''],
  [' \n\t ', ''],
])('renders %s as readable phone labels', (raw, expected) => {
  expect(readableIndonesianPhones(raw)).toBe(expected);
});

it('has a readable label for every phone allowed by the CLI', () => {
  const inventory = fs.readFileSync(path.join(__dirname, '../../ml/config/indonesian_phones.txt'), 'utf8')
    .trim().split(/\s+/);
  expect(new Set(inventory).size).toBe(inventory.length);
  expect(Object.keys(INDONESIAN_PHONE_LABELS).sort()).toEqual(inventory.sort());
});
