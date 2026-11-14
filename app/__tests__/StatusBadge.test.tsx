import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { ResultStatus } from '../src/api/types';
import { StatusBadge } from '../src/components/StatusBadge';
import { colors, statusStyles } from '../src/theme';

const CASES: [ResultStatus, string, string][] = [
  ['sesuai', 'Sesuai', 'status-shape-full'],
  ['mendekati', 'Mendekati', 'status-shape-half'],
  ['belum_sesuai', 'Belum sesuai', 'status-shape-retry'],
];

describe('StatusBadge', () => {
  it.each(CASES)('%s shows text "%s" and its own icon symbol, without a container', async (status, label, shape) => {
    await render(<StatusBadge status={status} testID="badge" />);

    expect(screen.getByText(label)).toBeTruthy();
    // The icon is decorative for screen readers (the label carries the meaning), hence hidden.
    expect(screen.getByTestId('badge-icon', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId(shape, { includeHiddenElements: true })).toBeTruthy();

    const badge = screen.getByTestId('badge');
    expect(badge.props.accessibilityLabel).toBe(label);
    const style = StyleSheet.flatten(badge.props.style);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderLeftWidth).toBeUndefined();
    expect(style.borderRadius).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByText(label).props.style)).toMatchObject({ color: colors.text });
  });

  it.each([
    ['md', 18, 15],
    ['lg', 26, 16],
  ] as const)('size %s uses glyph %i and text %i (Figma)', async (size, glyph, fontSize) => {
    await render(<StatusBadge status="sesuai" size={size} testID="badge" />);
    const icon = screen.getByTestId('badge-icon', { includeHiddenElements: true });
    expect(icon.props.width ?? icon.props.style?.width).toBe(glyph);
    expect(StyleSheet.flatten(screen.getByText('Sesuai').props.style).fontSize).toBe(fontSize);
  });

  it('prefixes the indicator name when a label is given', async () => {
    await render(<StatusBadge status="belum_sesuai" label="Suara" testID="badge" />);
    expect(screen.getByText('Suara: Belum sesuai')).toBeTruthy();
    expect(screen.getByTestId('badge').props.accessibilityLabel).toBe('Suara: Belum sesuai');
  });

  it('uses a distinct label per status (never color alone)', () => {
    const labels = new Set(Object.values(statusStyles).map((s) => s.label));
    expect(labels.size).toBe(3);
  });

  it('never uses clinical words in its labels', () => {
    for (const s of Object.values(statusStyles)) {
      expect(s.label).not.toMatch(/normal|abnormal|gangguan|diagnosis/i);
    }
  });
});
