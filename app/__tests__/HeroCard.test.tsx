import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { HeroCard } from '../src/components';

describe('HeroCard', () => {
  it('exposes the title as a header and renders children', async () => {
    await render(<HeroCard title="Siap latihan?" body="Langkah 1">
      <Text>tombol</Text>
    </HeroCard>);
    expect(screen.getByRole('header', { name: 'Siap latihan?' })).toBeTruthy();
    expect(screen.getByText('Langkah 1')).toBeTruthy();
    expect(screen.getByText('tombol')).toBeTruthy();
  });
});
