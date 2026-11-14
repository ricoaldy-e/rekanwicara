import { fireEvent, render, screen } from '@testing-library/react-native';

import { BackButton } from '../src/components/BackButton';

it('shows the destination inside the capsule and calls onPress', async () => {
  const onPress = jest.fn();
  await render(<BackButton label="Latihan" onPress={onPress} testID="back" />);
  expect(screen.getByText('Latihan')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Latihan'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
