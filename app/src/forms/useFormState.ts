import { useCallback, useState } from 'react';

import type { Problem } from './messages';

export type Rule<V, K extends keyof V> = (value: V[K], values: V) => Problem | null;
export type Rules<V> = { [K in keyof V]?: Rule<V, K> };
export type Errors<V> = Partial<Record<keyof V, Problem>>;

export interface SubmitResult<V> {
  ok: boolean;
  /** First field (in the order of `initial`) that is wrong, to move focus to. */
  firstInvalid: keyof V | null;
  count: number;
}

/**
 * Small form state (flow §7.7.1), no library. Keep it in the parent screen so the values survive
 * opening a video picker. Validation runs when a touched field is left and on submit; typing only
 * clears an error that is already fixed. Values are plain state: never log or store a password from here.
 */
export function useFormState<V extends Record<string, unknown>>(initial: V, rules: Rules<V>) {
  const [values, setValues] = useState<V>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  const [errors, setErrors] = useState<Errors<V>>({});
  const [start, setStart] = useState<V>(initial);

  const check = useCallback(
    <K extends keyof V>(key: K, all: V): Problem | null => rules[key]?.(all[key], all) ?? null,
    [rules],
  );

  const setValue = useCallback(
    <K extends keyof V>(key: K, value: V[K]) => {
      const next = { ...values, [key]: value };
      setValues(next);
      if (errors[key] !== undefined && check(key, next) === null) {
        setErrors(({ [key]: _fixed, ...rest }) => rest as Errors<V>);
      }
    },
    [values, errors, check],
  );

  /** Call when a field loses focus; it is validated once it has been touched. */
  const blur = useCallback(
    <K extends keyof V>(key: K) => {
      setTouched((t) => ({ ...t, [key]: true }));
      const problem = check(key, values);
      setErrors((e) => {
        const { [key]: _old, ...rest } = e;
        return (problem ? { ...rest, [key]: problem } : rest) as Errors<V>;
      });
    },
    [values, check],
  );

  const submit = useCallback((): SubmitResult<V> => {
    const keys = Object.keys(initial) as (keyof V)[];
    const found: Errors<V> = {};
    for (const key of keys) {
      const problem = check(key, values);
      if (problem) found[key] = problem;
    }
    setTouched(Object.fromEntries(keys.map((k) => [k, true])) as Partial<Record<keyof V, boolean>>);
    setErrors(found);
    const bad = keys.filter((k) => found[k] !== undefined);
    return { ok: bad.length === 0, firstInvalid: bad[0] ?? null, count: bad.length };
  }, [initial, values, check]);

  /** For an error that only the server knows (e.g. "email already used"). */
  const setError = useCallback(<K extends keyof V>(key: K, problem: Problem | null) => {
    setErrors((e) => {
      const { [key]: _old, ...rest } = e;
      return (problem ? { ...rest, [key]: problem } : rest) as Errors<V>;
    });
  }, []);

  /** Back to `next` (default: the first values) with nothing touched; also the new baseline for `dirty`. */
  const reset = useCallback(
    (next?: V) => {
      const base = next ?? start;
      setStart(base);
      setValues(base);
      setTouched({});
      setErrors({});
    },
    [start],
  );

  const dirty = (Object.keys(values) as (keyof V)[]).some((k) => values[k] !== start[k]);

  return { values, errors, touched, dirty, setValue, blur, submit, setError, reset };
}
