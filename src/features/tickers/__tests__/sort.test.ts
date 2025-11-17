import { describe, it, expect } from 'vitest';
import { sortRows } from '../../tickers/sort';
import type { TickerRow } from '../../../lib/types';

// Small builder for readable test data.
function makeTickerRow(
  partial: Partial<TickerRow> & Pick<TickerRow, 'ticker'>
): TickerRow {
  return {
    ticker: partial.ticker,
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
