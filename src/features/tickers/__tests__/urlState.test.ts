import { describe, it, expect } from 'vitest';
import { valuesFromParams, toSearchParams } from '../urlState';

describe('valuesFromParams', () => {
  it('returns defaults for an empty query string', () => {
    expect(valuesFromParams(new URLSearchParams())).toEqual({
      q: '',
      siMin: 0,
      dtcMin: 0,
      rvolMin: 0,
      catalyst: false,
      sort: 'ticker',
      dir: 'asc',
    });
  });

  it('parses catalyst=1 as true and anything else as false', () => {
    expect(valuesFromParams(new URLSearchParams('catalyst=1')).catalyst).toBe(true);
    expect(valuesFromParams(new URLSearchParams('catalyst=0')).catalyst).toBe(false);
    expect(valuesFromParams(new URLSearchParams('')).catalyst).toBe(false);
  });

  it('round-trips through toSearchParams', () => {
    const v = { q: 'gme', siMin: 10, dtcMin: 2.5, rvolMin: 1.5, catalyst: false, sort: 'dtc', dir: 'desc' } as const;
    expect(valuesFromParams(toSearchParams(v))).toEqual(v);
    expect(valuesFromParams(toSearchParams({ ...v, catalyst: true }))).toEqual({ ...v, catalyst: true });
  });
});
