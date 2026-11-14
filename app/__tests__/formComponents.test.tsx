import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Checkbox } from '../src/components/form/Checkbox';
import { ConfirmDialog } from '../src/components/form/ConfirmDialog';
import { PasswordField } from '../src/components/form/PasswordField';
import { PinDots } from '../src/components/form/PinDots';
import { PinPad } from '../src/components/form/PinPad';
import { Snackbar, SNACKBAR_MIN_MS } from '../src/components/form/Snackbar';
import { TextField } from '../src/components/form/TextField';
import { useFormState, type Rules } from '../src/forms/useFormState';
import { colors, pin } from '../src/theme';
import { messageOf } from '../src/forms/messages';
import * as auth from '../src/forms/validators/auth';

type Values = { username: string; email: string };
const INITIAL: Values = { username: '', email: '' };
const RULES: Rules<Values> = { username: (v) => auth.username(v), email: (v) => auth.email(v) };

describe('useFormState', () => {
  it('validates a field when it is left, not while typing', async () => {
    const { result } = await renderHook(() => useFormState(INITIAL, RULES));
    await act(async () => result.current.setValue('username', 'a'));
    expect(result.current.errors.username).toBeUndefined();
    await act(async () => result.current.blur('username'));
    expect(result.current.errors.username).toBe('usernameShort');
    expect(result.current.touched.username).toBe(true);
  });

  it('typing clears an error only once it is fixed', async () => {
    const { result } = await renderHook(() => useFormState(INITIAL, RULES));
    await act(async () => result.current.blur('username'));
    expect(result.current.errors.username).toBe('usernameEmpty');
    await act(async () => result.current.setValue('username', 'ab'));
    expect(result.current.errors.username).toBe('usernameEmpty'); // still wrong: kept
    await act(async () => result.current.setValue('username', 'abc'));
    expect(result.current.errors.username).toBeUndefined();
  });

  it('submit reports the first wrong field in the order of the form, and the count', async () => {
    const { result } = await renderHook(() => useFormState(INITIAL, RULES));
    let out!: ReturnType<typeof result.current.submit>;
    await act(async () => {
      out = result.current.submit();
    });
    expect(out).toEqual({ ok: false, firstInvalid: 'username', count: 2 });
    expect(result.current.errors).toEqual({ username: 'usernameEmpty', email: 'emailEmpty' });
    expect(messageOf({ key: 'errorCount', vars: { n: out.count } })).toBe('Ada 2 isian yang perlu diperbaiki.');

    await act(async () => result.current.setValue('username', 'rico'));
    await act(async () => {
      out = result.current.submit();
    });
    expect(out).toEqual({ ok: false, firstInvalid: 'email', count: 1 });
  });

  it('submit is ok when every field fits', async () => {
    const { result } = await renderHook(() => useFormState({ username: 'rico', email: 'a@b.co' }, RULES));
    let out!: ReturnType<typeof result.current.submit>;
    await act(async () => {
      out = result.current.submit();
    });
    expect(out).toEqual({ ok: true, firstInvalid: null, count: 0 });
  });

  it('tracks dirty against the starting values, shows a server error, and resets', async () => {
    const { result } = await renderHook(() => useFormState(INITIAL, RULES));
    expect(result.current.dirty).toBe(false);
    await act(async () => result.current.setValue('email', 'x'));
    expect(result.current.dirty).toBe(true);
    await act(async () => result.current.setValue('email', ''));
    expect(result.current.dirty).toBe(false);
    await act(async () => result.current.setError('email', 'emailInvalid'));
    expect(result.current.errors.email).toBe('emailInvalid');
    await act(async () => result.current.reset());
    expect(result.current.errors).toEqual({});
  });
});

function Demo({ onSubmit }: { onSubmit?: (r: { count: number; firstInvalid: string | null }) => void }) {
  const form = useFormState<Values>(INITIAL, RULES);
  return (
    <View>
      <TextField
        testID="username"
        label="Username"
        hint="3–20 karakter."
        value={form.values.username}
        onChangeText={(t) => form.setValue('username', t)}
        onBlur={() => form.blur('username')}
        error={form.errors.username ? messageOf(form.errors.username) : null}
        maxLength={20}
      />
      <TextField testID="email" label="Email" optional value={form.values.email} onChangeText={(t) => form.setValue('email', t)} />
      <Checkbox testID="agree" checked={false} onToggle={() => {}} text="Setuju" error={form.errors.email ? messageOf(form.errors.email) : null} />
      <View testID="submit" onTouchEnd={() => onSubmit?.(form.submit())} />
    </View>
  );
}

describe('TextField', () => {
  it('shows an error with icon and text when left, hides the hint, and clears it when fixed', async () => {
    await render(<Demo />);
    expect(screen.getByText('3–20 karakter.')).toBeTruthy();
    await fireEvent(screen.getByTestId('username'), 'blur');
    expect(screen.getByTestId('username-error')).toHaveAccessibleName('Isi username.');
    expect(screen.getByText('icon:alert-circle', { includeHiddenElements: true })).toBeTruthy(); // not colour alone
    expect(screen.queryByText('3–20 karakter.')).toBeNull(); // the error replaces the hint
    await fireEvent.changeText(screen.getByTestId('username'), 'rico');
    expect(screen.queryByTestId('username-error')).toBeNull();
    expect(screen.getByText('3–20 karakter.')).toBeTruthy();
  });

  it('labels the field, marks optional ones, and gives the hint to the screen reader', async () => {
    await render(<Demo />);
    expect(screen.getByTestId('username').props.accessibilityLabel).toBe('Username');
    expect(screen.getByTestId('username').props.accessibilityHint).toBe('3–20 karakter.');
    expect(screen.getByText('Email (opsional)')).toBeTruthy();
    expect(screen.getByTestId('email').props.accessibilityLabel).toBe('Email (opsional)');
  });

  it('shows the counter only from 80% of the limit', async () => {
    await render(<Demo />);
    await fireEvent.changeText(screen.getByTestId('username'), 'a'.repeat(15));
    expect(screen.queryByText('15 / 20')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('username'), 'a'.repeat(16));
    expect(screen.getByText('16 / 20')).toBeTruthy();
  });
});

