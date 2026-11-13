import { fireEvent, render, screen } from '@testing-library/react-native';

import { BottomBar } from '../src/components/BottomBar';

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
