import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { iconSize } from '../src/theme';

const ROOT = join(__dirname, '..');
const DIRS = ['app', 'src'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

// Everything except the theme itself: colors, icon sizes and font sizes come from src/theme (CLAUDE.md, design.md §0).
const sources = DIRS.flatMap((d) => files(join(ROOT, d))).filter((f) => !f.includes(join('src', 'theme')));

describe('no literals outside src/theme', () => {
  it('has no hex or rgb colors', () => {
    const hits = sources.filter((f) => /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b|rgba?\(/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('has no literal icon size or font size', () => {
    const hits = sources.filter((f) => /size=\{\d+\}|fontSize: \d/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});

describe('iconSize', () => {
  it('keeps the dp sizes the screens were built with', () => {
    expect(iconSize).toEqual({ chip: 18, field: 20, base: 22, button: 24, option: 26, note: 28, add: 32, status: 34, gate: 48 });
  });
});
