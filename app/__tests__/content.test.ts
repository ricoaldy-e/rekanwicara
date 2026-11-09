import fs from 'fs';
import path from 'path';

import { getHint, HINTS } from '../src/content/hints';
import { groupByLevel } from '../src/content/levels';
import type { Item } from '../src/api/types';

const APP_ROOT = path.resolve(__dirname, '..');
const SERVER_HINTS = path.resolve(APP_ROOT, '../server/app/content/hints.json');

describe('hints.json', () => {
  it('is identical to the server copy', () => {
    const server = JSON.parse(fs.readFileSync(SERVER_HINTS, 'utf8'));
    expect(HINTS).toEqual(server);
  });

  it('getHint returns text for known ids and null otherwise', () => {
    expect(getHint('a_open')).toBe('Buka mulut lebih lebar.');
    expect(getHint('nope')).toBeNull();
    expect(getHint(null)).toBeNull();
  });
});

describe('groupByLevel', () => {
  it('groups by level ascending and keeps order inside a level', () => {
    const mk = (item_id: string, level: number): Item => ({
      item_id,
      level,
      text: item_id,
      units: ['a'],
      priority: 'required',
      emoji: null,
      active: true,
    });
    const groups = groupByLevel([mk('l3_x', 3), mk('l1_b', 1), mk('l1_a', 1), mk('l0_z', 0)]);
    expect(groups.map((g) => g.level)).toEqual([0, 1, 3]);
    expect(groups[1].items.map((i) => i.item_id)).toEqual(['l1_b', 'l1_a']);
  });
});

/** CLAUDE.md product boundary: no clinical wording in user-facing app text. */
describe('UI wording', () => {
  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return sourceFiles(p);
      return /\.(tsx?|json)$/.test(e.name) ? [p] : [];
    });
  }

  it('app and src contain no "normal", "abnormal", "gangguan" or "diagnosis"', () => {
    const files = [...sourceFiles(path.join(APP_ROOT, 'app')), ...sourceFiles(path.join(APP_ROOT, 'src'))];
    expect(files.length).toBeGreaterThan(5);
    const offenders = files.filter((f) => /\b(normal|abnormal|gangguan|diagnosis)\b/i.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
