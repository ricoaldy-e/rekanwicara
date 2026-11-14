import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SplashIntro } from '../src/components/SplashIntro';
import { splashMotion as m } from '../src/theme';

let mockReduce = false;
jest.mock('../src/a11y/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

const opacityOf = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style).opacity;
const layoutLogo = () => fireEvent(screen.getByTestId('splash-logo'), 'layout', { nativeEvent: { layout: { x: 0, y: 300, width: 120, height: 120 } } });
const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms));
const INTRO_MS = m.hold + m.footDelay + m.footFade + m.rest + m.exit + 100;

beforeEach(() => {
  jest.useFakeTimers();
  mockReduce = false;
});
afterEach(() => jest.useRealTimers());

it('starts with the name hidden and leaves only once the gate is ready', async () => {
  const onDone = jest.fn();
  await render(<SplashIntro animate ready={false} onDone={onDone} />);
  await layoutLogo();
  expect(opacityOf('splash-name')).toBe(0);
  await advance(INTRO_MS);
  expect(onDone).not.toHaveBeenCalled(); // intro finished, gate still deciding: stay on the final state
  await screen.rerender(<SplashIntro animate ready onDone={onDone} />);
  await advance(m.exit + 100);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('with Reduce Motion shows everything at once and leaves after a short rest', async () => {
  mockReduce = true;
  const onDone = jest.fn();
  await render(<SplashIntro animate ready onDone={onDone} />);
  await layoutLogo();
  expect(opacityOf('splash-name')).toBe(1);
  expect(onDone).not.toHaveBeenCalled();
  await advance(m.reducedRest + 50);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('does not replay when the intro already ran in this launch', async () => {
  const onDone = jest.fn();
  await render(<SplashIntro animate={false} ready onDone={onDone} />);
  await layoutLogo();
  expect(opacityOf('splash-name')).toBe(1);
  await advance(50);
  expect(onDone).toHaveBeenCalledTimes(1);
});
