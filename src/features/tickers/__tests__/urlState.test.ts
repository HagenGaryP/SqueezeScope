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

describe('valuesFromParams with invalid input', () => {
  const defaults = valuesFromParams(new URLSearchParams());

  it.each([
    ['siMin=abc', 'siMin'],
    ['siMin=500', 'siMin'],
    ['siMin=-1', 'siMin'],
    ['dtcMin=-1', 'dtcMin'],
    ['dtcMin=11', 'dtcMin'],
    ['rvolMin=NaN', 'rvolMin'],
    ['rvolMin=99', 'rvolMin'],
    ['sort=bogus', 'sort'],
    ['dir=up', 'dir'],
  ] as const)('does not throw for %s and falls back to the default', (qs, key) => {
    const v = valuesFromParams(new URLSearchParams(qs));
    expect(v[key]).toEqual(defaults[key]);
  });

  it('keeps valid fields when other fields are invalid', () => {
    const v = valuesFromParams(
      new URLSearchParams('q=gme&siMin=500&dtcMin=2&rvolMin=x&catalyst=1&sort=nope&dir=desc')
    );
    expect(v).toEqual({
      q: 'gme',
      siMin: 0,
      dtcMin: 2,
      rvolMin: 0,
      catalyst: true,
      sort: 'ticker',
      dir: 'desc',
    });
  });

  it('accepts boundary values', () => {
    const v = valuesFromParams(new URLSearchParams('siMin=100&dtcMin=10&rvolMin=0'));
    expect([v.siMin, v.dtcMin, v.rvolMin]).toEqual([100, 10, 0]);
  });
});
