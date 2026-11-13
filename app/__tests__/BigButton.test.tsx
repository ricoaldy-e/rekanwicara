import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BigButton } from '../src/components/BigButton';
import { colors } from '../src/theme';

describe('BigButton', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<BigButton label="Mulai" onPress={onPress} testID="b" />);
    fireEvent.press(screen.getByTestId('b'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('b').props.accessibilityState.disabled).toBe(false);
  });

  it('does not call onPress when disabled and reports disabled state', async () => {
    const onPress = jest.fn();
    await render(<BigButton label="Mulai" onPress={onPress} disabled testID="b" />);
    fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    const b = screen.getByTestId('b');
    expect(b.props.accessibilityState.disabled).toBe(true);
    expect(StyleSheet.flatten(b.props.style).backgroundColor).toBe(colors.surfaceRaised);
    expect(StyleSheet.flatten(b.props.style).opacity).toBeUndefined();
  });
});
