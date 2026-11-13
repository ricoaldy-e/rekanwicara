import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { ResultStatus } from '../src/api/types';
import { StatusBadge } from '../src/components/StatusBadge';
import { statusStyles } from '../src/theme';

const CASES: [ResultStatus, string, string][] = [
  ['sesuai', 'Sesuai', 'status-shape-circle'],
  ['mendekati', 'Mendekati', 'status-shape-triangle'],
  ['belum_sesuai', 'Belum sesuai', 'status-shape-square'],
];

describe('StatusBadge', () => {
  it.each(CASES)('%s shows text "%s" and its own icon shape', async (status, label, shape) => {
    await render(<StatusBadge status={status} testID="badge" />);

    expect(screen.getByText(label)).toBeTruthy();
    // The icon is decorative for screen readers (the label carries the meaning), hence hidden.
    expect(screen.getByTestId('badge-icon', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId(shape, { includeHiddenElements: true })).toBeTruthy();

    const badge = screen.getByTestId('badge');
    expect(badge.props.accessibilityLabel).toBe(label);
    expect(StyleSheet.flatten(badge.props.style).borderLeftColor).toBe(statusStyles[status].foreground);
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
