import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  ScreenerInputSchema,
  SCREENER_DEFAULTS,
  type ScreenerValues,
} from './screenerSchema';

/**
 * Parses screener state from URL search params. Never throws: each field is validated
 * on its own and falls back to its default when missing, malformed or out of range,
 * so a hand-edited or stale shared URL degrades to defaults instead of crashing the page.
 */
export function valuesFromParams(params: URLSearchParams): ScreenerValues {
  const shape = ScreenerInputSchema.shape;
  const field = <K extends keyof ScreenerValues>(key: K, raw: unknown): ScreenerValues[K] => {
    const result = shape[key].safeParse(raw);
    return result.success ? (result.data as ScreenerValues[K]) : SCREENER_DEFAULTS[key];
  };
  const get = (key: string) => params.get(key) ?? undefined;

  return {
    q: field('q', get('q')),
    siMin: field('siMin', get('siMin')),
    dtcMin: field('dtcMin', get('dtcMin')),
    rvolMin: field('rvolMin', get('rvolMin')),
    // Pass a real boolean: z.coerce.boolean() would turn the string 'false' into true.
    catalyst: params.get('catalyst') === '1',
    sort: field('sort', get('sort')),
    dir: field('dir', get('dir')),
  };
}

export function toSearchParams(v: ScreenerValues): URLSearchParams {
  const next = new URLSearchParams();
  if (v.q) next.set('q', v.q);
  if (v.siMin) next.set('siMin', String(v.siMin));
  if (v.dtcMin) next.set('dtcMin', String(v.dtcMin));
  if (v.rvolMin) next.set('rvolMin', String(v.rvolMin));
  if (v.catalyst) next.set('catalyst', '1');
  next.set('sort', v.sort);
  next.set('dir', v.dir);
  return next;
}

type SetParams = (nextInit: URLSearchParams, options?: { replace?: boolean }) => void;

/** Keeps the URL in sync with the form state. */
export function useScreenerUrlSync(
  form: UseFormReturn<ScreenerValues>,
  setParams: SetParams
): void {
  useEffect(() => {
    const sub = form.watch((values) => {
      const v = values as ScreenerValues;
      setParams(toSearchParams(v), { replace: true });
    });
    return () => sub.unsubscribe();
  }, [form, setParams]);
}
