import { describe, it, expect } from 'vitest';
import type { TickerRow } from '../../../lib/types';
import { toTickerRows, type TickerQueryData } from '../query';

describe('toTickerRows', () => {
  it('returns an empty array when input is undefined', () => {
    const result = toTickerRows(undefined);
    expect(result).toEqual([]);
  });

  it('returns the same array instance when input is an array', () => {
    const rows: TickerRow[] = [
      { ticker: 'AAA' } as unknown as TickerRow,
      { ticker: 'BBB' } as unknown as TickerRow,
    ];

    const result = toTickerRows(rows);

    // Should not allocate a new array in this case
    expect(result).toBe(rows);
  });

  it('returns the rows property when input is an object with rows', () => {
    const rows: TickerRow[] = [
      { ticker: 'CCC' } as unknown as TickerRow,
      { ticker: 'DDD' } as unknown as TickerRow,
    ];

    const input: TickerQueryData = { rows };
    const result = toTickerRows(input);

    expect(result).toBe(rows);
  });
});