describe('PasswordField', () => {
  function Pw() {
    const [v, setV] = useState('');
    return <PasswordField testID="pw" label="Kata sandi" value={v} onChangeText={setV} />;
  }

  it('hides the password and toggles with a labelled switch', async () => {
    await render(<Pw />);
    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(true);
    const toggle = screen.getByTestId('pw-toggle');
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText('Tampilkan sandi')).toBeTruthy();
    await fireEvent.press(toggle);
    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(false);
    expect(screen.getByTestId('pw-toggle').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText('Sembunyikan sandi')).toBeTruthy();
  });
});

describe('Checkbox', () => {
  it('shows its error as icon + text', async () => {
    await render(<Checkbox testID="c" checked={false} onToggle={jest.fn()} text="Setuju" error="Centang persetujuan untuk melanjutkan." />);
    expect(screen.getByTestId('c-error')).toHaveAccessibleName('Centang persetujuan untuk melanjutkan.');
    expect(screen.getByRole('checkbox', { name: 'Setuju' })).toBeTruthy();
  });
});

describe('PinPad and PinDots', () => {
  it('reports digits and delete, with spoken labels', async () => {
    const onDigit = jest.fn();
    const onDelete = jest.fn();
    await render(<PinPad onDigit={onDigit} onDelete={onDelete} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Angka 5' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Angka 0' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Hapus' }));
    expect(onDigit.mock.calls).toEqual([['5'], ['0']]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does nothing while locked', async () => {
    const onDigit = jest.fn();
    await render(<PinPad onDigit={onDigit} onDelete={jest.fn()} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Angka 5' }));
    expect(onDigit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Angka 5' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('reads the dots as one element without the digits', async () => {
    await render(<PinDots filled={2} />);
    expect(screen.getByTestId('pin-dots')).toHaveAccessibleName('2 dari 4 angka terisi');
  });
});

describe('ConfirmDialog', () => {
  const props = { title: 'Hapus “mama”?', confirmLabel: 'Hapus', onConfirm: jest.fn(), onCancel: jest.fn() };

  it('shows nothing when not visible', async () => {
    await render(<ConfirmDialog {...props} visible={false} />);
    expect(screen.queryByText('Hapus “mama”?')).toBeNull();
  });

  it('puts the safe cream button above the red danger button (icon + text) and reports the press', async () => {
    await render(<ConfirmDialog {...props} visible danger message="Ini tidak bisa dibatalkan." />);
    expect(screen.getByText('Hapus “mama”?')).toBeTruthy();
    expect(screen.getByText('icon:trash-outline', { includeHiddenElements: true })).toBeTruthy();
    const fill = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style).backgroundColor;
    expect(fill('confirm-cancel')).toBe(colors.primary);
    expect(fill('confirm-ok')).toBe(colors.danger);
    const ids = screen.getAllByRole('button').map((b) => b.props.testID);
    expect(ids.indexOf('confirm-cancel')).toBeLessThan(ids.indexOf('confirm-ok'));
    await fireEvent.press(screen.getByRole('button', { name: 'Batal' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Hapus' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('PinPad and PinDots sizes (Figma)', () => {
  it('draws round 76 dp keys and 22 dp dots, filled solid and empty as a ring', async () => {
    await render(
      <>
        <PinPad onDigit={jest.fn()} onDelete={jest.fn()} />
        <PinDots filled={1} />
      </>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('pin-5').props.style)).toMatchObject({
      width: pin.key,
      height: pin.key,
      borderRadius: pin.key / 2,
      backgroundColor: colors.surface,
    });
    expect(pin.key).toBe(76);
    expect(pin.dot).toBe(22);
    const dots = screen.getByTestId('pin-dots').children as unknown as { props: { style: ViewStyle } }[];
    expect(StyleSheet.flatten(dots[0].props.style)).toMatchObject({ width: 22, backgroundColor: colors.primary });
    expect(StyleSheet.flatten(dots[1].props.style)).toMatchObject({ width: 22, borderColor: colors.border });
    expect(StyleSheet.flatten(dots[1].props.style)?.backgroundColor).toBeUndefined();
  });
});

describe('ConfirmDialog without danger', () => {
  it('keeps the confirm button outlined so only one button is cream', async () => {
    await render(<ConfirmDialog title="Keluar?" confirmLabel="Keluar" onConfirm={jest.fn()} onCancel={jest.fn()} visible />);
    expect(StyleSheet.flatten(screen.getByTestId('confirm-cancel').props.style).backgroundColor).toBe(colors.primary);
    expect(StyleSheet.flatten(screen.getByTestId('confirm-ok').props.style).backgroundColor).toBe('transparent');
  });
});

describe('Snackbar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stays at least 5 seconds, then asks to close', async () => {
    const onDismiss = jest.fn();
    await render(<Snackbar message="PIN diganti." onDismiss={onDismiss} durationMs={1000} />);
    expect(screen.getByTestId('snackbar')).toHaveAccessibleName('PIN diganti.');
    await act(async () => jest.advanceTimersByTime(SNACKBAR_MIN_MS - 1));
    expect(onDismiss).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing without a message', async () => {
    await render(<Snackbar message={null} onDismiss={jest.fn()} />);
    expect(screen.queryByTestId('snackbar')).toBeNull();
  });
});
