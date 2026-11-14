import { fireEvent, render, screen } from '@testing-library/react-native';

import { InstructionCarousel } from '../src/practice/InstructionCarousel';

jest.mock('../src/a11y/useReduceMotion', () => ({ useReduceMotion: () => false }));

const STEPS = 'Rapatkan bibir.\nBuka mulut lebar.\nUcapkan a perlahan.';
const measure = () => fireEvent(screen.getByTestId('instruction-carousel'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } } });

it('shows one paragraph as plain text, with no controls', async () => {
  await render(<InstructionCarousel text="Buka mulut lebar dan ucapkan A." />);
  expect(screen.getByText('Buka mulut lebar dan ucapkan A.')).toBeTruthy();
  expect(screen.queryByTestId('instruction-carousel')).toBeNull();
});

it('shows a card per step with "Langkah n dari N" and buttons that move between them', async () => {
  await render(<InstructionCarousel text={STEPS} />);
  await measure();
  expect(screen.getByTestId('instruction-counter')).toHaveTextContent('Langkah 1 dari 3');
  expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();
  await fireEvent.press(screen.getByTestId('instruction-next'));
  expect(screen.getByTestId('instruction-counter')).toHaveTextContent('Langkah 2 dari 3');
  await fireEvent.press(screen.getByTestId('instruction-next'));
  expect(screen.getByTestId('instruction-counter')).toHaveTextContent('Langkah 3 dari 3');
  expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeDisabled();
  await fireEvent.press(screen.getByTestId('instruction-prev'));
  expect(screen.getByTestId('instruction-counter')).toHaveTextContent('Langkah 2 dari 3');
});

it('follows a swipe, and names each card for assistive tech', async () => {
  await render(<InstructionCarousel text={STEPS} />);
  await measure();
  expect(screen.getByLabelText('Langkah 2 dari 3. Buka mulut lebar.')).toBeTruthy();
  const scroller = screen.getByTestId('instruction-scroller');
  await fireEvent(scroller, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 600, y: 0 } } });
  expect(screen.getByTestId('instruction-counter')).toHaveTextContent('Langkah 3 dari 3');
});
