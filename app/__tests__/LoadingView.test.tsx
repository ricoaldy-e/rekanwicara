import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { LoadingView } from '../src/components/LoadingView';

it('centres the spinner in the area, named for assistive tech', async () => {
  await render(<LoadingView label="Memuat kata" text="Memuat kata…" />);
  const view = screen.getByLabelText('Memuat kata');
  expect(StyleSheet.flatten(view.props.style)).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
  expect(StyleSheet.flatten(view.props.style).minHeight).toBeGreaterThan(0);
  expect(screen.getByText('Memuat kata…')).toBeTruthy();
});
