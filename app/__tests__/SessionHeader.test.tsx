import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SessionHeader } from '../src/components/SessionHeader';
import { colors, session } from '../src/theme';

describe('SessionHeader', () => {
  it('names the step, fills the segments up to it and reports the back press', async () => {
    const onBack = jest.fn();
    await render(<SessionHeader step={2} total={4} title="Ucapkan “a”" onBack={onBack} />);

    expect(screen.getByText('Langkah 2 dari 4')).toHaveAccessibleName('Langkah 2 dari 4');
    expect(screen.getByRole('header', { name: 'Ucapkan “a”' })).toBeTruthy();

    const bars = screen.getByTestId('session-bars', { includeHiddenElements: true }).children as unknown as { props: { style: unknown } }[];
    const fills = bars.map((b) => StyleSheet.flatten(b.props.style as never));
    expect(fills).toHaveLength(4);
    expect(fills.map((f) => f.backgroundColor)).toEqual([colors.text, colors.text, colors.surfaceRaised, colors.surfaceRaised]);
    expect(fills[0].height).toBe(session.stepBar.height);

    await fireEvent.press(screen.getByRole('button', { name: 'Keluar latihan' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
