import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { ListGroup, ListRow } from '../src/components/ListGroup';
import { colors, listGroup, stroke } from '../src/theme';

describe('ListGroup', () => {
  it('draws one inset hairline between rows, none before the first or after the last', async () => {
    await render(
      <ListGroup title="Kata saya" testID="group">
        <ListRow title="tolong" subtitle="Suku kata: to · long" testID="r1" />
        <ListRow title="bola" testID="r2" />
        <ListRow title="minum" testID="r3" />
      </ListGroup>,
    );
    expect(screen.getByRole('header', { name: 'Kata saya' })).toBeTruthy();
    const dividers = screen.getAllByTestId('list-separator');
    expect(dividers).toHaveLength(2);
    expect(StyleSheet.flatten(dividers[0].props.style)).toMatchObject({
      height: stroke.hairline,
      marginLeft: listGroup.paddingLeft + listGroup.inset,
      backgroundColor: colors.hairline,
    });
  });

  it('is pressable only with onPress, and then shows a chevron', async () => {
    const onPress = jest.fn();
    await render(
      <ListGroup>
        <ListRow title="tolong" subtitle="to · long" onPress={onPress} testID="open" leading={<Text>T</Text>} />
        <ListRow title="Bawaan" testID="static" />
      </ListGroup>,
    );
    expect(screen.getByTestId('open').props.accessibilityLabel).toBe('tolong. to · long');
    expect(screen.getByText('icon:chevron-forward', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryAllByText('icon:chevron-forward', { includeHiddenElements: true })).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('open'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

it('a pressed row owns the card padding, so its fill reaches the card edges', async () => {
  await render(
    <ListGroup paddingVertical={4} paddingRight={16}>
      <ListRow title="a" testID="first" onPress={jest.fn()} />
      <ListRow title="b" testID="last" onPress={jest.fn()} />
    </ListGroup>,
  );
  const first = StyleSheet.flatten(screen.getByTestId('first').props.style);
  const last = StyleSheet.flatten(screen.getByTestId('last').props.style);
  expect(first).toMatchObject({ paddingLeft: listGroup.paddingLeft, paddingRight: 16, paddingTop: listGroup.rowPaddingVertical + 4 });
  expect(last).toMatchObject({ paddingBottom: listGroup.rowPaddingVertical + 4 });
});
