import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

/**
 * expo-router carries its own copy of react-navigation. A hook imported from `@react-navigation/*` runs against a
 * different context and fails on the phone with "Couldn't find a navigation object", while Jest (which mocks the
 * module) stays green. Import navigation hooks from `expo-router` instead.
 */
it('app code does not import @react-navigation packages directly', () => {
  const offenders = [...sourceFiles(path.join(ROOT, 'app')), ...sourceFiles(path.join(ROOT, 'src'))].filter((f) =>
    /from\s+['"]@react-navigation\//.test(fs.readFileSync(f, 'utf8')),
  );
  expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
});
