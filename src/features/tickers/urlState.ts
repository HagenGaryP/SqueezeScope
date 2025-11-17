import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  ScreenerInputSchema,
  ScreenerFormSchema,
  type ScreenerValues,
  type SortKey,
  type Dir,
} from './screenerSchema';

export function valuesFromParams(params: URLSearchParams): ScreenerValues {
  const raw = {
    q: params.get('q') ?? '',
    siMin: params.get('siMin') ?? '0',
    dtcMin: params.get('dtcMin') ?? '0',
    rvolMin: params.get('rvolMin') ?? '0',
    catalyst: params.get('catalyst') === '1' ? 'true' : 'false',
    sort: (params.get('sort') ?? 'ticker') as SortKey,
    dir: (params.get('dir') ?? 'asc') as Dir,
  };
  const coerced = ScreenerInputSchema.parse(raw);
  return ScreenerFormSchema.parse(coerced);
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
