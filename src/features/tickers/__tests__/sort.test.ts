import { describe, it, expect } from 'vitest';
import { sortRows } from '../../tickers/sort';
import type { TickerRow } from '../../../lib/types';

// Small builder for readable test data.
function makeTickerRow(
  partial: Partial<TickerRow> & Pick<TickerRow, 'ticker'>
): TickerRow {
  return {
    price: 0,
    pctChange: 0,
    siPublic: 0,
    siBroad: 0,
    dtc: 0,
    rvol: 0,
    catalyst: false,
    ...partial,
  };
}

const sampleRows: TickerRow[] = [
  makeTickerRow({
    ticker: 'TSLA',
    price: 250,
    pctChange: 2.5,
    siPublic: 12,
    siBroad: 15,
    dtc: 1.1,
    rvol: 1.5,
    catalyst: true,
  }),
  makeTickerRow({
    ticker: 'AAPL',
    price: 170,
    pctChange: -1.2,
    siPublic: 5,
    siBroad: 4,
    dtc: 0.3,
    rvol: 0.8,
  }),
  makeTickerRow({
    ticker: 'NVDA',
    price: 470,
    pctChange: 5.9,
    siPublic: 3,
    siBroad: 3,
    dtc: 0.2,
    rvol: 2.1,
  }),
];

describe('sortRows', () => {
  it('sorts tickers alphabetically (asc/desc)', () => {
    const ascTickers = sortRows(sampleRows, 'ticker', 'asc').map(r => r.ticker);
    const descTickers = sortRows(sampleRows, 'ticker', 'desc').map(r => r.ticker);
    expect(ascTickers).toEqual(['AAPL', 'NVDA', 'TSLA']);
    expect(descTickers).toEqual(['TSLA', 'NVDA', 'AAPL']);
  });

  it('sorts numeric fields (price asc/desc)', () => {
    const ascPrices = sortRows(sampleRows, 'price', 'asc').map(r => r.price);
    const descPrices = sortRows(sampleRows, 'price', 'desc').map(r => r.price);
    expect(ascPrices).toEqual([170, 250, 470]);
    expect(descPrices).toEqual([470, 250, 170]);
  });

  it('sorts pctChange (desc) for momentum views', () => {
    const sortedTickers = sortRows(sampleRows, 'pctChange', 'desc').map(r => r.ticker);
    expect(sortedTickers[0]).toBe('NVDA');
  });

  it('does not mutate the input array', () => {
    const original = [...sampleRows];
    const out = sortRows(original, 'ticker', 'asc');
    expect(original).toEqual(sampleRows);
    expect(out).not.toBe(original);
  });
});

describe('sortRows edge cases', () => {
  it('returns a copy for empty and single-row input', () => {
    const empty: TickerRow[] = [];
    const one = [makeTickerRow({ ticker: 'ONE' })];
    expect(sortRows(empty, 'price', 'asc')).toEqual([]);
    expect(sortRows(empty, 'price', 'asc')).not.toBe(empty);
    expect(sortRows(one, 'squeezeScore', 'desc')).toEqual(one);
    expect(sortRows(one, 'squeezeScore', 'desc')).not.toBe(one);
  });

  it('keeps input order for ties on numeric keys in both directions', () => {
    const rows = [
      makeTickerRow({ ticker: 'B', dtc: 2 }),
      makeTickerRow({ ticker: 'A', dtc: 2 }),
      makeTickerRow({ ticker: 'C', dtc: 1 }),
    ];
    expect(sortRows(rows, 'dtc', 'asc').map((r) => r.ticker)).toEqual(['C', 'B', 'A']);
    expect(sortRows(rows, 'dtc', 'desc').map((r) => r.ticker)).toEqual(['B', 'A', 'C']);
  });

  it.each(['siPublic', 'siBroad', 'dtc', 'rvol'] as const)('sorts %s descending', (key) => {
    const rows = [1, 3, 2].map((v, i) => makeTickerRow({ ticker: `T${i}`, [key]: v }));
    expect(sortRows(rows, key, 'desc').map((r) => r[key])).toEqual([3, 2, 1]);
  });

  it('sorts negative percent changes below positives', () => {
    const rows = [
      makeTickerRow({ ticker: 'UP', pctChange: 1.5 }),
      makeTickerRow({ ticker: 'DOWN', pctChange: -12.3 }),
      makeTickerRow({ ticker: 'FLAT', pctChange: 0 }),
    ];
    expect(sortRows(rows, 'pctChange', 'asc').map((r) => r.ticker)).toEqual(['DOWN', 'FLAT', 'UP']);
  });
});
