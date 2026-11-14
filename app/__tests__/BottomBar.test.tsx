import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BottomBar } from '../src/components/BottomBar';
import { bottomBar, colors } from '../src/theme';

it('shows three labelled items, marks the active one and reports presses', async () => {
  const onCompanion = jest.fn();
  await render(
    <BottomBar
      items={[
        { key: 'home', label: 'Latihan', icon: 'mic-outline', active: true, onPress: jest.fn() },
        { key: 'companion', label: 'Pendamping', accessibilityLabel: 'Mode Pendamping', icon: 'people-outline', onPress: onCompanion },
        { key: 'settings', label: 'Pengaturan', icon: 'settings-outline', onPress: jest.fn() },
      ]}
    />,
  );
  expect(screen.getByText('Latihan')).toBeTruthy();
  expect(screen.getByText('Pengaturan')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Latihan' })).toBeSelected();
  await fireEvent.press(screen.getByRole('button', { name: 'Mode Pendamping' }));
  expect(onCompanion).toHaveBeenCalledTimes(1);
});

it('is 80 dp tall with a 40 dp accent circle behind the active icon only', async () => {
  await render(
    <BottomBar
      items={[
        { key: 'a', label: 'Latihan', icon: 'mic-outline', active: true, onPress: jest.fn() },
        { key: 'b', label: 'Pendamping', icon: 'people-outline', onPress: jest.fn() },
      ]}
    />,
  );
  const barStyle = StyleSheet.flatten(screen.getByRole('button', { name: 'Latihan' }).parent!.props.style);
  expect(barStyle.height).toBe(bottomBar.height);
  const circleOf = (name: string) =>
    StyleSheet.flatten(within(screen.getByRole('button', { name })).getByTestId('bar-circle').props.style);
  expect(circleOf('Latihan')).toMatchObject({ width: bottomBar.circle, height: bottomBar.circle, backgroundColor: colors.accent });
  expect(circleOf('Pendamping').backgroundColor).toBeUndefined();
});
