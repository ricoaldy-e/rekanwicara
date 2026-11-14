import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SegmentedControl } from '../src/components/SegmentedControl';
import { colors, segmented } from '../src/theme';

const OPTIONS = [
  { value: 'all', label: 'Semua kata' },
  { value: 'builtin', label: 'Bawaan' },
  { value: 'companion', label: 'Pendamping' },
] as const;

describe('SegmentedControl', () => {
  it('marks only the selected segment (state + cream fill), and reports a press', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl options={OPTIONS} value="all" onChange={onChange} testID="seg" accessibilityLabel="Filter kata" />);

    expect(screen.getByTestId('seg').props.accessibilityLabel).toBe('Filter kata');
    const all = screen.getByTestId('seg-all');
    const builtin = screen.getByTestId('seg-builtin');
    expect(all.props.accessibilityState).toMatchObject({ selected: true });
    expect(builtin.props.accessibilityState).toMatchObject({ selected: false });
    expect(StyleSheet.flatten(all.props.style)).toMatchObject({ backgroundColor: colors.primary });
    expect(StyleSheet.flatten(builtin.props.style).backgroundColor).toBeUndefined();
    expect(StyleSheet.flatten(all.props.style).minHeight).toBe(segmented.segmentHeight);

    await fireEvent.press(builtin);
    expect(onChange).toHaveBeenCalledWith('builtin');
  });
});
